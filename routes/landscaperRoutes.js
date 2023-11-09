const express = require("express");
const db = require("../data/database");
const transporter = require("../models/emailTransporter");
const router = express.Router();
const rq = require("../models/requestsPerDay");
const uploader = require("../models/multerConfig");
const vti = require("../models/validateTimeInput").validateTimeInputs;
const uuid = require("uuid");
const chatCtrl = require("../models/chatControl");

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get(
  "/edit",
  asyncHandler(async (req, res) => {
    if (!res.locals.isLs) {
      return res.render("404", { message: "Not authorized for this request" });
    }
    const ls = await db.getDb().collection("landscapers").findOne({ _id: res.locals.userId });

    res.render("edit", { ls: ls });
  })
);
router.get(
  "/availabilityData",
  asyncHandler(async (req, res) => {
    if (!res.locals.isLs) {
      return res.render("404", { message: "Not authorized for this request" });
    }
    const ls = await db.getDb().collection("landscapers").findOne({ _id: res.locals.userId });
    res.json(ls.availability);
  })
);
router.post(
  "/updateSettings",
  asyncHandler(async (req, res) => {
    if (!res.locals.isLs) {
      return res.render("404", { message: "Not authorized for this request" });
    }
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
        if (!vti(req.body["hours-start-tod"][count], req.body["hours-end-tod"][count], req.body["hours-start"][count], req.body["hours-end"][count])) {
          return res.render("404", { message: "Input Error" });
        }
        let start = 0;
        let end = 0;
        if (req.body["hours-start-tod"][count] == "pm") {
          start += 12;
        }
        if (req.body["hours-end-tod"][count] == "pm") {
          end += 12;
        }
        query[day].start = parseInt(req.body["hours-start"][count]) + start * 1;
        query[day].end = parseInt(req.body["hours-end"][count]) + end * 1;
        if (req.body["requests"][count] * 1 < 0) {
          query[day].rpd = 0;
        } else {
          query[day].rpd = req.body["requests"][count] * 1;
        }
      }
      count++;
    }
    console.log(query);
    await db
      .getDb()
      .collection("landscapers")
      .updateOne({ _id: res.locals.userId }, { $set: { availability: query, description: req.body.desc, zip: req.body.zip, city: req.body.city } });

    res.render("confirm", { message: "Settings succesfully updated", link: "/overview" });
  })
);
router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    if (!res.locals.isLs) {
      return res.render("404", { message: "Not authorized" });
    }
    const ls = await db.getDb().collection("landscapers").findOne({ _id: res.locals.userId });

    res.render("overview", { requests: ls.requests, accepted: ls.accepted, cr: ls.cr, limit: ls.availability[rq.date.day].rpd, ls: ls });
  })
);

router.post(
  "/accept",
  asyncHandler(async (req, res) => {
    const destination = await db.getDb().collection("users").findOne({ _id: req.body.id });

    const currentTime = new Date().getTime();
    const endTime = currentTime + 7 * 24 * 60 * 60 * 1000;
    const currentDate = new Date(currentTime).toLocaleDateString();
    const endDate = new Date(currentTime + 7 * 24 * 60 * 60 * 1000).toLocaleDateString();

    await transporter
      .sendMail({
        from: "<noreply-lawn@lawnrequest.com>",
        to: destination.email,
        subject: "Landscaping Request Accepted!",
        html: `<p>Your request has been accepted, expect landscaper to fullfill request within the dates: <strong>${currentDate}</strong> to <strong>${endDate}</strong>   </p>`,
      })
      .catch(async () => {
        await db.getDb().collection("errorLog").insertOne({
          destination: destination.email,
          time: new Date().getTime(),
        });
      });
    transporter.close();
    await db
      .getDb()
      .collection("landscapers")
      .updateMany({}, { $pull: { requests: { requestId: destination._id } } });

    let term = "";
    for (const key in destination.address) {
      if (term !== "") {
        term += "+";
      }
      if (key === "address") {
        term += destination.address[key].replace(/ /g, "+");
      } else {
        term += destination.address[key];
      }
    }
    const chatId = uuid.v4();
    await db
      .getDb()
      .collection("landscapers")
      .updateOne(
        { _id: res.locals.userId },
        {
          $push: {
            accepted: {
              destinationId: destination._id,
              address: destination.address.address,
              displayExpiration: endDate,
              search: term,
              expiration: endTime,
              chatId: chatId,
            },
          },
        }
      );

    await db
      .getDb()
      .collection("chat")
      .insertOne({
        _id: chatId,
        participants: {
          ls: res.locals.userId,
          user: destination._id,
        },
        messages: [],
        disabled: false,
      });
    res.redirect("/overview");
  })
);
router.get("/reject/:id", async function (req, res) {
  res.render("reject", { id: req.params.id });
});
router.get("/cancel/:id", async function (req, res) {
  res.render("cancel", { id: req.params.id });
});
router.post(
  "/reject",
  asyncHandler(async (req, res) => {
    const destination = await db.getDb().collection("users").findOne({ _id: req.body.id });

    await transporter
      .sendMail({
        from: "<noreply-lawn@lawnrequest.com>",
        to: destination.email,
        subject: "Landscaping Request Rejected!",
        html: `<p>Your request has been rejected, this was the reason why: ${req.body.reason}</p>`,
      })
      .catch(async () => {
        await db.getDb().collection("errorLog").insertOne({
          destination: destination.email,
          time: new Date().getTime(),
        });
      });
    transporter.close();
    await db
      .getDb()
      .collection("landscapers")
      .updateOne({ _id: res.locals.userId }, { $pull: { requests: { requestId: destination._id } } });

    res.redirect("/overview");
  })
);
router.post(
  "/cancel",
  asyncHandler(async (req, res) => {
    const destination = await db.getDb().collection("users").findOne({ _id: req.body.id });

    await transporter
      .sendMail({
        from: "<noreply-lawn@lawnrequest.com>",
        to: destination.email,
        subject: "Landscaping Request Cancelled!",
        html: `<p>Your request has been cancelled, this was the reason why: ${req.body.reason}</p>`,
      })
      .catch(async () => {
        await db.getDb().collection("errorLog").insertOne({
          destination: destination.email,
          time: new Date().getTime(),
        });
      });
    transporter.close();
    await db
      .getDb()
      .collection("landscapers")
      .updateOne({ _id: res.locals.userId }, { $pull: { accepted: { destinationId: destination._id } } })
      .then(await db.getDb().collection("cancelLog").insertOne({ _id: new Date().getTime(), landscaper: res.locals.userId, user: destination._id, reason: req.body.reason }));
    await chatCtrl.disable(res.locals.userId, destination._id);
    return res.redirect("/overview");
  })
);

router.post(
  "/complete",
  asyncHandler(async (req, res) => {
    const destination = await db.getDb().collection("users").findOne({ _id: req.body.destinationId });
    await transporter
      .sendMail({
        from: "<noreply-lawn@lawnrequest.com>",
        to: destination.email,
        subject: "Landscaping Request Completed!",
        html: `<p>Your request has been completed and fullfilled</p> `,
      })
      .then(
        await db
          .getDb()
          .collection("landscapers")
          .updateOne({ _id: res.locals.userId }, { $pull: { accepted: { destinationId: destination._id } }, $inc: { completed: 1 } })
      )
      .then(await db.getDb().collection("completionLog").insertOne({ _id: new Date().getTime(), landscaper: res.locals.userId, user: destination._id, by: "landscaper" }))
      .catch(async () => {
        await db.getDb().collection("errorLog").insertOne({
          destination: destination.email,
          time: new Date().getTime(),
        });
      });
    transporter.close();
    await chatCtrl.disable(res.locals.userId, destination._id);
    res.redirect("/overview");
  })
);

router.post(
  "/reset",
  asyncHandler(async (req, res) => {
    await rq.resetRequests(res.locals.userId);
    res.redirect("/overview");
  })
);

router.post(
  "/pause",
  asyncHandler(async (req, res) => {
    await rq.pauseRequests(res.locals.userId);
    res.redirect("/overview");
  })
);

router.post(
  "/enable",
  asyncHandler(async (req, res) => {
    await rq.enableOfflineRequests(res.locals.userId);
    res.redirect("/overview");
  })
);

router.post("/profile", async function (req, res) {
  let userImage = req.file;

  if (!userImage) {
    return res.status(404).render("404", { message: "No Image Provided" });
  }
  const allowedImageTypes = ["image/jpeg", "image/png"];
  if (!allowedImageTypes.includes(req.file.mimetype)) {
    return res.status(404).render("404", { message: "File must be image" });
  }

  await db
    .getDb()
    .collection("landscapers")
    .updateOne({ _id: res.locals.userId }, { $set: { profile: userImage.path } });

  res.redirect("/overview");
});

module.exports = router;
