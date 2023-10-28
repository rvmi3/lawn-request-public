const transporter = require("./emailTransporter.js");
const db = require("../data/database");

async function sendPostNoti(reciepient, type, header) {
  const user = await db.getDb().collection("users").findOne({ email: reciepient });
  console.log(user);
  let mail;
  switch (type) {
    case "d":
      if (user.noti[0] === 0) {
        break;
      }
      mail = {
        from: "<noreply-dous@dousdev.com>",
        to: reciepient,
        subject: "Post Deleted",
        html: `<p>Post: ${header} was successfully deleted</p>`,
      };

      break;
    case "u":
      if (user.noti[1] === 0) {
        break;
      }
      mail = {
        from: "<noreply-dous@dousdev.com>",
        to: reciepient,
        subject: "Post Updated",
        html: `<p>Your post, <strong>${header}</strong>,  has been updated!</p>
                <p>If you want to relink post, unlink and link again in post page</p>`,
      };

      break;
    case "c":
      if (user.noti[2] === 0) {
        break;
      }
      mail = {
        from: "<noreply-dous@dousdev.com>",
        to: reciepient,
        subject: "Post Confirmation",
        html: `<p>Your post, <strong>${header}</strong>, has been uploaded! Upload your datasets and link them to your listings in your account page or click link below</p>
                <a href="http://localhost:3000/account">Account Page</a>
                <p>Posts are not public until linked</p>`,
      };

      break;
    case "p":
      if (user.noti[3] === 0) {
        break;
      }
      mail = {
        from: "<noreply-dous@dousdev.com>",
        to: reciepient,
        subject: "Your post has been purchased!",
        html: `<p>Your post: ${header}, has been purhased. Funds will be available for transaction after two days.</p>`,
      };

      break;
    case "v":
      if (user.noti[4] === 0) {
        break;
      }
      mail = {
        from: "<noreply-dous@dousdev.com>",
        to: reciepient,
        subject: "Your post is doing well!",
        html: `<p>Your post is rising in views!</p>`,
      };
      break;
  }
  console.log(mail);
  if (!mail) {
    console.log(user.username, "has notifications off");
    return;
  }
  await transporter.sendMail(mail);
}

module.exports = { sendPostNoti };
