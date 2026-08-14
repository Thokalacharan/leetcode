const leetcode = require('./leetcode');

// Popular curated LeetCode questions database for instant fallback lookup
const curatedProblems = [
  { id: "1", title: "Two Sum", slug: "two-sum", difficulty: "Easy", topic: "Array, Hash Table" },
  { id: "2", title: "Add Two Numbers", slug: "add-two-numbers", difficulty: "Medium", topic: "Linked List, Math" },
  { id: "3", title: "Longest Substring Without Repeating Characters", slug: "longest-substring-without-repeating-characters", difficulty: "Medium", topic: "Sliding Window, String" },
  { id: "4", title: "Median of Two Sorted Arrays", slug: "median-of-two-sorted-arrays", difficulty: "Hard", topic: "Binary Search, Divide and Conquer" },
  { id: "5", title: "Longest Palindromic Substring", slug: "longest-palindromic-substring", difficulty: "Medium", topic: "Dynamic Programming, String" },
  { id: "11", title: "Container With Most Water", slug: "container-with-most-water", difficulty: "Medium", topic: "Two Pointers, Array" },
  { id: "15", title: "3Sum", slug: "3sum", difficulty: "Medium", topic: "Two Pointers, Sorting" },
  { id: "20", title: "Valid Parentheses", slug: "valid-parentheses", difficulty: "Easy", topic: "Stack, String" },
  { id: "21", title: "Merge Two Sorted Lists", slug: "merge-two-sorted-lists", difficulty: "Easy", topic: "Linked List, Recursion" },
  { id: "23", title: "Merge k Sorted Lists", slug: "merge-k-sorted-lists", difficulty: "Hard", topic: "Heap (Priority Queue), Linked List" },
  { id: "33", title: "Search in Rotated Sorted Array", slug: "search-in-rotated-sorted-array", difficulty: "Medium", topic: "Binary Search, Array" },
  { id: "42", title: "Trapping Rain Water", slug: "trapping-rain-water", difficulty: "Hard", topic: "Two Pointers, Stack, DP" },
  { id: "46", title: "Permutations", slug: "permutations", difficulty: "Medium", topic: "Backtracking" },
  { id: "48", title: "Rotate Image", slug: "rotate-image", difficulty: "Medium", topic: "Array, Matrix" },
  { id: "49", title: "Group Anagrams", slug: "group-anagrams", difficulty: "Medium", topic: "Hash Table, String" },
  { id: "53", title: "Maximum Subarray", slug: "maximum-subarray", difficulty: "Medium", topic: "Array, Dynamic Programming" },
  { id: "55", title: "Jump Game", slug: "jump-game", difficulty: "Medium", topic: "Greedy, Dynamic Programming" },
  { id: "56", title: "Merge Intervals", slug: "merge-intervals", difficulty: "Medium", topic: "Array, Sorting" },
  { id: "70", title: "Climbing Stairs", slug: "climbing-stairs", difficulty: "Easy", topic: "Dynamic Programming" },
  { id: "72", title: "Edit Distance", slug: "edit-distance", difficulty: "Medium", topic: "Dynamic Programming, String" },
  { id: "76", title: "Minimum Window Substring", slug: "minimum-window-substring", difficulty: "Hard", topic: "Sliding Window, Hash Table" },
  { id: "78", title: "Subsets", slug: "subsets", difficulty: "Medium", topic: "Backtracking, Bit Manipulation" },
  { id: "79", title: "Word Search", slug: "word-search", difficulty: "Medium", topic: "Backtracking, Matrix" },
  { id: "98", title: "Validate Binary Search Tree", slug: "validate-binary-search-tree", difficulty: "Medium", topic: "Tree, Depth-First Search" },
  { id: "102", title: "Binary Tree Level Order Traversal", slug: "binary-tree-level-order-traversal", difficulty: "Medium", topic: "Tree, BFS" },
  { id: "104", title: "Maximum Depth of Binary Tree", slug: "maximum-depth-of-binary-tree", difficulty: "Easy", topic: "Tree, DFS" },
  { id: "121", title: "Best Time to Buy and Sell Stock", slug: "best-time-to-buy-and-sell-stock", difficulty: "Easy", topic: "Array, Dynamic Programming" },
  { id: "124", title: "Binary Tree Maximum Path Sum", slug: "binary-tree-maximum-path-sum", difficulty: "Hard", topic: "Tree, DFS" },
  { id: "128", title: "Longest Consecutive Sequence", slug: "longest-consecutive-sequence", difficulty: "Medium", topic: "Hash Table, Union Find" },
  { id: "133", title: "Clone Graph", slug: "clone-graph", difficulty: "Medium", topic: "Graph, BFS, DFS" },
  { id: "139", title: "Word Break", slug: "word-break", difficulty: "Medium", topic: "Dynamic Programming, Trie" },
  { id: "141", title: "Linked List Cycle", slug: "linked-list-cycle", difficulty: "Easy", topic: "Linked List, Two Pointers" },
  { id: "146", title: "LRU Cache", slug: "lru-cache", difficulty: "Medium", topic: "Hash Table, Linked List, Design" },
  { id: "152", title: "Maximum Product Subarray", slug: "maximum-product-subarray", difficulty: "Medium", topic: "Array, Dynamic Programming" },
  { id: "198", title: "House Robber", slug: "house-robber", difficulty: "Medium", topic: "Dynamic Programming" },
  { id: "200", title: "Number of Islands", slug: "number-of-islands", difficulty: "Medium", topic: "DFS, BFS, Union Find" },
  { id: "206", title: "Reverse Linked List", slug: "reverse-linked-list", difficulty: "Easy", topic: "Linked List, Recursion" },
  { id: "207", title: "Course Schedule", slug: "course-schedule", difficulty: "Medium", topic: "Graph, Topological Sort" },
  { id: "208", title: "Implement Trie (Prefix Tree)", slug: "implement-trie-prefix-tree", difficulty: "Medium", topic: "Trie, Design" },
  { id: "215", title: "Kth Largest Element in an Array", slug: "kth-largest-element-in-an-array", difficulty: "Medium", topic: "Heap, Quickselect" },
  { id: "226", title: "Invert Binary Tree", slug: "invert-binary-tree", difficulty: "Easy", topic: "Tree, DFS" },
  { id: "230", title: "Kth Smallest Element in a BST", slug: "kth-smallest-element-in-a-bst", difficulty: "Medium", topic: "Tree, DFS" },
  { id: "238", title: "Product of Array Except Self", slug: "product-of-array-except-self", difficulty: "Medium", topic: "Array, Prefix Sum" },
  { id: "295", title: "Find Median from Data Stream", slug: "find-median-from-data-stream", difficulty: "Hard", topic: "Heap, Design" },
  { id: "300", title: "Longest Increasing Subsequence", slug: "longest-increasing-subsequence", difficulty: "Medium", topic: "Dynamic Programming, Binary Search" },
  { id: "322", title: "Coin Change", slug: "coin-change", difficulty: "Medium", topic: "Dynamic Programming, BFS" },
  { id: "347", title: "Top K Frequent Elements", slug: "top-k-frequent-elements", difficulty: "Medium", topic: "Hash Table, Heap, Bucket Sort" },
  { id: "416", title: "Partition Equal Subset Sum", slug: "partition-equal-subset-sum", difficulty: "Medium", topic: "Dynamic Programming" },
  { id: "435", title: "Non-overlapping Intervals", slug: "non-overlapping-intervals", difficulty: "Medium", topic: "Greedy, Sorting" },
  { id: "704", title: "Binary Search", slug: "binary-search", difficulty: "Easy", topic: "Binary Search, Array" }
];

// Supported Gemini models ordered by speed, accuracy & reliability
const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-pro-latest'
];

// Helper to ask AI or run local semantic match
async function answerProblemQuery(userPrompt, apiKey = null) {
  const cleanPrompt = (userPrompt || "").trim();
  if (!cleanPrompt) {
    throw new Error("Query cannot be empty.");
  }

  const geminiKey = apiKey || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expert LeetCode Assistant.
User question: "${cleanPrompt}"

Identify the relevant LeetCode questions. Always provide:
1. Exact LeetCode Question Number (e.g. #1, #207, #15)
2. Problem Title and Difficulty tag [Easy/Medium/Hard]
3. Clickable markdown link in the format [Problem Title](https://leetcode.com/problems/slug-name/)
4. Brief 1-line strategy/hint for each problem.

Keep the response concise, formatted with clear bullet points.`
              }]
            }]
          })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          return {
            source: `gemini (${model})`,
            reply: data.candidates[0].content.parts[0].text
          };
        }
      } catch (apiError) {
        console.warn(`[AI Assistant] Model ${model} failed, trying next model:`, apiError.message);
      }
    }
  }

  // 2. Intelligent Catalog Matcher fallback
  const queryLower = cleanPrompt.toLowerCase();
  const matches = curatedProblems.filter(p => {
    return p.title.toLowerCase().includes(queryLower) ||
      p.topic.toLowerCase().includes(queryLower) ||
      p.slug.toLowerCase().includes(queryLower) ||
      p.id === queryLower.replace('#', '');
  });

  if (matches.length > 0) {
    const listMarkdown = matches.slice(0, 6).map(p => 
      `- **#${p.id} [${p.title}](https://leetcode.com/problems/${p.slug}/)** \`[${p.difficulty}]\` — *${p.topic}*\n  👉 Link: https://leetcode.com/problems/${p.slug}/`
    ).join("\n\n");

    return {
      source: "catalog",
      reply: `Here are the matching LeetCode problems for **"${cleanPrompt}"**:\n\n${listMarkdown}\n\n💡 *Click any problem link above to start coding!*`
    };
  }

  const randomSample = curatedProblems.sort(() => 0.5 - Math.random()).slice(0, 4);
  const sampleMarkdown = randomSample.map(p => 
    `- **#${p.id} [${p.title}](https://leetcode.com/problems/${p.slug}/)** \`[${p.difficulty}]\` — *${p.topic}*`
  ).join("\n");

  return {
    source: "catalog",
    reply: `I searched the LeetCode catalog for **"${cleanPrompt}"**.\n\nHere are top recommended practice problems:\n\n${sampleMarkdown}\n\n💡 *Tip: Click on any link to start solving on LeetCode!*`
  };
}

module.exports = {
  answerProblemQuery
};
