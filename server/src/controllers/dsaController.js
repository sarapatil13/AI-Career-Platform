const dsaService = require("../services/dsaService");
const activityService = require("../services/activityService");

const getProgressController = async (req, res) => {
  try {
    const profile = await dsaService.getProfile(req.user._id);
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const putProgressController = async (req, res) => {
  try {
    const { questionId, completed } = req.body || {};

    if (!dsaService.isValidQuestionId(questionId)) {
      return res.status(400).json({
        message: "Invalid questionId",
      });
    }

    if (typeof completed !== "boolean") {
      return res.status(400).json({
        message: "completed must be a boolean",
      });
    }

    const question = dsaService.getQuestionById(questionId);
    const profileBefore = await dsaService.getProfile(req.user._id);
    const wasCompleted = profileBefore.completedQuestionIds.includes(String(questionId));

    await dsaService.setQuestionCompleted({
      userId: req.user._id,
      question,
      completed,
    });

    // Only genuinely new completions are activity; re-marking an already
    // completed question is not.
    if (completed && !wasCompleted) {
      await activityService.recordActivityQuietly({
        userId: req.user._id,
        type: "dsa_question_completed",
        summary: `Completed ${question.title} (${question.difficulty}, ${question.topic})`,
        metadata: {
          key: `question:${questionId}`,
          questionId: String(questionId),
          topic: question.topic,
        },
      });
    }

    const profile = await dsaService.getProfile(req.user._id);
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const syncProgressController = async (req, res) => {
  try {
    const { questionIds } = req.body || {};

    if (!Array.isArray(questionIds)) {
      return res.status(400).json({
        message: "questionIds must be an array",
      });
    }

    const { addedCount } = await dsaService.syncProgress({
      userId: req.user._id,
      questionIds,
    });

    if (addedCount > 0) {
      await activityService.recordActivityQuietly({
        userId: req.user._id,
        type: "dsa_question_completed",
        summary: `Synced ${addedCount} completed DSA ${addedCount === 1 ? "question" : "questions"}`,
        metadata: { key: "sync" },
      });
    }

    const profile = await dsaService.getProfile(req.user._id);
    res.status(200).json({ ...profile, addedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProgressController,
  putProgressController,
  syncProgressController,
};
