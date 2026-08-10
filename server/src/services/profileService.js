const User = require("../models/User");
const ResumeAnalysis = require("../models/ResumeAnalysis");
const CompanyPrepAnalysis = require("../models/CompanyPrepAnalysis");
const MockInterviewSession = require("../models/MockInterviewSession");
const dsaService = require("./dsaService");
const activityService = require("./activityService");
const companyCatalog = require("../data/companyCatalog");
const interviewCatalog = require("../data/interviewCatalog");
const { isValidName, isStringArray } = require("../utils/validation");

const PRIORITY_ORDER = { High: 3, Medium: 2, Low: 1 };
const WEAK_TOPIC_THRESHOLD = 3;

const findCompanyEntry = (company) =>
  companyCatalog.companies.find(
    (entry) =>
      entry.company.toLowerCase() === String(company || "").trim().toLowerCase()
  );

const findRoleEntry = (companyEntry, role) =>
  companyEntry
    ? companyEntry.roles.find(
        (entry) =>
          entry.role.toLowerCase() === String(role || "").trim().toLowerCase()
      )
    : undefined;

// -------------------------------
// Profile mutations
// -------------------------------

const updateProfile = async ({ userId, name, skills }) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (name !== undefined) {
    if (!isValidName(name)) {
      const error = new Error("Name must be at least 2 characters long");
      error.status = 400;
      throw error;
    }
    user.name = name.trim();
  }

  if (skills !== undefined) {
    if (!isStringArray(skills)) {
      const error = new Error("skills must be an array of strings");
      error.status = 400;
      throw error;
    }
    user.skills = [...new Set(skills.map((skill) => skill.trim()).filter(Boolean))];
  }

  await user.save();

  await activityService.recordActivityQuietly({
    userId,
    type: "profile_updated",
    summary: "Profile updated",
    metadata: { key: "profile" },
  });

  return serializeUser(user);
};

const addInterestedCompany = async ({ userId, company, role }) => {
  if (typeof company !== "string" || !company.trim()) {
    const error = new Error("company is required");
    error.status = 400;
    throw error;
  }

  const companyEntry = findCompanyEntry(company);

  if (!companyEntry) {
    const error = new Error("Unknown company");
    error.status = 400;
    throw error;
  }

  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const companies = user.interestedCompanies || [];
  const exact = companies.find(
    (entry) => entry.toLowerCase() === companyEntry.company.toLowerCase()
  );

  if (!exact) {
    user.interestedCompanies.push(companyEntry.company);
  }

  if (role) {
    if (!findRoleEntry(companyEntry, role)) {
      const error = new Error("Unknown role for this company");
      error.status = 400;
      throw error;
    }

    const roleEntry = findRoleEntry(companyEntry, role);
    const pairs = user.interestedCompanyRoles || [];
    const alreadyAssociated = pairs.some(
      (pair) =>
        pair.company.toLowerCase() === companyEntry.company.toLowerCase() &&
        pair.role.toLowerCase() === roleEntry.role.toLowerCase()
    );

    if (!alreadyAssociated) {
      user.interestedCompanyRoles.push({
        company: companyEntry.company,
        role: roleEntry.role,
      });
    }
  }

  await user.save();

  return serializePreferences(user);
};

const removeInterestedCompany = async ({ userId, company }) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  user.interestedCompanies = (user.interestedCompanies || []).filter(
    (entry) => entry.toLowerCase() !== String(company || "").trim().toLowerCase()
  );

  user.interestedCompanyRoles = (user.interestedCompanyRoles || []).filter(
    (pair) => pair.company.toLowerCase() !== String(company || "").trim().toLowerCase()
  );

  await user.save();

  return serializePreferences(user);
};

const addTargetRole = async ({ userId, role }) => {
  if (typeof role !== "string" || !role.trim()) {
    const error = new Error("role is required");
    error.status = 400;
    throw error;
  }

  if (!interviewCatalog.isValidRole(role)) {
    const error = new Error("Unknown role");
    error.status = 400;
    throw error;
  }

  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const roles = user.targetRoles || [];
  const exists = roles.some(
    (entry) => entry.toLowerCase() === role.trim().toLowerCase()
  );

  if (!exists) {
    const catalogRole = interviewCatalog.roles.find(
      (entry) => entry.toLowerCase() === role.trim().toLowerCase()
    );
    user.targetRoles.push(catalogRole);
  }

  await user.save();

  return serializePreferences(user);
};

const removeTargetRole = async ({ userId, role }) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  user.targetRoles = (user.targetRoles || []).filter(
    (entry) => entry.toLowerCase() !== String(role || "").trim().toLowerCase()
  );

  await user.save();

  return serializePreferences(user);
};

// -------------------------------
// Serializers
// -------------------------------

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  skills: user.skills || [],
  targetRoles: user.targetRoles || [],
});

const serializePreferences = (user) => {
  const companies = (user.interestedCompanies || []).map((company) => {
    const entry = findCompanyEntry(company);

    return {
      company,
      roles: (user.interestedCompanyRoles || [])
        .filter((pair) => pair.company.toLowerCase() === company.toLowerCase())
        .map((pair) => pair.role),
      catalog: entry ? entry.roles.map((roleEntry) => roleEntry.role) : [],
    };
  });

  return {
    interestedCompanies: companies,
    targetRoles: user.targetRoles || [],
    skills: user.skills || [],
  };
};

// -------------------------------
// Weak-topic aggregation
// -------------------------------

// Evidence-based aggregation. A topic only becomes a dashboard weak topic when
// it accumulates enough supporting evidence (an uncovered required DSA gap,
// company-prep mentions, or repeated mock-interview weakness). One isolated
// failed evaluation is never enough on its own.
const aggregateWeakTopics = async ({
  userId,
  dsaProfile,
  companyPreps,
  mockSessions,
}) => {
  const dsaGaps = new Set((dsaProfile.priorityGaps || []).map((gap) => gap.topic));
  const dsaGapPriority = new Map(
    (dsaProfile.priorityGaps || []).map((gap) => [gap.topic, gap.priority])
  );
  const dsaWeak = new Map(
    (dsaProfile.weakTopics || []).map((entry) => [entry.topic, entry])
  );

  // Uncovered required topics are only evidence of weakness once the user has
  // actually started practicing; before that it is absence of data, not proof.
  const hasDsaProgress =
    (dsaProfile.totals && dsaProfile.totals.completed) > 0;

  const companyMentions = new Map();
  const coreCSMentions = new Map();

  companyPreps.forEach((analysis) => {
    (analysis.focusTopics || []).forEach((topic) =>
      companyMentions.set(topic, (companyMentions.get(topic) || 0) + 1)
    );
    (analysis.coreCSGaps || []).forEach((topic) =>
      coreCSMentions.set(topic, (coreCSMentions.get(topic) || 0) + 1)
    );
  });

  const mockWeakSessions = new Map();
  const mockLowEvals = new Map();

  mockSessions.forEach((session) => {
    (session.weakTopics || []).forEach((topic) =>
      mockWeakSessions.set(topic, (mockWeakSessions.get(topic) || 0) + 1)
    );
    (session.topicPerformance || []).forEach((perf) => {
      if (perf.lowCount > 0) {
        mockLowEvals.set(perf.topic, (mockLowEvals.get(perf.topic) || 0) + perf.lowCount);
      }
    });
  });

  const candidates = new Set([
    ...dsaGaps,
    ...dsaWeak.keys(),
    ...companyMentions.keys(),
    ...coreCSMentions.keys(),
    ...mockWeakSessions.keys(),
    ...mockLowEvals.keys(),
  ]);

  const results = [];

  candidates.forEach((topic) => {
    let score = 0;
    const sources = [];
    const priority =
      (dsaWeak.get(topic) && dsaWeak.get(topic).priority) ||
      dsaGapPriority.get(topic) ||
      "Low";

    if (hasDsaProgress && dsaGaps.has(topic)) {
      score += 3;
      sources.push("dsa-gap");
    }

    if (hasDsaProgress && dsaWeak.has(topic)) {
      score += 3;
      sources.push("dsa");
    }

    if (companyMentions.has(topic)) {
      score += 3;
      sources.push("company-prep");
    }

    const coreCSCount = coreCSMentions.get(topic) || 0;
    if (coreCSCount > 0) {
      score += coreCSCount;
      sources.push("core-cs");
    }

    const weakSessions = mockWeakSessions.get(topic) || 0;
    const lowEvals = mockLowEvals.get(topic) || 0;

    // Repeated mock-interview evidence only: a single session with one low
    // evaluation is never enough to mark a topic as weak.
    if (weakSessions >= 2 || lowEvals >= 2) {
      score += 3;
      sources.push("mock-interview");
    }

    if (score >= WEAK_TOPIC_THRESHOLD) {
      results.push({ topic, score, sources: [...new Set(sources)], priority });
    }
  });

  results.sort(
    (a, b) =>
      b.score - a.score ||
      PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority] ||
      a.topic.localeCompare(b.topic)
  );

  return results;
};

// -------------------------------
// Recommended next actions
// -------------------------------

const recommendNextActions = ({ dsaProfile, latestResume, latestCompanyPrep, latestMock, user }) => {
  const actions = [];

  if (!latestResume) {
    actions.push({
      action: "Analyze your resume",
      detail: "Upload or analyze your resume to establish an ATS baseline.",
      priority: "High",
      source: "resume",
    });
  } else if (latestResume.atsScore < 60) {
    actions.push({
      action: "Improve your resume",
      detail: `Your latest ATS score is ${latestResume.atsScore}/100. Address the missing skills and re-analyze.`,
      priority: "High",
      source: "resume",
    });
  }

  const priorityGap = (dsaProfile.priorityGaps || [])[0];

  if (priorityGap) {
    actions.push({
      action: `Practice ${priorityGap.topic}`,
      detail: "Uncovered required DSA topic with High priority.",
      priority: "High",
      source: "dsa",
    });
  } else {
    const weak = (dsaProfile.weakTopics || [])[0];

    if (weak) {
      actions.push({
        action: `Complete more ${weak.topic} questions`,
        detail: `Only ${weak.completed} of ${weak.recommendedQuestions} recommended questions solved.`,
        priority: "Medium",
        source: "dsa",
      });
    }
  }

  if (latestCompanyPrep && latestCompanyPrep.overallMatchScore < 70) {
    actions.push({
      action: `Close skill gaps for ${latestCompanyPrep.company}`,
      detail: `Latest company readiness is ${latestCompanyPrep.overallMatchScore}/100 for the ${latestCompanyPrep.role} role.`,
      priority: "Medium",
      source: "company-prep",
    });
  } else if (!latestCompanyPrep && (user.interestedCompanies || []).length) {
    actions.push({
      action: "Run a company prep analysis",
      detail: `You follow ${user.interestedCompanies[0]} but have not analyzed your readiness for it yet.`,
      priority: "Medium",
      source: "company-prep",
    });
  }

  const mockCount = latestMock ? 1 : 0;

  if (mockCount === 0) {
    actions.push({
      action: "Take a mock interview",
      detail: "Complete a mock interview to establish a performance baseline.",
      priority: "Medium",
      source: "mock-interview",
    });
  } else if (latestMock.overallScore === null || latestMock.overallScore < 60) {
    actions.push({
      action: "Retake a mock interview",
      detail:
        latestMock.overallScore === null
          ? "Your latest session had no scored answers — retry with full written answers."
          : `Your latest mock interview scored ${latestMock.overallScore}/100. Practice more before the next one.`,
      priority: "Medium",
      source: "mock-interview",
    });
  }

  if (!actions.length) {
    actions.push({
      action: "Keep your streak alive",
      detail: "You are on a good path — keep solving questions and refining your prep.",
      priority: "Low",
      source: "general",
    });
  }

  return actions.slice(0, 5);
};

// -------------------------------
// Reads
// -------------------------------

const getProfileSummary = async (userId) => {
  const [
    user,
    dsaProfile,
    latestResume,
    latestCompanyPrep,
    latestMock,
    recentActivity,
    streak,
    counts,
  ] = await Promise.all([
    User.findById(userId)
      .select("name email skills targetRoles interestedCompanies interestedCompanyRoles")
      .lean(),
    dsaService.getProfile(userId),
    ResumeAnalysis.findOne({ user: userId }).sort({ createdAt: -1 }).lean(),
    CompanyPrepAnalysis.findOne({ user: userId }).sort({ createdAt: -1 }).lean(),
    MockInterviewSession.findOne({ user: userId, status: "completed" })
      .sort({ completedAt: -1 })
      .lean(),
    activityService.listActivity({ userId, limit: 8 }),
    activityService.getStreak(userId),
    Promise.all([
      MockInterviewSession.countDocuments({ user: userId, status: "completed" }),
      CompanyPrepAnalysis.countDocuments({ user: userId }),
      ResumeAnalysis.countDocuments({ user: userId }),
    ]),
  ]);

  const companyPreps = await CompanyPrepAnalysis.find({ user: userId })
    .select("focusTopics coreCSGaps")
    .lean();

  const mockSessions = await MockInterviewSession.find({
    user: userId,
    status: "completed",
  })
    .select("weakTopics topicPerformance")
    .lean();

  const weakTopics = await aggregateWeakTopics({
    userId,
    dsaProfile,
    companyPreps,
    mockSessions,
  });

  const latestScores = {
    resume: latestResume
      ? { score: latestResume.atsScore, source: latestResume.source, analyzedAt: latestResume.createdAt }
      : null,
    dsaReadiness: { score: dsaProfile.readinessScore },
    companyPrep: latestCompanyPrep
      ? {
          score: latestCompanyPrep.overallMatchScore,
          company: latestCompanyPrep.company,
          role: latestCompanyPrep.role,
          analyzedAt: latestCompanyPrep.createdAt,
        }
      : null,
    mockInterview: latestMock
      ? {
          score: latestMock.overallScore,
          interviewType: latestMock.interviewType,
          completedAt: latestMock.completedAt || latestMock.createdAt,
        }
      : null,
  };

  const recommendedActions = recommendNextActions({
    dsaProfile,
    latestResume,
    latestCompanyPrep,
    latestMock,
    user,
  });

  const hasData = Boolean(
    latestResume ||
      latestCompanyPrep ||
      latestMock ||
      dsaProfile.readinessScore > 0 ||
      counts[0] > 0 ||
      counts[1] > 0 ||
      counts[2] > 0 ||
      recentActivity.length > 0
  );

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      skills: user.skills || [],
      targetRoles: user.targetRoles || [],
    },
    interestedCompanies: (user.interestedCompanies || []).map((company) => {
      const entry = findCompanyEntry(company);

      return {
        company,
        roles: (user.interestedCompanyRoles || [])
          .filter((pair) => pair.company.toLowerCase() === company.toLowerCase())
          .map((pair) => pair.role),
        catalog: entry ? entry.roles.map((roleEntry) => roleEntry.role) : [],
      };
    }),
    latestScores,
    weakTopics,
    recommendedActions,
    streak,
    recentActivity,
    counts: {
      dsaCompleted: dsaProfile.totals.completed,
      mockInterviewsCompleted: counts[0],
      companyPrepsCompleted: counts[1],
      resumeAnalyses: counts[2],
    },
    hasData,
  };
};

const getActivityHistory = async ({ userId, limit = 20 }) => {
  const [streak, events] = await Promise.all([
    activityService.getStreak(userId),
    activityService.listActivity({ userId, limit }),
  ]);

  return { streak, events };
};

const getPerformanceHistory = async (userId) => {
  const [mockDocs, companyDocs, resumeDocs] = await Promise.all([
    MockInterviewSession.find({ user: userId, status: "completed" })
      .select("interviewType targetRole company difficulty overallScore totalQuestions questions completedAt createdAt")
      .sort({ completedAt: 1 })
      .lean(),
    CompanyPrepAnalysis.find({ user: userId })
      .select("company role overallMatchScore createdAt")
      .sort({ createdAt: 1 })
      .lean(),
    ResumeAnalysis.find({ user: userId })
      .select("atsScore filename createdAt")
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  return {
    mockInterviews: mockDocs.map((doc) => ({
      id: doc._id,
      date: doc.completedAt || doc.createdAt,
      interviewType: doc.interviewType,
      role: doc.targetRole,
      company: doc.company,
      difficulty: doc.difficulty,
      overallScore: doc.overallScore,
      answeredCount: (doc.questions || []).filter(
        (question) => !question.isSkipped && question.answerText
      ).length,
      totalQuestions: doc.totalQuestions,
    })),
    companyPrep: companyDocs.map((doc) => ({
      id: doc._id,
      date: doc.createdAt,
      company: doc.company,
      role: doc.role,
      overallMatchScore: doc.overallMatchScore,
    })),
    resumeAnalyses: resumeDocs.map((doc) => ({
      id: doc._id,
      date: doc.createdAt,
      atsScore: doc.atsScore,
      filename: doc.filename,
    })),
  };
};

module.exports = {
  updateProfile,
  addInterestedCompany,
  removeInterestedCompany,
  addTargetRole,
  removeTargetRole,
  getProfileSummary,
  getActivityHistory,
  getPerformanceHistory,
  aggregateWeakTopics,
  recommendNextActions,
  serializeUser,
  serializePreferences,
  findCompanyEntry,
  findRoleEntry,
  PRIORITY_ORDER,
  WEAK_TOPIC_THRESHOLD,
};
