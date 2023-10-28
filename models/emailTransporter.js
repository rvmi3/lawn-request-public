const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.forwardemail.net",
  port: 465,
  secure: true,
  auth: {
    user: "noreply-dous@dousdev.com",
    pass: "53bd9564b48c1ea8cc609fa9",
  },
});

async function checkEmailerHealth() {
  try {
    // Send a test email
    await transporter.sendMail({
      from: "your-email@example.com", // Replace with your email address
      to: "test@example.com", // Replace with a test recipient's email address
      subject: "Test Email",
      text: "This is a test email from your application.",
    });

    console.log("Emailer service is healthy.");
    return true; // Email was sent successfully; the service is healthy.
  } catch (error) {
    console.error("Emailer service is not healthy. Error:", error.message);
    return false; // An error occurred while sending the email; the service is not healthy.
  } finally {
    // Close the transporter
    transporter.close();
  }
}

module.exports = transporter;
