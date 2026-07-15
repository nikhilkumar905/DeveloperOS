import os
import asyncio
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from models.user import User
from models.integration_profile import IntegrationProfile
from models.github_stats import GithubStats, GithubProfile, GithubRepository, AggregatedStats
from models.knowledge_graph import KnowledgeGraph
from models.developer_intelligence import DeveloperIntelligence
import services.github_service as gh_svc
from middleware.auth import get_current_user
import json

router = APIRouter(prefix="/api/github", tags=["github"])

JWT_SECRET = os.getenv("JWT_SECRET", "")
ALGORITHM = "HS256"


def get_frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:6501")


@router.get("/auth-url")
async def get_auth_url(request: Request, current_user: User = Depends(get_current_user)):
    client_id = os.getenv("GITHUB_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="GitHub Client ID is missing.")
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="Server configuration error")

    state = jwt.encode({"userId": str(current_user.id), "exp": datetime.utcnow() + timedelta(minutes=10)}, JWT_SECRET, algorithm=ALGORITHM)
    scope = "repo read:user"
    redirect_uri = f"{request.base_url}api/github/callback".rstrip("/")
    auth_url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}&state={state}"
    return {"url": auth_url}


@router.get("/callback")
async def callback(code: str = None, state: str = None):
    frontend_url = get_frontend_url()
    if not code or not state:
        return RedirectResponse(f"{frontend_url}?github_error=missing_params")
    if not JWT_SECRET:
        return RedirectResponse(f"{frontend_url}?github_error=server_config")

    try:
        decoded = jwt.decode(state, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return RedirectResponse(f"{frontend_url}?github_error=invalid_state")

    user_id = decoded.get("userId")
    try:
        token = await gh_svc.exchange_code_for_token(code)
        from beanie import PydanticObjectId
        uid = PydanticObjectId(user_id)
        integration = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
        if not integration:
            integration = IntegrationProfile(user=uid)

        profile = await gh_svc.get_user_profile(token)
        integration.githubUsername = profile["login"]
        integration.githubToken = token
        await integration.save()

        asyncio.create_task(_sync_github_data(uid, token))
        return RedirectResponse(f"{frontend_url}/dashboard?github_connected=true")
    except Exception as e:
        print(f"[github callback] error: {e}")
        return RedirectResponse(f"{frontend_url}?github_error=true")


@router.delete("/disconnect")
async def disconnect(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    await IntegrationProfile.find_one(IntegrationProfile.user == uid).update({"$unset": {"githubToken": "", "githubUsername": ""}})
    await GithubStats.find_one(GithubStats.user == uid).delete()
    await KnowledgeGraph.find_one(KnowledgeGraph.user == uid).delete()
    await DeveloperIntelligence.find_one(DeveloperIntelligence.user == uid).delete()
    return {"message": "GitHub disconnected successfully"}


@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    stats = await GithubStats.find_one(GithubStats.user == current_user.id)
    if not stats:
        return None
    # Exclude heavy fields
    result = stats.model_dump(by_alias=True)
    for repo in result.get("repositories", []):
        repo.pop("filePaths", None)
        repo.pop("dependencies", None)
    return result


@router.post("/sync")
async def sync(current_user: User = Depends(get_current_user)):
    uid = current_user.id
    integration = await IntegrationProfile.find_one(IntegrationProfile.user == uid)
    if not integration or not integration.githubToken:
        raise HTTPException(status_code=400, detail="GitHub is not connected.")

    await _sync_github_data(uid, integration.githubToken)

    stats = await GithubStats.find_one(GithubStats.user == uid)
    if not stats:
        return None
    result = stats.model_dump(by_alias=True)
    for repo in result.get("repositories", []):
        repo.pop("filePaths", None)
        repo.pop("dependencies", None)
    return result


async def _sync_github_data(user_id, token: str):
    profile_data = await gh_svc.get_user_profile(token)
    repos_data = await gh_svc.get_user_repositories(token)
    pr_count = await gh_svc.get_user_pull_requests_count(token, profile_data["login"])
    issue_count = await gh_svc.get_user_issues_count(token, profile_data["login"])

    total_stars = 0
    top_languages = {}

    parsed_repos = []
    for repo in repos_data:
        # Ignore profile README repos (e.g. nikhilkumar905/nikhilkumar905)
        if repo.get("name", "").lower() == profile_data["login"].lower():
            continue
            
        total_stars += repo.get("stargazers_count", 0)
        parsed_repos.append(GithubRepository(
            name=repo.get("name", ""),
            url=repo.get("html_url", ""),
            homepage=repo.get("homepage", "") or "",
            stars=repo.get("stargazers_count", 0),
            forks=repo.get("forks_count", 0),
            language=repo.get("language") or "Unknown",
            defaultBranch=repo.get("default_branch", "main"),
            description=repo.get("description", "") or "",
        ))

    # Fetch languages concurrently
    async def fetch_langs(repo):
        lang_data = await gh_svc.get_repo_languages(token, profile_data["login"], repo.name)
        repo.languages = list(lang_data.keys())
        for lang, bytes_ in lang_data.items():
            top_languages[lang] = top_languages.get(lang, 0) + bytes_
        if repo.language != "Unknown" and repo.language not in repo.languages:
            repo.languages.append(repo.language)

    await asyncio.gather(*[fetch_langs(r) for r in parsed_repos])

    # Deep fetch top 30 repos
    async def deep_fetch(repo):
        repo.dependencies = []
        try:
            if "JavaScript" in repo.languages or "TypeScript" in repo.languages:
                pkg = await gh_svc.get_repo_file_content(token, profile_data["login"], repo.name, "package.json")
                if pkg:
                    try:
                        pkg_data = json.loads(pkg)
                        deps = list(pkg_data.get("dependencies", {}).keys())
                        dev_deps = list(pkg_data.get("devDependencies", {}).keys())
                        repo.dependencies = deps + dev_deps
                    except Exception:
                        pass

            if "Python" in repo.languages:
                req_txt = await gh_svc.get_repo_file_content(token, profile_data["login"], repo.name, "requirements.txt")
                if req_txt:
                    for line in req_txt.split("\n"):
                        dep = line.split("==")[0].split(">=")[0].strip()
                        if dep and not dep.startswith("#"):
                            repo.dependencies.append(dep)

            repo.filePaths = await gh_svc.get_repo_tree(token, profile_data["login"], repo.name, repo.defaultBranch)
        except Exception as e:
            print(f"[github sync] Error parsing {repo.name}: {e}")

    await asyncio.gather(*[deep_fetch(r) for r in parsed_repos[:30]])

    # Estimate commits
    total_commits = 0
    owned_repos = [r for r in parsed_repos[:10] if r.forks == 0 or r.stars > 0]
    for repo in owned_repos[:10]:
        try:
            total_commits += await gh_svc.get_repo_commit_count(token, profile_data["login"], repo.name)
        except Exception:
            pass

    stats = await GithubStats.find_one(GithubStats.user == user_id)
    if not stats:
        stats = GithubStats(user=user_id)

    stats.profile = GithubProfile(
        username=profile_data.get("login", ""),
        avatarUrl=profile_data.get("avatar_url", ""),
        bio=profile_data.get("bio", "") or "",
        followers=profile_data.get("followers", 0),
        following=profile_data.get("following", 0),
        publicRepos=profile_data.get("public_repos", 0),
    )
    stats.repositories = parsed_repos
    stats.aggregatedStats = AggregatedStats(
        totalCommits=total_commits, totalPRs=pr_count, totalIssues=issue_count, totalStars=total_stars
    )
    stats.topLanguages = top_languages
    stats.lastSyncedAt = datetime.utcnow()
    await stats.save()

    # Invalidate caches
    await KnowledgeGraph.find_one(KnowledgeGraph.user == user_id).delete()
    await DeveloperIntelligence.find_one(DeveloperIntelligence.user == user_id).delete()
