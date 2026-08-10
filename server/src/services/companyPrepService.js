const companyCatalog = require("../data/companyCatalog");
const dsaService = require("./dsaService");
const CompanyPrepAnalysis = require("../models/CompanyPrepAnalysis");

// Approved overall-match weights.
const WEIGHTS = {
  technical: 0.4,
  dsa: 0.35,
  coreCS: 0.25,
};

const resourceMap = new Map(companyCatalog.resources.map((resource) => [resource.id, resource]));

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSkill = (skill) => String(skill).trim().toLowerCase();

// Deterministic, word-boundary matching so "Java" does not match "JavaScript".
const matchesSkill = (catalogSkill, userSkill) => {
  const a = normalizeSkill(catalogSkill);
  const b = normalizeSkill(userSkill);

  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 3) return false;

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(a)}([^a-z0-9]|$)`);
  return pattern.test(b);
};

const normalizeSkills = (skills) => {
  return Array.isArray(skills)
    ? skills.map((skill) => normalizeSkill(skill)).filter(Boolean)
    : [];
};

const findEntry = (company, role) => {
  const companyEntry = companyCatalog.companies.find(
    (entry) =>
      entry.company.toLowerCase() === String(company || "").trim().toLowerCase()
  );

  if (!companyEntry) {
    return { error: "Unknown company" };
  }

  const roleEntry = companyEntry.roles.find(
    (entry) => entry.role.toLowerCase() === String(role || "").trim().toLowerCase()
  );

  if (!roleEntry) {
    return { error: "Unknown role for this company" };
  }

  return { companyEntry, roleEntry };
};

const resolveResources = (ids = []) => {
  return ids
    .map((id) => resourceMap.get(id))
    .filter(Boolean)
    .map((resource) => ({
      title: resource.title,
      website: resource.website,
      url: resource.url,
      topics: resource.topics,
      difficulty: resource.difficulty,
    }));
};

const buildSkillAndCoreMatch = ({ roleEntry, userSkills }) => {
  const required = roleEntry.requiredSkills;
  const preferred = roleEntry.preferredSkills;

  const matchedRequired = required.filter((skill) =>
    userSkills.some((userSkill) => matchesSkill(skill, userSkill))
  );
  const missingRequired = required.filter((skill) => !matchedRequired.includes(skill));

  const matchedPreferred = preferred.filter((skill) =>
    userSkills.some((userSkill) => matchesSkill(skill, userSkill))
  );
  const missingPreferred = preferred.filter((skill) => !matchedPreferred.includes(skill));

  const requiredRatio = required.length ? matchedRequired.length / required.length : 0;
  const preferredRatio = preferred.length ? matchedPreferred.length / preferred.length : 0;

  const technicalSkillsScore = Math.round(
    100 * (requiredRatio * 0.7 + preferredRatio * 0.3)
  );

  const coreCS = roleEntry.coreCS || [];
  const matchedCore = coreCS.filter((entry) =>
    entry.skillKeywords.some((keyword) =>
      userSkills.some((userSkill) => matchesSkill(keyword, userSkill))
    )
  );
  const coreCSGaps = coreCS.filter((entry) => !matchedCore.includes(entry)).map((entry) => entry.topic);
  const coreCSScore = coreCS.length ? Math.round(100 * (matchedCore.length / coreCS.length)) : 0;

  return {
    matchedRequired,
    missingRequired,
    matchedPreferred,
    missingPreferred,
    technicalSkillsScore,
    coreCSGaps,
    matchedCore,
    coreCSScore,
  };
};

const serializeAnalysis = (doc) => {
  const found = findEntry(doc.company, doc.role);
  const roleEntry = found.roleEntry || {};
  const dsa = roleEntry.dsa || {};
  const coreCS = roleEntry.coreCS || [];
  const coreCSGaps = doc.coreCSGaps || [];

  const matchedCoreTopics = coreCS
    .filter((entry) => !coreCSGaps.includes(entry.topic))
    .map((entry) => entry.topic);

  const priorityGaps = doc.priorityGaps || [];
  const pickPriority = (label) =>
    priorityGaps.filter((gap) => gap.priority === label).map((gap) => gap.gap);

  return {
    id: doc._id,
    company: doc.company,
    role: doc.role,
    source: doc.source,
    catalogVersion: doc.catalogVersion,
    overallMatchScore: doc.overallMatchScore,
    technicalSkillsScore: doc.technicalSkillsScore,
    dsaReadinessScore: doc.dsaReadinessScore,
    coreCSScore: doc.coreCSScore,
    weights: WEIGHTS,
    summary: doc.summary,
    strengths: doc.strengths,
    gaps: doc.gaps,
    highPriorityGaps: pickPriority("high"),
    mediumPriorityGaps: pickPriority("medium"),
    lowPriorityGaps: pickPriority("low"),
    skillMatch: {
      matchedRequiredSkills: doc.matchedRequiredSkills || [],
      missingRequiredSkills: doc.missingRequiredSkills || [],
      matchedPreferredSkills: doc.matchedPreferredSkills || [],
      missingPreferredSkills: doc.missingPreferredSkills || [],
    },
    dsa: {
      score: doc.dsaReadinessScore,
      strengths: doc.dsaStrengths || [],
      gaps: doc.focusTopics || [],
      focusTopics: doc.focusTopics || [],
      expectedDifficulty: dsa.expectedDifficulty || null,
      recommendedVolume: dsa.recommendedVolume || null,
      requiredTopics: dsa.requiredTopics || [],
      preferredTopics: dsa.preferredTopics || [],
    },
    coreCS: {
      score: doc.coreCSScore,
      matchedTopics: matchedCoreTopics,
      gaps: coreCSGaps,
    },
    focusTopics: doc.focusTopics || [],
    resources: resolveResources(doc.resources || []),
    strategy: doc.strategy || null,
    createdAt: doc.createdAt,
  };
};

const analyzeCompanyPrep = async ({
  userId,
  company,
  role,
  skills = [],
  aiProvider = null,
  enableAI = false,
}) => {
  const found = findEntry(company, role);

  if (found.error) {
    const error = new Error(found.error);
    error.status = 400;
    throw error;
  }

  const { companyEntry, roleEntry } = found;
  const userSkills = normalizeSkills(skills);
  const technical = buildSkillAndCoreMatch({ roleEntry, userSkills });

  const dsaProfile = await dsaService.getProfile(userId);

  const overallMatchScore = Math.round(
    WEIGHTS.technical * technical.technicalSkillsScore +
      WEIGHTS.dsa * dsaProfile.readinessScore +
      WEIGHTS.coreCS * technical.coreCSScore
  );

  const dsaFocusTopics = dsaProfile.priorityGaps.map((gap) => gap.topic);
  const dsaStrengths = dsaProfile.byTopic
    .filter((entry) => entry.covered)
    .map((entry) => `${entry.topic} (${entry.completed} solved)`);

  const highPriorityGaps = [
    ...technical.missingRequired.map((gap) => ({ gap, priority: "high" })),
    ...dsaProfile.priorityGaps.map((gap) => ({ gap: gap.topic, priority: "high" })),
  ];
  const mediumPriorityGaps = [
    ...technical.missingPreferred.map((gap) => ({ gap, priority: "medium" })),
    ...dsaProfile.weakTopics.map((entry) => ({ gap: entry.topic, priority: "medium" })),
  ];
  const lowPriorityGaps = technical.coreCSGaps.map((gap) => ({ gap, priority: "low" }));

  const priorityGaps = [...highPriorityGaps, ...mediumPriorityGaps, ...lowPriorityGaps];
  const gaps = [...new Set(priorityGaps.map((entry) => entry.gap))];

  const strengths = [];
  if (technical.matchedRequired.length) {
    strengths.push(`Matches required skills: ${technical.matchedRequired.join(", ")}`);
  }
  if (technical.matchedPreferred.length) {
    strengths.push(`Matches preferred skills: ${technical.matchedPreferred.join(", ")}`);
  }
  if (dsaProfile.coveredTopics.length) {
    strengths.push(`DSA topics started: ${dsaProfile.coveredTopics.join(", ")}`);
  }
  if (technical.matchedCore.length) {
    strengths.push(`Core CS knowledge: ${technical.matchedCore.map((entry) => entry.topic).join(", ")}`);
  }
  if (!strengths.length) {
    strengths.push("No preparation matched to this role yet");
  }

  const recommendations = [];
  if (technical.missingRequired.length) {
    recommendations.push(`Learn missing required skills first: ${technical.missingRequired.join(", ")}.`);
  }
  if (dsaFocusTopics.length) {
    recommendations.push(`Practice uncovered DSA topics: ${dsaFocusTopics.join(", ")}.`);
  }
  if (technical.missingPreferred.length) {
    recommendations.push(`Add preferred skills to stand out: ${technical.missingPreferred.join(", ")}.`);
  }
  if (technical.coreCSGaps.length) {
    recommendations.push(`Cover core CS topics: ${technical.coreCSGaps.join(", ")}.`);
  }
  if (!recommendations.length) {
    recommendations.push(
      "You are well aligned with this role. Keep deepening your skills and practice at the expected difficulty."
    );
  }

  const summary = `Company readiness for ${companyEntry.company} (${roleEntry.role}): overall ${overallMatchScore}/100. You match ${technical.matchedRequired.length}/${roleEntry.requiredSkills.length} required and ${technical.matchedPreferred.length}/${roleEntry.preferredSkills.length} preferred skills. DSA readiness ${dsaProfile.readinessScore}/100, core CS ${technical.coreCSScore}/100.`;

  const analysis = {
    user: userId,
    company: companyEntry.company,
    role: roleEntry.role,
    source: "fallback-heuristic",
    technicalSkillsScore: technical.technicalSkillsScore,
    dsaReadinessScore: dsaProfile.readinessScore,
    coreCSScore: technical.coreCSScore,
    overallMatchScore,
    summary,
    strengths,
    gaps,
    recommendations,
    resources: roleEntry.resources,
    catalogVersion: companyCatalog.version,
    focusTopics: dsaFocusTopics,
    priorityGaps,
    matchedRequiredSkills: technical.matchedRequired,
    missingRequiredSkills: technical.missingRequired,
    matchedPreferredSkills: technical.matchedPreferred,
    missingPreferredSkills: technical.missingPreferred,
    coreCSGaps: technical.coreCSGaps,
    dsaStrengths,
    strategy: "",
  };

  if (aiProvider && enableAI) {
    try {
      const ai = await aiProvider({
        company: analysis.company,
        role: analysis.role,
        overallMatchScore,
        technicalSkillsScore: analysis.technicalSkillsScore,
        dsaReadinessScore: analysis.dsaReadinessScore,
        coreCSScore: analysis.coreCSScore,
        skillMatch: {
          matchedRequiredSkills: analysis.matchedRequiredSkills,
          missingRequiredSkills: analysis.missingRequiredSkills,
          matchedPreferredSkills: analysis.matchedPreferredSkills,
          missingPreferredSkills: analysis.missingPreferredSkills,
        },
        focusTopics: dsaFocusTopics,
        coreCSGaps: technical.coreCSGaps,
      });

      analysis.source = "ai";
      analysis.strategy = ai.strategy || "";
    } catch (error) {
      // Keep the deterministic result and fallback source label.
    }
  }

  const doc = await CompanyPrepAnalysis.create(analysis);

  return serializeAnalysis(doc);
};

const getOptions = () => {
  return {
    companies: companyCatalog.companies.map((companyEntry) => ({
      name: companyEntry.company,
      roles: companyEntry.roles.map((roleEntry) => ({
        role: roleEntry.role,
        requiredSkills: roleEntry.requiredSkills,
        preferredSkills: roleEntry.preferredSkills,
        dsa: roleEntry.dsa,
        coreCS: (roleEntry.coreCS || []).map((entry) => entry.topic),
        resources: roleEntry.resources,
      })),
    })),
    catalogVersion: companyCatalog.version,
  };
};

module.exports = {
  analyzeCompanyPrep,
  serializeAnalysis,
  findEntry,
  matchesSkill,
  resolveResources,
  getOptions,
  WEIGHTS,
};
