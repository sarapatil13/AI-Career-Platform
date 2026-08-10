const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { connectTestDB, disconnectTestDB } = require("./helpers/db");
const mockInterviewService = require("../src/services/mockInterviewService");
const MockInterviewSession = require("../src/models/MockInterviewSession");
const CompanyPrepAnalysis = require("../src/models/CompanyPrepAnalysis");
const User = require("../src/models/User");
const UserDSAProgress = require("../src/models/UserDSAProgress");

before(connectTestDB.bind(null, "ai_career_test_mock_interview_service"));
after(disconnectTestDB);

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await UserDSAProgress.init();
  await CompanyPrepAnalysis.init();
  await MockInterviewSession.init();
});

const createUser = async (overrides = {}) => {
  return User.create({
    name: "Test User",
    email: "interview@example.com",
    password: "secret123",
    skills: ["Python", "SQL"],
    ...overrides,
  });
};

const questionProviderStub = async (context) => ({
  question: `Tell me about ${context.focusTopics[0] || "your approach"}.`,
  topic: context.focusTopics[0] || "Arrays",
  difficulty: "Medium",
  reason: "stub reason",
});

const evaluationProviderStub = async (context) => ({
  score: context.topic === "Graphs" ? 40 : 80,
  strengths: ["clear structure"],
  weaknesses: ["missing depth"],
  feedback: "Good start, go deeper.",
  missingPoints: ["include complexity analysis"],
  idealAnswerPoints: ["mention trade-offs"],
  detectedTopics: [context.topic],
  practiceTopics: ["Trees"],
});

const startTechnical = (userId, overrides = {}) =>
  mockInterviewService.startSession({
    userId,
    interviewType: "Technical",
    company: "Google",
    role: "Software Engineer",
    difficulty: "Medium",
    ...overrides,
  });

const rejectWithStatus = (promise, status) =>
  promise.then(
    () => {
      throw new Error("expected rejection");
    },
    (error) => {
      assert.equal(error.status, status);
    }
  );

test("startSession creates a Technical session with a first question", async () => {
  const user = await createUser();
  const session = await startTechnical(user._id);

  assert.equal(session.status, "in-progress");
  assert.equal(session.interviewType, "Technical");
  assert.equal(session.role, "Software Engineer");
  assert.equal(session.company, "Google");
  assert.equal(session.difficulty, "Medium");
  assert.equal(session.currentIndex, 0);
  assert.equal(session.totalQuestions, 5);
  assert.equal(session.questions.length, 1);
  assert.ok(session.questions[0].questionText);
  assert.equal(session.questions[0].source, "fallback");
});

test("startSession creates an HR session without difficulty", async () => {
  const user = await createUser();

  const session = await mockInterviewService.startSession({
    userId: user._id,
    interviewType: "HR",
    company: "Google",
    role: "Software Engineer",
    difficulty: null,
  });

  assert.equal(session.interviewType, "HR");
  assert.equal(session.difficulty, null);
  assert.equal(session.questions[0].difficulty, null);
  assert.ok(session.questions[0].questionText);
});

test("startSession validates interview type", async () => {
  const user = await createUser();

  await rejectWithStatus(
    mockInterviewService.startSession({
      userId: user._id,
      interviewType: "Pirate",
      role: "Software Engineer",
      difficulty: "Medium",
    }),
    400
  );
});

test("startSession validates role", async () => {
  const user = await createUser();

  await rejectWithStatus(startTechnical(user._id, { role: "Not A Real Role" }), 400);
});

test("startSession validates company", async () => {
  const user = await createUser();

  await rejectWithStatus(startTechnical(user._id, { company: "NopeCorp" }), 400);
});

test("startSession requires difficulty for technical interviews", async () => {
  const user = await createUser();

  await rejectWithStatus(startTechnical(user._id, { difficulty: null }), 400);
  await rejectWithStatus(startTechnical(user._id, { difficulty: "Extreme" }), 400);
});

test("AI question provider is used and receives the user's focus topics", async () => {
  const user = await createUser();

  await CompanyPrepAnalysis.create({
    user: user._id,
    company: "Google",
    role: "Software Engineer",
    focusTopics: ["Graphs", "DP"],
    coreCSGaps: ["Operating Systems"],
  });

  let receivedContext = null;
  const provider = async (context) => {
    receivedContext = context;
    return {
      question: "How would you find the shortest path in a graph?",
      topic: "Graphs",
      difficulty: "Hard",
      reason: "Graphs are a high-priority gap.",
    };
  };

  const session = await startTechnical(user._id, {
    questionProvider: provider,
    enableAI: true,
  });

  assert.equal(session.questions[0].source, "ai");
  assert.equal(session.questions[0].questionText, "How would you find the shortest path in a graph?");
  assert.ok(receivedContext.focusTopics.includes("Graphs"));
  assert.ok(receivedContext.focusTopics.includes("Operating Systems"));
  assert.ok(session.focusTopics.includes("Graphs"));
});

test("question provider failure falls back to a controlled question", async () => {
  const user = await createUser();

  const failingProvider = async () => {
    throw new Error("Gemini unavailable");
  };

  const session = await startTechnical(user._id, {
    questionProvider: failingProvider,
    enableAI: true,
  });

  assert.equal(session.questions[0].source, "fallback");
  assert.ok(session.questions[0].questionText);
});

test("submitAnswer saves the answer and stores the AI evaluation", async () => {
  const user = await createUser();
  const session = await startTechnical(user._id);

  const result = await mockInterviewService.submitAnswer({
    sessionId: session.id,
    userId: user._id,
    answerText: "I would use BFS with a queue.",
    evaluationProvider: evaluationProviderStub,
    enableAI: true,
  });

  assert.equal(result.answered.answerText, "I would use BFS with a queue.");
  assert.equal(result.answered.isSkipped, false);
  assert.equal(result.answered.evaluation.score, 80);
  assert.equal(result.answered.evaluation.source, "ai");
  assert.ok(result.answered.evaluation.strengths.length);
  assert.equal(result.session.currentIndex, 1);
  assert.equal(result.session.questions.length, 2);
  assert.equal(result.session.status, "in-progress");
});

test("submitAnswer records a skip without inventing an evaluation", async () => {
  const user = await createUser();
  const session = await startTechnical(user._id);

  const result = await mockInterviewService.submitAnswer({
    sessionId: session.id,
    userId: user._id,
    answerText: "",
    skipped: true,
    evaluationProvider: evaluationProviderStub,
    enableAI: true,
  });

  assert.equal(result.answered.isSkipped, true);
  assert.equal(result.answered.evaluation, null);
  assert.equal(result.answered.evaluationFailed, false);
  assert.equal(result.session.currentIndex, 1);
});

test("submitAnswer marks evaluation failure when the provider throws", async () => {
  const user = await createUser();
  const session = await startTechnical(user._id);

  const failingProvider = async () => {
    throw new Error("Gemini timeout");
  };

  const result = await mockInterviewService.submitAnswer({
    sessionId: session.id,
    userId: user._id,
    answerText: "A reasonable answer.",
    evaluationProvider: failingProvider,
    enableAI: true,
  });

  assert.equal(result.answered.evaluation, null);
  assert.equal(result.answered.evaluationFailed, true);
  assert.equal(result.session.status, "in-progress");
});

test("submitAnswer rejects missing or empty answers", async () => {
  const user = await createUser();
  const session = await startTechnical(user._id);

  await rejectWithStatus(
    mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
      answerText: "",
    }),
    400
  );

  await rejectWithStatus(
    mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
    }),
    400
  );

  await rejectWithStatus(
    mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
      answerText: "x".repeat(4001),
    }),
    400
  );
});

test("submitAnswer rejects an invalid or missing session", async () => {
  const user = await createUser();
  const session = await startTechnical(user._id);

  await rejectWithStatus(
    mockInterviewService.submitAnswer({
      sessionId: "not-an-object-id",
      userId: user._id,
      answerText: "hi",
    }),
    404
  );

  await rejectWithStatus(
    mockInterviewService.submitAnswer({
      sessionId: new mongoose.Types.ObjectId().toString(),
      userId: user._id,
      answerText: "hi",
    }),
    404
  );
});

test("a user cannot access another user's session", async () => {
  const userA = await createUser({ email: "a@example.com" });
  const userB = await createUser({ email: "b@example.com" });

  const session = await startTechnical(userA._id);

  await rejectWithStatus(
    mockInterviewService.getSession({ sessionId: session.id, userId: userB._id }),
    404
  );

  await rejectWithStatus(
    mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: userB._id,
      answerText: "intrusion",
    }),
    404
  );

  await rejectWithStatus(
    mockInterviewService.completeSession({ sessionId: session.id, userId: userB._id }),
    404
  );
});

test("completeSession aggregates the overall score deterministically", async () => {
  const user = await createUser();
  let session = await startTechnical(user._id);

  session = (
    await mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
      answerText: "Answer one",
      evaluationProvider: evaluationProviderStub,
      enableAI: true,
    })
  ).session;
  session = (
    await mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
      answerText: "Answer two",
      evaluationProvider: evaluationProviderStub,
      enableAI: true,
    })
  ).session;
  session = (
    await mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
      answerText: "Answer three",
      evaluationProvider: evaluationProviderStub,
      enableAI: true,
    })
  ).session;

  const completed = await mockInterviewService.completeSession({
    sessionId: session.id,
    userId: user._id,
  });

  assert.equal(completed.status, "completed");
  assert.equal(completed.overallScore, 80);
  assert.ok(completed.completedAt);
  assert.ok(completed.topicPerformance.length);
  assert.ok(completed.sessionStrengths.some((entry) => entry.includes("Strong in")));
});

test("completeSession aggregates weak topics and practice topics", async () => {
  const user = await createUser();
  let session = await startTechnical(user._id);

  const weakProvider = async () => ({
    score: 40,
    strengths: [],
    weaknesses: ["answer is shallow"],
    feedback: "Needs more depth.",
    missingPoints: ["mention trade-offs"],
    idealAnswerPoints: ["include complexity"],
    detectedTopics: [],
    practiceTopics: ["Trees"],
  });

  session = (
    await mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
      answerText: "Weak answer one",
      evaluationProvider: weakProvider,
      enableAI: true,
    })
  ).session;
  session = (
    await mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
      answerText: "Weak answer two",
      evaluationProvider: weakProvider,
      enableAI: true,
    })
  ).session;

  const completed = await mockInterviewService.completeSession({
    sessionId: session.id,
    userId: user._id,
  });

  assert.equal(completed.overallScore, 40);
  assert.equal(completed.weakTopics.length, 2);
  assert.ok(completed.practiceTopics.includes(completed.weakTopics[0]));
  assert.ok(completed.practiceTopics.includes("Trees"));
  assert.ok(completed.topicPerformance.length);
});

test("completing a session with no evaluations keeps the score honest", async () => {
  const user = await createUser();
  let session = await startTechnical(user._id);

  session = (
    await mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
      answerText: "No AI available",
    })
  ).session;
  session = (
    await mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
      answerText: "Still no AI",
    })
  ).session;

  const completed = await mockInterviewService.completeSession({
    sessionId: session.id,
    userId: user._id,
  });

  assert.equal(completed.overallScore, null);
  assert.deepEqual(completed.weakTopics, []);
  assert.equal(completed.status, "completed");
});

test("submitAnswer on a completed session returns 400", async () => {
  const user = await createUser();
  let session = await startTechnical(user._id);

  await mockInterviewService.completeSession({ sessionId: session.id, userId: user._id });

  await rejectWithStatus(
    mockInterviewService.submitAnswer({
      sessionId: session.id,
      userId: user._id,
      answerText: "too late",
    }),
    400
  );
});

test("listSessions returns only the user's sessions, newest first", async () => {
  const user = await createUser();
  await startTechnical(user._id);
  await startTechnical(user._id, { difficulty: "Hard" });

  const sessions = await mockInterviewService.listSessions({ userId: user._id });

  assert.equal(sessions.length, 2);
  assert.ok(new Date(sessions[0].createdAt) >= new Date(sessions[1].createdAt));
  assert.equal(sessions[0].overallScore, null);
});
