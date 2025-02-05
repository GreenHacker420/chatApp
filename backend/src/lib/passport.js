import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/user.model.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/api/auth/google/callback`,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user && !user.isGoogleAuth) {
          return done(null, false, { message: "Email already registered with a password. Use password login instead." });
        }

        if (!user) {
          user = new User({
            fullName: profile.displayName,
            email: profile.emails[0].value,
            profilePic: profile.photos[0].value,
            verified: true,
            isGoogleAuth: true, // ✅ Tracks Google authentication
          });

          await user.save();
        }

        return done(null, user);
      } catch (error) {
        console.error("Google OAuth Error:", error.message);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, { id: user._id, role: user.role }); // ✅ Store user role for permissions
});

passport.deserializeUser(async (data, done) => {
  try {
    const user = await User.findById(data.id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
