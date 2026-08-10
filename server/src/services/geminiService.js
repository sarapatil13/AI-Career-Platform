const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const fallbackFeedback = `Unable to generate AI feedback at this time. Gemini API is not configured or the API request failed. The resume ATS analysis remains available.`;

const buildModel = () => {
  if (!apiKey || !genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
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
    console.error("Gemini feedback error:", error.message);
    return fallbackFeedback;
  }
};

const generateCareerGuidance = async (prompt) => {
  try {
    const model = buildModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini guidance error:", error.message);
    return "Unable to generate career guidance with Gemini at this time.";
  }
};

const generateInterviewPreparation = async (prompt) => {
  try {
    const model = buildModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini interview error:", error.message);
    return "Unable to generate interview preparation from Gemini at this time.";
  }
};

// Parses and validates the JSON strategy contract returned by Gemini.
// Throws on any malformed output so callers can fall back to deterministic data.
const parseCompanyPrepStrategy = (text) => {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("Malformed company prep strategy from Gemini");
  }

  if (!parsed || typeof parsed.strategy !== "string" || !Array.isArray(parsed.nextSteps)) {
    throw new Error("Malformed company prep strategy from Gemini");
  }

  return {
    strategy: parsed.strategy,
    gapExplanations: Array.isArray(parsed.gapExplanations) ? parsed.gapExplanations : [],
    nextSteps: parsed.nextSteps,
  };
};

// Generates advisory company-prep strategy only. Throws on any failure so the
// caller can fall back to deterministic results. Never used for scoring.
const generateCompanyPrepStrategy = async (context) => {
  const model = buildModel();

  const prompt = `
You are a career preparation coach. Use ONLY the facts provided below. Do not invent company requirements, do not invent scores, and do not invent learning-resource URLs.

Company: ${context.company}
Role: ${context.role}

Scores (0-100):
- Overall match: ${context.overallMatchScore}
- Technical skill match: ${context.technicalSkillsScore}
- DSA readiness: ${context.dsaReadinessScore}
- Core CS: ${context.coreCSScore}

Matched required skills: ${context.skillMatch.matchedRequiredSkills.join(", ") || "none"}
Missing required skills: ${context.skillMatch.missingRequiredSkills.join(", ") || "none"}
Matched preferred skills: ${context.skillMatch.matchedPreferredSkills.join(", ") || "none"}
Missing preferred skills: ${context.skillMatch.missingPreferredSkills.join(", ") || "none"}
DSA focus topics: ${context.focusTopics.join(", ") || "none"}
Core CS gaps: ${context.coreCSGaps.join(", ") || "none"}

Return JSON with this exact structure:
{
  "strategy": "2-4 sentence personalized preparation strategy based only on the facts above",
  "gapExplanations": [ { "gap": "gap label", "explanation": "why it matters and how to close it" } ],
  "nextSteps": [ "concrete next step 1", "concrete next step 2", "concrete next step 3" ]
}
`;

  const result = await model.generateContent(
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            strategy: { type: "STRING" },
            gapExplanations: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  gap: { type: "STRING" },
                  explanation: { type: "STRING" },
                },
              },
            },
            nextSteps: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: ["strategy", "gapExplanations", "nextSteps"],
        },
      },
    },
    { timeout: 10000 }
  );

  return parseCompanyPrepStrategy(result.response.text());
};

// Parses and validates the interview question contract returned by Gemini.
// Throws on any malformed output so callers can fall back to controlled data.
const parseInterviewQuestion = (text) => {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("Malformed interview question from Gemini");
  }

  if (!parsed || typeof parsed.question !== "string" || !parsed.question.trim()) {
    throw new Error("Malformed interview question from Gemini");
  }

  const topic =
    typeof parsed.topic === "string" && parsed.topic.trim()
      ? parsed.topic.trim()
      : "General";

  const difficulty = ["Easy", "Medium", "Hard"].includes(parsed.difficulty)
    ? parsed.difficulty
    : null;

  const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";

  return {
    question: parsed.question.trim(),
    topic,
    difficulty,
    reason,
  };
};

// Generates a single interview question only. Never used for state.
// Throws on any failure so the caller can fall back to controlled questions.
const generateInterviewQuestion = async (context) => {
  const model = buildModel();

  const focusBlock =
    context.focusTopics && context.focusTopics.length
      ? context.focusTopics.join(", ")
      : "none yet (use role, difficulty and skills)";

  const prompt = `
You are an interview question generator for a student career platform.

Interview type: ${context.interviewType}
Role: ${context.role}
Company: ${context.company || "General"}
Difficulty: ${context.difficulty || "N/A"}
Candidate skills: ${context.skills && context.skills.length ? context.skills.join(", ") : "none listed"}
Preparation focus topics (DSA gaps, core CS gaps, company prep gaps): ${focusBlock}
Questions already asked this session: ${context.askedTopics && context.askedTopics.length ? context.askedTopics.join(", ") : "none"}

Generate ONE interview question appropriate for the interview type.
- For Technical interviews, prefer topics from the preparation focus list while keeping the interview varied; ask a question the candidate can answer in a few minutes (concept, approach, or small design), not a full coding problem.
- For HR interviews, ask a behavioral question based on the role and candidate context; do not invent project details.
Do not invent company-specific requirements.

Return JSON with this exact structure:
{
  "question": "the interview question",
  "topic": "short topic label",
  "difficulty": "Easy" | "Medium" | "Hard" | "N/A",
  "reason": "why this question is being asked"
}
`;

  const result = await model.generateContent(
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            question: { type: "STRING" },
            topic: { type: "STRING" },
            difficulty: { type: "STRING" },
            reason: { type: "STRING" },
          },
          required: ["question", "topic", "difficulty", "reason"],
        },
      },
    },
    { timeout: 25000 }
  );

  return parseInterviewQuestion(result.response.text());
};

// Parses and validates the answer evaluation contract returned by Gemini.
// Throws on any malformed output so callers never save invalid data.
const parseInterviewAnswer = (text) => {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("Malformed interview evaluation from Gemini");
  }

  if (!parsed || typeof parsed.score !== "number" || parsed.score < 0 || parsed.score > 100) {
    throw new Error("Malformed interview evaluation from Gemini");
  }

  const asStringArray = (value) =>
    Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

  return {
    score: Math.round(parsed.score),
    strengths: asStringArray(parsed.strengths),
    weaknesses: asStringArray(parsed.weaknesses),
    feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
    missingPoints: asStringArray(parsed.missing_points),
    idealAnswerPoints: asStringArray(parsed.ideal_answer_points),
    detectedTopics: asStringArray(parsed.detected_topics),
    practiceTopics: asStringArray(parsed.practice_topics),
  };
};

// Evaluates a single candidate answer. Advisory only: the returned score is an
// AI-based evaluation, never treated as objective truth. Throws on failure so
// callers can surface a controlled evaluation-unavailable state.
const evaluateInterviewAnswer = async (context) => {
  const model = buildModel();

  const criteria =
    context.interviewType === "HR"
      ? "relevance, clarity, structure, specificity and professionalism"
      : "correctness, completeness, reasoning, complexity awareness and communication";

  const prompt = `
You are an interview coach evaluating a single candidate answer for a student career platform.

Interview type: ${context.interviewType}
Role: ${context.role}
Company: ${context.company || "General"}
Question topic: ${context.topic}
Question: ${context.question}

Candidate answer:
${context.answerText}

Evaluate ONLY this answer against the criteria: ${criteria}.
Be honest and specific. Do not inflate the score. Use the candidate's real words only; do not infer facts they did not state.

Return JSON with this exact structure:
{
  "score": 0-100,
  "strengths": ["what the candidate did well"],
  "weaknesses": ["what was missing or weak"],
  "feedback": "2-4 sentence constructive feedback",
  "missing_points": ["points the answer should have covered"],
  "ideal_answer_points": ["points a strong answer would include"],
  "detected_topics": ["topics the answer touched on"],
  "practice_topics": ["topics to practice next"]
}
`;

  const result = await model.generateContent(
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "NUMBER" },
            strengths: { type: "ARRAY", items: { type: "STRING" } },
            weaknesses: { type: "ARRAY", items: { type: "STRING" } },
            feedback: { type: "STRING" },
            missing_points: { type: "ARRAY", items: { type: "STRING" } },
            ideal_answer_points: { type: "ARRAY", items: { type: "STRING" } },
            detected_topics: { type: "ARRAY", items: { type: "STRING" } },
            practice_topics: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: [
            "score",
            "strengths",
            "weaknesses",
            "feedback",
            "missing_points",
            "ideal_answer_points",
            "detected_topics",
            "practice_topics",
          ],
        },
      },
    },
    { timeout: 25000 }
  );

  return parseInterviewAnswer(result.response.text());
};

module.exports = {
  generateFeedback,
  generateCareerGuidance,
  generateInterviewPreparation,
  generateCompanyPrepStrategy,
  parseCompanyPrepStrategy,
  generateInterviewQuestion,
  parseInterviewQuestion,
  evaluateInterviewAnswer,
  parseInterviewAnswer,
};