const REQUIRED_SKILLS = [
  "c++",
  "python",
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node.js",
  "express",
  "mongodb",
  "sql",
  "git",
  "rest api",
  "jwt",
  "docker",
  "aws",
];

const analyzeResume = (text) => {
  const lowerText = text.toLowerCase();

  const foundSkills = REQUIRED_SKILLS.filter((skill) =>
    lowerText.includes(skill.toLowerCase())
  );

  const missingSkills = REQUIRED_SKILLS.filter(
    (skill) => !lowerText.includes(skill.toLowerCase())
  );

  const score = Math.round(
    (foundSkills.length / REQUIRED_SKILLS.length) * 100
  );

  const suggestions = [];

  if (!lowerText.includes("experience"))
    suggestions.push("Add an Experience section.");

  if (!lowerText.includes("project"))
    suggestions.push("Add Projects section.");

  if (!lowerText.includes("education"))
    suggestions.push("Add Education section.");

  if (missingSkills.length > 0)
    suggestions.push(
      `Consider adding: ${missingSkills.slice(0, 5).join(", ")}`
    );

  return {
    atsScore: score,
    foundSkills,
    missingSkills,
    suggestions,
  };
};

module.exports = {
  analyzeResume,
};