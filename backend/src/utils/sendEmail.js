import nodemailer from "nodemailer";
import config from "../config/env.js";

// Check for required email configuration
if (!config.EMAIL.USER || !config.EMAIL.PASS) {
  console.error("❌ Missing EMAIL_USER or EMAIL_PASS in environment configuration!");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: config.EMAIL.SERVICE,
  auth: {
    user: config.EMAIL.USER,
    pass: config.EMAIL.PASS,
  },
  secure: true,
});

async function sendEmail({ email, subject, text, html }) {
  try {
    await transporter.sendMail({
      from: `"GutarGu Team" <${config.EMAIL.USER}>`,
      to: email,
      subject,
      text,
      html,
    });

    console.log("✅ Email sent successfully to", email);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

export default sendEmail;
