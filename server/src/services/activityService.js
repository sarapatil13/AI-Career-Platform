const ActivityEvent = require("../models/ActivityEvent");

// Single source of truth for activity. Streaks are computed only from events
// that actually exist in the database; nothing here ever fabricates activity.
// The `key` inside metadata enables same-day dedup so repeated identical
// actions (e.g. re-analyzing a resume twice) do not spam history or inflate
// streaks. Streaks themselves count distinct calendar days regardless.

const VALID_TYPES = new Set([
  "resume_analyzed",
  "interview_prepared",
  "mock_interview_completed",
  "company_prep",
  "dsa_question_completed",
  "profile_updated",
]);

const DAY_MS = 86400000;

const startOfUtcDay = (date) => {
  const d = new Date(date);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const dayKey = (date) => new Date(startOfUtcDay(date)).toISOString().slice(0, 10);

const serializeEvent = (doc) => {
  const metadata = { ...(doc.metadata || {}) };
  delete metadata.key;

  return {
    id: doc._id,
    type: doc.type,
    summary: doc.summary || "",
    metadata,
    createdAt: doc.createdAt,
  };
};

const recordActivity = async ({ userId, type, summary = "", metadata = {} }) => {
  if (!VALID_TYPES.has(type)) {
    const error = new Error(`Unknown activity type: ${type}`);
    error.status = 400;
    throw error;
  }

  const key = metadata.key || null;

  if (key) {
    const dayStart = new Date(startOfUtcDay(new Date()));
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);

    const existing = await ActivityEvent.findOne({
      user: userId,
      type,
      "metadata.key": key,
      createdAt: { $gte: dayStart, $lt: dayEnd },
    });

    if (existing) return existing;
  }

  return ActivityEvent.create({
    user: userId,
    type,
    summary,
    metadata: { ...metadata, key },
  });
};

// Awaited for deterministic tests but never allowed to break the caller's
// primary operation when the event write itself fails.
const recordActivityQuietly = async (payload) => {
  try {
    return await recordActivity(payload);
  } catch (error) {
    console.error("Activity recording failed:", error.message);
    return null;
  }
};

const listActivity = async ({ userId, limit = 20 }) => {
  const docs = await ActivityEvent.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return docs.map(serializeEvent);
};

const computeStreaks = (dayKeys) => {
  if (!dayKeys.length) return { current: 0, longest: 0 };

  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - DAY_MS));

  const last = dayKeys[dayKeys.length - 1];

  let current = 0;

  // A streak is "current" when the most recent active day is today or
  // yesterday (a missed-but-not-broken day is tolerated).
  if (last === today || last === yesterday) {
    let cursor = last;
    let i = dayKeys.length - 1;

    while (i >= 0 && dayKeys[i] === cursor) {
      current += 1;
      cursor = dayKey(new Date(new Date(cursor).getTime() - DAY_MS));
      i -= 1;
    }
  }

  let longest = dayKeys.length ? 1 : 0;
  let run = 1;

  for (let i = 1; i < dayKeys.length; i++) {
    const expected = dayKey(new Date(new Date(dayKeys[i - 1]).getTime() + DAY_MS));

    if (dayKeys[i] === expected) {
      run += 1;
    } else {
      run = 1;
    }

    if (run > longest) longest = run;
  }

  return { current, longest };
};

const getStreak = async (userId) => {
  const events = await ActivityEvent.find({ user: userId }, { createdAt: 1 }).lean();

  const days = [...new Set(events.map((event) => dayKey(event.createdAt)))].sort();

  return computeStreaks(days);
};

module.exports = {
  recordActivity,
  recordActivityQuietly,
  listActivity,
  getStreak,
  computeStreaks,
  serializeEvent,
  dayKey,
  VALID_TYPES,
};
