const { predictPlacement, trainMlPipeline, placementFeatures } = require("../services/mlService");

const FEATURE_RANGES = {
  cgpa: [0, 10],
  dsaScore: [0, 100],
  aptitudeScore: [0, 100],
  projects: [0, 20],
  internshipExperience: [0, 1],
  technicalSkillScore: [0, 100],
  communicationScore: [0, 100],
};

const predictPlacementController = async (req, res) => {
  try {
    const body = req.body || {};

    for (const feature of placementFeatures) {
      const value = body[feature];

      if (value === undefined || value === null || !Number.isFinite(Number(value))) {
        return res.status(400).json({
          message: `Missing or non-numeric value for "${feature}"`,
        });
      }

      const [min, max] = FEATURE_RANGES[feature];

      if (Number(value) < min || Number(value) > max) {
        return res.status(400).json({
          message: `"${feature}" must be between ${min} and ${max}`,
        });
      }
    }

    const prediction = await predictPlacement(body);

    res.status(200).json({
      message: "Placement prediction complete",
      prediction,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const trainPipelineController = async (req, res) => {
  try {
    const pipeline = await trainMlPipeline();

    res.status(200).json({
      message: "Training pipeline metadata loaded",
      pipeline,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  predictPlacementController,
  trainPipelineController,
};
