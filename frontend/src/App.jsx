import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import GoogleAuthSuccess from "./pages/GoogleAuthSuccess";
import Navbar from "./components/Navbar";
import CallInterface from "./components/CallInterface";
import IncomingCallNotification from "./components/IncomingCallNotification";
import { useEffect } from "react";

const App = () => {
  const { user, checkAuth } = useAuthStore();
  const { isCallActive, isIncomingCall } = useChatStore();

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <div>
      <Toaster position="top-center" reverseOrder={false} />
      {user && <Navbar />}
      
      <Routes>
        <Route
          path="/"
          element={user ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={!user ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/signup"
          element={!user ? <SignUpPage /> : <Navigate to="/" />}
        />
        <Route
          path="/settings"
          element={user ? <SettingsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={user ? <ProfilePage /> : <Navigate to="/login" />}
        />
        <Route path="/google-auth-success" element={<GoogleAuthSuccess />} />
      </Routes>

      {/* Call-related components */}
      {isCallActive && <CallInterface />}
      {isIncomingCall && <IncomingCallNotification />}
    </div>
  );
};

export default App;
