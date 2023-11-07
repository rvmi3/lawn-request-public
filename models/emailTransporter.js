const nodemailer = require("nodemailer");

let user = process.env.USER;
let pass = process.env.PASS;
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: user,
    pass: pass,
  },
});

module.exports = transporter;
