import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Plus, Wifi, WifiOff } from "lucide-react";
import toast from "react-hot-toast";
import WebRTCService from "../services/webrtc.service";

const CallInterface = () => {
  const {
    activeCall,
    endCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
    groupCallParticipants,
    users
  } = useChatStore();

  const { socket, user: authUser } = useAuthStore(); // Fix: use user instead of authUser

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isLanConnection, setIsLanConnection] = useState(false);
  const [connectionQualityInfo, setConnectionQualityInfo] = useState({ quality: 'standard', isLan: false });
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const webRTCServiceRef = useRef(null);
  const connectionCheckInterval = useRef(null);

  // Initialize WebRTC service
  useEffect(() => {
    if (!socket) return;

    webRTCServiceRef.current = new WebRTCService(socket);

    // Set up callback for remote stream updates
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

    // Check if we're using a LAN connection
    if (webRTCServiceRef.current.isUsingLanConnection) {
      setIsLanConnection(webRTCServiceRef.current.isUsingLanConnection());
    }

    // Set up interval to check connection quality
    connectionCheckInterval.current = setInterval(() => {
      if (webRTCServiceRef.current && activeCall) {
        const quality = webRTCServiceRef.current.getConnectionQuality(activeCall.userId);
        setConnectionQualityInfo(quality);
        setIsLanConnection(quality.isLan);
      }
    }, 5000); // Check every 5 seconds

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

    // Initialize media for the call
    const setupCall = async () => {
      try {
        if (!webRTCServiceRef.current) return;

        // Initialize local stream
        const stream = await webRTCServiceRef.current.initLocalStream(activeCall.isVideo);
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // If this is an outgoing call, we need to wait for the other person to accept
        if (activeCall.isOutgoing) {
          // Wait for call acceptance
          socket.on('callAccepted', ({ receiverId }) => {
            if (receiverId === authUser._id) return;

            // Start WebRTC connection
            webRTCServiceRef.current.callUser(activeCall.userId);
          });
        } else {
          // For incoming calls, we need to establish the connection right away
          webRTCServiceRef.current.callUser(activeCall.userId);
        }

        // Handle call ended
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
    // Filter users who are not already in the call
    const availableUsers = users.filter(
      (user) =>
        !groupCallParticipants.some((p) => p._id === user._id) &&
        user._id !== activeCall.caller._id
    );
    setSelectedParticipants(availableUsers);
  };

  const handleInviteParticipant = (userId) => {
    socket.emit('inviteToGroupCall', {
      callId: activeCall.id,
      userId,
    });
  };

  if (!activeCall) return null;

  return (
    <div className="fixed bottom-0 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 m-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {activeCall.isVideo && (
            <div className="relative w-full mb-4">
              {localStream && (
                <div className="relative w-full h-32 mb-2">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute bottom-1 left-1 text-white text-xs bg-black bg-opacity-50 px-1 py-0.5 rounded">
                    You
                  </div>
                </div>
              )}
              {remoteStream && (
                <div className="relative w-full h-32">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute bottom-1 left-1 text-white text-xs bg-black bg-opacity-50 px-1 py-0.5 rounded">
                    {activeCall.userName || "Caller"}
                  </div>
                </div>
              )}
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
        <button
          onClick={() => {
            try {
              // Clean up WebRTC connections before ending call
              if (webRTCServiceRef.current) {
                webRTCServiceRef.current.closeAllConnections();
              }

              // End the call in the store
              endCall();

              // Manually emit end call event if needed
              if (!socket && authUser) {
                console.warn("Socket not available, manually cleaning up call");
                // Clean up local state
                if (localStream) {
                  localStream.getTracks().forEach(track => track.stop());
                  setLocalStream(null);
                }
                if (remoteStream) {
                  remoteStream.getTracks().forEach(track => track.stop());
                  setRemoteStream(null);
                }
              }
            } catch (error) {
              console.error("Error ending call:", error);
              toast.error("Error ending call");
            }
          }}
          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
        >
          <PhoneOff size={20} />
        </button>
      </div>

      {activeCall.isGroupCall && (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Participants</h4>
            <button
              onClick={handleAddParticipants}
              className="p-1 text-blue-500 hover:bg-blue-50 rounded-full"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {groupCallParticipants.map((participant) => (
              <div
                key={participant._id}
                className="flex items-center bg-gray-100 rounded-full px-3 py-1"
              >
                <img
                  src={participant.avatar}
                  alt={participant.name}
                  className="w-6 h-6 rounded-full mr-2"
                />
                <span className="text-sm">{participant.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection quality indicator */}
      <div className="mb-3 flex justify-center">
        <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
          isLanConnection
            ? 'bg-green-100 text-green-800 border border-green-300'
            : 'bg-blue-100 text-blue-800 border border-blue-300'
        }`}>
          {isLanConnection ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>LAN Connection ({connectionQualityInfo.quality === 'high' ? 'High' : 'Enhanced'} Quality)</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Internet Connection (Standard Quality)</span>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={() => {
            if (webRTCServiceRef.current) {
              try {
                const newMuteState = webRTCServiceRef.current.toggleAudio();
                console.log("Audio toggled, new state:", newMuteState);
                toggleMute(newMuteState);
              } catch (error) {
                console.error("Error toggling audio:", error);
                // Toggle mute state directly if WebRTC function fails
                toggleMute(!isMuted);
              }
            } else {
              console.warn("WebRTC service not available, toggling state directly");
              toggleMute(!isMuted);
            }
          }}
          className={`p-3 rounded-full ${
            isMuted ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        {activeCall.isVideo && (
          <button
            onClick={() => {
              if (webRTCServiceRef.current) {
                try {
                  const newVideoState = webRTCServiceRef.current.toggleVideo();
                  console.log("Video toggled, new state:", newVideoState);
                  toggleVideo(newVideoState);
                } catch (error) {
                  console.error("Error toggling video:", error);
                  // Toggle video state directly if WebRTC function fails
                  toggleVideo(!isVideoOff);
                }
              } else {
                console.warn("WebRTC service not available, toggling state directly");
                toggleVideo(!isVideoOff);
              }
            }}
            className={`p-3 rounded-full ${
              isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        )}
      </div>

      {showAddParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 w-96">
            <h3 className="text-lg font-semibold mb-4">Add Participants</h3>
            <div className="max-h-60 overflow-y-auto">
              {selectedParticipants.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                    <span>{user.name}</span>
                  </div>
                  <button
                    onClick={() => handleInviteParticipant(user._id)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600"
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAddParticipant(false)}
              className="mt-4 w-full py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallInterface;