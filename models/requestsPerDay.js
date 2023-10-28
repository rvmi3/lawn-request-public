const db = require("../data/database");

const now = new Date();
const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const date = {
  time: now.getTime(),
  day: daysOfWeek[now.getDay()],
};

const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
const timeRemaining = endOfDay.getTime() - now.getTime(); // Time difference in milliseconds

async function getRpd(id) {
  const ls = await db.getDb().collection("landscapers").findOne({ _id: id });

  const rpd = ls.availability[date.day].rpd;
  return rpd;
}

function getTimeLeft() {
  return timeRemaining;
}
async function checkAndResetRequests() {
  await db
    .getDb()
    .collection("landscapers")
    .updateMany({ isFull: true, setFullOn: { $ne: date.day } }, { $set: { cr: 0, isFull: false, setFullOn: null } });
}

async function resetRequests(id) {
  await db
    .getDb()
    .collection("landscapers")
    .updateMany({ _id: id }, { $set: { cr: 0, isFull: false, setFullOn: null } });
}

async function checkForFull(id) {
  const ls = await db.getDb().collection("landscapers").findOne({ _id: id });

  if (ls.hasOffline && (await getRpd(id)) === 0) {
    return false;
  }
  if (ls.isFull) {
    return true;
  }

  if (ls.cr == (await getRpd(id))) {
    await db
      .getDb()
      .collection("landscapers")
      .updateOne({ _id: id }, { $set: { isFull: true, setFullOn: date.day } });
    return true;
  }
  return false;
}

async function pauseRequests(id) {
  const response = await db
    .getDb()
    .collection("landscapers")
    .updateOne({ _id: id, isPaused: true }, { $set: { isPaused: false } });
  if (response.matchedCount === 0) {
    await db
      .getDb()
      .collection("landscapers")
      .updateOne({ _id: id, isPaused: false }, { $set: { isPaused: true } });
  }
}

async function enableOfflineRequests(id) {
  const response = await db
    .getDb()
    .collection("landscapers")
    .updateOne({ _id: id, hasOffline: true }, { $set: { hasOffline: false } });
  if (response.matchedCount === 0) {
    await db
      .getDb()
      .collection("landscapers")
      .updateOne({ _id: id, hasOffline: false }, { $set: { hasOffline: true } });
  }
}

module.exports = { getTimeLeft, getRpd, date, checkForFull, checkAndResetRequests, resetRequests, pauseRequests, enableOfflineRequests };
