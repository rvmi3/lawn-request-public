const express = require("express");
const tempCode = require("../models/tempCodes");
const router = express.Router();
const db = require("../data/database");
const day = require("../models/requestsPerDay");
const emailTransporter = require("../models/emailTransporter");
const trimStringsMiddleware = require("../middlewares/trimStringMiddleware");
const tokenMiddleware = require("../middlewares/tokenMiddleware");

const loggedOutRoutes = require("./loggedOutRoutes");
const registrationRoutes = require("./registrationRoutes");
const landscaperRoutes = require("./landscaperRoutes");
const requestRoutes = require("./requestRoutes");
const uploader = require("../models/multerConfig");

router.use(uploader.single("image"));

router.use(trimStringsMiddleware);
router.use(tokenMiddleware);

router.post("/disclaimer", async function (req, res, next) {
  if (!req.body.accept) {
    res.redirect("../");
    return;
  }
  await db
    .getDb()
    .collection("users")
    .updateOne({ _id: res.locals.userId }, { $set: { ["new.disclaimer"]: true } });
  req.session.trusted = true;
  return res.redirect("/");
});

router.use(async function (req, res, next) {
  if (!res.locals.isAuth) {
    return next();
  }
  if (!req.session.trusted) {
    return res.render("disclaimer");
  }
  if (!req.session.new) {
    await db
      .getDb()
      .collection("users")
      .updateOne({ _id: res.locals.userId }, { $set: { ["new.start"]: true } });
    req.session.new = true;
    return res.render("starting");
  } else {
    next();
  }
});
router.get("/guide", async function (req, res) {
  res.render("starting");
});
router.get("/", async function (req, res) {
  const search = new RegExp(req.query.search, "i");

  const page = parseInt(req.query.page - 1) || 0;
  const limit = 10;

  let query;
  if (req.query.unavailable) {
    query = {
      $or: [{ zip: { $regex: search } }, { city: { $regex: search } }, { name: { $regex: search } }],
    };
  } else {
    query = {
      [`availability.${day.date.day}.rpd`]: { $ne: 0 },
      isFull: false,
      $or: [{ zip: { $regex: search } }, { city: { $regex: search } }, { name: { $regex: search } }],
    };
  }

  const documents = await db.getDb().collection("landscapers").find(query).toArray();
  const pageCount = Math.ceil(documents.length / limit);

  const landscapers = await db
    .getDb()
    .collection("landscapers")
    .find(query)
    .skip(page * limit)
    .limit(limit)
    .toArray();

  res.render("main", { landscapers: landscapers, search: req.query.search, pageCount, page, results: documents.length });
});

router.use(loggedOutRoutes);

router.use(function (req, res, next) {
  if (!res.locals.isAuth) {
    res.render("404", { message: "Create an account to access services" });
  } else {
    next();
  }
});
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

router.use(registrationRoutes);
router.use(requestRoutes);

router.use(function (req, res, next) {
  if (!res.locals.isLs) {
    return res.render("404", { message: "Must register as a landscaper to access this page" });
  } else {
    next();
  }
});

router.use(landscaperRoutes);

setInterval(async () => {
  const expired = await db
    .getDb()
    .collection("resetTokens")
    .find({ expiration: { $lte: new Date().getTime() } })
    .toArray();

  for (const user of expired) {
    await db
      .getDb()
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { cr: 0 } });
  }
  await db
    .getDb()
    .collection("landscapers")
    .updateMany({}, { $pull: { requests: { expiration: { $lte: new Date().getTime() } }, accepted: { expiration: { $lte: new Date().getTime() } } } });
}, 15 * 60 * 1000);
setInterval(day.checkAndResetRequests, 15 * 60 * 1000);
setInterval(tempCode.deleteExpiredCodes, 60 * 15 * 1000);

module.exports = router;
