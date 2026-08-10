const mongoose = require("mongoose");

const resumeAnalysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    filename: {
      type: String,
      default: "",
    },

    atsScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    foundSkills: {
      type: [String],
      default: [],
    },

    missingSkills: {
      type: [String],
      default: [],
    },

    recommendations: {
      type: [String],
      default: [],
    },

    aiFeedback: {
      type: String,
      default: "",
    },

    source: {
      type: String,
      enum: ["ai", "fallback-heuristic"],
      default: "fallback-heuristic",
    },
  },
  {
    timestamps: true,
  }
);

resumeAnalysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("ResumeAnalysis", resumeAnalysisSchema);
