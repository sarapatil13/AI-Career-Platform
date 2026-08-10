const express = require("express");
const cors = require("cors");
const multer = require("multer");

const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const careerRoutes = require("./routes/careerRoutes");
const mlRoutes = require("./routes/mlRoutes");
const healthRoutes = require("./routes/healthRoutes");
const dsaRoutes = require("./routes/dsaRoutes");
const companyPrepRoutes = require("./routes/companyPrepRoutes");
const mockInterviewRoutes = require("./routes/mockInterviewRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

// CORS is restricted to the configured frontend origin. The local client runs
// on http://localhost:3000 by default; set CLIENT_URL when it runs elsewhere.
const allowedOrigins = [process.env.CLIENT_URL || "http://localhost:3000"];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "2mb" }));

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/career", careerRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/dsa", dsaRoutes);
app.use("/api/company", companyPrepRoutes);
app.use("/api/mock-interview", mockInterviewRoutes);
app.use("/api/profile", profileRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.message,
    });
  }

  const status = err.status || 500;

  res.status(status).json({
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
