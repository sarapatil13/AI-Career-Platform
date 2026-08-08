const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { prepareInterviewController } = require("../controllers/interviewController");

router.post("/prepare", protect, prepareInterviewController);

module.exports = router;
