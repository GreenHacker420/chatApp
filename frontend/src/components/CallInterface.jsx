import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Wifi, WifiOff, Maximize2, Minimize2, UserPlus, FileUp } from "lucide-react";
import toast from "react-hot-toast";
import WebRTCService from "../services/webrtc.service";
import AddToCallModal from "./AddToCallModal";
import FileShareModal from "./FileShareModal";

const CallInterface = () => {
  const {
    activeCall,
    endCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
    groupCallParticipants
  } = useChatStore();

  const { socket, user: authUser } = useAuthStore();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showFileShare, setShowFileShare] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isLanConnection, setIsLanConnection] = useState(false);
  const [connectionQualityInfo, setConnectionQualityInfo] = useState({ quality: 'standard', isLan: false });
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const webRTCServiceRef = useRef(null);
  const connectionCheckInterval = useRef(null);
  const callContainerRef = useRef(null);

  // Handle fullscreen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      callContainerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize WebRTC service
  useEffect(() => {
    if (!socket) return;

    webRTCServiceRef.current = new WebRTCService(socket);

    webRTCServiceRef.current.onRemoteStreamUpdate = (_, stream) => {
      if (stream) {
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      } else {
        setRemoteStream(null);
      }
    };

    if (webRTCServiceRef.current.isUsingLanConnection) {
      setIsLanConnection(webRTCServiceRef.current.isUsingLanConnection());
    }

    connectionCheckInterval.current = setInterval(() => {
      if (webRTCServiceRef.current && activeCall) {
        const quality = webRTCServiceRef.current.getConnectionQuality(activeCall.userId);
        setConnectionQualityInfo(quality);
        setIsLanConnection(quality.isLan);
      }
    }, 5000);

    return () => {
      if (webRTCServiceRef.current) {
        webRTCServiceRef.current.closeAllConnections();
      }
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, [socket, activeCall]);

  // Handle call setup
  useEffect(() => {
    if (!activeCall || !socket || !authUser) return;

    const setupCall = async () => {
      try {
        if (!webRTCServiceRef.current) return;

        const stream = await webRTCServiceRef.current.initLocalStream(activeCall.isVideo);
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        if (activeCall.isOutgoing) {
          socket.on('callAccepted', ({ receiverId }) => {
            if (receiverId === authUser._id) return;
            webRTCServiceRef.current.callUser(activeCall.userId);
          });
        } else {
          webRTCServiceRef.current.callUser(activeCall.userId);
        }

        socket.on('callEnded', ({ userId }) => {
          if (userId === activeCall.userId) {
            toast.info("Call ended by the other user");
            endCall();
          }
        });
      } catch (error) {
        console.error("Error setting up call:", error);
        toast.error("Failed to set up call");
        endCall();
      }
    };

    setupCall();

    return () => {
      socket.off('callAccepted');
      socket.off('callEnded');
      if (webRTCServiceRef.current) {
        webRTCServiceRef.current.closeAllConnections();
      }
    };
  }, [activeCall, socket, authUser]);

  const handleAddParticipants = () => {
    setShowAddParticipant(true);
  };

  const handleFileShare = () => {
    setShowFileShare(true);
  };

  const handleEndCall = () => {
    try {
      if (webRTCServiceRef.current) {
        webRTCServiceRef.current.closeAllConnections();
      }
      endCall();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        setRemoteStream(null);
      }
    } catch (error) {
      console.error("Error ending call:", error);
      toast.error("Error ending call");
    }
  };

  if (!activeCall) return null;

  return (
    <div
      ref={callContainerRef}
      className={`fixed ${isFullScreen ? 'inset-0 z-[100] bg-black' : 'bottom-0 right-0 w-80 md:w-96 z-[100]'} bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 m-4 transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center w-full">
          {activeCall.isVideo && (
            <div className={`relative w-full ${isFullScreen ? 'h-[calc(100vh-120px)]' : 'h-48 md:h-64'} mb-2`}>
              {/* Remote video (main video) */}
              <div className="absolute inset-0 w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-white text-center">
                    <div className="animate-pulse mb-2">
                      <Phone size={40} className="mx-auto" />
                    </div>
                    <p>Connecting to {activeCall.userName || "Caller"}...</p>
                  </div>
                )}
                {remoteStream && (
                  <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                    {activeCall.userName || "Caller"}
                  </div>
                )}
              </div>

              {/* Local video (picture-in-picture) */}
              <div className={`absolute ${isFullScreen ? 'w-48 h-36 bottom-4 right-4' : 'w-28 h-24 md:w-32 md:h-28 bottom-2 right-2'} z-10 rounded-lg overflow-hidden border-2 border-white shadow-lg bg-gray-800`}>
                {localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-pulse">
                      <Video size={20} className="text-gray-400" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-1 left-1 text-white text-xs bg-black bg-opacity-50 px-1 py-0.5 rounded">
                  You
                </div>
              </div>
            </div>
          )}
          {!activeCall.isVideo && (
            <>
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white mr-2">
                <Phone size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">{activeCall.userName || "Caller"}</h3>
                <p className="text-sm text-gray-500">
                  {activeCall.isOutgoing ? 'Outgoing call' : 'Incoming call'}
                </p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullScreen}
            className="p-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            aria-label={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-3 md:gap-4 mt-4">
        <button
          onClick={() => toggleMute(!isMuted)}
          className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'} text-white shadow-md hover:shadow-lg transition-all`}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {activeCall.isVideo && (
          <button
            onClick={() => toggleVideo(!isVideoOff)}
            className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'} text-white shadow-md hover:shadow-lg transition-all`}
            aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        )}

        <button
          onClick={handleEndCall}
          className="p-3 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 hover:shadow-lg transition-all"
          aria-label="End call"
        >
          <PhoneOff size={20} />
        </button>

        {isLanConnection && (
          <button
            onClick={() => setShowFileShare(true)}
            className="p-3 bg-primary text-white rounded-full shadow-md hover:opacity-90 hover:shadow-lg transition-all"
            aria-label="Share files"
          >
            <FileUp size={20} />
          </button>
        )}
      </div>

      {/* Call Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={handleAddParticipants}
          className="btn btn-sm btn-outline gap-2"
        >
          <UserPlus size={16} />
          Add People
        </button>

        <button
          onClick={handleFileShare}
          className="btn btn-sm btn-outline gap-2"
          disabled={!isLanConnection}
          title={isLanConnection ? "Share Files (LAN)" : "LAN connection required for file sharing"}
        >
          <FileUp size={16} />
          Share Files
        </button>
      </div>

      {/* Participants List */}
      {groupCallParticipants && groupCallParticipants.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Participants ({groupCallParticipants.length})</h4>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {groupCallParticipants.map((participant) => (
              <div
                key={participant._id}
                className="flex items-center gap-2 bg-base-200 px-2 py-1 rounded-full"
              >
                <span className="text-sm">{participant.fullName || participant.name || "User"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {connectionQualityInfo && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          {isLanConnection ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>Connection: {connectionQualityInfo.quality}</span>
        </div>
      )}

      {/* Add to Call Modal */}
      <AddToCallModal
        isOpen={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
      />

      {/* File Share Modal */}
      <FileShareModal
        isOpen={showFileShare}
        onClose={() => setShowFileShare(false)}
      />
    </div>
  );
};

export default CallInterface;