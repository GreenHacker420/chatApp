import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Mail, User, Globe, ArrowLeft, Phone, Video } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { useChatStore } from "../store/useChatStore";

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const { initiateCall } = useChatStore();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileImage, setProfileImage] = useState("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/users/${userId}`);
        setUserProfile(response.data);
        setProfileImage(response.data.profilePic);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load user profile");
        toast.error("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  // Handle image load error (fallback to default avatar)
  const handleImageError = () => {
    setProfileImage("/avatar.png");
  };

  // Check if profile image is the missing Cloudinary image
  useEffect(() => {
    if (profileImage && profileImage.includes("Default_ProfilePic.png")) {
      setProfileImage("/avatar.png");
    }
  }, [profileImage]);

  // Start a call with this user
  const handleStartCall = (isVideo) => {
    if (userProfile) {
      initiateCall(userProfile._id, isVideo);
      navigate("/"); // Navigate to home page where call interface will appear
    }
  };

  if (loading) {
    return (
      <div className="h-screen pt-20 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="h-screen pt-20">
        <div className="max-w-2xl mx-auto p-4 py-8">
          <div className="bg-base-300 rounded-xl p-6 space-y-8 text-center">
            <h1 className="text-2xl font-semibold">Error</h1>
            <p>{error || "User not found"}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate(-1)}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="flex justify-between items-center">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-2xl font-semibold">User Profile</h1>
            <div className="w-16"></div> {/* Empty div for flex alignment */}
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="relative">
                <img
                  src={profileImage || "/avatar.png"}
                  alt="Profile"
                  className="size-32 rounded-full object-cover border-4 border-base-300"
                  onError={handleImageError}
                />
                {userProfile.isGoogleAuth && (
                  <div className="absolute -top-2 -right-2 bg-white p-1 rounded-full shadow-md" title="Google Account">
                    <Globe className="w-5 h-5 text-[#4285F4]" />
                  </div>
                )}
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">{userProfile.fullName}</h2>
              {userProfile.isGoogleAuth && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  <Globe className="w-3 h-3" />
                  <span>Google Account</span>
                </div>
              )}
            </div>
          </div>

          {/* Call Actions */}
          <div className="flex justify-center gap-4">
            <button
              className="btn btn-primary btn-sm gap-2"
              onClick={() => handleStartCall(false)}
            >
              <Phone className="w-4 h-4" />
              Audio Call
            </button>
            <button
              className="btn btn-accent btn-sm gap-2"
              onClick={() => handleStartCall(true)}
            >
              <Video className="w-4 h-4" />
              Video Call
            </button>
          </div>

          {/* User Information */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{userProfile.fullName}</p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                {userProfile.email}
              </p>
            </div>
          </div>

          {/* Account Information */}
          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>
                  {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Type</span>
                <span className="flex items-center gap-1">
                  {userProfile.isGoogleAuth ? (
                    <>
                      <Globe className="w-4 h-4 text-[#4285F4]" />
                      <span className="text-[#4285F4]">Google Account</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 text-primary" />
                      <span>Email/Password</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
