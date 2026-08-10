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

  // NOTE: This is a deterministic heuristic demo rule, NOT a trained ML model.
  // A real model would be trained on a placement dataset (see trainMlPipeline).
  const probability = Math.max(0, Math.min(1, 0.72 + (payload.cgpa - 6) * 0.03));
  const label = probability >= 0.7 ? "likely" : "needs-support";

  return {
    method: "heuristic-rule",
    interpretation: "Demo only: a deterministic rule (0.72 + (cgpa - 6) * 0.03) estimates placement likelihood. No machine-learning model is involved.",
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
    status: "design_scaffold_only",
    dataset: mlPipeline.datasetPath,
    note: "No model is trained here. This endpoint only documents the intended pipeline (RandomForest, XGBoost, LightGBM) and prepares a sample dataset for a future Python-based implementation.",
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
