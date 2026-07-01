import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { GithubService } from '../services/githubService';
import IntegrationProfile from '../models/IntegrationProfile';
import { GithubStats } from '../models/GithubStats';
import KnowledgeGraph from '../models/KnowledgeGraph';
import DeveloperIntelligence from '../models/DeveloperIntelligence';

// Extend Express Request to include user (from auth middleware)
interface AuthRequest extends Request {
  user?: { id: string; _id: string };
}

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:6501';

export const getAuthUrl = (req: AuthRequest, res: Response): void => {
  try {
    const userId = (req as any).user?._id || req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      res.status(500).json({ error: 'GitHub Client ID is missing.' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Sign the userId in the state parameter to prevent CSRF
    const state = jwt.sign({ userId }, jwtSecret, { expiresIn: '10m' });
    const scope = 'repo read:user';
    const redirectUri = `${req.protocol}://${req.get('host')}/api/github/callback`;
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;

    res.json({ url: authUrl });
  } catch (error: any) {
    console.error('[githubController] getAuthUrl error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const callback = async (req: Request, res: Response): Promise<void> => {
  const frontendUrl = FRONTEND_URL();
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      res.redirect(`${frontendUrl}?github_error=missing_params`);
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.redirect(`${frontendUrl}?github_error=server_config`);
      return;
    }

    // Verify state to get userId
    let decoded: any;
    try {
      decoded = jwt.verify(state as string, jwtSecret);
    } catch (err) {
      res.redirect(`${frontendUrl}?github_error=invalid_state`);
      return;
    }
    const userId = decoded.userId;

    // Exchange code for token
    const token = await GithubService.exchangeCodeForToken(code as string);

    // Save token in IntegrationProfile
    let integration = await IntegrationProfile.findOne({ user: userId });
    if (!integration) {
      integration = new IntegrationProfile({ user: userId });
    }

    // Fetch basic profile to get username
    const profile = await GithubService.getUserProfile(token);
    integration.githubUsername = profile.login;
    integration.githubToken = token;
    await integration.save();

    // Trigger initial sync in the background — don't await
    syncGithubDataForUser(userId, token).catch(err =>
      console.error('[githubController] Background sync failed:', err)
    );

    res.redirect(`${frontendUrl}/dashboard?github_connected=true`);
  } catch (error: any) {
    console.error('[githubController] callback error:', error.message);
    res.redirect(`${frontendUrl}?github_error=true`);
  }
};

export const disconnect = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await IntegrationProfile.findOneAndUpdate(
      { user: userId },
      { $unset: { githubToken: '', githubUsername: '' } }
    );

    await GithubStats.findOneAndDelete({ user: userId });
    // Invalidate related caches
    await KnowledgeGraph.findOneAndDelete({ user: userId });
    await DeveloperIntelligence.findOneAndDelete({ user: userId });

    res.json({ message: 'GitHub disconnected successfully' });
  } catch (error: any) {
    console.error('[githubController] disconnect error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stats = await GithubStats.findOne({ user: userId })
      .select('-repositories.filePaths -repositories.dependencies') // Exclude heavy fields
      .lean();

    if (!stats) {
      res.json(null);
      return;
    }

    res.json(stats);
  } catch (error: any) {
    console.error('[githubController] getStats error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const sync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const integration = await IntegrationProfile.findOne({ user: userId });
    if (!integration || !integration.githubToken) {
      res.status(400).json({ error: 'GitHub is not connected.' });
      return;
    }

    await syncGithubDataForUser(userId, integration.githubToken);

    const stats = await GithubStats.findOne({ user: userId })
      .select('-repositories.filePaths -repositories.dependencies')
      .lean();

    res.json(stats);
  } catch (error: any) {
    console.error('[githubController] sync error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ─── Internal helper: sync GitHub data for a user ───────────────────────────

async function syncGithubDataForUser(userId: string, token: string): Promise<void> {
  const profile = await GithubService.getUserProfile(token);
  const repos = await GithubService.getUserRepositories(token);
  const prCount = await GithubService.getUserPullRequestsCount(token, profile.login);
  const issueCount = await GithubService.getUserIssuesCount(token, profile.login);

  let totalStars = 0;
  let totalCommits = 0;
  const topLanguages: Record<string, number> = {};

  const parsedRepos = repos.map((repo: any) => {
    totalStars += repo.stargazers_count || 0;
    // Use GitHub's push_count proxy via size for commits estimate, or keep 0 — 
    // real commit count requires per-repo API calls which is rate-limit intensive.
    // We sum up watchers as a rough proxy.

    return {
      name: repo.name,
      url: repo.html_url,
      homepage: repo.homepage || '',
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      language: repo.language || 'Unknown',
      languages: [],
      dependencies: [],
      filePaths: [],
      defaultBranch: repo.default_branch || 'main',
      description: repo.description || '',
    };
  });

  // Deep fetch languages for all repos
  await Promise.all(parsedRepos.map(async (repo: any) => {
    const languageBytes = await GithubService.getRepoLanguages(token, profile.login, repo.name);
    repo.languages = Object.keys(languageBytes);

    for (const [lang, bytes] of Object.entries(languageBytes)) {
      topLanguages[lang] = (topLanguages[lang] || 0) + (bytes as number);
    }

    if (repo.language !== 'Unknown' && !repo.languages.includes(repo.language)) {
      repo.languages.push(repo.language);
    }
  }));

  // Fetch dependencies and file trees for the top 30 repos
  const topRepos = parsedRepos.slice(0, 30);
  await Promise.all(topRepos.map(async (repo: any) => {
    repo.dependencies = [];
    try {
      if (repo.languages.includes('JavaScript') || repo.languages.includes('TypeScript')) {
        const pkgJson = await GithubService.getRepoFileContent(token, profile.login, repo.name, 'package.json');
        if (pkgJson) {
          const pkg = typeof pkgJson === 'string' ? JSON.parse(pkgJson) : pkgJson;
          const deps = Object.keys(pkg.dependencies || {});
          const devDeps = Object.keys(pkg.devDependencies || {});
          repo.dependencies.push(...deps, ...devDeps);
        }
      }

      if (repo.languages.includes('Python')) {
        const reqTxt = await GithubService.getRepoFileContent(token, profile.login, repo.name, 'requirements.txt');
        if (reqTxt && typeof reqTxt === 'string') {
          const deps = reqTxt.split('\n')
            .map(line => line.split('==')[0].split('>=')[0].trim())
            .filter(line => line && !line.startsWith('#'));
          repo.dependencies.push(...deps);
        }
      }

      // Fetch full repo file tree for architectural inference
      repo.filePaths = await GithubService.getRepoTree(token, profile.login, repo.name, repo.defaultBranch);
    } catch (err) {
      console.error(`[githubController] Error parsing ${repo.name}:`, err);
    }
  }));

  // Compute commits estimate: sum of repo-level commit contributions
  // GitHub API does not provide a total commit count without GraphQL.
  // Use the contributor stats endpoint for repos owned by the user as a best-effort estimate.
  const ownedRepos = topRepos.filter((r: any) => r.forks === 0 || r.stars > 0).slice(0, 10);
  for (const repo of ownedRepos) {
    try {
      const commitCount = await GithubService.getRepoCommitCount(token, profile.login, repo.name);
      totalCommits += commitCount;
    } catch {
      // Non-critical — skip on error
    }
  }

  let stats = await GithubStats.findOne({ user: userId });
  if (!stats) {
    stats = new GithubStats({ user: userId });
  }

  stats.profile = {
    username: profile.login,
    avatarUrl: profile.avatar_url,
    bio: profile.bio || '',
    followers: profile.followers || 0,
    following: profile.following || 0,
    publicRepos: profile.public_repos || 0,
  };
  stats.repositories = parsedRepos;
  stats.aggregatedStats = {
    totalCommits,
    totalPRs: prCount,
    totalIssues: issueCount,
    totalStars: totalStars,
  };
  stats.topLanguages = topLanguages;
  stats.lastSyncedAt = new Date();

  await stats.save();

  // Invalidate intelligence and graph caches for fresh rebuild
  await KnowledgeGraph.findOneAndDelete({ user: userId });
  await DeveloperIntelligence.findOneAndDelete({ user: userId });
}
