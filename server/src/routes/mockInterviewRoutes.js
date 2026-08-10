const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getOptionsController,
  startSessionController,
  listSessionsController,
  getSessionController,
  submitAnswerController,
  completeSessionController,
} = require("../controllers/mockInterviewController");

router.get("/options", protect, getOptionsController);
router.post("/start", protect, startSessionController);
router.get("/sessions", protect, listSessionsController);
router.get("/sessions/:id", protect, getSessionController);
router.post("/sessions/:id/submit-answer", protect, submitAnswerController);
router.post("/sessions/:id/complete", protect, completeSessionController);

module.exports = router;
