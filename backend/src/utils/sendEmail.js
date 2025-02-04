import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config(); // Load environment variables

async function sendEmail({ email, subject, text }) {
    try {
        console.log("🛠 DEBUG - Email Config:", {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS ? "Loaded" : "Not Loaded"
        });

        if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
            throw new Error("Missing GMAIL_USER or GMAIL_PASS in environment variables");
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS, // Use your Gmail App Password
            }
        });

        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject,
            text
        });

        console.log("✅ Email sent successfully");
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
}

export default sendEmail;
