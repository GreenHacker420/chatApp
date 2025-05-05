import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { toast } from "react-hot-toast";
import { ERROR_MESSAGES } from "../constants/messages";

/**
 * This component handles the redirect from Google OAuth
 * It's no longer needed with the new direct Google login flow,
 * but we keep it for backward compatibility
 */
const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  useEffect(() => {
    // Check for error from Google OAuth
    const error = searchParams.get('error');
    if (error) {
      console.error('❌ Google OAuth error:', error);
      toast.error(ERROR_MESSAGES.GOOGLE_AUTH);
      navigate('/login');
      return;
    }

    // If we have a user, redirect to home
    if (user) {
      console.log('✅ User already authenticated, redirecting to home');
      navigate('/');
      return;
    }

    // Otherwise, redirect to login
    console.log('⚠️ No user found after Google auth, redirecting to login');
    navigate('/login');
  }, [navigate, searchParams, user]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="text-center p-8 bg-base-100 rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg text-base-content/80">Processing authentication...</p>
        <p className="text-sm text-base-content/60 mt-2">Please wait while we complete your sign-in</p>
      </div>
    </div>
  );
};

export default GoogleAuthSuccess;
