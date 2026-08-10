const mockInterviewService = require("../services/mockInterviewService");
const activityService = require("../services/activityService");
const {
  generateInterviewQuestion,
  evaluateInterviewAnswer,
} = require("../services/geminiService");

const aiEnabled =
  process.env.MOCK_INTERVIEW_AI_ENABLED === "true" ||
  (Boolean(process.env.GEMINI_API_KEY) &&
    process.env.MOCK_INTERVIEW_AI_ENABLED !== "false");

const getOptionsController = async (req, res) => {
  try {
    res.status(200).json(mockInterviewService.getOptions());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const startSessionController = async (req, res) => {
  try {
    const { interviewType, company, role, difficulty, totalQuestions } = req.body || {};

    const session = await mockInterviewService.startSession({
      userId: req.user._id,
      interviewType,
      company: company || null,
      role,
      difficulty: difficulty || null,
      totalQuestions:
        Number.isInteger(totalQuestions) && totalQuestions >= 1 && totalQuestions <= 10
          ? totalQuestions
          : 5,
      questionProvider: generateInterviewQuestion,
      enableAI: aiEnabled,
    });

    res.status(200).json({
      message: "Mock interview session started",
      session,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const listSessionsController = async (req, res) => {
  try {
    const sessions = await mockInterviewService.listSessions({ userId: req.user._id });
    res.status(200).json({ sessions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSessionController = async (req, res) => {
  try {
    const session = await mockInterviewService.getSession({
      sessionId: req.params.id,
      userId: req.user._id,
    });
    res.status(200).json({ session });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const submitAnswerController = async (req, res) => {
  try {
    const { answerText, skipped } = req.body || {};

    const result = await mockInterviewService.submitAnswer({
      sessionId: req.params.id,
      userId: req.user._id,
      answerText,
      skipped: Boolean(skipped),
      questionProvider: generateInterviewQuestion,
      evaluationProvider: evaluateInterviewAnswer,
      enableAI: aiEnabled,
    });

    res.status(200).json({
      message: "Answer recorded",
      ...result,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const completeSessionController = async (req, res) => {
  try {
    const before = await mockInterviewService.getSession({
      sessionId: req.params.id,
      userId: req.user._id,
    });

    const session = await mockInterviewService.completeSession({
      sessionId: req.params.id,
      userId: req.user._id,
    });

    // Only a transition in-progress -> completed is real activity.
    if (before.status !== "completed") {
      const scoreText =
        session.overallScore === null ? "" : ` (score ${session.overallScore}/100)`;
      const score = session.overallScore === null ? null : session.overallScore;

      await activityService.recordActivityQuietly({
        userId: req.user._id,
        type: "mock_interview_completed",
        summary: `Completed ${session.interviewType} mock interview${scoreText}`,
        metadata: {
          key: `session:${session.id}`,
          score,
          interviewType: session.interviewType,
        },
      });
    }

    res.status(200).json({
      message: "Mock interview completed",
      session,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

module.exports = {
  getOptionsController,
  startSessionController,
  listSessionsController,
  getSessionController,
  submitAnswerController,
  completeSessionController,
};
