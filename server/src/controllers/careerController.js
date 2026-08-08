const { generateCareerRecommendations, generateCareerGuidanceText } = require("../services/careerService");

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

module.exports = {
  recommendCareer,
  guideCareer,
};
