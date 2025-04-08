import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

const App = () => {
  const { authUser } = useAuthStore();
  const { isCallActive, isIncomingCall } = useChatStore();

  return (
    <Router>
      <div>
        <Toaster position="top-center" reverseOrder={false} />
        {authUser && <Navbar />}
        
        <Routes>
          <Route
            path="/"
            element={authUser ? <HomePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/login"
            element={!authUser ? <LoginPage /> : <Navigate to="/" />}
          />
          <Route
            path="/signup"
            element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
          />
          <Route
            path="/settings"
            element={authUser ? <SettingsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
          />
          <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
        </Routes>

        {/* Call-related components */}
        {isCallActive && <CallInterface />}
        {isIncomingCall && <IncomingCallNotification />}
      </div>
    </Router>
  );
};

export default App;
