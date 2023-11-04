const express = require("express");
const db = require("../data/database");
const router = express.Router();
const transporter = require("../models/emailTransporter");
const rq = require("../models/requestsPerDay");
const { uuid } = require("uuidv4");

router.get("/request/:id", async function (req, res) {
  if (res.locals.userId === req.params.id) {
    return res.render("404", { message: "Cant send request to yourself" });
  }
  const match = await db
    .getDb()
    .collection("landscapers")
    .findOne({ _id: req.params.id, requests: { $elemMatch: { requestId: res.locals.userId } } });
  if (match) {
    return res.render("404", { message: "Request has already been made" });
  }
  const requested = await db
    .getDb()
    .collection("requestLog")
    .findOne({ from: res.locals.userId, to: req.params.id, expiration: { $gte: new Date().getTime() } });
  if (requested) {
    return res.render("404", { message: "Must wait 1 hour before sending another request to same landscaper" });
  }

  const userId = req.params.id;
  const ls = await db.getDb().collection("landscapers").findOne({ _id: userId });
  const user = await db.getDb().collection("users").findOne({ _id: res.locals.userId });

  if (!ls || !user) {
    return res.redirect("/");
  }
  let address = {
    address: "",
    zip: "",
    city: "",
    state: "",
  };
  if (user.address) {
    address = user.address;
  }

  if (!ls.hasOffline && ls.availability[rq.date.day].rpd === 0) {
    return res.render("404", { message: "User has offline requests disabled" });
  }
  if (await rq.checkForFull(userId)) {
    return res.render("404", { message: "Requests are full for the day" });
  }
  if (ls.isPaused) {
    return res.render("404", { message: "User has requests paused" });
  }

  res.render("request", { ls: ls, address: address });
});
router.post("/request", async function (req, res, next) {
  try {
    if (res.locals.userId === req.body.destination) {
      return res.render("404", { message: "Cant send request to yourself" });
    }
    const date = new Date();
    const match = await db
      .getDb()
      .collection("landscapers")
      .findOne({ _id: req.body.destination, requests: { $elemMatch: { requestId: res.locals.userId } } });

    const requested = await db
      .getDb()
      .collection("contactLog")
      .findOne({ from: res.locals.userId, to: req.body.destination, expiration: { $gte: date.getTime() } });
    if (requested) {
      return res.render("404", { message: "Must wait 1 hour before sending another request to same landscaper" });
    }

    if (match) {
      return res.render("404", { message: "Request has already been made" });
    }
    const ls = await db.getDb().collection("landscapers").findOne({ _id: req.body.destination });

    if (!ls) {
      return res.render("404", { message: "Input error" });
    }
    if (!ls.hasOffline && ls.availability[rq.date.day].rpd === 0) {
      return res.render("404", { message: "User has offline requests disabled" });
    }
    if (ls.isPaused) {
      return res.render("404", { message: "User has requests paused" });
    }
    if (ls.isFull) {
      return res.render("404", { message: "User requests are full for the day" });
    }
    if (!req.body.address || !req.body.zip || !req.body.city || !req.body.state || !req.body.desc) {
      return res.render("404", { message: "Missing values" });
    }
    const address = {
      address: req.body.address,
      zip: req.body.zip,
      city: req.body.city,
      state: req.body.state,
    };
    const query = {
      requestId: res.locals.userId,
      address: address,
      expiration: date.getTime() + 7 * 24 * 60 * 60 * 1000,
      description: req.body.desc,
    };
    const response = await db
      .getDb()
      .collection("users")
      .updateOne({ _id: res.locals.userId, cr: { $lt: 5 } }, { $set: { address: address }, $inc: { cr: 1 } });
    if (response.matchedCount === 0) {
      await db
        .getDb()
        .collection("resetTokens")
        .insertOne({ _id: res.locals.userId, expiration: date.getTime() + 24 * 60 * 60 * 1000 });
      return res.render("404", { message: "Request limit has been reached for the day(5)" });
    }

    await transporter
      .sendMail({
        from: "<noreply-dous@dousdev.com>",
        to: ls.email,
        subject: "Landscaping Request",
        html: `<p>Landscaping request from ${res.locals.name} on ${new Date().toLocaleDateString()}</p><p>Request Description: ${req.body.desc}</p>`,
      })
      .catch(async () => {
        await db.getDb().collection("errorLog").insertOne({
          destination: ls.email,
          time: date.getTime(),
        });
      });
    transporter.close();
    await db
      .getDb()
      .collection("landscapers")
      .updateOne({ _id: req.body.destination }, { $push: { requests: query }, $inc: { cr: 1 } });
    await db
      .getDb()
      .collection("requestLog")
      .insertOne({ from: res.locals.userId, to: req.body.destination, expiration: date.getTime() + 60 * 60 * 1000 });
    res.render("confirm", { message: "Request succesfully sent!" });
  } catch (error) {
    next(error);
  }
});
router.get("/sent", async function (req, res) {
  let request = [];
  let landscaper = await db
    .getDb()
    .collection("landscapers")
    .find({ requests: { $elemMatch: { requestId: res.locals.userId } } })
    .toArray();
  if (landscaper.length !== 0) {
    for (const ls of landscaper) {
      for (const reqs of ls.requests) {
        if (reqs.requestId === res.locals.userId) {
          request.push({ destination: ls._id, to: ls.name, when: new Date(reqs.expiration - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(), description: reqs.description });
        }
      }
    }
  } else {
    landscaper = await db
      .getDb()
      .collection("landscapers")
      .findOne({ accepted: { $elemMatch: { destinationId: res.locals.userId } } });
    if (landscaper) {
      for (const acc of landscaper.accepted) {
        if (acc.destinationId === res.locals.userId) {
          request.push({ destination: landscaper._id, to: landscaper.name, when: acc.displayExpiration, accepted: true });
        }
      }
    }
  }

  res.render("sentRequests", { requests: request });
});
router.post("/cancel-sent", async (req, res) => {
  const destination = await db.getDb().collection("users").findOne({ _id: res.locals.userId });
  const landscaper = await db.getDb().collection("landscapers").findOne({ _id: req.body.destination });

  if (!landscaper || !destination) {
    return res.render("404", { message: "Input error" });
  }
  await transporter
    .sendMail({
      from: "<noreply-dous@dousdev.com>",
      to: landscaper.email,
      subject: "A Landscaping Request Has Been Cancelled!",
      html: `<p>${res.locals.name} has cancelled their request</p>`,
    })
    .then(
      await transporter.sendMail({
        from: "<noreply-dous@dousdev.com>",
        to: destination.email,
        subject: "Landscaping Request Cancelled!",
        html: `<p>You have cancelled your request for ${landscaper.name}</p>`,
      })
    )
    .catch(async () => {
      await db.getDb().collection("errorLog").insertOne({
        destination: destination.email,
        time: new Date().getTime(),
      });
    });
  transporter.close();
  const match = await db
    .getDb()
    .collection("landscapers")
    .updateOne({ _id: landscaper._id }, { $pull: { requests: { requestId: destination._id } } });

  if (match.modifiedCount === 0) {
    await db
      .getDb()
      .collection("landscapers")
      .updateOne({ _id: landscaper._id }, { $pull: { accepted: { destinationId: destination._id } } });
  }
  return res.redirect("/sent");
});

router.post("/complete-sent", async (req, res) => {
  const accepted = await db
    .getDb()
    .collection("landscapers")
    .find({ accepted: { $elemMatch: { destinationId: res.locals.userId } } });

  if (!accepted) {
    return res.render("404", { message: "Request must be accepted to report as complete" });
  }

  await transporter
    .sendMail({
      from: "<noreply-dous@dousdev.com>",
      to: res.locals.user,
      subject: "Landscaping Request Completed!",
      html: `<p>You reported your request as complete.</p> `,
    })
    .then(
      await db
        .getDb()
        .collection("landscapers")
        .updateOne({ _id: req.body.destination }, { $pull: { accepted: { destinationId: res.locals.userId } }, $inc: { completed: 1 } })
    )
    .then(await db.getDb().collection("completionLog").insertOne({ _id: new Date().getTime(), landscaper: res.locals.userId, user: req.body.destination, by: "user" }))
    .catch(async () => {
      await db.getDb().collection("errorLog").insertOne({
        destination: res.locals.user,
        time: new Date().getTime(),
      });
    });
  transporter.close();
  res.redirect("/sent");
});
router.get("/saved", async function (req, res) {
  let landscapers = [];
  const user = await db.getDb().collection("users").findOne({ _id: res.locals.userId });
  if (user.saved) {
    for (const ls of user.saved) {
      const lsf = await db.getDb().collection("landscapers").findOne({ _id: ls });
      landscapers.push({ profile: lsf.profile, name: lsf.name, _id: lsf._id });
    }
  }

  res.render("saved", { landscapers: landscapers });
});
router.post("/save/:id", async function (req, res) {
  await db
    .getDb()
    .collection("users")
    .updateOne({ _id: res.locals.userId, saved: { $nin: [req.params.id] } }, { $push: { saved: req.params.id } });
  res.redirect("/saved");
});

router.post("/remove/:id", async function (req, res) {
  await db
    .getDb()
    .collection("users")
    .updateOne({ _id: res.locals.userId }, { $pull: { saved: req.params.id } });
  res.redirect("/saved");
});

router.get("/report/:id", async function (req, res) {
  const ls = await db.getDb().collection("landscapers").findOne({ _id: req.params.id });
  if (!ls) {
    return res.render("404", { message: "Error locating landscaper" });
  }
  const found = await db.getDb().collection("reports").findOne({ from: res.locals.userId, to: req.params.id });
  if (found) {
    return res.render("404", { message: "Already sent report" });
  }
  res.render("report", { id: ls._id, name: ls.name });
});
router.post("/report", async function (req, res) {
  const found = await db.getDb().collection("reports").findOne({ from: res.locals.userId, to: req.body.destination });
  if (found) {
    return res.render("404", { message: "Already sent report" });
  }
  if (!req.body.reason) {
    return res.render("404", { message: "Reason must be provided to report" });
  }
  const report = {
    from: res.locals.userId,
    to: req.body.destination,
    reason: req.body.reason,
    date: new Date().getTime(),
  };
  await transporter
    .sendMail({
      from: "<noreply-dous@dousdev.com>",
      to: "addous72@gmail.com",
      subject: `Report from: ${res.locals.name}, Reporting: ${req.body.destination}  `,
      html: `${report.reason}`,
    })
    .then(await db.getDb().collection("reports").insertOne(report));
  res.render("confirm", { message: "Report succesfully sent" });
});

module.exports = router;
