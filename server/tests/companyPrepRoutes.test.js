process.env.JWT_SECRET = "test-secret";
process.env.COMPANY_PREP_AI_ENABLED = "false";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const User = require("../src/models/User");
const UserDSAProgress = require("../src/models/UserDSAProgress");
const CompanyPrepAnalysis = require("../src/models/CompanyPrepAnalysis");
const { connectTestDB, disconnectTestDB } = require("./helpers/db");

let server;
let baseUrl;

before(async () => {
  await connectTestDB.bind(null, "ai_career_test_company_routes")();
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
  await CompanyPrepAnalysis.init();
});

const createUser = async (email, skills = []) => {
  return User.create({
    name: "Test User",
    email,
    password: "secret123",
    skills,
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

const getOptions = (token) =>
  fetch(`${baseUrl}/company/options`, { headers: authed(token) });

const analyze = (token, body) =>
  fetch(`${baseUrl}/company/analyze`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });

const listAnalyses = (token) =>
  fetch(`${baseUrl}/company/analyses`, { headers: authed(token) });

const getAnalysis = (token, id) =>
  fetch(`${baseUrl}/company/analyses/${id}`, { headers: authed(token) });

test("company prep routes require authentication", async () => {
  assert.equal((await getOptions(undefined)).status, 401);

  const response = await analyze(undefined, {
    company: "Google",
    role: "Software Engineer",
    skills: [],
  });
  assert.equal(response.status, 401);
});

test("GET /company/options lists companies and roles", async () => {
  const user = await createUser("a@example.com");
  const response = await getOptions(tokenFor(user));

  assert.equal(response.status, 200);
  const body = await response.json();

  const google = body.companies.find((entry) => entry.name === "Google");
  assert.ok(google);
  assert.ok(google.roles.some((role) => role.role === "Software Engineer"));
  assert.equal(body.catalogVersion, 1);
});

test("POST /company/analyze returns scores and persists the analysis", async () => {
  const user = await createUser("a@example.com");
  const response = await analyze(tokenFor(user), {
    company: "Google",
    role: "Software Engineer",
    skills: ["Python", "Data Structures", "Problem Solving", "SQL", "Networking"],
  });

  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.overallMatchScore, 26);
  assert.equal(body.technicalSkillsScore, 34);
  assert.equal(body.coreCSScore, 50);
  assert.ok(Array.isArray(body.resources));
  assert.ok(body.resources.length > 0);

  const doc = await CompanyPrepAnalysis.findOne({ user: user._id });
  assert.ok(doc);
  assert.equal(doc.company, "Google");
  assert.equal(doc.role, "Software Engineer");
});

test("analyze rejects an unknown company with 400", async () => {
  const user = await createUser("a@example.com");
  const response = await analyze(tokenFor(user), {
    company: "NopeCorp",
    role: "Software Engineer",
    skills: [],
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.message, /Unknown company/);
});

test("analyze rejects an invalid role for the company with 400", async () => {
  const user = await createUser("a@example.com");
  const response = await analyze(tokenFor(user), {
    company: "Google",
    role: "Not A Real Role",
    skills: [],
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.message, /Unknown role for this company/);
});

test("analyze rejects an invalid company/role combination with 400", async () => {
  const user = await createUser("a@example.com");
  const response = await analyze(tokenFor(user), {
    company: "Google",
    role: "System Engineer",
    skills: [],
  });

  assert.equal(response.status, 400);
});

test("analyze rejects invalid skills payloads with 400", async () => {
  const user = await createUser("a@example.com");

  const response = await analyze(tokenFor(user), {
    company: "Google",
    role: "Software Engineer",
    skills: "python, java",
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.message, /skills must be an array of strings/);
});

test("analyze falls back to saved user skills when none are sent", async () => {
  const user = await createUser("a@example.com", ["Python"]);

  const response = await analyze(tokenFor(user), {
    company: "Infosys",
    role: "System Engineer",
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.skillMatch.matchedRequiredSkills.includes("Python"));
});

test("saved analyses are scoped to the owner", async () => {
  const userA = await createUser("a@example.com");
  const userB = await createUser("b@example.com");

  const created = await analyze(tokenFor(userA), {
    company: "Google",
    role: "Software Engineer",
    skills: ["Python"],
  });
  const createdBody = await created.json();
  const analysisId = createdBody.id;

  const forB = await getAnalysis(tokenFor(userB), analysisId);
  assert.equal(forB.status, 404);

  const listB = await (await listAnalyses(tokenFor(userB))).json();
  assert.deepEqual(listB.analyses, []);

  const forA = await getAnalysis(tokenFor(userA), analysisId);
  assert.equal(forA.status, 200);

  const listA = await (await listAnalyses(tokenFor(userA))).json();
  assert.equal(listA.analyses.length, 1);
});

test("GET /company/analyses lists the user's saved analyses", async () => {
  const user = await createUser("a@example.com");
  const token = tokenFor(user);

  await analyze(token, { company: "Google", role: "Software Engineer", skills: ["Python"] });
  await analyze(token, { company: "Infosys", role: "System Engineer", skills: ["Java"] });

  const response = await listAnalyses(token);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.analyses.length, 2);
  assert.equal(body.analyses[0].company, "Infosys");
});

test("malformed analysis id returns 404", async () => {
  const user = await createUser("a@example.com");
  const response = await getAnalysis(tokenFor(user), "not-an-object-id");

  assert.equal(response.status, 404);
});
