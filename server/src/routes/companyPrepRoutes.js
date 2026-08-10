const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getOptionsController,
  analyzeCompanyPrepController,
  listAnalysesController,
  getAnalysisController,
} = require("../controllers/companyPrepController");

router.get("/options", protect, getOptionsController);
router.post("/analyze", protect, analyzeCompanyPrepController);
router.get("/analyses", protect, listAnalysesController);
router.get("/analyses/:id", protect, getAnalysisController);

module.exports = router;
