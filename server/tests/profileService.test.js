const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

process.env.JWT_SECRET = "test-secret";

const { connectTestDB, disconnectTestDB } = require("./helpers/db");

const User = require("../src/models/User");
const UserDSAProgress = require("../src/models/UserDSAProgress");
const ResumeAnalysis = require("../src/models/ResumeAnalysis");
const CompanyPrepAnalysis = require("../src/models/CompanyPrepAnalysis");
const MockInterviewSession = require("../src/models/MockInterviewSession");
const ActivityEvent = require("../src/models/ActivityEvent");

const profileService = require("../src/services/profileService");
const activityService = require("../src/services/activityService");

const DAY_MS = 86400000;

before(connectTestDB.bind(null, "ai_career_test_profile_service"));
after(disconnectTestDB);

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await UserDSAProgress.init();
});

const createUser = async (overrides = {}) => {
  return User.create({
    name: "Test User",
    email: `user_${Math.random().toString(36).slice(2)}@example.com`,
    password: "secret123",
    ...overrides,
  });
};

const insertActivityAt = async ({ userId, type, daysAgo, summary, key }) => {
  const createdAt = new Date(Date.now() - daysAgo * DAY_MS);
  return ActivityEvent.collection.insertOne({
    user: userId,
    type,
    summary: summary || type,
    metadata: { key: key || null },
    createdAt,
    updatedAt: createdAt,
  });
};

const createCompletedSession = async ({ user, overallScore, weakTopics = [], topicPerformance = [], interviewType = "Technical" }) => {
  return MockInterviewSession.create({
    user: user._id,
    targetRole: "Software Engineer",
    company: "Google",
    interviewType,
    totalQuestions: 2,
    currentIndex: 2,
    status: "completed",
    overallScore,
    weakTopics,
    topicPerformance,
    completedAt: new Date(),
    questions: [
      {
        questionId: "1",
        topic: "Arrays",
        difficulty: "Medium",
        questionText: "Q1",
        answerText: "Answer",
        isSkipped: false,
        evaluation: { score: 80 },
      },
      {
        questionId: "2",
        topic: "Graphs",
        difficulty: "Medium",
        questionText: "Q2",
        answerText: "Answer",
        isSkipped: false,
        evaluation: { score: 40 },
      },
    ],
  });
};

// -------------------------------
// Profile mutations
// -------------------------------

test("addInterestedCompany validates against the controlled catalog", async () => {
  const user = await createUser();

  const ok = await profileService.addInterestedCompany({
    userId: user._id,
    company: "Google",
    role: "Software Engineer",
  });

  assert.ok(ok.interestedCompanies.some((entry) => entry.company === "Google"));
  assert.deepEqual(
    ok.interestedCompanies.find((entry) => entry.company === "Google").roles,
    ["Software Engineer"]
  );

  await assert.rejects(
    () => profileService.addInterestedCompany({ userId: user._id, company: "Meta" }),
    (error) => error.status === 400 && error.message === "Unknown company"
  );

  await assert.rejects(
    () =>
      profileService.addInterestedCompany({
        userId: user._id,
        company: "Google",
        role: "Not A Real Role",
      }),
    (error) => error.status === 400 && error.message === "Unknown role for this company"
  );
});

test("addInterestedCompany is idempotent for duplicates", async () => {
  const user = await createUser();

  await profileService.addInterestedCompany({ userId: user._id, company: "Amazon", role: "Software Engineer" });
  const again = await profileService.addInterestedCompany({ userId: user._id, company: "Amazon" });

  assert.equal(again.interestedCompanies.length, 1);
  assert.equal(again.interestedCompanies[0].roles.length, 1);
});

test("removeInterestedCompany removes the company and its associated roles", async () => {
  const user = await createUser({
    interestedCompanies: ["Google", "Amazon"],
    interestedCompanyRoles: [
      { company: "Google", role: "Software Engineer" },
      { company: "Amazon", role: "Software Engineer" },
    ],
  });

  const result = await profileService.removeInterestedCompany({ userId: user._id, company: "Google" });

  assert.deepEqual(
    result.interestedCompanies.map((entry) => entry.company),
    ["Amazon"]
  );
  assert.equal(result.interestedCompanies[0].roles.length, 1);
});

test("addTargetRole validates against the catalog and dedupes", async () => {
  const user = await createUser();

  const ok = await profileService.addTargetRole({ userId: user._id, role: "Software Engineer" });
  assert.deepEqual(ok.targetRoles, ["Software Engineer"]);

  const dup = await profileService.addTargetRole({ userId: user._id, role: "software engineer" });
  assert.equal(dup.targetRoles.length, 1);

  await assert.rejects(
    () => profileService.addTargetRole({ userId: user._id, role: "Astronaut" }),
    (error) => error.status === 400 && error.message === "Unknown role"
  );
});

test("removeTargetRole is case-insensitive and idempotent", async () => {
  const user = await createUser({ targetRoles: ["System Engineer", "Software Engineer"] });

  const result = await profileService.removeTargetRole({ userId: user._id, role: "SYSTEM ENGINEER" });

  assert.deepEqual(result.targetRoles, ["Software Engineer"]);
});

test("updateProfile validates name and skills", async () => {
  const user = await createUser({ skills: ["JavaScript"] });

  const updated = await profileService.updateProfile({
    userId: user._id,
    name: "New Name",
    skills: ["JavaScript", " JavaScript ", "", "Node.js"],
  });

  assert.equal(updated.name, "New Name");
  assert.deepEqual(updated.skills, ["JavaScript", "Node.js"]);

  await assert.rejects(
    () => profileService.updateProfile({ userId: user._id, name: "A" }),
    (error) => error.status === 400
  );

  await assert.rejects(
    () => profileService.updateProfile({ userId: user._id, skills: "not-array" }),
    (error) => error.status === 400
  );
});

// -------------------------------
// Profile summary
// -------------------------------

test("empty profile returns an honest empty summary", async () => {
  const user = await createUser();

  const summary = await profileService.getProfileSummary(user._id);

  assert.equal(summary.user.name, "Test User");
  assert.equal(summary.latestScores.resume, null);
  assert.equal(summary.latestScores.companyPrep, null);
  assert.equal(summary.latestScores.mockInterview, null);
  assert.equal(summary.latestScores.dsaReadiness.score, 0);
  assert.deepEqual(summary.weakTopics, []);
  assert.equal(summary.streak.current, 0);
  assert.equal(summary.streak.longest, 0);
  assert.deepEqual(summary.recentActivity, []);
  assert.equal(summary.hasData, false);
  assert.equal(summary.counts.dsaCompleted, 0);
  assert.ok(summary.recommendedActions.length > 0);
});

test("profile summary aggregates latest real scores", async () => {
  const user = await createUser({ skills: ["Python", "JavaScript"] });

  await UserDSAProgress.create({
    user: user._id,
    records: [
      { questionId: "1", topic: "Arrays", difficulty: "Easy", completedAt: new Date() },
    ],
  });

  await ResumeAnalysis.create({
    user: user._id,
    filename: "r.pdf",
    atsScore: 70,
    foundSkills: ["Python"],
    missingSkills: [],
    recommendations: [],
    source: "fallback-heuristic",
  });

  await CompanyPrepAnalysis.create({
    user: user._id,
    company: "Google",
    role: "Software Engineer",
    source: "fallback-heuristic",
    technicalSkillsScore: 60,
    dsaReadinessScore: 50,
    coreCSScore: 40,
    overallMatchScore: 52,
    focusTopics: ["Trees"],
  });

  await createCompletedSession({ user, overallScore: 62 });

  const summary = await profileService.getProfileSummary(user._id);

  assert.equal(summary.latestScores.resume.score, 70);
  assert.equal(summary.latestScores.companyPrep.score, 52);
  assert.equal(summary.latestScores.companyPrep.company, "Google");
  assert.equal(summary.latestScores.mockInterview.score, 62);
  assert.ok(summary.latestScores.dsaReadiness.score > 0);
  assert.equal(summary.hasData, true);
  assert.equal(summary.counts.mockInterviewsCompleted, 1);
  assert.equal(summary.counts.companyPrepsCompleted, 1);
  assert.equal(summary.counts.resumeAnalyses, 1);
  assert.equal(summary.counts.dsaCompleted, 1);
});

test("profile summary is user-scoped (isolation)", async () => {
  const userA = await createUser();
  const userB = await createUser();

  await ResumeAnalysis.create({
    user: userA._id,
    filename: "a.pdf",
    atsScore: 90,
    source: "fallback-heuristic",
  });
  await createCompletedSession({ user: userA, overallScore: 80 });

  const summaryB = await profileService.getProfileSummary(userB._id);

  assert.equal(summaryB.latestScores.resume, null);
  assert.equal(summaryB.latestScores.mockInterview, null);
  assert.equal(summaryB.hasData, false);
});

// -------------------------------
// Activity recording + streaks
// -------------------------------

test("recordActivity creates an event and dedupes same-day identical events", async () => {
  const user = await createUser();

  const first = await activityService.recordActivity({
    userId: user._id,
    type: "resume_analyzed",
    summary: "First",
    metadata: { key: "analysis" },
  });

  const second = await activityService.recordActivity({
    userId: user._id,
    type: "resume_analyzed",
    summary: "Second",
    metadata: { key: "analysis" },
  });

  assert.equal(String(first._id), String(second._id));
  const count = await ActivityEvent.countDocuments({ user: user._id });
  assert.equal(count, 1);

  // An event with the same key on a different day is a separate, valid event.
  const yesterday = new Date(Date.now() - DAY_MS);
  await ActivityEvent.collection.insertOne({
    user: user._id,
    type: "resume_analyzed",
    summary: "Next day",
    metadata: { key: "analysis" },
    createdAt: yesterday,
    updatedAt: yesterday,
  });

  const again = await activityService.recordActivity({
    userId: user._id,
    type: "resume_analyzed",
    summary: "Still today",
    metadata: { key: "analysis" },
  });

  // Same-day dedup still returns today's event, and yesterday's event remains.
  assert.equal(String(again._id), String(first._id));
  const total = await ActivityEvent.countDocuments({ user: user._id });
  assert.equal(total, 2);
});

test("recordActivity rejects unknown types", async () => {
  const user = await createUser();

  await assert.rejects(
    () => activityService.recordActivity({ userId: user._id, type: "bogus" }),
    (error) => error.status === 400
  );
});

test("streak counts distinct active days only (duplicates do not inflate)", async () => {
  const user = await createUser();

  // Two events today + two events yesterday must equal a 2-day streak.
  await activityService.recordActivity({ userId: user._id, type: "dsa_question_completed", metadata: { key: "q:1" } });
  await activityService.recordActivity({ userId: user._id, type: "dsa_question_completed", metadata: { key: "q:2" } });

  const yesterday = new Date(Date.now() - DAY_MS);
  await ActivityEvent.collection.insertOne({
    user: user._id,
    type: "company_prep",
    summary: "",
    metadata: { key: null },
    createdAt: yesterday,
    updatedAt: yesterday,
  });
  await ActivityEvent.collection.insertOne({
    user: user._id,
    type: "mock_interview_completed",
    summary: "",
    metadata: { key: null },
    createdAt: yesterday,
    updatedAt: yesterday,
  });

  const streak = await activityService.getStreak(user._id);

  assert.equal(streak.current, 2);
  assert.equal(streak.longest, 2);
});

test("broken streak reports current 0 when last activity is older than yesterday", async () => {
  const user = await createUser();

  await insertActivityAt({ userId: user._id, type: "dsa_question_completed", daysAgo: 3 });
  await insertActivityAt({ userId: user._id, type: "dsa_question_completed", daysAgo: 2 });

  const streak = await activityService.getStreak(user._id);

  assert.equal(streak.current, 0);
  assert.equal(streak.longest, 2);
});

test("yesterday-only activity keeps the current streak alive", async () => {
  const user = await createUser();

  await insertActivityAt({ userId: user._id, type: "dsa_question_completed", daysAgo: 1 });

  const streak = await activityService.getStreak(user._id);

  assert.equal(streak.current, 1);
  assert.equal(streak.longest, 1);
});

test("longest streak is measured across gaps", async () => {
  const user = await createUser();

  // Run of 3 (5,4,3 days ago), gap, run of 2 (yesterday, today).
  await insertActivityAt({ userId: user._id, type: "dsa_question_completed", daysAgo: 5 });
  await insertActivityAt({ userId: user._id, type: "dsa_question_completed", daysAgo: 4 });
  await insertActivityAt({ userId: user._id, type: "dsa_question_completed", daysAgo: 3 });
  await insertActivityAt({ userId: user._id, type: "dsa_question_completed", daysAgo: 1 });
  await insertActivityAt({ userId: user._id, type: "dsa_question_completed", daysAgo: 0 });

  const streak = await activityService.getStreak(user._id);

  assert.equal(streak.current, 2);
  assert.equal(streak.longest, 3);
});

test("computeStreaks handles empty input deterministically", () => {
  assert.deepEqual(activityService.computeStreaks([]), { current: 0, longest: 0 });
});

test("listActivity returns newest events first", async () => {
  const user = await createUser();

  await insertActivityAt({ userId: user._id, type: "dsa_question_completed", daysAgo: 1, summary: "Old" });
  await activityService.recordActivity({
    userId: user._id,
    type: "resume_analyzed",
    summary: "New",
    metadata: { key: "analysis" },
  });

  const events = await activityService.listActivity({ userId: user._id });

  assert.equal(events.length, 2);
  assert.equal(events[0].summary, "New");
});

// -------------------------------
// Performance history
// -------------------------------

test("performance history returns chronological data across all sources", async () => {
  const user = await createUser();

  const older = new Date(Date.now() - 3 * DAY_MS);
  const newer = new Date(Date.now() - DAY_MS);

  const r1 = await ResumeAnalysis.create({ user: user._id, filename: "a.pdf", atsScore: 50, source: "fallback-heuristic" });
  const r2 = await ResumeAnalysis.create({ user: user._id, filename: "b.pdf", atsScore: 80, source: "fallback-heuristic" });
  await ResumeAnalysis.updateOne({ _id: r1._id }, { $set: { createdAt: older } });
  await ResumeAnalysis.updateOne({ _id: r2._id }, { $set: { createdAt: newer } });

  const c1 = await CompanyPrepAnalysis.create({ user: user._id, company: "Google", role: "Software Engineer", source: "fallback-heuristic", overallMatchScore: 40 });
  const c2 = await CompanyPrepAnalysis.create({ user: user._id, company: "Amazon", role: "Software Engineer", source: "fallback-heuristic", overallMatchScore: 70 });
  await CompanyPrepAnalysis.updateOne({ _id: c1._id }, { $set: { createdAt: older } });
  await CompanyPrepAnalysis.updateOne({ _id: c2._id }, { $set: { createdAt: newer } });

  const m1 = await createCompletedSession({ user, overallScore: 30 });
  await MockInterviewSession.updateOne({ _id: m1._id }, { $set: { completedAt: older } });
  const m2 = await createCompletedSession({ user, overallScore: 90 });
  await MockInterviewSession.updateOne({ _id: m2._id }, { $set: { completedAt: newer } });

  const history = await profileService.getPerformanceHistory(user._id);

  assert.equal(history.resumeAnalyses.length, 2);
  assert.equal(history.resumeAnalyses[0].atsScore, 50);
  assert.equal(history.resumeAnalyses[1].atsScore, 80);

  assert.equal(history.companyPrep.length, 2);
  assert.equal(history.companyPrep[0].overallMatchScore, 40);
  assert.equal(history.companyPrep[1].overallMatchScore, 70);

  assert.equal(history.mockInterviews.length, 2);
  assert.equal(history.mockInterviews[0].overallScore, 30);
  assert.equal(history.mockInterviews[1].overallScore, 90);
  assert.equal(history.mockInterviews[1].answeredCount, 2);
  assert.equal(history.mockInterviews[1].totalQuestions, 2);
});

test("performance history is empty when no data exists", async () => {
  const user = await createUser();

  const history = await profileService.getPerformanceHistory(user._id);

  assert.deepEqual(history.mockInterviews, []);
  assert.deepEqual(history.companyPrep, []);
  assert.deepEqual(history.resumeAnalyses, []);
});

// -------------------------------
// Weak-topic aggregation
// -------------------------------

test("one failed evaluation does not create a weak topic without evidence", async () => {
  const user = await createUser();
  const dsaProfile = await profileService.aggregateWeakTopics({
    userId: user._id,
    dsaProfile: { priorityGaps: [], weakTopics: [] },
    companyPreps: [],
    mockSessions: [
      {
        weakTopics: ["Trees"],
        topicPerformance: [{ topic: "Trees", asked: 2, evaluated: 1, avgScore: 20, lowCount: 1 }],
      },
    ],
  });

  assert.deepEqual(dsaProfile, []);
});

test("repeated mock weakness across sessions becomes a weak topic", async () => {
  const user = await createUser();
  const topics = await profileService.aggregateWeakTopics({
    userId: user._id,
    dsaProfile: { priorityGaps: [], weakTopics: [] },
    companyPreps: [],
    mockSessions: [
      { weakTopics: ["Trees"], topicPerformance: [{ topic: "Trees", lowCount: 1 }] },
      { weakTopics: ["Trees"], topicPerformance: [{ topic: "Trees", lowCount: 1 }] },
    ],
  });

  const trees = topics.find((entry) => entry.topic === "Trees");
  assert.ok(trees);
  assert.ok(trees.sources.includes("mock-interview"));
});

test("dsa gap alone qualifies as a weak topic", async () => {
  const user = await createUser();
  const topics = await profileService.aggregateWeakTopics({
    userId: user._id,
    dsaProfile: {
      totals: { completed: 1 },
      priorityGaps: [{ topic: "Graphs", priority: "High" }],
      weakTopics: [],
    },
    companyPreps: [],
    mockSessions: [],
  });

  assert.deepEqual(topics.map((entry) => entry.topic), ["Graphs"]);
  assert.ok(topics[0].sources.includes("dsa-gap"));
});

test("dsa weak volume alone qualifies as a weak topic", async () => {
  const user = await createUser();
  const topics = await profileService.aggregateWeakTopics({
    userId: user._id,
    dsaProfile: {
      totals: { completed: 1 },
      priorityGaps: [],
      weakTopics: [{ topic: "Arrays", priority: "High" }],
    },
    companyPreps: [],
    mockSessions: [],
  });

  assert.ok(topics.some((entry) => entry.topic === "Arrays" && entry.sources.includes("dsa")));
});

test("weak topics are sorted by evidence score then priority", async () => {
  const user = await createUser();
  const topics = await profileService.aggregateWeakTopics({
    userId: user._id,
    dsaProfile: {
      totals: { completed: 1 },
      priorityGaps: [{ topic: "Graphs", priority: "High" }],
      weakTopics: [{ topic: "Arrays", priority: "Medium" }],
    },
    companyPreps: [{ focusTopics: ["Trees"] }],
    mockSessions: [],
  });

  // Graphs: 3 (dsa-gap, High), Arrays: 3 (dsa, Medium), Trees: 3 (company-prep, Low).
  assert.deepEqual(
    topics.map((entry) => entry.topic),
    ["Graphs", "Arrays", "Trees"]
  );
});

// -------------------------------
// Recommended actions
// -------------------------------

test("recommended actions start with resume analysis on an empty profile", async () => {
  const actions = profileService.recommendNextActions({
    dsaProfile: { priorityGaps: [], weakTopics: [] },
    latestResume: null,
    latestCompanyPrep: null,
    latestMock: null,
    user: { interestedCompanies: [] },
  });

  assert.equal(actions[0].source, "resume");
  assert.ok(actions.some((action) => action.source === "mock-interview"));
});
