const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getProgressController,
  putProgressController,
  syncProgressController,
} = require("../controllers/dsaController");

router.get("/progress", protect, getProgressController);
router.put("/progress", protect, putProgressController);
router.post("/progress/sync", protect, syncProgressController);

module.exports = router;
