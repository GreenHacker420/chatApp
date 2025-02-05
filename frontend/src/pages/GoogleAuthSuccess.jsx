import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate, useLocation } from "react-router-dom";

const GoogleAuthSuccess = () => {
  const { setAuthUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("jwt", token); // ✅ Store JWT securely
      setAuthUser({ isAuthenticated: true }); // ✅ Update global auth state
      navigate("/"); // ✅ Redirect to homepage after login
    } else {
      navigate("/login"); // If no token, go back to login
    }
  }, [navigate, location, setAuthUser]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Authenticating...</p>
    </div>
  );
};

export default GoogleAuthSuccess;

