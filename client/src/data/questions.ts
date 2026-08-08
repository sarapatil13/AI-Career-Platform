export const questions = [
  {
    id: 1,
    company: "Lam Research",
    difficulty: "Easy",
    topic: "Arrays",
    title: "Two Sum",
    link: "https://leetcode.com/problems/two-sum/",
    hint: "Use a HashMap to store visited elements.",
    solution: "Store each number in a HashMap and check if the complement exists."
  },

  {
    id: 2,
    company: "Infosys",
    difficulty: "Easy",
    topic: "Arrays",
    title: "Best Time to Buy and Sell Stock",
    link: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
    hint: "Track the smallest seen value and calculate margin on each pass.",
    solution: "Maintain minPrice and update max profit whenever the current day price is higher than minPrice."
  },

  {
    id: 3,
    company: "Lam Research",
    difficulty: "Medium",
    topic: "Graphs",
    title: "Number of Islands",
    link: "https://leetcode.com/problems/number-of-islands/",
    hint: "Use DFS or BFS.",
    solution: "Traverse every cell and perform DFS whenever you encounter an unvisited land cell."
  },

  {
    id: 4,
    company: "Amazon",
    difficulty: "Medium",
    topic: "Trees",
    title: "Binary Tree Level Order Traversal",
    link: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
    hint: "Think Queue.",
    solution: "Use BFS with a queue."
  },

  {
    id: 5,
    company: "Google",
    difficulty: "Hard",
    topic: "DP",
    title: "Edit Distance",
    link: "https://leetcode.com/problems/edit-distance/",
    hint: "2D DP table.",
    solution: "Use dynamic programming where dp[i][j] stores the minimum operations."
  }
];