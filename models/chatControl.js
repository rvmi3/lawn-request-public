const db = require("../data/database");

async function disable(landscaper, user) {
  await db
    .getDb()
    .collection("chat")
    .updateOne({ "participants.ls": landscaper, "participants.user": user }, { $set: { expiraton: new Date().getTime() + 24 * 60 * 60 * 1000, disabled: false } });
}

async function disableExpired() {
  await db
    .getDb()
    .collection("chat")
    .updateOne({ expiration: { $lte: new Date().getTime() } }, { $unset: { expiraton: {} }, $set: { disabled: true } });
}

async function validate(res, chatId) {
  const chat = await db.getDb().collection("chat").findOne({ _id: chatId });
  if (!chat) {
    return next();
  }
  if (chat.disabled) {
    return res.render("404", { message: "This chat has been disabled, to request chat logs please contact through contact page" });
  }
  if (chat.participants.ls !== res.locals.userId && chat.participants.user !== res.locals.userId) {
    return res.render("404", { message: "Not Allowed Access" });
  }
  console.log(chat);
  return chat;
}

module.exports = { disable, disableExpired, validate };
