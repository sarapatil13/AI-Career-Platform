// Controlled Mock Interview catalog.
// Interview types, difficulties, roles and HR behavioral topics are authored
// facts. The fallback question pool is only used when Gemini is unavailable,
// so an interview can still run offline without fabricated content.

const companyCatalog = require("./companyCatalog");

const types = ["Technical", "HR"];
const difficulties = ["Easy", "Medium", "Hard"];

// Union of catalog roles plus a generic fallback role.
const roles = [
  "Software Engineer",
  "Software Engineer Intern",
  "System Engineer",
  "Cloud Support Engineer",
  "General",
];

const hrTopics = [
  "Introduction",
  "Projects",
  "Teamwork",
  "Conflict Resolution",
  "Ownership",
  "Career Goals",
  "Strengths",
  "Weaknesses",
];

const companies = companyCatalog.companies.map((entry) => entry.company);

const isValidType = (value) => types.includes(value);
const isValidDifficulty = (value) => difficulties.includes(value);
const isValidRole = (value) =>
  roles.some((role) => role.toLowerCase() === String(value || "").trim().toLowerCase());
const isValidCompany = (value) =>
  companies.some(
    (company) => company.toLowerCase() === String(value || "").trim().toLowerCase()
  );

// Deterministic fallback questions, only used when Gemini fails. Keyed by topic.
const technicalFallbackQuestions = [
  {
    topic: "Arrays",
    difficulty: "Medium",
    question: "How would you reverse an array in place? Explain the approach and its time and space complexity.",
    reason: "Arrays are a foundational required topic.",
  },
  {
    topic: "Strings",
    difficulty: "Medium",
    question: "Given two strings, how would you check whether one is an anagram of the other? Describe the approach and complexity.",
    reason: "String manipulation is a frequently asked required topic.",
  },
  {
    topic: "Linked List",
    difficulty: "Medium",
    question: "How would you detect a cycle in a singly linked list? Explain the algorithm you would use.",
    reason: "Linked List is a common interview topic.",
  },
  {
    topic: "Trees",
    difficulty: "Medium",
    question: "Explain in-order traversal of a binary tree and describe a problem you would solve with it.",
    reason: "Trees are a core data structure in technical interviews.",
  },
  {
    topic: "Graphs",
    difficulty: "Hard",
    question: "How would you find the shortest path in an unweighted graph? Describe the algorithm and its time complexity.",
    reason: "Graphs are a high-priority gap for many roles.",
  },
  {
    topic: "DP",
    difficulty: "Hard",
    question: "Using an example such as the Fibonacci sequence, explain how you would break a problem down with dynamic programming.",
    reason: "Dynamic programming is a high-priority topic.",
  },
  {
    topic: "Heap",
    difficulty: "Medium",
    question: "Explain how a min-heap can be used to find the k smallest elements efficiently.",
    reason: "Heaps are a preferred DSA topic.",
  },
  {
    topic: "Trie",
    difficulty: "Medium",
    question: "When would you choose a trie over a hash map for string-based lookups? Justify your answer.",
    reason: "Tries are a preferred DSA topic.",
  },
  {
    topic: "Operating Systems",
    difficulty: "Medium",
    question: "Explain the difference between a process and a thread, and when you would choose each.",
    reason: "Operating Systems is a core CS gap.",
  },
  {
    topic: "Computer Networks",
    difficulty: "Medium",
    question: "Describe what happens at the network level when a browser loads a web page.",
    reason: "Computer Networks is a core CS gap.",
  },
  {
    topic: "Databases",
    difficulty: "Medium",
    question: "Explain the difference between a database index and a full table scan, and when an index helps.",
    reason: "Databases is a core CS gap.",
  },
  {
    topic: "System Design",
    difficulty: "Medium",
    question: "How would you design a URL shortener? Describe the main components and trade-offs.",
    reason: "System design is important for software roles.",
  },
];

const hrFallbackQuestions = [
  {
    topic: "Introduction",
    difficulty: null,
    question: "Tell me about yourself and why you are interested in this role.",
    reason: "Opens every HR interview.",
  },
  {
    topic: "Projects",
    difficulty: null,
    question: "Describe a project you are most proud of and what your specific contribution was.",
    reason: "Explores practical project experience.",
  },
  {
    topic: "Teamwork",
    difficulty: null,
    question: "Describe a time you worked with a difficult teammate and how you handled it.",
    reason: "Assesses collaboration skills.",
  },
  {
    topic: "Conflict Resolution",
    difficulty: null,
    question: "Tell me about a time you disagreed with a decision and how you resolved it.",
    reason: "Assesses conflict management.",
  },
  {
    topic: "Ownership",
    difficulty: null,
    question: "Describe a situation where you took ownership of a task beyond your assigned responsibilities.",
    reason: "Assesses accountability and initiative.",
  },
  {
    topic: "Career Goals",
    difficulty: null,
    question: "Where do you see yourself in the next few years, and how does this role help you get there?",
    reason: "Checks alignment with the role.",
  },
  {
    topic: "Strengths",
    difficulty: null,
    question: "What are your strongest skills, and how do they make you a good fit for this role?",
    reason: "Explores self-awareness and fit.",
  },
  {
    topic: "Weaknesses",
    difficulty: null,
    question: "What is a weakness you are working to improve, and what steps have you taken?",
    reason: "Assesses honesty and growth mindset.",
  },
];

module.exports = {
  types,
  difficulties,
  roles,
  hrTopics,
  companies,
  technicalFallbackQuestions,
  hrFallbackQuestions,
  isValidType,
  isValidDifficulty,
  isValidRole,
  isValidCompany,
  version: 1,
};
