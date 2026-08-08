const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { recommendCareer, guideCareer } = require("../controllers/careerController");

router.post("/recommend", protect, recommendCareer);
router.post("/guidance", protect, guideCareer);

module.exports = router;
