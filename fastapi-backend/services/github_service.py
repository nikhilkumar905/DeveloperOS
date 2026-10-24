import os
from typing import Optional, Dict, List
import httpx

GITHUB_API_URL = "https://api.github.com"


def _headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
    }


async def exchange_code_for_token(code: str) -> str:
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("GitHub OAuth configuration is missing.")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            json={"client_id": client_id, "client_secret": client_secret, "code": code},
            headers={"Accept": "application/json"},
        )
        data = response.json()
        if "error" in data:
            raise ValueError(data.get("error_description", "Failed to exchange code for token"))
        return data["access_token"]


class GithubAuthError(Exception):
    """The stored GitHub token is invalid, expired or revoked."""


def _check_response(r: httpx.Response) -> None:
    if r.status_code == 401:
        raise GithubAuthError("GitHub token is invalid or expired. Please reconnect GitHub.")
    r.raise_for_status()


async def get_user_profile(token: str) -> Dict:
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(f"{GITHUB_API_URL}/user", headers=_headers(token))
        _check_response(r)
        return r.json()


async def get_user_repositories(token: str, max_pages: int = 5) -> List[Dict]:
    repos: List[Dict] = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        for page in range(1, max_pages + 1):
            r = await client.get(
                f"{GITHUB_API_URL}/user/repos?per_page=100&sort=updated&affiliation=owner&page={page}",
                headers=_headers(token),
            )
            _check_response(r)
            batch = r.json()
            if not isinstance(batch, list):
                break
            repos.extend(batch)
            if len(batch) < 100:
                break
    return repos


async def get_repo_languages(token: str, owner: str, repo: str) -> Dict[str, int]:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{GITHUB_API_URL}/repos/{owner}/{repo}/languages",
                headers=_headers(token),
            )
            data = r.json()
            return data if r.status_code == 200 and isinstance(data, dict) else {}
    except Exception:
        return {}


async def get_repo_file_content(token: str, owner: str, repo: str, path: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{GITHUB_API_URL}/repos/{owner}/{repo}/contents/{path}",
                headers={**_headers(token), "Accept": "application/vnd.github.v3.raw"},
            )
            if r.status_code != 200:
                return None
            return r.text
    except Exception:
        return None


async def get_repo_tree(token: str, owner: str, repo: str, default_branch: str) -> List[str]:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{GITHUB_API_URL}/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1",
                headers=_headers(token),
            )
            data = r.json()
            if data.get("tree"):
                return [item["path"] for item in data["tree"] if item.get("type") == "blob"]
        return []
    except Exception:
        return []


async def get_repo_commit_count(token: str, owner: str, repo: str) -> int:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{GITHUB_API_URL}/repos/{owner}/{repo}/commits?author={owner}&per_page=1",
                headers=_headers(token),
            )
            link_header = r.headers.get("link", "")
            import re
            match = re.search(r'page=(\d+)>;\s*rel="last"', link_header)
            if match:
                return int(match.group(1))
            data = r.json()
            return len(data) if isinstance(data, list) else 0
    except Exception:
        return 0


async def get_user_pull_requests_count(token: str, username: str) -> int:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{GITHUB_API_URL}/search/issues?q=author:{username}+type:pr",
                headers=_headers(token),
            )
            return r.json().get("total_count", 0)
    except Exception:
        return 0


async def get_user_issues_count(token: str, username: str) -> int:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{GITHUB_API_URL}/search/issues?q=author:{username}+type:issue",
                headers=_headers(token),
            )
            return r.json().get("total_count", 0)
    except Exception:
        return 0
