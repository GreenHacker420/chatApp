import { useChatStore } from "../store/useChatStore";
import { Phone, PhoneOff, Video } from "lucide-react";

const IncomingCallNotification = () => {
  const { incomingCallData, acceptCall, rejectCall } = useChatStore();

  if (!incomingCallData) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-base-100 p-4 rounded-lg shadow-lg border border-base-300 w-80 animate-slideIn">
        <div className="flex items-center gap-3 mb-4">
          <div className="avatar">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-content">
              {incomingCallData.isVideo ? (
                <Video className="w-6 h-6" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </div>
          </div>
          <div>
            <h3 className="font-medium">{incomingCallData.callerName}</h3>
            <p className="text-sm text-base-content/70">
              Incoming {incomingCallData.isVideo ? "Video" : "Audio"} Call
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={rejectCall}
            className="btn btn-sm btn-error gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            Decline
          </button>
          <button
            onClick={acceptCall}
            className="btn btn-sm btn-success gap-2"
          >
            <Phone className="w-4 h-4" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification; 