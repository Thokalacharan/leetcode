const fs = require('fs');
const path = require('path');

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const cachePath = path.join(__dirname, '..', 'data', 'difficulty_cache.json');

// Loaded cached difficulties and question IDs
let difficultyCache = {};
try {
  if (fs.existsSync(cachePath)) {
    difficultyCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }
} catch (err) {
  console.error("[LeetCode] Error loading difficulty cache:", err);
}

function saveDifficultyCache() {
  try {
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(difficultyCache, null, 2), 'utf8');
  } catch (err) {
    console.error("[LeetCode] Error saving difficulty cache:", err);
  }
}

// Generic helper to query LeetCode GraphQL endpoint
async function queryLeetCode(query, variables) {
  try {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors.map(e => e.message).join(", "));
    }
    return json.data;
  } catch (error) {
    console.error(`[LeetCode] Query failed variables=${JSON.stringify(variables)}:`, error.message);
    throw error;
  }
}

// 1. Fetch User Profile
async function fetchUserProfile(username) {
  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
          userAvatar
          realName
        }
      }
    }
  `;

  try {
    const data = await queryLeetCode(query, { username });
    if (!data || !data.matchedUser) {
      return null;
    }
    return {
      username: data.matchedUser.username,
      realName: data.matchedUser.profile.realName,
      ranking: data.matchedUser.profile.ranking,
      avatar: data.matchedUser.profile.userAvatar
    };
  } catch (error) {
    console.error(`[LeetCode] Failed to fetch profile for user ${username}:`, error.message);
    return null;
  }
}

// 2. Fetch Recent Accepted Submissions
async function fetchRecentAcceptedSubmissions(username, limit = 5) {
  const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  try {
    const data = await queryLeetCode(query, { username, limit });
    if (!data || !data.recentAcSubmissionList) {
      return [];
    }
    return data.recentAcSubmissionList;
  } catch (error) {
    console.error(`[LeetCode] Failed to fetch submissions for user ${username}:`, error.message);
    return [];
  }
}

// 3. Fetch Problem Details (difficulty & questionId) with caching
async function fetchQuestionDetails(titleSlug) {
  if (difficultyCache[titleSlug]) {
    const cachedVal = difficultyCache[titleSlug];
    if (typeof cachedVal === 'object' && cachedVal.questionId && cachedVal.questionId !== "Unknown") {
      return cachedVal;
    }
  }

  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        difficulty
      }
    }
  `;

  try {
    const data = await queryLeetCode(query, { titleSlug });
    if (data && data.question) {
      const details = {
        questionId: data.question.questionId || "Unknown",
        difficulty: data.question.difficulty || "Unknown"
      };
      difficultyCache[titleSlug] = details;
      saveDifficultyCache();
      return details;
    }
    return { questionId: "Unknown", difficulty: "Unknown" };
  } catch (error) {
    console.error(`[LeetCode] Failed to fetch details for slug ${titleSlug}:`, error.message);
    return { questionId: "Unknown", difficulty: "Unknown" };
  }
}

module.exports = {
  fetchUserProfile,
  fetchRecentAcceptedSubmissions,
  fetchQuestionDetails
};
