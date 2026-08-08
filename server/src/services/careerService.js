const { generateCareerGuidance, generateFeedback } = require("./geminiService");
const { analyzeResume } = require("./atsService");

const roleCatalog = [
  {
    role: "Software Engineer",
    skills: ["JavaScript", "Node.js", "React", "Data Structures", "REST APIs", "Git"],
    interviewTopics: ["DSA", "System design", "API design", "Project walkthrough"],
    suggestedProjects: ["Build a CRUD API with a React dashboard", "Create a mini SaaS project"]
  },
  {
    role: "Full Stack Developer",
    skills: ["JavaScript", "Express", "React", "MongoDB", "Authentication", "Docker"],
    interviewTopics: ["Full-stack architecture", "JWT flows", "Database modeling", "Frontend integration"],
    suggestedProjects: ["Build a full-stack portfolio app", "Design a dashboard with auth and CRUD APIs"]
  },
  {
    role: "Data Analyst",
    skills: ["SQL", "Python", "Dashboarding", "Statistics", "Excel", "Visualization"],
    interviewTopics: ["Data cleaning", "Business metrics", "SQL joins", "Dashboard decisions"],
    suggestedProjects: ["Create a KPI dashboard", "Analyze sample business data"]
  },
  {
    role: "Data Scientist",
    skills: ["Python", "Statistics", "Machine Learning", "Pandas", "Model evaluation", "Visualization"],
    interviewTopics: ["Feature engineering", "Model metrics", "Bias-variance", "Deployment"],
    suggestedProjects: ["Build a classification model", "Design a model evaluation notebook"]
  }
];

const generateCareerRecommendations = async ({ resumeText, targetRole, skills = [] } = {}) => {
  const extraction = analyzeResume(resumeText || "");
  const normalizedSkills = (skills || []).map((skill) => skill.toLowerCase());

  const matchedRoles = roleCatalog
    .filter((catalogRole) => {
      if (!targetRole) return true;
      return catalogRole.role.toLowerCase().includes(targetRole.toLowerCase()) ||
        targetRole.toLowerCase().includes(catalogRole.role.toLowerCase());
    })
    .map((role) => {
      const skillOverlap = role.skills.filter((skill) =>
        normalizedSkills.some((candidate) => candidate.includes(skill.toLowerCase()) || skill.toLowerCase().includes(candidate))
      );

      return {
        role: role.role,
        fitScore: Math.max(35, Math.min(92, 45 + skillOverlap.length * 12 + (extraction.foundSkills.length >= 3 ? 10 : 0))),
        skillsToLearn: role.skills.filter((skill) => !normalizedSkills.includes(skill.toLowerCase())),
        interviewTopics: role.interviewTopics,
        suggestedProjects: role.suggestedProjects
      };
    });

  const recommendations = matchedRoles.length > 0 ? matchedRoles : roleCatalog.slice(0, 2).map((role) => ({
    role: role.role,
    fitScore: 50,
    skillsToLearn: role.skills,
    interviewTopics: role.interviewTopics,
    suggestedProjects: role.suggestedProjects
  }));

  return {
    recommendations,
    extractedSkillSummary: {
      atsScore: extraction.atsScore,
      foundSkills: extraction.foundSkills,
      missingSkills: extraction.missingSkills
    }
  };
};

const generateCareerGuidanceText = async ({ resumeText, targetRole, skills = [] } = {}) => {
  const recommendations = await generateCareerRecommendations({ resumeText, targetRole, skills });
  const guidancePrompt = `
Create short, honest and actionable career guidance for a student resume portfolio project.
Resume:
${resumeText || "No resume text supplied."}
Target role: ${targetRole || "Career development"}
Skills: ${(skills || []).join(", ") || "Not supplied"}
Recommendations: ${JSON.stringify(recommendations.recommendations)}

Return a compact answer with these sections:
Career guidance:
- 2-3 bullet points
Next steps:
- 3 bullet points
Skill roadmap:
- 3 bullet points
`;

  const result = await generateCareerGuidance(guidancePrompt);

  return {
    guidance: result,
    recommendations: recommendations.recommendations
  };
};

module.exports = {
  generateCareerRecommendations,
  generateCareerGuidanceText
};
