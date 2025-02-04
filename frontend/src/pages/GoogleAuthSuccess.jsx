import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";

const GoogleAuthSuccess = () => {
  const { handleGoogleAuthSuccess } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      await handleGoogleAuthSuccess();
      navigate("/"); // ✅ Redirect to homepage after login
    };

    fetchUser();
  }, [handleGoogleAuthSuccess, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Authenticating...</p>
    </div>
  );
};

export default GoogleAuthSuccess;
