// import nodemailer from "nodemailer";
// import dotenv from "dotenv";
// dotenv.config();

// async function sendEmail({ email, subject, text, html }) {
//   try {
//     if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
//       throw new Error("Missing GMAIL_USER or GMAIL_PASS in environment variables");
//     }

//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.GMAIL_USER,
//         pass: process.env.GMAIL_PASS,
//       },
//     });

//     await transporter.sendMail({
//       from: `"Chat App" <${process.env.GMAIL_USER}>`,
//       to: email,
//       subject,
//       text,
//       html,
//     });

//     console.log("✅ Email sent successfully");
//   } catch (error) {
//     console.error("❌ Error sending email:", error);
//   }
// }

// export default sendEmail;

import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Validate environment variables
if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
  console.error("❌ Missing GMAIL_USER or GMAIL_PASS in .env file!");
  process.exit(1);
}

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  debug: true, // Enable debug logs
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ SMTP Connection Error:", error);
  } else {
    console.log("✅ SMTP Server is ready to send emails");
  }
});

async function sendEmail({ email, subject, text, html }) {
  try {
    const mailOptions = {
      from: `"Chat App" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      text,
      html,
    };

    console.log("📧 Attempting to send email to:", email);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully to:", email);
    console.log("📨 Message ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    if (error.code === "EAUTH") {
      console.error("⚠️ Authentication failed. Please check your Gmail credentials.");
    } else if (error.code === "ESOCKET") {
      console.error("⚠️ Network error. Please check your internet connection.");
    }
    throw error;
  }
}

export default sendEmail;
