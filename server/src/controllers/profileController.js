const profileService = require("../services/profileService");

const getSummaryController = async (req, res) => {
  try {
    const summary = await profileService.getProfileSummary(req.user._id);
    res.status(200).json(summary);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const getActivityController = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const result = await profileService.getActivityHistory({ userId: req.user._id, limit });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPerformanceController = async (req, res) => {
  try {
    const history = await profileService.getPerformanceHistory(req.user._id);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWeakTopicsController = async (req, res) => {
  try {
    const summary = await profileService.getProfileSummary(req.user._id);
    res.status(200).json({ weakTopics: summary.weakTopics });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfileController = async (req, res) => {
  try {
    const { name, skills } = req.body || {};
    const user = await profileService.updateProfile({
      userId: req.user._id,
      name,
      skills,
    });

    res.status(200).json({ message: "Profile updated", user });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const addCompanyController = async (req, res) => {
  try {
    const { company, role } = req.body || {};
    const preferences = await profileService.addInterestedCompany({
      userId: req.user._id,
      company,
      role,
    });

    res.status(200).json({ message: "Company added to interests", ...preferences });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const removeCompanyController = async (req, res) => {
  try {
    const preferences = await profileService.removeInterestedCompany({
      userId: req.user._id,
      company: req.params.company,
    });

    res.status(200).json({ message: "Company removed from interests", ...preferences });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const addRoleController = async (req, res) => {
  try {
    const { role } = req.body || {};
    const preferences = await profileService.addTargetRole({
      userId: req.user._id,
      role,
    });

    res.status(200).json({ message: "Role added to targets", ...preferences });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const removeRoleController = async (req, res) => {
  try {
    const preferences = await profileService.removeTargetRole({
      userId: req.user._id,
      role: req.params.role,
    });

    res.status(200).json({ message: "Role removed from targets", ...preferences });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

module.exports = {
  getSummaryController,
  getActivityController,
  getPerformanceController,
  getWeakTopicsController,
  updateProfileController,
  addCompanyController,
  removeCompanyController,
  addRoleController,
  removeRoleController,
};
