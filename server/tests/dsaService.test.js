const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { connectTestDB, disconnectTestDB } = require("./helpers/db");
const dsaService = require("../src/services/dsaService");
const User = require("../src/models/User");
const UserDSAProgress = require("../src/models/UserDSAProgress");

before(connectTestDB.bind(null, "ai_career_test_dsa_service"));
after(disconnectTestDB);

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await UserDSAProgress.init();
});

const createUser = async () => {
  return User.create({
    name: "Test User",
    email: "dsa@example.com",
    password: "secret123",
  });
};

const seedProgress = async (userId, records) => {
  await UserDSAProgress.create({ user: userId, records });
};

test("empty progress yields readiness 0 and no invented gaps", async () => {
  const user = await createUser();
  const profile = await dsaService.getProfile(user._id);

  assert.equal(profile.readinessScore, 0);
  assert.equal(profile.totals.completed, 0);
  assert.equal(profile.totals.topicsCovered, 0);
  assert.deepEqual(profile.coveredTopics, []);
  assert.deepEqual(profile.completedQuestionIds, []);
  assert.equal(profile.uncoveredRequiredTopics.length, 5);
  assert.equal(profile.priorityGaps.length, 5);
  assert.equal(profile.recommendedPractice.length, 5);
  assert.equal(profile.lastSyncedAt, null);
});

test("totals and per-topic aggregation", async () => {
  const user = await createUser();
  await seedProgress(user._id, [
    { questionId: "1", topic: "Arrays", difficulty: "Easy" },
    { questionId: "2", topic: "Arrays", difficulty: "Easy" },
  ]);

  const profile = await dsaService.getProfile(user._id);

  assert.equal(profile.totals.completed, 2);
  assert.equal(profile.totals.topicsCovered, 1);
  assert.equal(profile.totals.requiredCovered, 1);
  assert.equal(profile.totals.preferredCovered, 0);

  const arrays = profile.byTopic.find((entry) => entry.topic === "Arrays");
  assert.equal(arrays.covered, true);
  assert.equal(arrays.completed, 2);
  assert.equal(arrays.questions.length, 2);

  const strings = profile.byTopic.find((entry) => entry.topic === "Strings");
  assert.equal(strings.covered, false);
  assert.equal(strings.completed, 0);
});

test("readiness formula produces the exact approved value", async () => {
  const user = await createUser();
  await seedProgress(user._id, [
    { questionId: "1", topic: "Arrays", difficulty: "Easy" },
    { questionId: "3", topic: "Graphs", difficulty: "Medium" },
    { questionId: "4", topic: "Trees", difficulty: "Medium" },
    { questionId: "5", topic: "DP", difficulty: "Hard" },
  ]);

  const profile = await dsaService.getProfile(user._id);
  assert.equal(profile.readinessScore, 56);
});

test("completing below expected difficulty lowers the score", async () => {
  const user = await createUser();
  await seedProgress(user._id, [
    { questionId: "1", topic: "Arrays", difficulty: "Easy" },
  ]);

  const profile = await dsaService.getProfile(user._id);
  assert.equal(profile.readinessScore, 20);
  assert.equal(profile.totals.difficultyScore, 0.5);
});

test("required vs preferred topic gaps are reported separately", async () => {
  const user = await createUser();
  await seedProgress(user._id, [
    { questionId: "1", topic: "Arrays", difficulty: "Easy" },
  ]);

  const profile = await dsaService.getProfile(user._id);

  assert.deepEqual(profile.uncoveredRequiredTopics, [
    "Strings",
    "Trees",
    "Graphs",
    "DP",
  ]);
  assert.equal(profile.totals.requiredCovered, 1);
  assert.equal(profile.totals.preferredCovered, 0);
  assert.ok(profile.byTopic.every((entry) => entry.expectedDifficulty));
});

test("expected difficulty metadata is exposed per topic", async () => {
  const user = await createUser();
  await seedProgress(user._id, [
    { questionId: "3", topic: "Graphs", difficulty: "Medium" },
  ]);

  const profile = await dsaService.getProfile(user._id);
  const graphs = profile.byTopic.find((entry) => entry.topic === "Graphs");

  assert.equal(graphs.expectedDifficulty, "Hard");
  assert.equal(graphs.required, true);
  assert.equal(profile.totals.difficultyScore, 0.5);
});

test("priority gaps are ordered deterministically", async () => {
  const user = await createUser();
  const profile = await dsaService.getProfile(user._id);

  assert.deepEqual(
    profile.priorityGaps.map((gap) => gap.topic),
    ["Arrays", "Strings", "Trees", "Graphs", "DP"]
  );
  assert.equal(profile.recommendedPractice[0].topic, "Arrays");
  assert.equal(profile.recommendedPractice[0].reason, "Not started yet (required topic)");
});

test("weak topics are derived from below-volume coverage", async () => {
  const user = await createUser();
  await seedProgress(user._id, [
    { questionId: "1", topic: "Arrays", difficulty: "Easy" },
  ]);

  const profile = await dsaService.getProfile(user._id);

  assert.deepEqual(
    profile.weakTopics.map((entry) => entry.topic),
    ["Arrays"]
  );
  assert.equal(profile.weakTopics[0].completed, 1);
  assert.equal(profile.weakTopics[0].recommendedQuestions, 8);

  const practice = profile.recommendedPractice.find((entry) => entry.topic === "Arrays");
  assert.match(practice.reason, /Below recommended practice volume \(1 of 8\)/);
});

test("forged records are ignored by normalization", async () => {
  const user = await createUser();
  await seedProgress(user._id, [
    { questionId: "999", topic: "Fake", difficulty: "Hard" },
    { questionId: "evil", topic: "Graphs", difficulty: "Medium" },
  ]);

  const profile = await dsaService.getProfile(user._id);

  assert.equal(profile.totals.completed, 0);
  assert.equal(profile.totals.topicsCovered, 0);
  assert.equal(profile.readinessScore, 0);
});

test("duplicate records are deduplicated by questionId", async () => {
  const user = await createUser();
  await seedProgress(user._id, [
    { questionId: "1", topic: "Arrays", difficulty: "Easy" },
    { questionId: "1", topic: "Arrays", difficulty: "Easy" },
  ]);

  const profile = await dsaService.getProfile(user._id);
  assert.equal(profile.totals.completed, 1);
  assert.deepEqual(profile.completedQuestionIds, ["1"]);
});

test("question id helpers coerce numbers and reject unknown ids", () => {
  assert.equal(dsaService.isValidQuestionId(1), true);
  assert.equal(dsaService.isValidQuestionId("1"), true);
  assert.equal(dsaService.isValidQuestionId("999"), false);
  assert.equal(dsaService.getQuestionById(3).title, "Number of Islands");
});
