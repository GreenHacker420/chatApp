import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import config from "../config/env.js";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState(null); // ✅ Store login errors
  const { login, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();

  // ✅ Validate Input Before Submitting
  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("Both fields are required.");
      return false;
    }
    if (!formData.email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      setError("Invalid email format.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // ✅ Clear previous errors
    if (!validateForm()) return;

    try {
      await login(formData, navigate);
    } catch (error) {
      setError("Invalid email or password."); // ✅ Show error to user
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
    <div className="h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
              >
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Welcome Back</h1>
              <p className="text-base-content/60">Sign in to your account</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded-lg">{error}</p>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className={`input input-bordered w-full pl-10`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)} // ✅ Support Enter key
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input input-bordered w-full pl-10`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)} // ✅ Support Enter key
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-base-content/40" />
                  ) : (
                    <Eye className="h-5 w-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Sign in"
              )}
            </button>

            <div className="text-center mt-4">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot Password?
              </Link>
            </div>
          </form>

          {/* ✅ Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className="btn btn-outline w-full flex items-center gap-2"
            disabled={isLoggingIn} // ✅ Prevents multiple clicks
          >
            <img
              src="https://cdn-icons-png.flaticon.com/512/720/720255.png"
              alt="Google"
              className="h-5 w-5"
            />
            Sign in with Google
          </button>

          <div className="text-center">
            <p className="text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Pattern */}
      <AuthImagePattern
        title={"Welcome back!"}
        subtitle={"Sign in to continue your conversations and catch up with your messages."}
      />
    </div>
  );
};

export default LoginPage;
