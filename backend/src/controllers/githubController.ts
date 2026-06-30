import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { GithubService } from '../services/githubService';
import IntegrationProfile from '../models/IntegrationProfile';
import { GithubStats } from '../models/GithubStats';
import KnowledgeGraph from '../models/KnowledgeGraph';
import DeveloperIntelligence from '../models/DeveloperIntelligence';

// Extend Express Request to include user (from auth middleware if needed)
interface AuthRequest extends Request {
  user?: { id: string };
}

export const getAuthUrl = (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'GitHub Client ID is missing.' });
    }

    // Sign the userId in the state parameter to prevent CSRF and identify the user on callback
    const state = jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', { expiresIn: '10m' });
    
    // Scopes for reading repos and profile
    const scope = 'repo read:user';
    const redirectUri = `${req.protocol}://${req.get('host')}/api/github/callback`;
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
    
    res.json({ url: authUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const callback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).send('Code and state are required.');
    }

    // Verify state to get userId
    let decoded: any;
    try {
      decoded = jwt.verify(state as string, process.env.JWT_SECRET || 'secret');
    } catch (err) {
      return res.status(400).send('Invalid or expired state parameter.');
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

    // Trigger an initial sync in the background
    syncGithubDataForUser(userId, token).catch(err => console.error('Background sync failed:', err));

    // Redirect to frontend dashboard
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:6501';
    res.redirect(`${frontendUrl}?github_connected=true`);
  } catch (error: any) {
    console.error('GitHub Callback Error:', error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?github_error=true`);
  }
};

export const disconnect = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Remove from IntegrationProfile
    await IntegrationProfile.findOneAndUpdate({ user: userId }, { $unset: { githubToken: "", githubUsername: "" } });
    
    // Clear stats
    await GithubStats.findOneAndDelete({ user: userId });

    res.json({ message: 'GitHub disconnected successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const stats = await GithubStats.findOne({ user: userId });
    if (!stats) {
      return res.json(null);
    }

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const sync = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const integration = await IntegrationProfile.findOne({ user: userId });
    if (!integration || !integration.githubToken) {
      return res.status(400).json({ error: 'GitHub is not connected.' });
    }

    await syncGithubDataForUser(userId, integration.githubToken);
    
    const stats = await GithubStats.findOne({ user: userId });
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Helper function to sync data from GitHub to MongoDB
async function syncGithubDataForUser(userId: string, token: string) {
  try {
    const profile = await GithubService.getUserProfile(token);
    const repos = await GithubService.getUserRepositories(token);
    const prCount = await GithubService.getUserPullRequestsCount(token, profile.login);
    const issueCount = await GithubService.getUserIssuesCount(token, profile.login);

    let totalStars = 0;
    const topLanguages: Record<string, number> = {};
    const parsedRepos = repos.map((repo: any) => {
      totalStars += repo.stargazers_count;

      return {
        name: repo.name,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language || 'Unknown',
        languages: [], // Will populate below
        dependencies: [], // Will populate below
        filePaths: [], // Will populate below
        defaultBranch: repo.default_branch || 'main',
        description: repo.description || '',
      };
    });

    // Deep fetch languages for all repositories to get byte counts
    await Promise.all(parsedRepos.map(async (repo: any) => {
      const languageBytes = await GithubService.getRepoLanguages(token, profile.login, repo.name);
      repo.languages = Object.keys(languageBytes);
      
      // Accumulate bytes for developer scoring
      for (const [lang, bytes] of Object.entries(languageBytes)) {
        topLanguages[lang] = (topLanguages[lang] || 0) + (bytes as number);
      }

      // Ensure primary language is in the array if API missed it
      if (repo.language !== 'Unknown' && !repo.languages.includes(repo.language)) {
        repo.languages.push(repo.language);
      }
    }));

    // Fetch dependencies for the top 30 repos to avoid rate limits
    const topRepos = parsedRepos.slice(0, 30);
    await Promise.all(topRepos.map(async (repo: any) => {
      repo.dependencies = [];
      try {
        // Try package.json for JS/TS projects
        if (repo.languages.includes('JavaScript') || repo.languages.includes('TypeScript')) {
          const pkgJson = await GithubService.getRepoFileContent(token, profile.login, repo.name, 'package.json');
          if (pkgJson) {
            const pkg = typeof pkgJson === 'string' ? JSON.parse(pkgJson) : pkgJson;
            const deps = Object.keys(pkg.dependencies || {});
            const devDeps = Object.keys(pkg.devDependencies || {});
            repo.dependencies.push(...deps, ...devDeps);
          }
        }
        
        // Try requirements.txt for Python projects
        if (repo.languages.includes('Python')) {
          const reqTxt = await GithubService.getRepoFileContent(token, profile.login, repo.name, 'requirements.txt');
          if (reqTxt && typeof reqTxt === 'string') {
            const deps = reqTxt.split('\n')
              .map(line => line.split('==')[0].trim())
              .filter(line => line && !line.startsWith('#'));
            repo.dependencies.push(...deps);
          }
        }
        
        // Fetch full repository file tree for architectural inference
        repo.filePaths = await GithubService.getRepoTree(token, profile.login, repo.name, repo.defaultBranch);

      } catch (err) {
        console.error(`Error parsing dependencies for ${repo.name}:`, err);
      }
    }));

    let stats = await GithubStats.findOne({ user: userId });
    if (!stats) {
      stats = new GithubStats({ user: userId });
    }

    stats.profile = {
      username: profile.login,
      avatarUrl: profile.avatar_url,
      bio: profile.bio || '',
      followers: profile.followers,
      following: profile.following,
      publicRepos: profile.public_repos,
    };
    stats.repositories = parsedRepos;
    stats.aggregatedStats = {
      totalCommits: 0, // Difficult to get without GraphQL, defaulting to 0
      totalPRs: prCount,
      totalIssues: issueCount,
      totalStars: totalStars,
    };
    stats.topLanguages = topLanguages;
    stats.lastSyncedAt = new Date();

    await stats.save();

    // Invalidate caches so they rebuild on next request
    await KnowledgeGraph.findOneAndDelete({ user: userId });
    await DeveloperIntelligence.findOneAndDelete({ user: userId });
  } catch (error) {
    console.error('Failed to sync GitHub data:', error);
    throw error;
  }
}
