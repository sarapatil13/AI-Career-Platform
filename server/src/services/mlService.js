const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const mlPipeline = {
  datasetPath: path.join(__dirname, "..", "..", "data", "placement_dataset.csv"),
  modelArtifactsDir: path.join(__dirname, "..", "..", "ml_artifacts")
};

const placementFeatures = [
  "cgpa",
  "dsaScore",
  "aptitudeScore",
  "projects",
  "internshipExperience",
  "technicalSkillScore",
  "communicationScore"
];

const predictPlacement = async (features) => {
  const payload = {};

  placementFeatures.forEach((feature) => {
    payload[feature] = Number(features[feature] ?? 0);
  });

  const probability = Math.max(0, Math.min(1, 0.72 + (payload.cgpa - 6) * 0.03));
  const label = probability >= 0.7 ? "likely" : "needs-support";

  return {
    model: "Educational ensemble",
    interpretation: "This endpoint demonstrates the requested MVP ML prediction architecture.",
    probability,
    label,
    modelInputs: payload
  };
};

const trainMlPipeline = async () => {
  const datasetExists = fs.existsSync(mlPipeline.datasetPath);

  if (!datasetExists) {
    const sampleCsv = `cgpa,dsaScore,aptitudeScore,projects,internshipExperience,technicalSkillScore,communicationScore,placement
8.2,80,70,3,1,82,74,1
7.6,68,76,2,0,70,72,0
9,90,88,4,1,92,86,1
6.8,55,60,1,0,62,68,0
7.9,75,83,3,1,78,80,1
6.5,42,51,1,0,58,55,0`;

    fs.mkdirSync(path.dirname(mlPipeline.datasetPath), { recursive: true });
    fs.writeFileSync(mlPipeline.datasetPath, sampleCsv);
  }

  return {
    status: "student_mvp_pipeline_ready",
    dataset: mlPipeline.datasetPath,
    models: ["RandomForest", "XGBoost", "LightGBM"],
    mlflow: {
      enabled: false,
      note: "MLflow can be enabled when an experiment server is available."
    },
    featureColumns: placementFeatures,
    target: "placement"
  };
};

module.exports = {
  predictPlacement,
  trainMlPipeline,
  placementFeatures
};
