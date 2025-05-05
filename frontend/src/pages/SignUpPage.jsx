import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthImagePattern from "../components/AuthImagePattern";
import toast from "react-hot-toast";
import config from "../config/env.js";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const { signup, isSigningUp } = useAuthStore();
  const navigate = useNavigate();

  // ✅ Validate Form Inputs
  const validateForm = () => {
    let newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!formData.email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format.";
    if (!formData.password) newErrors.password = "Password is required.";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters.";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0; // ✅ Return true if no errors
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await signup(formData);
      toast.success("Account created! Please check your email to verify.");
    } catch (error) {
      toast.error("Signup failed. Try again.");
    }
  };

  // ✅ Google Login Handler
  const handleGoogleLogin = async () => {
    try {
      // Load the Google API
      const { google } = window;

      if (!google) {
        toast.error("Google API not available");
        return;
      }

      // Debug the client ID
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      console.log("Google Client ID from env:", clientId);
      console.log("Google Client ID from config:", config.GOOGLE.CLIENT_ID);

      if (!clientId) {
        toast.error("Google Client ID is missing. Please check your environment configuration.");
        return;
      }

      // Initialize Google Sign-In
      const auth2 = google.accounts.oauth2.initCodeClient({
        client_id: clientId, // Use directly from env
        scope: 'profile email',
        callback: async (response) => {
          if (response.error) {
            toast.error("Google authentication failed");
            return;
          }

          try {
            // We have an authorization code, not an access token
            // Send the code to our backend to handle the token exchange
            console.log("Google auth code received, sending to backend");

            // Call our authentication function with the code
            await useAuthStore.getState().googleLogin({ code: response.code }, navigate);
          } catch (error) {
            console.error("Google auth error:", error);
            toast.error("Failed to authenticate with Google");
          }
        }
      });

      // Start the Google OAuth flow
      auth2.requestCode();
    } catch (error) {
      console.error("Google login error:", error);
      toast.error("Failed to initialize Google login");
    }
  };

  // We no longer need to fetch Google user info directly
  // The backend will handle the token exchange and user info fetching

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* LOGO */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="size-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Create Account</h1>
              <p className="text-base-content/60">Get started with your free account</p>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Full Name</span>
              </label>
              <div className="relative">
                <User className="size-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" />
                <input
                  type="text"
                  className="input input-bordered w-full pl-10"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <Mail className="size-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" />
                <input
                  type="email"
                  className="input input-bordered w-full pl-10"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <Lock className="size-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full pl-10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-5 text-base-content/40" /> : <Eye className="size-5 text-base-content/40" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn btn-primary w-full" disabled={isSigningUp}>
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Google Signup Button */}
          <div className="mt-4">
            <button
              onClick={handleGoogleLogin}
              className="btn btn-outline w-full flex items-center gap-2"
              disabled={isSigningUp}
            >
              <img
                src="https://cdn-icons-png.flaticon.com/512/720/720255.png"
                alt="Google"
                className="h-5 w-5"
              />
              Sign up with Google
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-base-content/60">
              Already have an account?{" "}
              <Link to="/login" className="link link-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image Pattern */}
      <AuthImagePattern
        title="Join our community"
        subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
      />
    </div>
  );
};

export default SignUpPage;
