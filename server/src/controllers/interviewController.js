const { prepareInterview } = require("../services/interviewService");

const prepareInterviewController = async (req, res) => {
  try {
    const result = await prepareInterview(req.body || {});

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
