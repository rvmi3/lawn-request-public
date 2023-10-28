const db = require("../data/database");
const uuid = require("uuidv4");

async function addRequest(destination, from, desc) {
  const query = {
    _id: from,
    to: destination,
    expiration: new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
    status: "pending",
  };
  try {
    await db.getDb().collection("requests").insertOne(query);
  } catch (error) {
    return error;
  }
}
async function removeRequest(id) {
  try {
    await db
      .getDb()
      .collection("requests")
      .updateOne({ _id: id }, { $set: { status: "declined/cancelled", expiration: new Date().getTime() + 60 * 1000 } });
  } catch (error) {
    return error;
  }
}

async function acceptRequest(id) {
  try {
    await db
      .getDb()
      .collection("requests")
      .updateOne({ _id: id }, { $set: { status: "declined/cancelled", expiration: new Date().getTime() + 60 * 1000 } });
  } catch (error) {
    return error;
  }
}
