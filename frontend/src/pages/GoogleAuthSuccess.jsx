import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const GoogleAuthSuccess = () => {
  const { checkAuth, handleGoogleAuthSuccess } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const authenticateUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("🔹 Starting Google authentication process...");
        
        // First try to handle Google auth success
        console.log("🔹 Calling handleGoogleAuthSuccess...");
        const userData = await handleGoogleAuthSuccess();
        console.log("✅ handleGoogleAuthSuccess completed:", userData);
        
        // Then check auth status
        console.log("🔹 Calling checkAuth...");
        const authData = await checkAuth();
        console.log("✅ checkAuth completed:", authData);
        
        if (authData) {
          console.log("✅ Google authentication successful, redirecting to home...");
          toast.success("Google login successful!");
          
          // Force a small delay to ensure state updates are processed
          setTimeout(() => {
            console.log("🔹 Navigating to home page...");
            navigate("/", { replace: true });
          }, 500);
        } else {
          throw new Error("Authentication failed - no user data returned");
        }
      } catch (error) {
        console.error("❌ Google authentication failed:", error);
        setError(error.message || "Authentication failed");
        toast.error("Google login failed. Please try again.");
        
        // Force a small delay before redirecting to login
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1000);
      } finally {
        setIsLoading(false);
      }
    };

    authenticateUser();
  }, [navigate, checkAuth, handleGoogleAuthSuccess]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="loading loading-spinner loading-lg mb-4"></div>
      <p className="text-lg">{isLoading ? "Authenticating..." : "Redirecting..."}</p>
      {error && <p className="text-error mt-2">{error}</p>}
    </div>
  );
};

export default GoogleAuthSuccess;
