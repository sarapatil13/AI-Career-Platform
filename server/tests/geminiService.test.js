const { test } = require("node:test");
const assert = require("node:assert/strict");

const { parseCompanyPrepStrategy } = require("../src/services/geminiService");

test("parses a valid Gemini strategy payload", () => {
  const result = parseCompanyPrepStrategy(
    JSON.stringify({
      strategy: "Focus on Trees first.",
      gapExplanations: [{ gap: "Trees", explanation: "Core topic." }],
      nextSteps: ["Solve Tree questions"],
    })
  );

  assert.equal(result.strategy, "Focus on Trees first.");
  assert.equal(result.gapExplanations.length, 1);
  assert.deepEqual(result.nextSteps, ["Solve Tree questions"]);
});

test("throws on non-JSON Gemini output", () => {
  assert.throws(() => parseCompanyPrepStrategy("plain text, not json"));
});

test("throws when the strategy field is missing", () => {
  assert.throws(() =>
    parseCompanyPrepStrategy(JSON.stringify({ nextSteps: ["a"] }))
  );
});

test("throws when strategy is not a string", () => {
  assert.throws(() =>
    parseCompanyPrepStrategy(JSON.stringify({ strategy: 42, nextSteps: [] }))
  );
});

test("throws when nextSteps is missing", () => {
  assert.throws(() =>
    parseCompanyPrepStrategy(JSON.stringify({ strategy: "ok" }))
  );
});
