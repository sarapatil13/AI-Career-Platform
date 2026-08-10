const mongoose = require("mongoose");

const priorityGapSchema = new mongoose.Schema(
  {
    gap: {
      type: String,
      required: true,
    },

    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      required: true,
    },
  },
  {
    _id: false,
  }
);

const companyPrepAnalysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    company: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      required: true,
    },

    source: {
      type: String,
      enum: ["ai", "fallback-heuristic"],
      default: "fallback-heuristic",
    },

    technicalSkillsScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    dsaReadinessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    coreCSScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    overallMatchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    summary: {
      type: String,
      default: "",
    },

    strengths: {
      type: [String],
      default: [],
    },

    gaps: {
      type: [String],
      default: [],
    },

    recommendations: {
      type: [String],
      default: [],
    },

    resources: {
      type: [String],
      default: [],
    },

    catalogVersion: {
      type: Number,
      default: 1,
    },

    focusTopics: {
      type: [String],
      default: [],
    },

    priorityGaps: {
      type: [priorityGapSchema],
      default: [],
    },

    matchedRequiredSkills: {
      type: [String],
      default: [],
    },

    missingRequiredSkills: {
      type: [String],
      default: [],
    },

    matchedPreferredSkills: {
      type: [String],
      default: [],
    },

    missingPreferredSkills: {
      type: [String],
      default: [],
    },

    coreCSGaps: {
      type: [String],
      default: [],
    },

    dsaStrengths: {
      type: [String],
      default: [],
    },

    strategy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

companyPrepAnalysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("CompanyPrepAnalysis", companyPrepAnalysisSchema);
