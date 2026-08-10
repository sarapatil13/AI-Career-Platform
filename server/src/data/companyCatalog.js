// Controlled Company/role requirements catalog.
// Small and curated. Company requirements are authored facts, never AI-invented.
// DSA topics reference the DSA catalog topics. Resources are a controlled set
// with real, verified URLs only.

const resources = [
  {
    id: "neetcode",
    title: "NeetCode 150",
    website: "NeetCode",
    url: "https://neetcode.io/practice",
    topics: ["Arrays", "Strings", "Trees", "Graphs", "DP", "Linked List", "Heap", "Trie"],
    difficulty: "Medium",
  },
  {
    id: "leetcode",
    title: "LeetCode Problem Set",
    website: "LeetCode",
    url: "https://leetcode.com/problemset/",
    topics: ["All DSA topics"],
    difficulty: "All levels",
  },
  {
    id: "gfg",
    title: "GeeksforGeeks",
    website: "GeeksforGeeks",
    url: "https://www.geeksforgeeks.org",
    topics: ["Algorithms", "Data structures"],
    difficulty: "Beginner",
  },
  {
    id: "system-design-primer",
    title: "The System Design Primer",
    website: "GitHub",
    url: "https://github.com/donnemartin/system-design-primer",
    topics: ["System design", "Scalability"],
    difficulty: "Intermediate",
  },
  {
    id: "cs50",
    title: "CS50x",
    website: "Harvard",
    url: "https://cs50.harvard.edu/x/",
    topics: ["Computer science", "C", "Algorithms"],
    difficulty: "Beginner",
  },
  {
    id: "aws-training",
    title: "AWS Skill Builder",
    website: "Amazon Web Services",
    url: "https://aws.amazon.com/training/",
    topics: ["Cloud", "AWS"],
    difficulty: "Beginner",
  },
  {
    id: "sqlzoo",
    title: "SQLZoo",
    website: "SQLZoo",
    url: "https://sqlzoo.net",
    topics: ["SQL", "Databases"],
    difficulty: "Beginner",
  },
  {
    id: "cppreference",
    title: "cppreference",
    website: "cppreference",
    url: "https://en.cppreference.com",
    topics: ["C", "C++"],
    difficulty: "Reference",
  },
  {
    id: "linux-handbook",
    title: "Linux Handbook",
    website: "Linux Handbook",
    url: "https://www.linuxhandbook.com",
    topics: ["Linux", "Shell scripting"],
    difficulty: "Beginner",
  },
];

const companies = [
  {
    company: "Google",
    roles: [
      {
        role: "Software Engineer",
        requiredSkills: ["Data Structures", "Algorithms", "Problem Solving", "System Design", "Coding"],
        preferredSkills: ["Python", "Java", "C++", "Distributed Systems", "Machine Learning"],
        dsa: {
          requiredTopics: ["Arrays", "Strings", "Trees", "Graphs", "DP"],
          preferredTopics: ["Linked List", "Heap", "Trie"],
          expectedDifficulty: "Hard",
          recommendedVolume: 25,
        },
        coreCS: [
          { topic: "Operating Systems", skillKeywords: ["Operating Systems"] },
          { topic: "Computer Networks", skillKeywords: ["Networking", "Networks", "TCP/IP", "HTTP"] },
          { topic: "Databases", skillKeywords: ["Databases", "SQL", "MongoDB"] },
          { topic: "System Design", skillKeywords: ["System Design", "Distributed Systems", "Architecture"] },
        ],
        resources: ["neetcode", "leetcode", "system-design-primer", "cs50"],
      },
    ],
  },
  {
    company: "Amazon",
    roles: [
      {
        role: "Software Engineer",
        requiredSkills: ["Data Structures", "Algorithms", "Problem Solving", "OOP", "System Design"],
        preferredSkills: ["Java", "Python", "AWS", "SQL", "Distributed Systems"],
        dsa: {
          requiredTopics: ["Arrays", "Strings", "Trees", "Graphs"],
          preferredTopics: ["Linked List", "Heap"],
          expectedDifficulty: "Medium",
          recommendedVolume: 20,
        },
        coreCS: [
          { topic: "Databases", skillKeywords: ["Databases", "SQL", "MongoDB"] },
          { topic: "Operating Systems", skillKeywords: ["Operating Systems"] },
          { topic: "Computer Networks", skillKeywords: ["Networking", "Networks", "TCP/IP", "HTTP"] },
        ],
        resources: ["leetcode", "neetcode", "gfg", "aws-training"],
      },
      {
        role: "Cloud Support Engineer",
        requiredSkills: ["Networking", "Linux", "Databases", "Troubleshooting", "Communication"],
        preferredSkills: ["AWS", "Docker", "Shell Scripting", "Cloud Basics"],
        dsa: {
          requiredTopics: ["Arrays", "Strings"],
          preferredTopics: ["Linked List"],
          expectedDifficulty: "Easy",
          recommendedVolume: 8,
        },
        coreCS: [
          { topic: "Computer Networks", skillKeywords: ["Networking", "Networks", "TCP/IP", "HTTP"] },
          { topic: "Operating Systems", skillKeywords: ["Operating Systems", "Linux"] },
        ],
        resources: ["aws-training", "linux-handbook", "gfg"],
      },
    ],
  },
  {
    company: "Infosys",
    roles: [
      {
        role: "System Engineer",
        requiredSkills: ["Java", "Python", "SQL", "Data Structures", "Communication"],
        preferredSkills: ["Spring Boot", "React", "MongoDB", "Cloud Basics"],
        dsa: {
          requiredTopics: ["Arrays", "Strings"],
          preferredTopics: ["Linked List"],
          expectedDifficulty: "Medium",
          recommendedVolume: 12,
        },
        coreCS: [
          { topic: "Databases", skillKeywords: ["Databases", "SQL", "MongoDB"] },
          { topic: "Operating Systems", skillKeywords: ["Operating Systems"] },
        ],
        resources: ["gfg", "leetcode", "sqlzoo"],
      },
    ],
  },
  {
    company: "Lam Research",
    roles: [
      {
        role: "Software Engineer Intern",
        requiredSkills: ["C", "C++", "Data Structures", "Problem Solving", "OOP"],
        preferredSkills: ["Python", "Algorithms", "Embedded Basics", "Linux"],
        dsa: {
          requiredTopics: ["Arrays", "Strings", "Graphs"],
          preferredTopics: ["Trees", "Linked List"],
          expectedDifficulty: "Medium",
          recommendedVolume: 12,
        },
        coreCS: [
          { topic: "Operating Systems", skillKeywords: ["Operating Systems", "Linux"] },
          { topic: "Computer Networks", skillKeywords: ["Networking", "Networks", "TCP/IP", "HTTP"] },
        ],
        resources: ["leetcode", "gfg", "cppreference"],
      },
    ],
  },
];

module.exports = {
  companies,
  resources,
  version: 1,
};
