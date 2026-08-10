const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;

const connectTestDB = async (dbName = "ai_career_test") => {
  const localUri =
    process.env.MONGODB_TEST_URI || `mongodb://127.0.0.1:27017/${dbName}`;

  try {
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
};

const disconnectTestDB = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};

module.exports = { connectTestDB, disconnectTestDB };
