const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { connectTestDB, disconnectTestDB } = require("./helpers/db");

const User = require("../src/models/User");
const UserDSAProgress = require("../src/models/UserDSAProgress");
const MockInterviewSession = require("../src/models/MockInterviewSession");
const CompanyPrepAnalysis = require("../src/models/CompanyPrepAnalysis");
const ActivityEvent = require("../src/models/ActivityEvent");
const ResumeAnalysis = require("../src/models/ResumeAnalysis");

before(connectTestDB.bind(null, "ai_career_test_models"));
after(disconnectTestDB);

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await UserDSAProgress.init();
});

const createUser = async (overrides = {}) => {
  return User.create({
    name: "Test User",
    email: "test@example.com",
    password: "secret123",
    ...overrides,
  });
};

test("User defaults preferences to empty arrays", async () => {
  const user = await createUser();

  assert.deepEqual(user.skills, []);
  assert.deepEqual(user.targetRoles, []);
  assert.deepEqual(user.interestedCompanies, []);
});

test("User persists embedded preferences", async () => {
  const user = await createUser({
    skills: ["JavaScript", "Node.js"],
    targetRoles: ["Software Engineer"],
    interestedCompanies: ["Google", "Amazon"],
  });

  const found = await User.findById(user._id);
  assert.deepEqual(found.skills, ["JavaScript", "Node.js"]);
  assert.deepEqual(found.targetRoles, ["Software Engineer"]);
  assert.deepEqual(found.interestedCompanies, ["Google", "Amazon"]);
});

test("UserDSAProgress stores records as the source of truth", async () => {
  const user = await createUser();
  const progress = await UserDSAProgress.create({
    user: user._id,
    records: [
      { questionId: "1", topic: "Arrays", difficulty: "Easy", completedAt: new Date() },
      { questionId: "3", topic: "Graphs", difficulty: "Medium", completedAt: new Date() },
    ],
    lastSyncedAt: new Date(),
  });

  const found = await UserDSAProgress.findOne({ user: user._id });
  assert.equal(found.records.length, 2);
  assert.equal(found.records[0].topic, "Arrays");
  assert.equal(found.records[0].difficulty, "Easy");
});

test("UserDSAProgress allows only one document per user", async () => {
  const user = await createUser();
  await UserDSAProgress.create({ user: user._id });

  await assert.rejects(() => UserDSAProgress.create({ user: user._id }));
});

test("MockInterviewSession stores a focusTopics snapshot and question answers", async () => {
  const user = await createUser();
  const session = await MockInterviewSession.create({
    user: user._id,
    targetRole: "Software Engineer",
    company: "Google",
    focusTopics: ["Trees", "Graphs"],
    questions: [
      { questionId: "4", topic: "Trees", difficulty: "Medium", answerText: "Use BFS with a queue." },
      { isSkipped: true },
    ],
  });

  const found = await MockInterviewSession.findById(session._id);
  assert.deepEqual(found.focusTopics, ["Trees", "Graphs"]);
  assert.equal(found.questions.length, 2);
  assert.equal(found.status, "in-progress");
});

test("CompanyPrepAnalysis rejects scores outside 0-100", async () => {
  const user = await createUser();
  await assert.rejects(() =>
    CompanyPrepAnalysis.create({
      user: user._id,
      company: "Google",
      role: "Software Engineer",
      overallMatchScore: 120,
    })
  );
});

test("CompanyPrepAnalysis persists the four company-prep scores", async () => {
  const user = await createUser();
  const analysis = await CompanyPrepAnalysis.create({
    user: user._id,
    company: "Amazon",
    role: "Software Engineer",
    source: "fallback-heuristic",
    technicalSkillsScore: 70,
    dsaReadinessScore: 55,
    coreCSScore: 60,
    overallMatchScore: 64,
    summary: "Decent technical fit, DSA gaps in Trees.",
    gaps: ["Trees", "Graphs"],
  });

  const found = await CompanyPrepAnalysis.findById(analysis._id);
  assert.equal(found.overallMatchScore, 64);
  assert.equal(found.source, "fallback-heuristic");
  assert.deepEqual(found.gaps, ["Trees", "Graphs"]);
});

test("ActivityEvent rejects unknown event types", async () => {
  const user = await createUser();
  await assert.rejects(() =>
    ActivityEvent.create({ user: user._id, type: "not-a-real-event" })
  );
});

test("ActivityEvent persists a typed event", async () => {
  const user = await createUser();
  const event = await ActivityEvent.create({
    user: user._id,
    type: "dsa_question_completed",
    summary: "Completed Edit Distance (Hard, DP)",
    metadata: { questionId: "5", topic: "DP" },
  });

  const found = await ActivityEvent.findById(event._id);
  assert.equal(found.type, "dsa_question_completed");
  assert.equal(found.metadata.topic, "DP");
});

test("ResumeAnalysis persists analysis fields", async () => {
  const user = await createUser();
  const analysis = await ResumeAnalysis.create({
    user: user._id,
    filename: "resume.pdf",
    atsScore: 82,
    foundSkills: ["JavaScript", "React"],
    missingSkills: ["Docker"],
    recommendations: ["Add Docker to the skills section."],
    aiFeedback: "Solid project descriptions.",
  });

  const found = await ResumeAnalysis.findById(analysis._id);
  assert.equal(found.atsScore, 82);
  assert.deepEqual(found.missingSkills, ["Docker"]);
});
