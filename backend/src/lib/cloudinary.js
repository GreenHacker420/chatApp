import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

config();

// ✅ Ensure Environment Variables Exist
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("❌ Cloudinary environment variables are missing! Please check your .env file.");
  process.exit(1); // ✅ Exit process if Cloudinary credentials are not set
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // ✅ Forces HTTPS for all requests
});

// ✅ Default Cloudinary Upload Settings
export const uploadImage = async (file, folder = "uploads") => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "gif"],
      transformation: [{ width: 800, height: 800, crop: "limit" }], // ✅ Prevents oversized uploads
    });

    return result.secure_url;
  } catch (error) {
    console.error("❌ Cloudinary Upload Error:", error.message);
    throw new Error("Image upload failed. Please try again.");
  }
};

export default cloudinary;
