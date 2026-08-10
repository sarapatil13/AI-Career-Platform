const mongoose = require("mongoose");

const interviewCatalog = require("../data/interviewCatalog");
const dsaService = require("./dsaService");
const User = require("../models/User");
const CompanyPrepAnalysis = require("../models/CompanyPrepAnalysis");
const MockInterviewSession = require("../models/MockInterviewSession");

const DEFAULT_TOTAL_QUESTIONS = 5;
const ANSWER_MAX_LENGTH = 4000;
const WEAK_SCORE_THRESHOLD = 60;
const STRONG_SCORE_THRESHOLD = 70;

const toError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const dedupe = (items) => [...new Set(items)];

// ------------------------- Validation -------------------------

const validateType = (interviewType) => {
  if (!interviewCatalog.isValidType(interviewType)) {
    throw toError("interviewType must be Technical or HR", 400);
  }
};

const validateRole = (role) => {
  if (!interviewCatalog.isValidRole(role)) {
    throw toError("Unknown role", 400);
  }
};

const validateCompany = (company) => {
  if (company !== null && company !== undefined && !interviewCatalog.isValidCompany(company)) {
    throw toError("Unknown company", 400);
  }
};

const validateDifficulty = (interviewType, difficulty) => {
  if (interviewType !== "Technical") return;

  if (difficulty === null || difficulty === undefined) {
    throw toError("difficulty is required for technical interviews", 400);
  }

  if (!interviewCatalog.isValidDifficulty(difficulty)) {
    throw toError("difficulty must be Easy, Medium or Hard", 400);
  }
};

// ------------------------- Profile context -------------------------

const buildInterviewContext = async ({ userId, interviewType, company, role }) => {
  const user = await User.findById(userId);

  const dsaProfile = await dsaService.getProfile(userId);

  let analysis = role
    ? await CompanyPrepAnalysis.findOne({ user: userId, role }).sort({ createdAt: -1 })
    : null;

  if (!analysis) {
    analysis = await CompanyPrepAnalysis.findOne({ user: userId }).sort({ createdAt: -1 });
  }

  const dsaGaps = dsaProfile.priorityGaps.map((gap) => gap.topic);
  const companyFocusTopics = analysis ? analysis.focusTopics || [] : [];
  const coreCSGaps = analysis ? analysis.coreCSGaps || [] : [];

  const focusTopics = dedupe([...dsaGaps, ...companyFocusTopics, ...coreCSGaps]);

  return {
    userId,
    interviewType,
    role,
    company: company || null,
    skills: user ? user.skills || [] : [],
    candidateName: user ? user.name || "" : "",
    candidateContext: {
      name: user ? user.name || "" : "",
      skills: user ? user.skills || [] : [],
      targetRoles: user ? user.targetRoles || [] : [],
      interestedCompanies: user ? user.interestedCompanies || [] : [],
    },
    dsaReadinessScore: dsaProfile.readinessScore,
    dsaGaps,
    coreCSGaps,
    focusTopics,
  };
};

// ------------------------- Question generation -------------------------

const fallbackQuestion = ({ interviewType, difficulty, focusTopics, askedTopics }) => {
  const pool =
    interviewType === "HR"
      ? interviewCatalog.hrFallbackQuestions
      : interviewCatalog.technicalFallbackQuestions;

  const asked = new Set(askedTopics || []);

  const prioritized = pool.filter(
    (entry) => focusTopics.includes(entry.topic) && !asked.has(entry.topic)
  );
  const remaining = pool.filter(
    (entry) => !focusTopics.includes(entry.topic) && !asked.has(entry.topic)
  );

  const selected = prioritized[0] || remaining[0] || pool.find((entry) => !asked.has(entry.topic)) || pool[0];

  return {
    question: selected.question,
    topic: selected.topic,
    difficulty: interviewType === "Technical" ? difficulty || selected.difficulty : null,
    reason: selected.reason,
    source: "fallback",
  };
};

const generateQuestion = async ({ session, context, questionProvider, enableAI }) => {
  const askedTopics = session.questions.map((question) => question.topic);

  if (questionProvider && enableAI) {
    try {
      const generated = await questionProvider({
        interviewType: context.interviewType,
        role: context.role,
        company: context.company,
        difficulty: session.difficulty,
        skills: context.skills,
        focusTopics: context.focusTopics,
        askedTopics,
      });

      return {
        question: generated.question,
        topic: generated.topic,
        difficulty:
          context.interviewType === "Technical"
            ? generated.difficulty || session.difficulty
            : null,
        reason: generated.reason || "",
        source: "ai",
      };
    } catch (error) {
      // Fall back to controlled questions without crashing.
    }
  }

  return fallbackQuestion({
    interviewType: context.interviewType,
    difficulty: session.difficulty,
    focusTopics: context.focusTopics,
    askedTopics,
  });
};

// ------------------------- Evaluation -------------------------

const evaluateAnswer = async ({ session, context, question, answerText, evaluationProvider, enableAI }) => {
  if (question.isSkipped) {
    return null;
  }

  if (!evaluationProvider || !enableAI) {
    return null;
  }

  try {
    const result = await evaluationProvider({
      interviewType: session.interviewType,
      role: session.targetRole,
      company: session.company,
      difficulty: question.difficulty,
      topic: question.topic,
      question: question.questionText,
      answerText,
      candidateContext: context.candidateContext,
    });

    return {
      score: result.score,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      feedback: result.feedback,
      missingPoints: result.missingPoints,
      idealAnswerPoints: result.idealAnswerPoints,
      detectedTopics: result.detectedTopics,
      practiceTopics: result.practiceTopics,
      source: "ai",
      evaluatedAt: new Date(),
    };
  } catch (error) {
    return null;
  }
};

// ------------------------- Aggregation (deterministic) -------------------------

const aggregateSession = (questions) => {
  const evaluated = questions.filter(
    (question) =>
      !question.isSkipped &&
      !question.evaluationFailed &&
      question.evaluation &&
      typeof question.evaluation.score === "number"
  );

  const byTopic = new Map();

  questions.forEach((question) => {
    if (!question.topic) return;
    const entry = byTopic.get(question.topic) || { topic: question.topic, asked: 0, scores: [], lowCount: 0 };
    entry.asked += 1;
    byTopic.set(question.topic, entry);
  });

  evaluated.forEach((question) => {
    const entry = byTopic.get(question.topic) || { topic: question.topic, asked: 0, scores: [], lowCount: 0 };
    entry.scores.push(question.evaluation.score);
    if (question.evaluation.score < WEAK_SCORE_THRESHOLD) {
      entry.lowCount += 1;
    }
    byTopic.set(question.topic, entry);
  });

  const topicPerformance = [...byTopic.values()]
    .map((entry) => ({
      topic: entry.topic,
      asked: entry.asked,
      evaluated: entry.scores.length,
      avgScore: entry.scores.length ? Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length) : 0,
      lowCount: entry.lowCount,
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));

  const overallScore = evaluated.length
    ? Math.round(evaluated.reduce((sum, question) => sum + question.evaluation.score, 0) / evaluated.length)
    : null;

  const weakTopics = topicPerformance
    .filter((entry) => entry.evaluated > 0 && entry.avgScore < WEAK_SCORE_THRESHOLD)
    .map((entry) => entry.topic);

  const practiceTopics = dedupe([
    ...weakTopics,
    ...evaluated.flatMap((question) => question.evaluation.practiceTopics || []),
  ]);

  const sessionStrengths = topicPerformance
    .filter((entry) => entry.evaluated > 0 && entry.avgScore >= STRONG_SCORE_THRESHOLD)
    .map((entry) => `Strong in ${entry.topic} (avg ${entry.avgScore}%)`);

  return {
    overallScore,
    topicPerformance,
    weakTopics,
    practiceTopics,
    sessionStrengths,
  };
};

// ------------------------- Serialization -------------------------

const serializeQuestion = (question, index) => {
  return {
    id: question.questionId || String(index + 1),
    questionText: question.questionText || "",
    topic: question.topic || null,
    difficulty: question.difficulty || null,
    reason: question.reason || "",
    source: question.source || "fallback",
    answerText: question.answerText || "",
    isSkipped: Boolean(question.isSkipped),
    answeredAt: question.answeredAt || null,
    evaluation: question.evaluation
      ? {
          score: question.evaluation.score,
          strengths: question.evaluation.strengths || [],
          weaknesses: question.evaluation.weaknesses || [],
          feedback: question.evaluation.feedback || "",
          missingPoints: question.evaluation.missingPoints || [],
          idealAnswerPoints: question.evaluation.idealAnswerPoints || [],
          detectedTopics: question.evaluation.detectedTopics || [],
          practiceTopics: question.evaluation.practiceTopics || [],
          source: question.evaluation.source || null,
          evaluatedAt: question.evaluation.evaluatedAt || null,
        }
      : null,
    evaluationFailed: Boolean(question.evaluationFailed),
  };
};

const serializeSession = (doc) => {
  return {
    id: doc._id,
    interviewType: doc.interviewType,
    role: doc.targetRole,
    company: doc.company || null,
    difficulty: doc.difficulty || null,
    status: doc.status,
    focusTopics: doc.focusTopics || [],
    totalQuestions: doc.totalQuestions,
    currentIndex: doc.currentIndex,
    questions: (doc.questions || []).map(serializeQuestion),
    overallScore: doc.overallScore,
    topicPerformance: doc.topicPerformance || [],
    sessionStrengths: doc.sessionStrengths || [],
    weakTopics: doc.weakTopics || [],
    practiceTopics: doc.practiceTopics || [],
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
  };
};

const serializeSummary = (doc) => {
  return {
    id: doc._id,
    interviewType: doc.interviewType,
    role: doc.targetRole,
    company: doc.company || null,
    difficulty: doc.difficulty || null,
    status: doc.status,
    focusTopics: doc.focusTopics || [],
    totalQuestions: doc.totalQuestions,
    answeredCount: (doc.questions || []).filter((question) => question.answerText || question.isSkipped).length,
    overallScore: doc.overallScore,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
  };
};

// ------------------------- Session operations -------------------------

const getOptions = () => {
  return {
    types: interviewCatalog.types,
    difficulties: interviewCatalog.difficulties,
    roles: interviewCatalog.roles,
    companies: interviewCatalog.companies,
    hrTopics: interviewCatalog.hrTopics,
    totalQuestionsOptions: [3, 5, 7],
    catalogVersion: interviewCatalog.version,
  };
};

const startSession = async ({
  userId,
  interviewType,
  company,
  role,
  difficulty,
  totalQuestions = DEFAULT_TOTAL_QUESTIONS,
  questionProvider = null,
  enableAI = false,
}) => {
  validateType(interviewType);
  validateRole(role);
  validateCompany(company);
  validateDifficulty(interviewType, difficulty);

  const context = await buildInterviewContext({ userId, interviewType, company, role });

  const doc = await MockInterviewSession.create({
    user: userId,
    interviewType,
    targetRole: interviewCatalog.roles.find(
      (entry) => entry.toLowerCase() === String(role).trim().toLowerCase()
    ),
    company: context.company,
    difficulty: interviewType === "Technical" ? difficulty : null,
    focusTopics: context.focusTopics,
    totalQuestions,
    currentIndex: 0,
    questions: [],
    status: "in-progress",
  });

  const firstQuestion = await generateQuestion({
    session: doc,
    context,
    questionProvider,
    enableAI,
  });

  doc.questions.push({
    questionId: String(1),
    questionText: firstQuestion.question,
    topic: firstQuestion.topic,
    difficulty: firstQuestion.difficulty,
    reason: firstQuestion.reason,
    source: firstQuestion.source,
    isSkipped: false,
    evaluation: null,
    evaluationFailed: false,
  });

  await doc.save();

  return serializeSession(doc);
};

const getSession = async ({ sessionId, userId }) => {
  if (!mongoose.isValidObjectId(sessionId)) {
    throw toError("Session not found", 404);
  }

  const doc = await MockInterviewSession.findOne({ _id: sessionId, user: userId });

  if (!doc) {
    throw toError("Session not found", 404);
  }

  return serializeSession(doc);
};

const listSessions = async ({ userId }) => {
  const docs = await MockInterviewSession.find({ user: userId }).sort({ createdAt: -1 }).limit(20);
  return docs.map(serializeSummary);
};

const submitAnswer = async ({
  sessionId,
  userId,
  answerText,
  skipped = false,
  questionProvider = null,
  evaluationProvider = null,
  enableAI = false,
}) => {
  if (!mongoose.isValidObjectId(sessionId)) {
    throw toError("Session not found", 404);
  }

  const doc = await MockInterviewSession.findOne({ _id: sessionId, user: userId });

  if (!doc) {
    throw toError("Session not found", 404);
  }

  if (doc.status !== "in-progress") {
    throw toError("Session already completed", 400);
  }

  if (!skipped && (typeof answerText !== "string" || !answerText.trim())) {
    throw toError("answerText is required", 400);
  }

  if (!skipped && answerText.length > ANSWER_MAX_LENGTH) {
    throw toError("answerText is too long", 400);
  }

  const question = doc.questions[doc.currentIndex];

  if (!question) {
    throw toError("No pending question for this session", 400);
  }

  const answeredIndex = doc.currentIndex;

  const context = await buildInterviewContext({
    userId,
    interviewType: doc.interviewType,
    company: doc.company,
    role: doc.targetRole,
  });

  question.answerText = skipped ? "" : answerText.trim();
  question.isSkipped = skipped;
  question.answeredAt = new Date();
  question.evaluationFailed = false;
  question.evaluation = null;

  const evaluation = await evaluateAnswer({
    session: doc,
    context,
    question,
    answerText: question.answerText,
    evaluationProvider,
    enableAI,
  });

  if (evaluation) {
    question.evaluation = evaluation;
  } else if (!skipped) {
    question.evaluationFailed = true;
  }

  if (doc.currentIndex + 1 < doc.totalQuestions) {
    const nextQuestion = await generateQuestion({
      session: doc,
      context,
      questionProvider,
      enableAI,
    });

    doc.questions.push({
      questionId: String(doc.questions.length + 1),
      questionText: nextQuestion.question,
      topic: nextQuestion.topic,
      difficulty: nextQuestion.difficulty,
      reason: nextQuestion.reason,
      source: nextQuestion.source,
      isSkipped: false,
      evaluation: null,
      evaluationFailed: false,
    });

    doc.currentIndex += 1;
  }

  await doc.save();

  const answered = serializeQuestion(doc.questions[answeredIndex], answeredIndex);

  return { session: serializeSession(doc), answered };
};

const completeSession = async ({ sessionId, userId }) => {
  if (!mongoose.isValidObjectId(sessionId)) {
    throw toError("Session not found", 404);
  }

  const doc = await MockInterviewSession.findOne({ _id: sessionId, user: userId });

  if (!doc) {
    throw toError("Session not found", 404);
  }

  if (doc.status === "completed") {
    return serializeSession(doc);
  }

  const aggregation = aggregateSession(doc.questions);

  doc.overallScore = aggregation.overallScore;
  doc.topicPerformance = aggregation.topicPerformance;
  doc.sessionStrengths = aggregation.sessionStrengths;
  doc.weakTopics = aggregation.weakTopics;
  doc.practiceTopics = aggregation.practiceTopics;
  doc.status = "completed";
  doc.completedAt = new Date();

  await doc.save();

  return serializeSession(doc);
};

module.exports = {
  getOptions,
  startSession,
  getSession,
  listSessions,
  submitAnswer,
  completeSession,
  serializeSession,
  aggregateSession,
  fallbackQuestion,
  buildInterviewContext,
};
