const dsaCatalog = require("../data/dsaCatalog");
const UserDSAProgress = require("../models/UserDSAProgress");

const DIFFICULTY_LEVELS = { Easy: 1, Medium: 2, Hard: 3 };
const PRIORITY_LEVELS = { High: 3, Medium: 2, Low: 1 };

const FORMULA_WEIGHTS = {
  required: 0.5,
  preferred: 0.2,
  difficulty: 0.2,
  volume: 0.1,
};

const topicMap = new Map(dsaCatalog.topics.map((topic) => [topic.name, topic]));
const questionMap = new Map(
  dsaCatalog.questions.map((question) => [String(question.id), question])
);
const requiredTopics = dsaCatalog.topics.filter((topic) => topic.tier === "required");
const preferredTopics = dsaCatalog.topics.filter((topic) => topic.tier === "preferred");
const catalogIndex = new Map(
  dsaCatalog.topics.map((topic, index) => [topic.name, index])
);
const recommendedVolume = dsaCatalog.topics.reduce(
  (sum, topic) => sum + topic.recommendedQuestions,
  0
);

const getQuestionById = (questionId) => questionMap.get(String(questionId));

const isValidQuestionId = (questionId) => questionMap.has(String(questionId));

// Deduplicate by questionId (keep latest completion) and drop any record that
// does not map to a catalog question, so forged data can never enter results.
const normalizeRecords = (records = []) => {
  const byId = new Map();

  records.forEach((record) => {
    const question = questionMap.get(String(record.questionId));
    if (!question) return;

    const completedAt = new Date(record.completedAt || Date.now());
    const existing = byId.get(question.id);

    if (!existing || completedAt > existing.completedAt) {
      byId.set(question.id, {
        questionId: question.id,
        topic: question.topic,
        difficulty: question.difficulty,
        completedAt,
      });
    }
  });

  return [...byId.values()];
};

const sortByPriority = (a, b) => {
  const priorityDiff = PRIORITY_LEVELS[b.priority] - PRIORITY_LEVELS[a.priority];
  if (priorityDiff !== 0) return priorityDiff;
  return catalogIndex.get(a.name) - catalogIndex.get(b.name);
};

// Approved deterministic formula:
// round(100 * (0.5 * requiredCoverage + 0.2 * preferredCoverage +
//              0.2 * difficultyScore + 0.1 * volumeScore))
const calculateReadiness = ({ records, requiredCovered, preferredCovered }) => {
  let difficultyTotal = 0;

  records.forEach((record) => {
    const topic = topicMap.get(record.topic);
    if (!topic) return;

    const gap =
      DIFFICULTY_LEVELS[topic.expectedDifficulty] -
      (DIFFICULTY_LEVELS[record.difficulty] || 0);

    difficultyTotal += gap <= 0 ? 1 : gap === 1 ? 0.5 : 0.25;
  });

  const difficultyScore = records.length === 0 ? 0 : difficultyTotal / records.length;
  const volumeScore =
    recommendedVolume === 0 ? 0 : Math.min(1, records.length / recommendedVolume);

  const readinessScore = Math.round(
    100 *
      (FORMULA_WEIGHTS.required * (requiredCovered / requiredTopics.length) +
        FORMULA_WEIGHTS.preferred * (preferredCovered / preferredTopics.length) +
        FORMULA_WEIGHTS.difficulty * difficultyScore +
        FORMULA_WEIGHTS.volume * volumeScore)
  );

  return { readinessScore, difficultyScore, volumeScore };
};

const computeProfile = (records, doc) => {
  const covered = new Set(records.map((record) => record.topic));
  const requiredCovered = requiredTopics.filter((topic) => covered.has(topic.name)).length;
  const preferredCovered = preferredTopics.filter((topic) => covered.has(topic.name)).length;

  const { readinessScore, difficultyScore, volumeScore } = calculateReadiness({
    records,
    requiredCovered,
    preferredCovered,
  });

  const byTopic = dsaCatalog.topics.map((topic) => {
    const topicRecords = records.filter((record) => record.topic === topic.name);

    return {
      topic: topic.name,
      required: topic.tier === "required",
      priority: topic.priority,
      expectedDifficulty: topic.expectedDifficulty,
      recommendedQuestions: topic.recommendedQuestions,
      covered: topicRecords.length > 0,
      completed: topicRecords.length,
      questions: topicRecords.map((record) => ({
        questionId: record.questionId,
        difficulty: record.difficulty,
        completedAt: record.completedAt,
      })),
    };
  });

  const uncoveredRequiredTopics = requiredTopics
    .filter((topic) => !covered.has(topic.name))
    .sort(sortByPriority)
    .map((topic) => topic.name);

  const priorityGaps = requiredTopics
    .filter((topic) => !covered.has(topic.name))
    .sort(sortByPriority)
    .map((topic) => ({
      topic: topic.name,
      priority: topic.priority,
      expectedDifficulty: topic.expectedDifficulty,
      recommendedQuestions: topic.recommendedQuestions,
    }));

  const weakTopics = dsaCatalog.topics
    .filter((topic) => covered.has(topic.name))
    .map((topic) => ({
      topic: topic.name,
      priority: topic.priority,
      expectedDifficulty: topic.expectedDifficulty,
      completed: records.filter((record) => record.topic === topic.name).length,
      recommendedQuestions: topic.recommendedQuestions,
    }))
    .filter((entry) => entry.completed < entry.recommendedQuestions)
    .sort(
      (a, b) =>
        a.completed / a.recommendedQuestions - b.completed / b.recommendedQuestions ||
        PRIORITY_LEVELS[b.priority] - PRIORITY_LEVELS[a.priority] ||
        catalogIndex.get(a.topic) - catalogIndex.get(b.topic)
    );

  const completedIds = new Set(records.map((record) => record.questionId));

  const practiceQuestionFor = (topic) => {
    const question = dsaCatalog.questions.find(
      (q) => q.topic === topic && !completedIds.has(String(q.id))
    );

    return question
      ? {
          id: question.id,
          title: question.title,
          link: question.link,
          difficulty: question.difficulty,
        }
      : null;
  };

  const recommendedPractice = [
    ...priorityGaps.map((gap) => ({
      topic: gap.topic,
      reason: "Not started yet (required topic)",
      priority: gap.priority,
      expectedDifficulty: gap.expectedDifficulty,
      recommendedQuestions: gap.recommendedQuestions,
      question: practiceQuestionFor(gap.topic),
    })),
    ...weakTopics.map((entry) => ({
      topic: entry.topic,
      reason: `Below recommended practice volume (${entry.completed} of ${entry.recommendedQuestions})`,
      priority: entry.priority,
      expectedDifficulty: entry.expectedDifficulty,
      recommendedQuestions: entry.recommendedQuestions,
      question: practiceQuestionFor(entry.topic),
    })),
  ];

  return {
    readinessScore,
    totals: {
      completed: records.length,
      topicsCovered: covered.size,
      requiredTopics: requiredTopics.length,
      preferredTopics: preferredTopics.length,
      requiredCovered,
      preferredCovered,
      recommendedVolume,
      difficultyScore: Number(difficultyScore.toFixed(3)),
      volumeScore: Number(volumeScore.toFixed(3)),
    },
    byTopic,
    coveredTopics: [...covered],
    uncoveredRequiredTopics,
    weakTopics,
    priorityGaps,
    recommendedPractice,
    completedQuestionIds: records.map((record) => record.questionId),
    lastSyncedAt: doc && doc.lastSyncedAt ? doc.lastSyncedAt : null,
  };
};

const getProfile = async (userId) => {
  const doc = await UserDSAProgress.findOne({ user: userId });
  const records = normalizeRecords(doc ? doc.records : []);

  return computeProfile(records, doc);
};

const setQuestionCompleted = async ({ userId, question, completed }) => {
  let doc = await UserDSAProgress.findOne({ user: userId });

  if (!doc) {
    doc = await UserDSAProgress.create({ user: userId, records: [] });
  }

  let records = normalizeRecords(doc.records);

  if (completed) {
    if (!records.some((record) => record.questionId === question.id)) {
      records.push({
        questionId: question.id,
        topic: question.topic,
        difficulty: question.difficulty,
        completedAt: new Date(),
      });
    }
  } else {
    records = records.filter((record) => record.questionId !== question.id);
  }

  doc.records = records;
  await doc.save();

  return doc;
};

const syncProgress = async ({ userId, questionIds }) => {
  let doc = await UserDSAProgress.findOne({ user: userId });

  if (!doc) {
    doc = await UserDSAProgress.create({ user: userId, records: [] });
  }

  const requestedIds = [...new Set((questionIds || []).map((id) => String(id)))];
  const validIds = requestedIds.filter((id) => questionMap.has(id));

  let records = normalizeRecords(doc.records);
  const existing = new Set(records.map((record) => record.questionId));
  let addedCount = 0;

  validIds.forEach((id) => {
    if (!existing.has(id)) {
      const question = questionMap.get(id);
      records.push({
        questionId: question.id,
        topic: question.topic,
        difficulty: question.difficulty,
        completedAt: new Date(),
      });
      addedCount += 1;
    }
  });

  doc.records = records;
  doc.lastSyncedAt = new Date();
  await doc.save();

  return { doc, addedCount };
};

module.exports = {
  getProfile,
  setQuestionCompleted,
  syncProgress,
  getQuestionById,
  isValidQuestionId,
  normalizeRecords,
  calculateReadiness,
};
