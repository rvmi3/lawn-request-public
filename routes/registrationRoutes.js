const express = require("express");
const db = require("../data/database");
const transporter = require("../models/emailTransporter");
const router = express.Router();

router.get("/register", async function (req, res) {
  const user = await db.getDb().collection("users").findOne({ _id: res.locals.userId });
  if (user.address) {
    return res.redirect("/availability");
  }
  res.render("register");
});
router.post("/register", async function (req, res, next) {
  try {
    const result = await db
      .getDb()
      .collection("users")
      .updateOne(
        {
          _id: res.locals.userId,
        },
        {
          $set: {
            address: {
              address: req.body.address,
              zip: req.body.zip,
              city: req.body.city,
              state: req.body.state,
            },
          },
        }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: "Address was not updated" });
    }
    res.redirect("/availability");
  } catch (err) {
    next(err);
  }
});
router.get("/availability", async function (req, res) {
  const usert = await db.getDb().collection("users").findOne({ _id: res.locals.userId });
  if (!usert.address) {
    return res.redirect("/register");
  }

  const user = await db.getDb().collection("landscapers").findOne({ _id: res.locals.userId });

  if (!user || !user.availability) {
    return res.render("availability");
  }
  res.redirect("/description");
});
router.post("/availability", async function (req, res, next) {
  try {
    const query = {
      sunday: { start: 0, end: 0, rpd: 0 },
      monday: { start: 0, end: 0, rpd: 0 },
      tuesday: { start: 0, end: 0, rpd: 0 },
      wednesday: { start: 0, end: 0, rpd: 0 },
      thursday: { start: 0, end: 0, rpd: 0 },
      friday: { start: 0, end: 0, rpd: 0 },
      saturday: { start: 0, end: 0, rpd: 0 },
    };

    let count = 0;
    for (const day in query) {
      if (req.body[day]) {
        let start = 0;
        let end = 0;
        if (req.body["hours-start-tod"][count] === "pm") {
          start += 12;
        }
        if (req.body["hours-end-tod"][count] === "pm") {
          end += 12;
        }
        query[day].start = parseInt(req.body["hours-start"][count]) + start;
        query[day].end = parseInt(req.body["hours-end"][count]) + end;
        query[day].rpd = parseInt(req.body["requests"][count]);
      }
      count++;
    }

    await db
      .getDb()
      .collection("users")
      .updateOne({ _id: res.locals.userId }, { $set: { isLandscaper: true } });

    const landscaperProfile = {
      _id: res.locals.userId,
      email: res.locals.user,
      zip: res.locals.zip,
      city: res.locals.city,
      availability: query,
      requests: [],
      accepted: [],
      name: res.locals.name,
      cr: 0,
      isFull: false,
      hasOffline: true,
      isPaused: false,
      completed: 0,
      setFullOn: null,
    };

    await db.getDb().collection("landscapers").insertOne(landscaperProfile);

    res.redirect("/description");
  } catch (err) {
    next(err);
  }
});
router.get("/description", async function (req, res) {
  const user = await db.getDb().collection("landscapers").findOne({ _id: res.locals.userId });
  if (!user) {
    return res.redirect("/availability");
  }
  if (user.description) {
    return res.redirect("/");
  }
  res.render("description");
});
router.post("/description", async function (req, res, next) {
  try {
    const desc = req.body.desc;

    const result = await db
      .getDb()
      .collection("landscapers")
      .updateOne({ _id: res.locals.userId }, { $set: { description: desc } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Landscaper not found" });
    }
    await transporter
      .sendMail({
        from: "<noreply-lawn@lawnrequest.com>",
        to: res.locals.user,
        subject: `Landscaper Registration Complete! `,
        html: `Your landscaper registration has been complete, your profile card is now displayed publicly for people to discover. Dont forget to set a profile picture!`,
      })
      .catch(async (err) => {
        await db.getDb().collection("errorLog").insertOne({
          destination: res.locals.user,
          time: new Date().getTime(),
        });
        console.log(err);
        return next();
      });
    transporter.close();
    req.session.isLandscaper = true;
    req.session.save(() => {
      res.redirect("/");
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
