const db = require("../data/database");
const uuid = require("uuid");

async function generateCode(email) {
  const query = {
    timeCreated: new Date().getTime(),
    user: email,
    code: uuid.v4(),
    expiration: new Date().getTime() + 10 * 60 * 1000,
  };

  await db.getDb().collection("tempCodes").insertOne(query);

  return query.code;
}

async function validateCode(tempCode, age) {
  const foundTempCode = await db.getDb().collection("tempCodes").findOne({ code: tempCode });

  if (!foundTempCode) {
    return false;
  } else if (new Date().getTime() - foundTempCode.timeCreated > age) {
    await db.getDb().collection("tempCodes").deleteOne({ code: tempCode });
    return false;
  } else {
    return true;
  }
}

async function getUser(code) {
  const foundUser = await db.getDb().collection("tempCodes").findOne({ code: code });

  if (!foundUser) {
    return false;
  }
  const userInfo = await db.getDb().collection("users").findOne({ email: foundUser.user });

  return userInfo;
}

function createBufferWheel() {
  const spinner = ["|", "/", "-", "\\"];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(`\r${spinner[i]} deleting_codes...`);
    i = (i + 1) % spinner.length;
  }, 100);

  setTimeout(() => {
    clearInterval(interval);
    process.stdout.write("\rDone!                        \n");
  }, 3000);
}
async function deleteExpiredCodes() {
  const expiredPost = await db
    .getDb()
    .collection("tempCodes")
    .deleteMany({ expiration: { $lt: new Date().getTime() } });

  createBufferWheel();
}

module.exports = { generateCode, validateCode, getUser, deleteExpiredCodes };
