import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate, useLocation } from "react-router-dom";

const GoogleAuthSuccess = () => {
  const { checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("jwt", token); // Store JWT securely
      
      // Call checkAuth to fetch full user data and update the auth state
      checkAuth().then(() => {
        navigate("/", { replace: true }); // Redirect to homepage after auth check
      });
    } else {
      navigate("/login", { replace: true }); // If no token, go back to login
    }
  }, [navigate, location, checkAuth]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Authenticating...</p>
    </div>
  );
};

export default GoogleAuthSuccess;
