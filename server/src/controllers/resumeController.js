const { generateFeedback } = require("../services/geminiService");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const { analyzeResume } = require("../services/atsService");
const { generateCareerRecommendations, generateCareerGuidanceText } = require("../services/careerService");
const { prepareInterview: prepareInterviewService } = require("../services/interviewService");
const { predictPlacement: predictPlacementService } = require("../services/mlService");

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);

    const analysis = analyzeResume(pdfData.text);
    const aiFeedback = await generateFeedback(pdfData.text);

    console.log("========== RESUME TEXT ==========");
    console.log(pdfData.text);
    console.log("================================");

    res.status(200).json({
      message: "Resume uploaded successfully",
      analysis,
      aiFeedback,
      extractedText: pdfData.text,
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
      },
    });
  } catch (error) {
    console.error("UPLOAD ERROR:");
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

const analyzeResumeText = async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText || typeof resumeText !== "string") {
      return res.status(400).json({
        message: "resumeText is required",
      });
    }

    const analysis = analyzeResume(resumeText);
    const aiFeedback = await generateFeedback(resumeText);

    res.status(200).json({
      message: "Resume analysis complete",
      analysis,
      aiFeedback,
      extractedText: resumeText,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const prepareInterviewHandler = async (req, res) => {
  try {
    const payload = req.body;

    const result = await prepareInterviewService(payload);

    res.status(200).json({
      message: "Interview preparation generated",
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const recommendCareer = async (req, res) => {
  try {
    const payload = req.body;

    const result = await generateCareerRecommendations(payload);

    res.status(200).json({
      message: "Career recommendations generated",
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const guideCareer = async (req, res) => {
  try {
    const payload = req.body;

    const result = await generateCareerGuidanceText(payload);

    res.status(200).json({
      message: "Career guidance generated",
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const predictPlacementHandler = async (req, res) => {
  try {
    const result = await predictPlacementService(req.body);

    res.status(200).json({
      message: "Placement prediction complete",
      prediction: result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  uploadResume,
  analyzeResumeText,
  prepareInterview: prepareInterviewHandler,
  recommendCareer,
  guideCareer,
  predictPlacement: predictPlacementHandler,
};