const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const fallbackFeedback = `Unable to generate AI feedback at this time. Gemini API is not configured or the API request failed. The resume ATS analysis remains available.`;

const buildModel = () => {
  if (!apiKey || !genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });
};

const generateFeedback = async (resumeText) => {
  try {
    const model = buildModel();

    const prompt = `
You are an expert ATS Resume Reviewer for a student career platform.

Analyze the following resume honestly and use the extracted resume text as the only context.

Return this structure exactly:

Resume strengths:
- point 1
- point 2
- point 3

Weaknesses:
- point 1
- point 2
- point 3

Missing skills:
- point 1
- point 2
- point 3

Suggested improvements:
- point 1
- point 2
- point 3

Interview preparation suggestions:
- point 1
- point 2
- point 3

Career recommendations:
- point 1
- point 2
- point 3

Resume text:
${resumeText}
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error(error);
    return fallbackFeedback;
  }
};

const generateCareerGuidance = async (prompt) => {
  try {
    const model = buildModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error(error);
    return "Unable to generate career guidance with Gemini at this time.";
  }
};

const generateInterviewPreparation = async (prompt) => {
  try {
    const model = buildModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error(error);
    return "Unable to generate interview preparation from Gemini at this time.";
  }
};

module.exports = {
  generateFeedback,
  generateCareerGuidance,
  generateInterviewPreparation,
};