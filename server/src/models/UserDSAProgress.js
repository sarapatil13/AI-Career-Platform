const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },

    topic: {
      type: String,
      required: true,
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },

    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const userDsaProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    records: {
      type: [recordSchema],
      default: [],
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("UserDSAProgress", userDsaProgressSchema);
