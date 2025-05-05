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
  const { user, checkAuth, isLoading } = useAuthStore();
  const { isCallActive, isIncomingCall } = useChatStore();

  // Check authentication status on app load
  useEffect(() => {
    console.log("🔹 App mounted, checking auth status...");
    checkAuth();
  }, [checkAuth]);

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <div className="text-center p-8 bg-base-100 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-base-content/80">Loading...</p>
          <p className="text-sm text-base-content/60 mt-2">Please wait while we set up your experience</p>
        </div>
        <Toaster position="top-center" reverseOrder={false} />
      </div>
    );
  }

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
