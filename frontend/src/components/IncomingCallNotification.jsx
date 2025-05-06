import { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { Phone, PhoneOff, Video } from "lucide-react";

const IncomingCallNotification = () => {
  const { incomingCallData, acceptCall, rejectCall } = useChatStore();
  const audioRef = useRef(null);

  useEffect(() => {
    if (incomingCallData) {
      // Play ringtone
      if (audioRef.current) {
        audioRef.current.loop = true;
        audioRef.current.play().catch(error => {
          console.error("Error playing ringtone:", error);
        });
      }

      // Request notification permission if not granted
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }

      // Show browser notification if permitted
      if (Notification.permission === "granted") {
        new Notification("Incoming Call", {
          body: `${incomingCallData.callerName} is calling...`,
          icon: "/logo.png"
        });
      }
    }

    return () => {
      // Stop ringtone when component unmounts or call is handled
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [incomingCallData]);

  if (!incomingCallData) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src="/ringtone.mp3"
        preload="auto"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-base-100 p-6 rounded-lg shadow-xl border border-base-300 w-96 animate-slideIn">
          <div className="flex items-center gap-4 mb-6">
            <div className="avatar">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-content">
                {incomingCallData.isVideo ? (
                  <Video className="w-8 h-8" />
                ) : (
                  <Phone className="w-8 h-8" />
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold">{incomingCallData.callerName}</h3>
              <p className="text-base-content/70">
                Incoming {incomingCallData.isVideo ? "Video" : "Audio"} Call
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={rejectCall}
              className="btn btn-lg btn-error gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              Decline
            </button>
            <button
              onClick={acceptCall}
              className="btn btn-lg btn-success gap-2"
            >
              <Phone className="w-5 h-5" />
              Accept
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default IncomingCallNotification; 