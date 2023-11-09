const mongodb = require("mongodb");

const MongoClient = mongodb.MongoClient;

let database;
let mongodbUrl = "mongodb://127.0.0.1:27017";
if (process.env.MONGODB_URL) {
  mongodbUrl = process.env.MONGODB_URL;
}
async function connectToDatabase() {
  const client = await MongoClient.connect(mongodbUrl);
  database = client.db("lawn");
}

function getDb() {
  if (!database) {
    throw { message: "You must connect first!" };
  }
  return database;
}

module.exports = {
  connectToDatabase: connectToDatabase,
  getDb: getDb,
  mongoUrl: mongodbUrl,
};
