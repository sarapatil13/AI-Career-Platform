const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { connectTestDB, disconnectTestDB } = require("./helpers/db");
const companyPrepService = require("../src/services/companyPrepService");
const dsaService = require("../src/services/dsaService");
const CompanyPrepAnalysis = require("../src/models/CompanyPrepAnalysis");
const User = require("../src/models/User");
const UserDSAProgress = require("../src/models/UserDSAProgress");

before(connectTestDB.bind(null, "ai_career_test_company_service"));
after(disconnectTestDB);

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await UserDSAProgress.init();
  await CompanyPrepAnalysis.init();
});

const createUser = async () => {
  return User.create({
    name: "Test User",
    email: "company@example.com",
    password: "secret123",
  });
};

const seedDsaProgress = async (userId, records) => {
  await UserDSAProgress.create({ user: userId, records });
};

const GOOGLE_SWE_SKILLS = ["Python", "Data Structures", "Problem Solving", "SQL", "Networking"];

test("valid company/role yields exact deterministic scores", async () => {
  const user = await createUser();

  const analysis = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Google",
    role: "Software Engineer",
    skills: GOOGLE_SWE_SKILLS,
  });

  assert.equal(analysis.overallMatchScore, 26);
  assert.equal(analysis.technicalSkillsScore, 34);
  assert.equal(analysis.dsaReadinessScore, 0);
  assert.equal(analysis.coreCSScore, 50);
  assert.equal(analysis.source, "fallback-heuristic");
});

test("DSA readiness from dsaService is reused for the DSA score", async () => {
  const user = await createUser();
  await seedDsaProgress(user._id, [
    { questionId: "1", topic: "Arrays", difficulty: "Easy" },
    { questionId: "3", topic: "Graphs", difficulty: "Medium" },
    { questionId: "4", topic: "Trees", difficulty: "Medium" },
    { questionId: "5", topic: "DP", difficulty: "Hard" },
  ]);

  const dsaProfile = await dsaService.getProfile(user._id);
  const analysis = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Google",
    role: "Software Engineer",
    skills: GOOGLE_SWE_SKILLS,
  });

  assert.equal(dsaProfile.readinessScore, 56);
  assert.equal(analysis.dsaReadinessScore, 56);
  assert.equal(analysis.overallMatchScore, 46);
});

test("DSA gaps from dsaService surface in company gaps and focus topics", async () => {
  const user = await createUser();
  await seedDsaProgress(user._id, [
    { questionId: "1", topic: "Arrays", difficulty: "Easy" },
    { questionId: "2", topic: "Arrays", difficulty: "Easy" },
  ]);

  const analysis = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Google",
    role: "Software Engineer",
    skills: [],
  });

  assert.deepEqual(analysis.focusTopics, ["Strings", "Trees", "Graphs", "DP"]);
  assert.ok(analysis.gaps.includes("Trees"));
  assert.ok(analysis.highPriorityGaps.includes("Graphs"));
  assert.deepEqual(analysis.dsa.gaps, ["Strings", "Trees", "Graphs", "DP"]);
  assert.deepEqual(analysis.dsa.requiredTopics, ["Arrays", "Strings", "Trees", "Graphs", "DP"]);
});

test("required vs preferred skill matching is reported separately", async () => {
  const user = await createUser();

  const analysis = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Google",
    role: "Software Engineer",
    skills: GOOGLE_SWE_SKILLS,
  });

  assert.deepEqual(analysis.skillMatch.matchedRequiredSkills, ["Data Structures", "Problem Solving"]);
  assert.deepEqual(analysis.skillMatch.missingRequiredSkills, ["Algorithms", "System Design", "Coding"]);
  assert.deepEqual(analysis.skillMatch.matchedPreferredSkills, ["Python"]);
  assert.deepEqual(analysis.skillMatch.missingPreferredSkills, ["Java", "C++", "Distributed Systems", "Machine Learning"]);
});

test("word-boundary matching avoids false positives like Java vs JavaScript", () => {
  assert.equal(companyPrepService.matchesSkill("Java", "javascript"), false);
  assert.equal(companyPrepService.matchesSkill("Java", "java"), true);
  assert.equal(companyPrepService.matchesSkill("SQL", "SQL"), true);
  assert.equal(companyPrepService.matchesSkill("System Design", "system design basics"), true);
});

test("empty user profile produces a 0 readiness score", async () => {
  const user = await createUser();

  const analysis = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Google",
    role: "Software Engineer",
    skills: [],
  });

  assert.equal(analysis.overallMatchScore, 0);
  assert.equal(analysis.technicalSkillsScore, 0);
  assert.equal(analysis.dsaReadinessScore, 0);
  assert.equal(analysis.coreCSScore, 0);
  assert.ok(analysis.strengths.some((strength) => strength.includes("No preparation matched")));
});

test("invalid company throws a 400 error", async () => {
  const user = await createUser();

  await assert.rejects(
    () =>
      companyPrepService.analyzeCompanyPrep({
        userId: user._id,
        company: "NopeCorp",
        role: "Software Engineer",
        skills: [],
      }),
    (error) => error.status === 400 && error.message === "Unknown company"
  );
});

test("invalid role for an existing company throws a 400 error", async () => {
  const user = await createUser();

  await assert.rejects(
    () =>
      companyPrepService.analyzeCompanyPrep({
        userId: user._id,
        company: "Google",
        role: "Not A Real Role",
        skills: [],
      }),
    (error) => error.status === 400 && error.message === "Unknown role for this company"
  );
});

test("invalid company/role combination throws a 400 error", async () => {
  const user = await createUser();

  await assert.rejects(
    () =>
      companyPrepService.analyzeCompanyPrep({
        userId: user._id,
        company: "Google",
        role: "System Engineer",
        skills: [],
      }),
    (error) => error.status === 400 && error.message === "Unknown role for this company"
  );
});

test("the same inputs always produce the same score", async () => {
  const user = await createUser();

  const first = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Infosys",
    role: "System Engineer",
    skills: ["Java", "SQL", "Communication"],
  });

  const second = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Infosys",
    role: "System Engineer",
    skills: ["Java", "SQL", "Communication"],
  });

  assert.equal(first.overallMatchScore, second.overallMatchScore);
  assert.equal(first.technicalSkillsScore, second.technicalSkillsScore);
});

test("analysis is persisted with version and gap metadata", async () => {
  const user = await createUser();

  await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Infosys",
    role: "System Engineer",
    skills: ["Java", "SQL"],
  });

  const doc = await CompanyPrepAnalysis.findOne({ user: user._id });
  assert.equal(doc.company, "Infosys");
  assert.equal(doc.role, "System Engineer");
  assert.equal(doc.source, "fallback-heuristic");
  assert.equal(doc.catalogVersion, 1);
  assert.ok(Array.isArray(doc.focusTopics));
  assert.ok(doc.priorityGaps.length > 0);
  assert.ok(doc.matchedRequiredSkills.includes("Java"));
  assert.equal(doc.strategy, "");
});

test("Gemini failure falls back to deterministic results", async () => {
  const user = await createUser();

  const failingProvider = async () => {
    throw new Error("Gemini API down");
  };

  const analysis = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Google",
    role: "Software Engineer",
    skills: GOOGLE_SWE_SKILLS,
    aiProvider: failingProvider,
    enableAI: true,
  });

  assert.equal(analysis.source, "fallback-heuristic");
  assert.equal(analysis.strategy, null);
  assert.equal(analysis.overallMatchScore, 26);
});

test("malformed Gemini output falls back to deterministic results", async () => {
  const user = await createUser();

  const malformedProvider = async () => {
    throw new Error("Malformed company prep strategy from Gemini");
  };

  const analysis = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Google",
    role: "Software Engineer",
    skills: GOOGLE_SWE_SKILLS,
    aiProvider: malformedProvider,
    enableAI: true,
  });

  assert.equal(analysis.source, "fallback-heuristic");
  assert.equal(analysis.strategy, null);
  assert.equal(analysis.dsaReadinessScore, 0);
});

test("successful Gemini strategy is labeled and persisted", async () => {
  const user = await createUser();

  const goodProvider = async () => ({
    strategy: "Focus first on closing DSA gaps in Trees and Graphs.",
    gapExplanations: [{ gap: "Trees", explanation: "Core for interviews at Google." }],
    nextSteps: ["Solve Tree traversal questions", "Revisit DP basics"],
  });

  const analysis = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Google",
    role: "Software Engineer",
    skills: GOOGLE_SWE_SKILLS,
    aiProvider: goodProvider,
    enableAI: true,
  });

  assert.equal(analysis.source, "ai");
  assert.match(analysis.strategy, /DSA gaps/);

  const doc = await CompanyPrepAnalysis.findOne({ user: user._id });
  assert.equal(doc.source, "ai");
  assert.match(doc.strategy, /DSA gaps/);
});

test("when AI is disabled the result stays deterministic", async () => {
  const user = await createUser();

  const analysis = await companyPrepService.analyzeCompanyPrep({
    userId: user._id,
    company: "Google",
    role: "Software Engineer",
    skills: GOOGLE_SWE_SKILLS,
    aiProvider: async () => ({ strategy: "should not run", gapExplanations: [], nextSteps: [] }),
    enableAI: false,
  });

  assert.equal(analysis.source, "fallback-heuristic");
  assert.equal(analysis.strategy, null);
});
