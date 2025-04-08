import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const GoogleAuthSuccess = () => {
  const { checkAuth, handleGoogleAuthSuccess } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authenticateUser = async () => {
      try {
        setIsLoading(true);
        console.log("🔹 Starting Google authentication process...");
        
        // First try to handle Google auth success
        await handleGoogleAuthSuccess();
        
        // Then check auth status
        await checkAuth();
        
        console.log("✅ Google authentication successful, redirecting to home...");
        toast.success("Google login successful!");
        navigate("/", { replace: true });
      } catch (error) {
        console.error("❌ Google authentication failed:", error);
        toast.error("Google login failed. Please try again.");
        navigate("/login", { replace: true });
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
    </div>
  );
};

export default GoogleAuthSuccess;
