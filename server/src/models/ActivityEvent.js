const mongoose = require("mongoose");

const activityEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "resume_analyzed",
        "interview_prepared",
        "mock_interview_completed",
        "company_prep",
        "dsa_question_completed",
        "profile_updated",
      ],
      required: true,
    },

    summary: {
      type: String,
      default: "",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

activityEventSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityEvent", activityEventSchema);
