const mongoose = require("mongoose");

const companyPrepService = require("../services/companyPrepService");
const activityService = require("../services/activityService");
const { generateCompanyPrepStrategy } = require("../services/geminiService");
const { isStringArray } = require("../utils/validation");
const CompanyPrepAnalysis = require("../models/CompanyPrepAnalysis");

const getOptionsController = async (req, res) => {
  try {
    res.status(200).json(companyPrepService.getOptions());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const analyzeCompanyPrepController = async (req, res) => {
  try {
    const { company, role, skills } = req.body || {};

    if (typeof company !== "string" || !company.trim()) {
      return res.status(400).json({ message: "company is required" });
    }

    if (typeof role !== "string" || !role.trim()) {
      return res.status(400).json({ message: "role is required" });
    }

    if (skills !== undefined && !isStringArray(skills)) {
      return res.status(400).json({ message: "skills must be an array of strings" });
    }

    const userSkills =
      skills !== undefined
        ? skills.map((skill) => skill.trim()).filter(Boolean)
        : req.user.skills || [];

    const aiEnabled =
      process.env.COMPANY_PREP_AI_ENABLED === "true" ||
      (Boolean(process.env.GEMINI_API_KEY) &&
        process.env.COMPANY_PREP_AI_ENABLED !== "false");

    const analysis = await companyPrepService.analyzeCompanyPrep({
      userId: req.user._id,
      company,
      role,
      skills: userSkills,
      aiProvider: generateCompanyPrepStrategy,
      enableAI: aiEnabled,
    });

    await activityService.recordActivityQuietly({
      userId: req.user._id,
      type: "company_prep",
      summary: `Company prep analysis for ${analysis.company} (${analysis.role}): ${analysis.overallMatchScore}/100`,
      metadata: {
        key: `analysis:${analysis.company}:${analysis.role}`,
        company: analysis.company,
        role: analysis.role,
        overallMatchScore: analysis.overallMatchScore,
      },
    });

    res.status(200).json({
      message: "Company readiness analysis complete",
      ...analysis,
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: error.message });
  }
};

const listAnalysesController = async (req, res) => {
  try {
    const docs = await CompanyPrepAnalysis.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    const analyses = docs.map((doc) => companyPrepService.serializeAnalysis(doc));

    res.status(200).json({ analyses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAnalysisController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    const doc = await CompanyPrepAnalysis.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!doc) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    res.status(200).json(companyPrepService.serializeAnalysis(doc));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOptionsController,
  analyzeCompanyPrepController,
  listAnalysesController,
  getAnalysisController,
};
