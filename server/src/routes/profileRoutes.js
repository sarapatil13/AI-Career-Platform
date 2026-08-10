const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const {
  getSummaryController,
  getActivityController,
  getPerformanceController,
  getWeakTopicsController,
  updateProfileController,
  addCompanyController,
  removeCompanyController,
  addRoleController,
  removeRoleController,
} = require("../controllers/profileController");

const router = express.Router();

router.get("/summary", protect, getSummaryController);
router.get("/activity", protect, getActivityController);
router.get("/performance", protect, getPerformanceController);
router.get("/weak-topics", protect, getWeakTopicsController);

router.patch("/", protect, updateProfileController);

router.post("/companies", protect, addCompanyController);
router.delete("/companies/:company", protect, removeCompanyController);

router.post("/roles", protect, addRoleController);
router.delete("/roles/:role", protect, removeRoleController);

module.exports = router;
