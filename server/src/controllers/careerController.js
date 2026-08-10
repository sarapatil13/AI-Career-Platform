const {
  generateCareerRecommendations,
  generateCareerGuidanceText,
} = require("../services/careerService");
const { optionalString, isStringArray } = require("../utils/validation");

const validateCareerPayload = (body) => {
  const payload = {
    resumeText: optionalString(body.resumeText, 50000),
    targetRole: optionalString(body.targetRole, 100),
    skills: isStringArray(body.skills)
      ? body.skills.map((skill) => skill.trim()).filter(Boolean)
      : undefined,
  };

  if (body.resumeText !== undefined && payload.resumeText === undefined) {
    return { error: "resumeText must be a non-empty string" };
  }

  if (body.skills !== undefined && !isStringArray(body.skills)) {
    return { error: "skills must be an array of strings" };
  }

  return { payload };
};

const recommendCareer = async (req, res) => {
  try {
    const { payload, error } = validateCareerPayload(req.body || {});

    if (error) {
      return res.status(400).json({ message: error });
    }

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
    const { payload, error } = validateCareerPayload(req.body || {});

    if (error) {
      return res.status(400).json({ message: error });
    }

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

module.exports = {
  recommendCareer,
  guideCareer,
};
