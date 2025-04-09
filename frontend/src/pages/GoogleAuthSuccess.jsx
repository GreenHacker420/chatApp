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
        
        // First check auth status
        console.log("🔹 Calling checkAuth...");
        const authData = await checkAuth();
        console.log("✅ checkAuth completed:", authData);
        
        if (authData) {
          console.log("✅ Google authentication successful, redirecting to home...");
          toast.success("Google login successful!");
          navigate("/", { replace: true });
        } else {
          console.error("❌ No auth data returned");
          throw new Error("Authentication failed - no user data returned");
        }
      } catch (error) {
        console.error("❌ Google authentication failed:", error);
        setError(error.message || "Authentication failed");
        toast.error("Google login failed. Please try again.");
        navigate("/login", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    authenticateUser();
  }, [navigate, checkAuth]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-error mb-4">{error}</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate("/login")}
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="loading loading-spinner loading-lg mb-4"></div>
      <p className="text-lg">
        {isLoading ? "Authenticating..." : "Redirecting..."}
      </p>
    </div>
  );
};

export default GoogleAuthSuccess;
