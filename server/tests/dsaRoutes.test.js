process.env.JWT_SECRET = "test-secret";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const User = require("../src/models/User");
const UserDSAProgress = require("../src/models/UserDSAProgress");
const { connectTestDB, disconnectTestDB } = require("./helpers/db");

let server;
let baseUrl;

before(async () => {
  await connectTestDB.bind(null, "ai_career_test_dsa_routes")();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectTestDB();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await UserDSAProgress.init();
});

const createUser = async (email) => {
  return User.create({ name: "Test User", email, password: "secret123" });
};

const tokenFor = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const authed = (token) => ({ Authorization: `Bearer ${token}` });

const getProgress = (token) =>
  fetch(`${baseUrl}/dsa/progress`, { headers: authed(token) });

const putProgress = (token, body) =>
  fetch(`${baseUrl}/dsa/progress`, {
    method: "PUT",
    headers: { ...authed(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const syncProgress = (token, body) =>
  fetch(`${baseUrl}/dsa/progress/sync`, {
    method: "POST",
    headers: { ...authed(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("DSA routes require authentication", async () => {
  const response = await fetch(`${baseUrl}/dsa/progress`);
  assert.equal(response.status, 401);

  const syncResponse = await fetch(`${baseUrl}/dsa/progress/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionIds: [] }),
  });
  assert.equal(syncResponse.status, 401);
});

test("GET /dsa/progress returns an empty profile for a new user", async () => {
  const user = await createUser("a@example.com");
  const response = await getProgress(tokenFor(user));

  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.equal(profile.readinessScore, 0);
  assert.deepEqual(profile.completedQuestionIds, []);
});

test("completing a question persists it with catalog-derived metadata", async () => {
  const user = await createUser("a@example.com");
  const response = await putProgress(tokenFor(user), {
    questionId: "1",
    completed: true,
  });

  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.deepEqual(profile.completedQuestionIds, ["1"]);
  assert.equal(profile.totals.completed, 1);

  const doc = await UserDSAProgress.findOne({ user: user._id });
  assert.equal(doc.records[0].topic, "Arrays");
  assert.equal(doc.records[0].difficulty, "Easy");
});

test("accepts a numeric questionId from the client", async () => {
  const user = await createUser("a@example.com");
  const response = await putProgress(tokenFor(user), {
    questionId: 4,
    completed: true,
  });

  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.deepEqual(profile.completedQuestionIds, ["4"]);
});

test("uncompleting a question removes it", async () => {
  const user = await createUser("a@example.com");
  const token = tokenFor(user);

  await putProgress(token, { questionId: "1", completed: true });
  const response = await putProgress(token, { questionId: "1", completed: false });

  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.deepEqual(profile.completedQuestionIds, []);
  assert.equal(profile.totals.completed, 0);
});

test("rejects invalid questionId even with forged topic/difficulty", async () => {
  const user = await createUser("a@example.com");
  const response = await putProgress(tokenFor(user), {
    questionId: "999",
    topic: "Fake",
    difficulty: "Hard",
    completed: true,
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.message, /Invalid questionId/);
});

test("rejects a non-boolean completed flag", async () => {
  const user = await createUser("a@example.com");
  const response = await putProgress(tokenFor(user), {
    questionId: "1",
    completed: "yes",
  });

  assert.equal(response.status, 400);
});

test("sync accepts catalog ids only and ignores unknown ids", async () => {
  const user = await createUser("a@example.com");
  const response = await syncProgress(tokenFor(user), {
    questionIds: ["1", 3, "forged-123", "1"],
  });

  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.deepEqual(profile.completedQuestionIds.sort(), ["1", "3"]);
  assert.equal(profile.addedCount, 2);
});

test("duplicate sync is idempotent", async () => {
  const user = await createUser("a@example.com");
  const token = tokenFor(user);

  await syncProgress(token, { questionIds: ["1", "3"] });
  const second = await syncProgress(token, { questionIds: ["1", "3", "5"] });
  const profile = await second.json();

  assert.equal(profile.addedCount, 1);
  assert.deepEqual(profile.completedQuestionIds.sort(), ["1", "3", "5"]);
});

test("sync rejects a non-array payload", async () => {
  const user = await createUser("a@example.com");
  const response = await syncProgress(tokenFor(user), { questionIds: "nope" });

  assert.equal(response.status, 400);
});

test("user A cannot read or mutate user B's progress", async () => {
  const userA = await createUser("a@example.com");
  const userB = await createUser("b@example.com");

  await putProgress(tokenFor(userA), { questionId: "1", completed: true });

  const profileB = await (await getProgress(tokenFor(userB))).json();
  assert.deepEqual(profileB.completedQuestionIds, []);
  assert.equal(profileB.totals.completed, 0);

  const profileA = await (await getProgress(tokenFor(userA))).json();
  assert.deepEqual(profileA.completedQuestionIds, ["1"]);

  const docA = await UserDSAProgress.findOne({ user: userA._id });
  const docB = await UserDSAProgress.findOne({ user: userB._id });
  assert.equal(docA.records.length, 1);
  assert.equal(docB, null);
});
