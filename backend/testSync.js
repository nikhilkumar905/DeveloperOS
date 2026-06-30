const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect('mongodb+srv://developer:nikhil2857@cluster0.hbnaqbi.mongodb.net/personalos?retryWrites=true&w=majority&appName=Cluster0')
.then(async () => {
  const IntegrationProfile = require('./dist/models/IntegrationProfile').default;
  const ip = await IntegrationProfile.findOne({ githubToken: { $exists: true } });
  
  if (!ip) {
    console.log('No token');
    process.exit(1);
  }
  
  const token = ip.githubToken;
  const userId = ip.user;
  
  const GithubService = require('./dist/services/githubService').GithubService;
  const GithubStats = require('./dist/models/GithubStats').GithubStats;
  const KnowledgeGraph = require('./dist/models/KnowledgeGraph').default;
  const DeveloperIntelligence = require('./dist/models/DeveloperIntelligence').default;
  
  try {
    const profile = await GithubService.getUserProfile(token);
    const repos = await GithubService.getUserRepositories(token);
    const prCount = await GithubService.getUserPullRequestsCount(token, profile.login);
    const issueCount = await GithubService.getUserIssuesCount(token, profile.login);

    let totalStars = 0;
    const topLanguages = {};
    const parsedRepos = repos.map(repo => {
      totalStars += repo.stargazers_count;
      return {
        name: repo.name,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language || 'Unknown',
        languages: [],
        dependencies: [],
        filePaths: [],
        defaultBranch: repo.default_branch || 'main',
        description: repo.description || '',
      };
    });

    console.log('Repos to fetch:', parsedRepos.length);

    await Promise.all(parsedRepos.map(async repo => {
      const languageBytes = await GithubService.getRepoLanguages(token, profile.login, repo.name);
      repo.languages = Object.keys(languageBytes);
      for (const [lang, bytes] of Object.entries(languageBytes)) {
        topLanguages[lang] = (topLanguages[lang] || 0) + bytes;
      }
      if (repo.language !== 'Unknown' && !repo.languages.includes(repo.language)) {
        repo.languages.push(repo.language);
      }
    }));

    console.log('Languages fetched. Fetching trees...');

    const topRepos = parsedRepos.slice(0, 30);
    await Promise.all(topRepos.map(async repo => {
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
              .map(line => line.split('==')[0].trim())
              .filter(line => line && !line.startsWith('#'));
            repo.dependencies.push(...deps);
          }
        }
        
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
      totalCommits: 0,
      totalPRs: prCount,
      totalIssues: issueCount,
      totalStars: totalStars,
    };
    stats.topLanguages = topLanguages;
    stats.lastSyncedAt = new Date();

    console.log('Saving to DB...');
    await stats.save();
    console.log('Saved to DB successfully.');
    
    // Check what was saved
    const saved = await GithubStats.findOne({ user: userId }).lean();
    console.log('Saved paths length:', saved.repositories[0].filePaths.length);
    console.log('Saved deps length:', saved.repositories[0].dependencies.length);

    await KnowledgeGraph.findOneAndDelete({ user: userId });
    if (DeveloperIntelligence) {
        await DeveloperIntelligence.findOneAndDelete({ user: userId });
    }
    process.exit(0);
  } catch (error) {
    console.error('Failed to sync GitHub data:', error);
    process.exit(1);
  }
});
