import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { toast } from "react-hot-toast";
import { ERROR_MESSAGES } from "../constants/messages";

const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleGoogleAuthSuccess, user } = useAuthStore();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        console.log('🔹 Starting Google auth success flow');
        
        // Check for error from Google OAuth
        const error = searchParams.get('error');
        if (error) {
          console.error('❌ Google OAuth error:', error);
          toast.error(ERROR_MESSAGES.GOOGLE_AUTH);
          navigate('/login');
          return;
        }

        console.log('🔹 Calling handleGoogleAuthSuccess');
        const success = await handleGoogleAuthSuccess();
        console.log('✅ Google auth success result:', success);

        if (success) {
          console.log('✅ Auth successful, redirecting to home');
          // Force a hard redirect to home page
          window.location.href = '/';
        } else {
          console.error('❌ Google auth success handler failed');
          toast.error(ERROR_MESSAGES.GOOGLE_AUTH);
          navigate('/login');
        }
      } catch (error) {
        console.error('❌ Google auth error:', error);
        toast.error(ERROR_MESSAGES.GOOGLE_AUTH);
        navigate('/login');
      }
    };

    // Only run the auth flow if we don't have a user yet
    if (!user) {
      handleAuth();
    } else {
      console.log('✅ User already authenticated, redirecting to home');
      window.location.href = '/';
    }
  }, [navigate, searchParams, handleGoogleAuthSuccess, user]);

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
