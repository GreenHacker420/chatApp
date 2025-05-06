import { MessageSquare, Wifi, Users } from "lucide-react";
import { useState, useEffect } from "react";
import electronService from "../services/electron.service";

const NoChatSelected = () => {
  const [isElectron, setIsElectron] = useState(false);

  // Check if running in Electron
  useEffect(() => {
    setIsElectron(electronService.isElectron);
  }, []);

  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-10 sm:p-16 bg-base-100/50 animate-fadeIn">
      <div className="max-w-md text-center space-y-6">
        {/* Animated Icons */}
        <div className="flex justify-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center
            justify-center animate-bounce shadow-lg"
          >
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>

          {isElectron && (
            <div
              className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center
              justify-center animate-pulse shadow-lg"
            >
              <Wifi className="w-8 h-8 text-accent" />
            </div>
          )}
        </div>

        {/* Welcome Message */}
        <h2 className="text-2xl font-bold">Welcome to GutarGu!</h2>
        <p className="text-base-content/60">
          Select a conversation from the sidebar or start a new one.
        </p>

        {/* LAN Features Info */}
        {isElectron && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Wifi className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">LAN Features Available</h3>
            </div>
            <p className="text-sm">
              You're using the desktop app! Enjoy enhanced features like LAN calls,
              offline messaging, and file sharing with users on the same network.
            </p>
          </div>
        )}

        {/* Call-to-Action Buttons */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => document.querySelector('[aria-label="Toggle LAN Users"]')?.click()}
            className="btn btn-primary flex items-center gap-2"
          >
            <Users className="w-5 h-5" />
            Find LAN Users
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
