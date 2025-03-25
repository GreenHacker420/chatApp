import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";

const GoogleAuthSuccess = () => {
  const { checkAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Fetch user session from backend (cookie-based)
    checkAuth().then(() => {
      navigate("/", { replace: true }); // ✅ Redirect to homepage after auth check
    }).catch(() => {
      navigate("/login", { replace: true }); // ✅ Redirect to login if auth fails
    });
  }, [navigate, checkAuth]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Authenticating...</p>
    </div>
  );
};

export default GoogleAuthSuccess;
