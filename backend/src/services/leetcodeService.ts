import axios from 'axios';

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

export const fetchLeetCodeProfile = async (username: string) => {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        badges {
          id
          name
        }
      }
      userContestRanking(username: $username) {
        rating
      }
      recentAcSubmissionList(username: $username, limit: 5) {
        title
        titleSlug
        timestamp
      }
    }
  `;

  try {
    const response = await axios.post(
      LEETCODE_API_ENDPOINT,
      {
        query,
        variables: { username },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
        },
      }
    );

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const data = response.data.data;
    
    if (!data.matchedUser) {
      throw new Error('User not found on LeetCode');
    }

    const submitStats = data.matchedUser.submitStats.acSubmissionNum;
    const statsMap: Record<string, any> = {};
    submitStats.forEach((stat: any) => {
      statsMap[stat.difficulty] = stat;
    });

    const solvedTotal = statsMap['All']?.count || 0;
    const solvedEasy = statsMap['Easy']?.count || 0;
    const solvedMedium = statsMap['Medium']?.count || 0;
    const solvedHard = statsMap['Hard']?.count || 0;
    const submissions = statsMap['All']?.submissions || 0;

    const contestRating = data.userContestRanking?.rating ? Math.round(data.userContestRanking.rating) : 0;
    const badges = data.matchedUser.badges?.length || 0;
    
    // Default streak to 0 
    const streak = 0; 

    const recentActivity = (data.recentAcSubmissionList || []).map((sub: any) => ({
      title: sub.title,
      date: new Date(parseInt(sub.timestamp) * 1000).toISOString(),
      difficulty: 'Unknown',
    }));

    return {
      solvedTotal,
      solvedEasy,
      solvedMedium,
      solvedHard,
      submissions,
      contestRating,
      badges,
      streak,
      recentActivity,
    };
  } catch (error: any) {
    console.error('Error fetching LeetCode profile:', error.message);
    throw new Error('Failed to fetch LeetCode data');
  }
};
