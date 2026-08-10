const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: false,
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    googleId: {
      type: String,
      default: null,
    },

    skills: {
      type: [String],
      default: [],
    },

    targetRoles: {
      type: [String],
      default: [],
    },

    interestedCompanies: {
      type: [String],
      default: [],
    },

    interestedCompanyRoles: {
      type: [
        {
          company: { type: String, required: true },
          role: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);