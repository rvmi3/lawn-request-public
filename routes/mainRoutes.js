const express = require("express");
const tempCode = require("../models/tempCodes");
const router = express.Router();
const db = require("../data/database");
const day = require("../models/requestsPerDay");

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

// router.get("/:term", async function (req, res) {
//   res.render(req.params.term);
// });
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
    res.redirect("/");
  } else {
    next();
  }
});
router.use(registrationRoutes);
router.use(requestRoutes);

router.use(function (req, res, next) {
  if (!res.locals.isLs) {
    return res.render("404", { message: "Not authorized" });
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
    .updateMany({}, { $pull: { requests: { expiration: { $lte: new Date().getTime() } } } });
}, 15 * 60 * 1000);
setInterval(day.checkAndResetRequests, 15 * 60 * 1000);
setInterval(tempCode.deleteExpiredCodes, 60 * 15 * 1000);

module.exports = router;
