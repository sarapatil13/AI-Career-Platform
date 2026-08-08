const { predictPlacement, trainMlPipeline } = require("../services/mlService");

const predictPlacementController = async (req, res) => {
  try {
    const prediction = await predictPlacement(req.body || {});

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
