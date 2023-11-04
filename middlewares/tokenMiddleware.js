const express = require("express");
const router = express.Router();

const tempCode = require("../models/tempCodes");

router.use(async function (req, res, next) {
  if (req.originalUrl === "/logout" || req.originalUrl === "/disclaimer") {
    return next();
  }
  if (res.locals.isAuth) {
    if (req.method === "POST") {
      const validate = await tempCode.validateCode(req.body.token, 5 * 60 * 1000);
      if (!validate) {
        console.log("failed validation");
        return res.render("404", { message: "Session timeout" });
      }
    }
  }

  next();
});
router.use(async function (req, res, next) {
  if (res.locals.isAuth) {
    const token = await tempCode.generateCode(res.locals.user);
    res.locals.token = token;
  }
  next();
});

module.exports = router;
