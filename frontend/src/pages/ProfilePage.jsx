import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, ShieldCheck, Globe, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const { user, isUpdatingProfile, updateProfile, logout } = useAuthStore();
  const authUser = user; // Ensure we have a consistent reference to the user
  const [selectedImg, setSelectedImg] = useState(null);
  const [profileImage, setProfileImage] = useState("");
  const navigate = useNavigate();

  // Effect to handle profile image loading and error handling
  useEffect(() => {
    if (authUser?.profilePic) {
      setProfileImage(authUser.profilePic);
    }
  }, [authUser]);

  // Handle image load error (fallback to default avatar)
  const handleImageError = () => {
    setProfileImage("/avatar.png");
    console.error("Failed to load profile image, using default");
  };

  // Check if profile image is the missing Cloudinary image
  useEffect(() => {
    if (profileImage && profileImage.includes("Default_ProfilePic.png")) {
      setProfileImage("/avatar.png");
    }
  }, [profileImage]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ✅ Validate image type and size before uploading
    if (!file.type.startsWith("image/")) {
      return toast.error("Invalid file type. Please upload an image.");
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image must be less than 5MB.");
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);

      // ✅ Upload image
      try {
        await updateProfile({ profilePic: base64Image });
        toast.success("Profile picture updated!");
      } catch (error) {
        console.error("Failed to update profile:", error);
        toast.error("Failed to update profile picture.");
      }
    };
  };

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* ✅ Avatar Upload Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="relative">
                <img
                  src={selectedImg || profileImage || authUser?.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="size-32 rounded-full object-cover border-4 border-base-300"
                  onError={handleImageError}
                />
                {authUser?.isGoogleAuth && (
                  <div className="absolute -top-2 -right-2 bg-white p-1 rounded-full shadow-md" title="Google Account">
                    <Globe className="w-5 h-5 text-[#4285F4]" />
                  </div>
                )}
              </div>

              {!authUser?.isGoogleAuth && (
                <label
                  htmlFor="avatar-upload"
                  className={`absolute bottom-0 right-0 bg-base-content hover:scale-105
                    p-2 rounded-full cursor-pointer transition-all duration-200
                    ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
                >
                  <Camera className="w-5 h-5 text-base-200" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-400">
                {isUpdatingProfile ? "Uploading..." :
                  authUser?.isGoogleAuth ?
                  "Profile picture from Google account" :
                  "Click the camera icon to update your photo"}
              </p>
              {authUser?.isGoogleAuth && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  <Globe className="w-3 h-3" />
                  <span>Google Account</span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ User Information */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.fullName}</p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border flex items-center justify-between">
                {authUser?.email}
                {authUser.verified ? (
                  <ShieldCheck className="w-4 h-4 text-green-500" title="Verified" />
                ) : (
                  <span className="text-red-500 text-xs">Not Verified</span>
                )}
              </p>
            </div>
          </div>

          {/* ✅ Account Information */}
          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>
                  {authUser?.createdAt ? new Date(authUser.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Account Type</span>
                <span className="flex items-center gap-1">
                  {authUser?.isGoogleAuth ? (
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
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="btn btn-error w-full gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
