process.env.JWT_SECRET = "test-secret";
process.env.MOCK_INTERVIEW_AI_ENABLED = "false";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const User = require("../src/models/User");
const MockInterviewSession = require("../src/models/MockInterviewSession");
const { connectTestDB, disconnectTestDB } = require("./helpers/db");

let server;
let baseUrl;

before(async () => {
  await connectTestDB.bind(null, "ai_career_test_mock_interview_routes")();
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
  await MockInterviewSession.init();
});

const createUser = async (email) => {
  return User.create({
    name: "Test User",
    email,
    password: "secret123",
  });
};

const tokenFor = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const authed = (token) => ({ Authorization: `Bearer ${token}` });
const jsonHeaders = (token) => ({
  ...authed(token),
  "Content-Type": "application/json",
});

const post = (path, token, body) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });

const get = (path, token) => fetch(`${baseUrl}${path}`, { headers: authed(token) });

const startSession = (token, body) =>
  post("/mock-interview/start", token, {
    interviewType: "Technical",
    company: "Google",
    role: "Software Engineer",
    difficulty: "Medium",
    ...body,
  });

const startAndReturn = async (token, body) => {
  const response = await startSession(token, body);
  const result = await response.json();
  return { response, session: result.session };
};

test("mock interview routes require authentication", async () => {
  assert.equal((await get("/mock-interview/options")).status, 401);
  assert.equal(
    (
      await post("/mock-interview/start", undefined, {
        interviewType: "Technical",
        role: "Software Engineer",
        difficulty: "Medium",
      })
    ).status,
    401
  );
  assert.equal((await get("/mock-interview/sessions")).status, 401);
});

test("GET /mock-interview/options returns the controlled catalog", async () => {
  const user = await createUser("options@example.com");
  const response = await get("/mock-interview/options", tokenFor(user));

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.types.includes("Technical"));
  assert.ok(body.types.includes("HR"));
  assert.deepEqual(body.difficulties, ["Easy", "Medium", "Hard"]);
  assert.ok(body.roles.includes("Software Engineer"));
  assert.ok(body.companies.includes("Google"));
});

test("POST /mock-interview/start creates a technical session", async () => {
  const user = await createUser("start@example.com");
  const { response, session } = await startAndReturn(tokenFor(user));

  assert.equal(response.status, 200);
  assert.equal(session.interviewType, "Technical");
  assert.equal(session.role, "Software Engineer");
  assert.equal(session.company, "Google");
  assert.equal(session.difficulty, "Medium");
  assert.equal(session.status, "in-progress");
  assert.equal(session.questions.length, 1);
  assert.ok(session.questions[0].questionText);
});

test("POST /mock-interview/start creates an HR session", async () => {
  const user = await createUser("hr@example.com");
  const { response, session } = await startAndReturn(tokenFor(user), {
    interviewType: "HR",
    difficulty: null,
  });

  assert.equal(response.status, 200);
  assert.equal(session.interviewType, "HR");
  assert.equal(session.difficulty, null);
});

test("start rejects an unknown role with 400", async () => {
  const user = await createUser("badrole@example.com");
  const response = await startSession(tokenFor(user), { role: "Nope" });

  assert.equal(response.status, 400);
});

test("start rejects an unknown company with 400", async () => {
  const user = await createUser("badco@example.com");
  const response = await startSession(tokenFor(user), { company: "NopeCorp" });

  assert.equal(response.status, 400);
});

test("start rejects a technical interview without difficulty", async () => {
  const user = await createUser("nodiff@example.com");
  const response = await startSession(tokenFor(user), { difficulty: null });

  assert.equal(response.status, 400);
});

test("submit-answer records the answer and advances the session", async () => {
  const user = await createUser("answer@example.com");
  const token = tokenFor(user);
  const { session } = await startAndReturn(token);

  const response = await post(
    `/mock-interview/sessions/${session.id}/submit-answer`,
    token,
    { answerText: "I would use a hash map." }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.answered.answerText, "I would use a hash map.");
  assert.equal(body.session.currentIndex, 1);
  assert.equal(body.session.questions.length, 2);
  assert.equal(body.session.status, "in-progress");
});

test("submit-answer rejects an empty answer with 400", async () => {
  const user = await createUser("empty@example.com");
  const token = tokenFor(user);
  const { session } = await startAndReturn(token);

  const response = await post(
    `/mock-interview/sessions/${session.id}/submit-answer`,
    token,
    { answerText: "" }
  );

  assert.equal(response.status, 400);
});

test("complete ends the session and returns the result", async () => {
  const user = await createUser("complete@example.com");
  const token = tokenFor(user);
  const { session } = await startAndReturn(token);

  await post(`/mock-interview/sessions/${session.id}/submit-answer`, token, {
    answerText: "My answer.",
  });

  const response = await post(`/mock-interview/sessions/${session.id}/complete`, token, {});

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.session.status, "completed");
  assert.ok(body.session.completedAt);
  assert.equal(body.session.overallScore, null);
});

test("GET /mock-interview/sessions/:id returns the session to its owner", async () => {
  const user = await createUser("get@example.com");
  const token = tokenFor(user);
  const { session } = await startAndReturn(token);

  const response = await get(`/mock-interview/sessions/${session.id}`, token);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.session.id, session.id);
});

test("unknown or malformed session ids return 404", async () => {
  const user = await createUser("missing@example.com");
  const token = tokenFor(user);

  const malformed = await get("/mock-interview/sessions/not-an-id", token);
  assert.equal(malformed.status, 404);

  const missing = await get(
    `/mock-interview/sessions/000000000000000000000000`,
    token
  );
  assert.equal(missing.status, 404);
});

test("a user cannot access another user's session", async () => {
  const userA = await createUser("a@example.com");
  const userB = await createUser("b@example.com");
  const { session } = await startAndReturn(tokenFor(userA));

  const bGet = await get(`/mock-interview/sessions/${session.id}`, tokenFor(userB));
  assert.equal(bGet.status, 404);

  const bSubmit = await post(
    `/mock-interview/sessions/${session.id}/submit-answer`,
    tokenFor(userB),
    { answerText: "intrusion" }
  );
  assert.equal(bSubmit.status, 404);

  const bComplete = await post(
    `/mock-interview/sessions/${session.id}/complete`,
    tokenFor(userB),
    {}
  );
  assert.equal(bComplete.status, 404);
});

test("GET /mock-interview/sessions lists only the user's sessions", async () => {
  const userA = await createUser("a2@example.com");
  const userB = await createUser("b2@example.com");

  await startAndReturn(tokenFor(userA));
  await startAndReturn(tokenFor(userA));
  await startAndReturn(tokenFor(userB));

  const response = await get("/mock-interview/sessions", tokenFor(userA));

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.sessions.length, 2);
});
