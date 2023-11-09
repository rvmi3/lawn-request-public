const express = require("express");
const db = require("../data/database");
const emailTransporter = require("../models/emailTransporter");
const router = express.Router();

const chatCtrl = require("../models/chatControl");
setInterval(chatCtrl.disableExpired, 30 * 60 * 1000);

router.get("/comment/:id", async function (req, res, next) {
  const ls = await db.getDb().collection("landscapers").findOne({ _id: req.params.id });
  if (!ls) {
    return next();
  }
  const comments = await db.getDb().collection("comments").find({ landscaper: req.params.id }).toArray();

  let sessionInputData = req.session.inputData;
  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      message: "",
    };
  }
  req.session.inputData = null;

  res.render("comments", { ls: ls, comments: comments, inputData: sessionInputData });
});
router.post("/comment/:id", async function (req, res, next) {
  const comment = req.body.comment;
  if (!comment) {
    return res.redirect("/");
  }
  const completed = await db.getDb().collection("completionLog").findOne({ landscaper: req.params.id, user: res.locals.userId });
  if (!completed) {
    req.session.inputData = {
      hasError: true,
      message: "Must have job completed by landscaper to comment",
    };
    req.session.save(function () {
      res.redirect(`/comment/${req.params.id}`);
    });
    return;
  }
  const foundComment = await db.getDb().collection("comments").findOne({ landscaper: req.params.id, user: res.locals.name });
  if (foundComment) {
    req.session.inputData = {
      hasError: true,
      message: "Already commented",
    };
    req.session.save(function () {
      res.redirect(`/comment/${req.params.id}`);
    });
    return;
  }
  const ls = await db.getDb().collection("landscapers").findOne({ _id: req.params.id });
  await db.getDb().collection("comments").insertOne({ landscaper: req.params.id, user: res.locals.name, comment: comment, date: new Date().toLocaleDateString() });
  await emailTransporter
    .sendMail({
      from: "<noreply-lawn@lawnrequest.com>",
      to: ls.email,
      subject: `New Comment`,
      html: `<p><strong>User:</strong> ${res.locals.name}</p> <p><strong>Comment:</strong> ${comment}</p><p>View your comments here: <a href="https://www.lawnrequest.com/comment/${req.params.id}">Comments</a><p>`,
    })
    .catch((err) => {
      console.log(err);
      return next();
    });
  emailTransporter.close();
  res.redirect(`/comment/${req.params.id}`);
});

router.get("/contact", async function (req, res) {
  res.render("contact");
});
router.post("/contact", async function (req, res, next) {
  if (!req.body.subject || !req.body.message) {
    return res.render("404", { message: "Missing Error Input" });
  }

  const userInfo = await db.getDb().collection("users").findOne({ _id: res.locals.userId });

  if (!userInfo) {
    return res.render("404", { message: "Error recieving user info" });
  }

  const commented = await db
    .getDb()
    .collection("contactLog")
    .findOne({ from: userInfo._id, expiration: { $gte: new Date().getTime() } });
  if (commented) {
    return res.render("404", { message: "Must wait 24 hours before sending another message" });
  }
  await emailTransporter
    .sendMail({
      from: "<noreply-lawn@lawnrequest.com>",
      to: "addous72@gmail.com",
      subject: `CONTACT MESSAGE ${userInfo.email}: ${req.body.subject} `,
      html: `${req.body.message}`,
    })
    .then(
      await db
        .getDb()
        .collection("contactLog")
        .insertOne({ from: userInfo._id, subject: req.body.subject, message: req.body.message, expiration: new Date().getTime() + 24 * 60 * 60 * 1000 })
    )
    .then(res.render("confirm", { message: "Message succesfully sent!" }))
    .catch((err) => {
      console.log(err);
      return next();
    });
  emailTransporter.close();
  return;
});

router.get("/chat/:id", async function (req, res, next) {
  const chat = await chatCtrl.validate(res, req.params.id);
  if (!chat) {
    return;
  }
  return res.render("chat", { chat: chat.messages, id: chat._id });
});
router.post("/chat", async function (req, res) {
  const message = req.body.message;
  const chatId = req.body.chatId;
  await db
    .getDb()
    .collection("chat")
    .updateOne({ _id: chatId }, { $push: { messages: { id: res.locals.userId, name: res.locals.name, message: message, date: new Date().getTime() } } });
  return res.json({ status: "Message received successfully" });
});
router.get("/updateChat/:id", async function (req, res) {
  const chat = await chatCtrl.validate(res, req.params.id);
  if (!chat) {
    return;
  }
  return res.json({ chat: chat.messages, id: chat._id, primary: res.locals.userId });
});

module.exports = router;
