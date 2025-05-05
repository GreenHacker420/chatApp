import nodemailer from "nodemailer";
import config from "../config/env.js";
import dotenv from "dotenv";
dotenv.config();

// Check for required email configuration
// Support both old and new environment variable names for backward compatibility
const emailUser = config.EMAIL.USER || process.env.GMAIL_USER;
const emailPass = config.EMAIL.PASS || process.env.GMAIL_PASS;
const emailService = config.EMAIL.SERVICE || process.env.SERVICE || 'gmail';

if (!emailUser || !emailPass) {
  console.error("❌ Missing email credentials in environment configuration!");
  console.error("Please check your .env file for EMAIL_USER/GMAIL_USER and EMAIL_PASS/GMAIL_PASS");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: emailService,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  secure: true,
});

async function sendEmail({ email, subject, text, html }) {
  try {
    await transporter.sendMail({
      from: `"GutarGu Team" <${emailUser}>`,
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
