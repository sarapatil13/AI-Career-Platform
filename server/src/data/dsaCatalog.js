// Curated, controlled DSA catalog.
// Topics define the readiness formula inputs: required/preferred coverage,
// expected difficulty, priority (for gap ordering) and recommended practice volume.
// Questions are a small curated anchor set with real, verified links.
// No scraping, no fabricated content.

const topics = [
  { name: "Arrays", tier: "required", priority: "High", expectedDifficulty: "Medium", recommendedQuestions: 8 },
  { name: "Strings", tier: "required", priority: "High", expectedDifficulty: "Medium", recommendedQuestions: 6 },
  { name: "Linked List", tier: "preferred", priority: "Medium", expectedDifficulty: "Medium", recommendedQuestions: 4 },
  { name: "Trees", tier: "required", priority: "High", expectedDifficulty: "Medium", recommendedQuestions: 6 },
  { name: "Graphs", tier: "required", priority: "High", expectedDifficulty: "Hard", recommendedQuestions: 5 },
  { name: "DP", tier: "required", priority: "High", expectedDifficulty: "Hard", recommendedQuestions: 5 },
  { name: "Heap", tier: "preferred", priority: "Medium", expectedDifficulty: "Medium", recommendedQuestions: 3 },
  { name: "Trie", tier: "preferred", priority: "Low", expectedDifficulty: "Medium", recommendedQuestions: 3 },
];

const questions = [
  {
    id: "1",
    topic: "Arrays",
    difficulty: "Easy",
    title: "Two Sum",
    company: "Lam Research",
    link: "https://leetcode.com/problems/two-sum/",
  },
  {
    id: "2",
    topic: "Arrays",
    difficulty: "Easy",
    title: "Best Time to Buy and Sell Stock",
    company: "Infosys",
    link: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
  },
  {
    id: "3",
    topic: "Graphs",
    difficulty: "Medium",
    title: "Number of Islands",
    company: "Lam Research",
    link: "https://leetcode.com/problems/number-of-islands/",
  },
  {
    id: "4",
    topic: "Trees",
    difficulty: "Medium",
    title: "Binary Tree Level Order Traversal",
    company: "Amazon",
    link: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
  },
  {
    id: "5",
    topic: "DP",
    difficulty: "Hard",
    title: "Edit Distance",
    company: "Google",
    link: "https://leetcode.com/problems/edit-distance/",
  },
];

module.exports = {
  topics,
  questions,
  version: 1,
};
