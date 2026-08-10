const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    strengths: {
      type: [String],
      default: [],
    },

    weaknesses: {
      type: [String],
      default: [],
    },

    feedback: {
      type: String,
      default: "",
    },

    missingPoints: {
      type: [String],
      default: [],
    },

    idealAnswerPoints: {
      type: [String],
      default: [],
    },

    detectedTopics: {
      type: [String],
      default: [],
    },

    practiceTopics: {
      type: [String],
      default: [],
    },

    source: {
      type: String,
      enum: ["ai", "fallback"],
      default: null,
    },

    evaluatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      default: null,
    },

    questionText: {
      type: String,
      default: "",
    },

    topic: {
      type: String,
      default: null,
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: null,
    },

    reason: {
      type: String,
      default: "",
    },

    answerText: {
      type: String,
      default: "",
    },

    isSkipped: {
      type: Boolean,
      default: false,
    },

    source: {
      type: String,
      enum: ["ai", "fallback"],
      default: "fallback",
    },

    evaluation: {
      type: evaluationSchema,
      default: null,
    },

    evaluationFailed: {
      type: Boolean,
      default: false,
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    feedback: {
      type: String,
      default: "",
    },

    answeredAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const topicPerformanceSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
    },

    asked: {
      type: Number,
      default: 0,
    },

    evaluated: {
      type: Number,
      default: 0,
    },

    avgScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    lowCount: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const mockInterviewSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    interviewType: {
      type: String,
      enum: ["Technical", "HR"],
      default: "Technical",
    },

    targetRole: {
      type: String,
      default: "Software Engineer",
    },

    company: {
      type: String,
      default: null,
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: null,
    },

    focusTopics: {
      type: [String],
      default: [],
    },

    totalQuestions: {
      type: Number,
      min: 1,
      default: 5,
    },

    currentIndex: {
      type: Number,
      min: 0,
      default: 0,
    },

    questions: {
      type: [answerSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["in-progress", "completed"],
      default: "in-progress",
    },

    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    topicPerformance: {
      type: [topicPerformanceSchema],
      default: [],
    },

    sessionStrengths: {
      type: [String],
      default: [],
    },

    weakTopics: {
      type: [String],
      default: [],
    },

    practiceTopics: {
      type: [String],
      default: [],
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

mockInterviewSessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("MockInterviewSession", mockInterviewSessionSchema);
