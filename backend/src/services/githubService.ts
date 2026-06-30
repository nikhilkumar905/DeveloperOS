import axios from 'axios';

const GITHUB_API_URL = 'https://api.github.com';

export class GithubService {
  /**
   * Exchanges the OAuth code for an access token
   */
  static async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth configuration is missing.');
    }

    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error_description || 'Failed to exchange code for token');
    }

    return response.data.access_token;
  }

  /**
   * Fetches the authenticated user's profile
   */
  static async getUserProfile(token: string) {
    const response = await axios.get(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return response.data;
  }

  /**
   * Fetches the user's public and private repositories (depending on token scope)
   */
  static async getUserRepositories(token: string) {
    // Fetch up to 100 repositories
    const response = await axios.get(`${GITHUB_API_URL}/user/repos?per_page=100&sort=updated`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return response.data;
  }

  /**
   * Fetches all languages used in a specific repository
   */
  static async getRepoLanguages(token: string, owner: string, repo: string) {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/languages`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching languages for ${owner}/${repo}:`, error);
      return {};
    }
  }

  /**
   * Fetches file content from a repository
   */
  static async getRepoFileContent(token: string, owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3.raw',
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null; // File not found
      console.error(`Error fetching ${path} for ${owner}/${repo}:`, error.message);
      return null;
    }
  }

  /**
   * Fetches the file tree for a repository
   */
  static async getRepoTree(token: string, owner: string, repo: string, defaultBranch: string): Promise<string[]> {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (response.data && response.data.tree) {
        return response.data.tree.filter((item: any) => item.type === 'blob').map((item: any) => item.path);
      }
      return [];
    } catch (error: any) {
      console.error(`Error fetching tree for ${owner}/${repo}:`, error.message);
      return [];
    }
  }

  /**
   * Counts total PRs created by the user
   */
  static async getUserPullRequestsCount(token: string, username: string): Promise<number> {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/search/issues?q=author:${username}+type:pr`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      return response.data.total_count || 0;
    } catch (error) {
      console.error('Error fetching PR count:', error);
      return 0;
    }
  }

  /**
   * Counts total issues created by the user
   */
  static async getUserIssuesCount(token: string, username: string): Promise<number> {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/search/issues?q=author:${username}+type:issue`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      return response.data.total_count || 0;
    } catch (error) {
      console.error('Error fetching issue count:', error);
      return 0;
    }
  }
}
