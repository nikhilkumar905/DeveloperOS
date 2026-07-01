import axios from 'axios';

const GITHUB_API_URL = 'https://api.github.com';

const githubHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github.v3+json',
});

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
      { client_id: clientId, client_secret: clientSecret, code },
      { headers: { Accept: 'application/json' } }
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
      headers: githubHeaders(token),
    });
    return response.data;
  }

  /**
   * Fetches user repositories (up to 100, sorted by last updated)
   */
  static async getUserRepositories(token: string) {
    const response = await axios.get(
      `${GITHUB_API_URL}/user/repos?per_page=100&sort=updated&affiliation=owner`,
      { headers: githubHeaders(token) }
    );
    return response.data;
  }

  /**
   * Fetches languages used in a repository
   */
  static async getRepoLanguages(token: string, owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const response = await axios.get(
        `${GITHUB_API_URL}/repos/${owner}/${repo}/languages`,
        { headers: githubHeaders(token) }
      );
      return response.data;
    } catch (error) {
      return {};
    }
  }

  /**
   * Fetches raw file content from a repository
   */
  static async getRepoFileContent(
    token: string, owner: string, repo: string, path: string
  ): Promise<string | null> {
    try {
      const response = await axios.get(
        `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`,
        { headers: { ...githubHeaders(token), Accept: 'application/vnd.github.v3.raw' } }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      return null;
    }
  }

  /**
   * Fetches all file paths in a repository (git tree)
   */
  static async getRepoTree(
    token: string, owner: string, repo: string, defaultBranch: string
  ): Promise<string[]> {
    try {
      const response = await axios.get(
        `${GITHUB_API_URL}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers: githubHeaders(token) }
      );
      if (response.data?.tree) {
        return response.data.tree
          .filter((item: any) => item.type === 'blob')
          .map((item: any) => item.path as string);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Gets the commit count for a repository owned by the given user.
   * Uses the contributors API which is lighter than paginating commits.
   */
  static async getRepoCommitCount(token: string, owner: string, repo: string): Promise<number> {
    try {
      // GitHub returns 1 item per page; check last page number from Link header
      const response = await axios.get(
        `${GITHUB_API_URL}/repos/${owner}/${repo}/commits?author=${owner}&per_page=1`,
        { headers: githubHeaders(token) }
      );
      const linkHeader: string = response.headers['link'] || '';
      const match = linkHeader.match(/page=(\d+)>;\s*rel="last"/);
      if (match) return parseInt(match[1], 10);
      // If no "last" page, there's exactly 1 page of commits (or 0)
      return Array.isArray(response.data) ? response.data.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Counts total PRs created by the user
   */
  static async getUserPullRequestsCount(token: string, username: string): Promise<number> {
    try {
      const response = await axios.get(
        `${GITHUB_API_URL}/search/issues?q=author:${username}+type:pr`,
        { headers: githubHeaders(token) }
      );
      return response.data.total_count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Counts total issues created by the user
   */
  static async getUserIssuesCount(token: string, username: string): Promise<number> {
    try {
      const response = await axios.get(
        `${GITHUB_API_URL}/search/issues?q=author:${username}+type:issue`,
        { headers: githubHeaders(token) }
      );
      return response.data.total_count || 0;
    } catch {
      return 0;
    }
  }
}
