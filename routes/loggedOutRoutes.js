const express = require("express");

const router = express.Router();
const db = require("../data/database");
const bcrypt = require("bcrypt");
const uuid = require("uuid");
const transporter = require("../models/emailTransporter");
const tempCode = require("../models/tempCodes");

router.get("/signup", function (req, res) {
  let sessionInputData = req.session.inputData;
  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      message: "",
      email: "",
      first: "",
      last: "",
      confirmPassword: "",
      password: "",
    };
  }
  req.session.inputData = null;

  res.render("user-sign", { inputData: sessionInputData, newUser: true });
});

router.get("/login", function (req, res) {
  let sessionInputData = req.session.inputData;
  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      message: "",
      email: "",
      password: "",
    };
  }
  req.session.inputData = null;

  res.render("user-sign", { inputData: sessionInputData, newUser: false });
});

router.post("/signup", async function (req, res, next) {
  try {
    const { firstName, lastName } = req.body;
    const userPassword = req.body.password;
    const userConfPassword = req.body.confPassword;
    const userEmail = req.body.email;
    const userId = uuid.v4();
    if (!firstName || !lastName || !userPassword || !userConfPassword || !userEmail) {
      return res.redirect("/");
    }
    if (userPassword !== userConfPassword) {
      req.session.inputData = {
        hasError: true,
        message: "Passwords do not match",
        email: userEmail,
        first: firstName,
        last: lastName,
      };
      req.session.save(function () {
        res.redirect("/signup");
      });
      return;
    }

    const existingUser = await db.getDb().collection("users").findOne({ email: userEmail });

    if (existingUser) {
      req.session.inputData = {
        hasError: true,
        message: "Email associated with account already exists.",
        email: userEmail,
        first: firstName,
        last: lastName,
      };
      req.session.save(function () {
        res.redirect("/signup");
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(userPassword, 12);
    const user = {
      _id: userId,
      email: userEmail,
      name: {
        first: firstName,
        last: lastName,
      },
      password: hashedPassword,
      verified: false,
      isLandscaper: false,
      cr: 0,
    };
    await db.getDb().collection("users").insertOne(user);

    const code = await tempCode.generateCode(userEmail);
    await transporter
      .sendMail({
        from: "<noreply-dous@dousdev.com>",
        to: userEmail,
        subject: "Account Verification",
        html: `<h1>Hello ${firstName}</h1><p>This email is to verify account, account will be succesfully created after verifying. Link will expire in 5 minutes</p><strong>If link is expired, you must sign up again</strong><a href="http://localhost:3000/verify/${code}">Verify</a>`,
      })
      .catch(async () => {
        await db.getDb().collection("errorLog").insertOne({
          destination: userEmail,
          time: new Date().getTime(),
        });
      });
    res.render("confirm", { message: `Verification email sent to ${userEmail}, verify account to complete account creation` });
  } catch (err) {
    next(err);
  }
});

router.get("/verify/:id", async function (req, res, next) {
  try {
    const code = req.params.id;
    console.log(code);
    const user = await tempCode.getUser(code);

    const validate = await tempCode.validateCode(code, 5 * 60 * 1000);
    console.log(validate);
    if (validate) {
      if (user.email) {
        await db
          .getDb()
          .collection("users")
          .updateOne({ _id: user._id }, { $set: { verified: true } });
        await transporter
          .sendMail({
            from: "<noreply-dous@dousdev.com>",
            to: user.email,
            subject: "Account Created",
            html: `<h1>Welcome ${user.name.first}</h1><p>Your account has succesfully been created</p>`,
          })
          .then(console.log(`Email sent to ${user.email}`))
          .catch(async () => {
            await db.getDb().collection("errorLog").insertOne({
              destination: user.email,
              time: new Date().getTime(),
            });
            return res.render("404", { message: "An error has occured" });
          });
        transporter.close();
        return res.redirect("/login");
      } else {
        return res.redirect("/");
      }
    } else {
      console.log(user._id);
      await db.getDb().collection("users").deleteOne({ _id: user._id });
      return res.render("404", { message: `Link has expired or does not exist! You must go through the sign up proccess again` });
    }
  } catch (err) {
    next(err);
  }
});

router.post("/login", async function (req, res, next) {
  try {
    const userEmail = req.body.email;
    const userPassword = req.body.password;

    if (!userPassword || !userEmail) {
      return res.redirect("/");
    }

    let matchedPassword;
    const userFound = await db.getDb().collection("users").findOne({ email: userEmail });
    if (userFound) {
      matchedPassword = await bcrypt.compare(userPassword, userFound.password);
    }

    if (!userFound || !matchedPassword || !userFound.verified) {
      req.session.inputData = {
        hasError: true,
        message: "Log in failed - check input",
        email: userEmail,
      };
      req.session.save(function () {
        res.redirect("/login");
      });
      return;
    }
    req.session.user = { userId: userFound._id, email: userFound.email };
    req.session.isAuth = true;
    req.session.save(function () {
      res.redirect("/");
    });
  } catch (error) {
    next(error);
  }
});

router.get("/forgot-password", async function (req, res) {
  if (!req.session.isAuth) {
    let sessionInputData = req.session.inputData;
    if (!sessionInputData) {
      sessionInputData = {
        hasError: false,
        message: "",
        email: "",
        password: "",
      };
    }
    req.session.inputData = null;

    return res.render("forgot-password", { inputData: sessionInputData });
  }
});

router.post("/password-reset-request", async function (req, res, next) {
  try {
    if (!req.session.isAuth) {
      const user = req.body;
      if (!user) {
        return res.redirect("/");
      }
      const foundUser = await db.getDb().collection("users").findOne({ email: user.email });

      if (!foundUser) {
        req.session.inputData = {
          hasError: true,
          message: "User does not exist!",
          email: user.email,
        };
        req.session.save(function () {
          return res.redirect("/forgot-password");
        });
      }
      const code = await tempCode.generateCode(foundUser.email);

      const mail = {
        from: "<noreply-dous@dousdev.com>",
        to: foundUser.email,
        subject: "Password Reset",
        html: `<a href='http://localhost:3000/resetPassword/${code}'>Reset Password, Link will expire in 60 seconds</a>`,
      };
      await transporter.sendMail(mail).catch(async () => {
        await db.getDb().collection("errorLog").insertOne({
          destination: foundUser.email,
          time: new Date().getTime(),
        });
      });
      transporter.close();

      res.render("confirm", { message: `Password reset link sent to ${foundUser.email}.` }); // take to "check email" page
    } else {
      res.redirect("/");
    }
  } catch (error) {
    next(error);
  }
});

router.get("/resetPassword/:tempCode", async function (req, res) {
  if (req.session.isAuth) {
    return res.render("404", { message: "Already logged in!" });
  }
  let sessionInputData = req.session.inputData;
  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      message: "",
    };
  }
  req.session.inputData = null;

  const code = req.params.tempCode;

  const validation = await tempCode.validateCode(code, 60 * 1000);

  if (!validation) {
    return res.render("404", { message: `Link has expired or does not exist! Try another request` });
  }

  return res.render("new-password", { code: code, inputData: sessionInputData });
});

router.post("/password-reset", async function (req, res, next) {
  try {
    const newPassword = req.body.password;
    const confPassword = req.body.confPassword;
    if (!newPassword || !confPassword) {
      return res.redirect("/");
    }
    if (newPassword != confPassword) {
      req.session.inputData = {
        hasError: true,
        message: "Passwords dont match",
      };
      req.session.save(function () {
        console.log("session info saved, returning...");
        res.redirect(`/resetPassword/${req.body.tempCode}`);
      });
      return;
    }
    console.log("still running");
    const foundUser = await tempCode.getUser(req.body.tempCode);
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db
      .getDb()
      .collection("users")
      .updateOne({ email: foundUser.email }, { $set: { password: hashedPassword } });
    const mail = {
      from: "<noreply-dous@dousdev.com>",
      to: foundUser.email,
      subject: "Password Has Been Reset",
      html: `<p>Youre password was reset on ${new Date().toLocaleDateString()} </p>`,
    };
    await transporter.sendMail(mail).catch(async () => {
      await db.getDb().collection("errorLog").insertOne({
        destination: foundUser.email,
        time: new Date().getTime(),
      });
    });
    transporter.close();
    return res.redirect("/login");
  } catch (error) {
    next(error);
  }
});

router.post("/logout", function (req, res) {
  req.session.user = null;
  req.session.isAuth = false;
  req.session.isLoggedin = false;
  res.redirect("/");
});

module.exports = router;
