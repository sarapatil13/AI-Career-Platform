process.env.JWT_SECRET = "test-secret";
process.env.MOCK_INTERVIEW_AI_ENABLED = "false";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const User = require("../src/models/User");
const UserDSAProgress = require("../src/models/UserDSAProgress");
const ResumeAnalysis = require("../src/models/ResumeAnalysis");
const MockInterviewSession = require("../src/models/MockInterviewSession");
const { connectTestDB, disconnectTestDB } = require("./helpers/db");

let server;
let baseUrl;

before(async () => {
  await connectTestDB.bind(null, "ai_career_test_profile_routes")();
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

const del = (path, token) =>
  fetch(`${baseUrl}${path}`, { method: "DELETE", headers: authed(token) });

const patch = (path, token, body) =>
  fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });

const put = (path, token, body) =>
  fetch(`${baseUrl}${path}`, {
    method: "PUT",
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });

test("profile routes require authentication", async () => {
  assert.equal((await get("/profile/summary")).status, 401);
  assert.equal((await get("/profile/activity")).status, 401);
  assert.equal((await get("/profile/performance")).status, 401);
  assert.equal((await post("/profile/companies", undefined, { company: "Google" })).status, 401);
  assert.equal((await post("/profile/roles", undefined, { role: "Software Engineer" })).status, 401);
  assert.equal((await patch("/profile", undefined, { name: "X" })).status, 401);
});

test("GET /profile/summary returns an honest empty state for a fresh user", async () => {
  const user = await createUser("empty@example.com");

  const response = await get("/profile/summary", tokenFor(user));
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.user.email, "empty@example.com");
  assert.equal(body.latestScores.resume, null);
  assert.equal(body.latestScores.companyPrep, null);
  assert.equal(body.latestScores.mockInterview, null);
  assert.equal(body.hasData, false);
});

test("POST /profile/companies validates against the catalog", async () => {
  const user = await createUser("companies@example.com");
  const token = tokenFor(user);

  const ok = await post("/profile/companies", token, { company: "Google", role: "Software Engineer" });
  assert.equal(ok.status, 200);
  const okBody = await ok.json();
  assert.ok(okBody.interestedCompanies.some((entry) => entry.company === "Google"));
  assert.deepEqual(
    okBody.interestedCompanies.find((entry) => entry.company === "Google").roles,
    ["Software Engineer"]
  );

  const badCompany = await post("/profile/companies", token, { company: "Meta" });
  assert.equal(badCompany.status, 400);

  const badRole = await post("/profile/companies", token, { company: "Google", role: "Astronaut" });
  assert.equal(badRole.status, 400);

  const summary = await (await get("/profile/summary", token)).json();
  assert.equal(summary.interestedCompanies.length, 1);
});

test("DELETE /profile/companies/:company removes an interest", async () => {
  const user = await createUser("remove-company@example.com");
  const token = tokenFor(user);

  await post("/profile/companies", token, { company: "Amazon", role: "Software Engineer" });
  await post("/profile/companies", token, { company: "Google" });

  const response = await del("/profile/companies/Amazon", token);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.deepEqual(
    body.interestedCompanies.map((entry) => entry.company),
    ["Google"]
  );
});

test("POST /profile/roles validates against the catalog", async () => {
  const user = await createUser("roles@example.com");
  const token = tokenFor(user);

  const ok = await post("/profile/roles", token, { role: "System Engineer" });
  assert.equal(ok.status, 200);
  assert.ok((await ok.json()).targetRoles.includes("System Engineer"));

  const bad = await post("/profile/roles", token, { role: "Astronaut" });
  assert.equal(bad.status, 400);
});

test("DELETE /profile/roles/:role removes a target role", async () => {
  const user = await createUser("remove-role@example.com");
  const token = tokenFor(user);

  await post("/profile/roles", token, { role: "Software Engineer" });
  await post("/profile/roles", token, { role: "Cloud Support Engineer" });

  const response = await del("/profile/roles/Software%20Engineer", token);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.deepEqual(body.targetRoles, ["Cloud Support Engineer"]);
});

test("PATCH /profile updates name and skills", async () => {
  const user = await createUser("patch@example.com");
  const token = tokenFor(user);

  const response = await patch("/profile", token, {
    name: "Updated Name",
    skills: ["Python", "Python", " SQL "],
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.name, "Updated Name");
  assert.deepEqual(body.user.skills, ["Python", "SQL"]);

  const bad = await patch("/profile", token, { skills: "nope" });
  assert.equal(bad.status, 400);
});

test("activity is recorded by real flows and surfaced in /profile/activity", async () => {
  const user = await createUser("activity@example.com");
  const token = tokenFor(user);

  await put("/dsa/progress", token, { questionId: "1", completed: true });

  const response = await get("/profile/activity", token);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.streak.current, 1);
  assert.equal(body.streak.longest, 1);
  assert.ok(body.events.length >= 1);
  assert.ok(body.events.some((event) => event.type === "dsa_question_completed"));
});

test("duplicate activity on the same day does not inflate the streak", async () => {
  const user = await createUser("dedup-activity@example.com");
  const token = tokenFor(user);

  await put("/dsa/progress", token, { questionId: "1", completed: true });
  await put("/dsa/progress", token, { questionId: "2", completed: true });
  await put("/dsa/progress", token, { questionId: "2", completed: false });
  await put("/dsa/progress", token, { questionId: "2", completed: true });

  const body = await (await get("/profile/activity", token)).json();
  assert.equal(body.streak.current, 1);
});

test("completed mock interviews record activity through the API", async () => {
  const user = await createUser("mi-activity@example.com");
  const token = tokenFor(user);

  const startRes = await post("/mock-interview/start", token, {
    interviewType: "Technical",
    company: "Google",
    role: "Software Engineer",
    difficulty: "Medium",
    totalQuestions: 2,
  });
  const session = (await startRes.json()).session;

  await post(`/mock-interview/sessions/${session.id}/submit-answer`, token, {
    answerText: "BFS with a visited set for the shortest path.",
  });
  await post(`/mock-interview/sessions/${session.id}/submit-answer`, token, {
    answerText: "Use a hash map for constant-time lookups.",
  });
  await post(`/mock-interview/sessions/${session.id}/complete`, token, {});

  const body = await (await get("/profile/activity", token)).json();
  assert.ok(body.events.some((event) => event.type === "mock_interview_completed"));
});

test("GET /profile/performance returns user data chronologically", async () => {
  const user = await createUser("performance@example.com");
  const token = tokenFor(user);

  await ResumeAnalysis.create({
    user: user._id,
    filename: "r.pdf",
    atsScore: 65,
    source: "fallback-heuristic",
  });

  await MockInterviewSession.create({
    user: user._id,
    targetRole: "Software Engineer",
    company: "Google",
    interviewType: "Technical",
    status: "completed",
    totalQuestions: 1,
    overallScore: 70,
    completedAt: new Date(),
    questions: [{ questionId: "1", topic: "Arrays", difficulty: "Medium", questionText: "Q", answerText: "A", isSkipped: false, evaluation: { score: 70 } }],
  });

  const response = await get("/profile/performance", token);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.resumeAnalyses.length, 1);
  assert.equal(body.resumeAnalyses[0].atsScore, 65);
  assert.equal(body.mockInterviews.length, 1);
  assert.equal(body.mockInterviews[0].overallScore, 70);
});

test("user isolation: user A data never leaks into user B summary", async () => {
  const userA = await createUser("isolation-a@example.com");
  const userB = await createUser("isolation-b@example.com");

  await ResumeAnalysis.create({
    user: userA._id,
    filename: "a.pdf",
    atsScore: 95,
    source: "fallback-heuristic",
  });

  const response = await get("/profile/summary", tokenFor(userB));
  const body = await response.json();

  assert.equal(body.latestScores.resume, null);
  assert.equal(body.hasData, false);
});
