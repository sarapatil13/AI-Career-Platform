const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getCurrentUser,
  googleOAuthStart,
  googleOAuthCallback,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/google", googleOAuthStart);
router.get("/google/callback", googleOAuthCallback);
router.get("/me", protect, getCurrentUser);

module.exports = router;