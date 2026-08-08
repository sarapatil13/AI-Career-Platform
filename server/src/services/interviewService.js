const { generateInterviewPreparation } = require("./geminiService");

const prepareInterview = async ({ resumeText, targetRole, company, technology, query }) => {
  const retrievalSource = [
    "Data structures and algorithms fundamentals",
    "Frontend interview preparation",
    "Backend interview preparation",
    "System design for student portfolio projects",
    "Career communication and soft-skill interview preparation"
  ];

  const instruction = query || "Prepare me for my technical interview.";

  const prompt = `
Use the following retrieval context to prepare a student-level interview plan.

Resume:
${resumeText || "No resume text provided."}

Target role: ${targetRole || "Software Engineer"}
Company/technology focus: ${company || "General"} / ${technology || "General"}
User query: ${instruction}

Retrieval context:
${retrievalSource.join("\n")}

Generate a practical interview preparation plan with these sections:
Questions to practice:
- 3 bullet points
Topics to revise:
- 3 bullet points
Technical explanations:
- 3 bullet points
Suggested action plan:
- 3 bullet points
`;

  const aiResponse = await generateInterviewPreparation(prompt);

  return {
    interviewPreparation: aiResponse,
    retrievalContext: retrievalSource,
    selectedChunks: retrievalSource.slice(0, 3)
  };
};

module.exports = {
  prepareInterview
};
