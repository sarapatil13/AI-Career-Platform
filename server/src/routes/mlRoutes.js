const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { predictPlacementController, trainPipelineController } = require("../controllers/mlController");

router.post("/predict", protect, predictPlacementController);
router.get("/train", protect, trainPipelineController);

module.exports = router;
