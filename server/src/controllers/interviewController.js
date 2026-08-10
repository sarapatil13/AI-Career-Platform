const { prepareInterview } = require("../services/interviewService");
const { optionalString } = require("../utils/validation");

const prepareInterviewController = async (req, res) => {
  try {
    const body = req.body || {};

    const payload = {
      resumeText: optionalString(body.resumeText, 50000),
      targetRole: optionalString(body.targetRole, 100),
      company: optionalString(body.company, 100),
      technology: optionalString(body.technology, 100),
      query: optionalString(body.query, 500),
    };

    if (body.resumeText !== undefined && payload.resumeText === undefined) {
      return res.status(400).json({
        message: "resumeText must be a non-empty string",
      });
    }

    const result = await prepareInterview(payload);

    res.status(200).json({
      message: "Interview preparation generated",
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  prepareInterviewController,
};
