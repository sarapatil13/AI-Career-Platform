const { generateFeedback } = require("../services/geminiService");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { analyzeResume } = require("../services/atsService");
const ResumeAnalysis = require("../models/ResumeAnalysis");
const activityService = require("../services/activityService");

const MAX_RESUME_TEXT_LENGTH = 50000;

// Uploaded resumes are processed in memory and then deleted from disk so
// personal data is not left in the uploads folder.
const removeUploadedFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
};

const persistResumeAnalysis = async ({ userId, filename, analysis, aiFeedback }) => {
  await ResumeAnalysis.create({
    user: userId,
    filename: filename || "",
    atsScore: analysis.atsScore,
    foundSkills: analysis.foundSkills,
    missingSkills: analysis.missingSkills,
    recommendations: analysis.suggestions,
    aiFeedback:
      typeof aiFeedback === "string"
        ? aiFeedback
        : JSON.stringify(aiFeedback || ""),
    source: "fallback-heuristic",
  });

  await activityService.recordActivityQuietly({
    userId,
    type: "resume_analyzed",
    summary: `Resume analyzed (ATS ${analysis.atsScore}/100)`,
    metadata: { key: "analysis", atsScore: analysis.atsScore },
  });
};

const extractText = async (file) => {
  const dataBuffer = fs.readFileSync(file.path);

  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value;
  }

  const pdfData = await pdfParse(dataBuffer);
  return pdfData.text;
};

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    try {
      const extractedText = await extractText(req.file);

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(422).json({
          message: "No readable text could be extracted from the uploaded file.",
        });
      }

      const analysis = analyzeResume(extractedText);
      const aiFeedback = await generateFeedback(extractedText);

      await persistResumeAnalysis({
        userId: req.user._id,
        filename: req.file.originalname,
        analysis,
        aiFeedback,
      });

      res.status(200).json({
        message: "Resume uploaded successfully",
        analysis,
        aiFeedback,
        extractedText,
        file: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
    } finally {
      removeUploadedFile(req.file.path);
    }
  } catch (error) {
    console.error("UPLOAD ERROR:", error.message);

    res.status(500).json({
      message: error.message,
    });
  }
};

const analyzeResumeText = async (req, res) => {
  try {
    const { resumeText } = req.body || {};

    if (!resumeText || typeof resumeText !== "string") {
      return res.status(400).json({
        message: "resumeText is required",
      });
    }

    if (resumeText.trim().length === 0) {
      return res.status(400).json({
        message: "resumeText cannot be empty",
      });
    }

    if (resumeText.length > MAX_RESUME_TEXT_LENGTH) {
      return res.status(400).json({
        message: `resumeText must be at most ${MAX_RESUME_TEXT_LENGTH} characters`,
      });
    }

    const analysis = analyzeResume(resumeText);
    const aiFeedback = await generateFeedback(resumeText);

    await persistResumeAnalysis({
      userId: req.user._id,
      filename: "",
      analysis,
      aiFeedback,
    });

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

module.exports = {
  uploadResume,
  analyzeResumeText,
};
