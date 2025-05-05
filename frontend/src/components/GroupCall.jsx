import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users } from "lucide-react";
import toast from "react-hot-toast";
import WebRTCService from "../services/webrtc.service";

const GroupCall = ({ groupId, groupName, onEndCall }) => {
  const { authUser, socket } = useAuthStore();
  const { selectedGroup } = useChatStore();
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const localVideoRef = useRef(null);
  const webRTCServiceRef = useRef(null);

  // Initialize WebRTC service
  useEffect(() => {
    if (!socket) return;

    webRTCServiceRef.current = new WebRTCService(socket);

    // Set up callback for remote stream updates
    webRTCServiceRef.current.onRemoteStreamUpdate = (userId, stream) => {
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        if (stream) {
          newStreams.set(userId, stream);
        } else {
          newStreams.delete(userId);
        }
        return newStreams;
      });
    };

    return () => {
      if (webRTCServiceRef.current) {
        webRTCServiceRef.current.closeAllConnections();
      }
    };
  }, [socket]);

  // Handle group call room
  useEffect(() => {
    if (!socket || !groupId || !authUser?._id) return;

    // Join the group call room
    socket.emit("joinGroupCall", { groupId, userId: authUser._id });

    // Start the call automatically
    startCall();

    // Handle participants joining
    socket.on("participantJoined", ({ userId }) => {
      if (userId !== authUser._id && webRTCServiceRef.current) {
        setParticipants(prev => {
          if (!prev.some(p => p.userId === userId)) {
            toast.success("New participant joined the call");
            // Initiate WebRTC connection with the new participant
            webRTCServiceRef.current.callUser(userId);
            return [...prev, { userId }];
          }
          return prev;
        });
      }
    });

    // Handle participants leaving
    socket.on("participantLeft", ({ userId }) => {
      setParticipants(prev => {
        const filtered = prev.filter(p => p.userId !== userId);
        if (filtered.length !== prev.length) {
          toast.info("A participant left the call");
        }
        return filtered;
      });

      // Close the connection with this participant
      if (webRTCServiceRef.current) {
        webRTCServiceRef.current.closeConnection(userId);
      }
    });

    // Handle call ended
    socket.on("groupCallEnded", () => {
      toast.info("Group call has ended");
      onEndCall();
    });

    return () => {
      socket.off("participantJoined");
      socket.off("participantLeft");
      socket.off("groupCallEnded");
      endCall();
    };
  }, [socket, groupId, authUser?._id]);

  const startCall = async () => {
    try {
      if (!webRTCServiceRef.current) return;

      // Initialize local stream through WebRTC service
      const stream = await webRTCServiceRef.current.initLocalStream(true);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Notify other participants
      socket.emit("startGroupCall", {
        groupId,
        userId: authUser._id
      });

      // Connect to existing participants
      participants.forEach(participant => {
        if (participant.userId !== authUser._id) {
          webRTCServiceRef.current.callUser(participant.userId);
        }
      });
    } catch (error) {
      toast.error("Failed to access camera/microphone");
      console.error("Error starting call:", error);
    }
  };

  const endCall = () => {
    if (webRTCServiceRef.current) {
      webRTCServiceRef.current.closeAllConnections();
    }
    socket.emit("leaveGroupCall", { groupId, userId: authUser._id });
    onEndCall();
  };

  const toggleMute = () => {
    if (webRTCServiceRef.current) {
      const newMuteState = webRTCServiceRef.current.toggleAudio();
      setIsMuted(newMuteState);
    }
  };

  const toggleVideo = () => {
    if (webRTCServiceRef.current) {
      const newVideoState = webRTCServiceRef.current.toggleVideo();
      setIsVideoOff(newVideoState);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-base-100 p-4 rounded-lg w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{groupName} - Group Call</h2>
          <button onClick={endCall} className="btn btn-circle btn-error">
            <PhoneOff size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-lg"
            />
            <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
              You
            </div>
          </div>
          {Array.from(remoteStreams).map(([userId, stream]) => (
            <div key={userId} className="relative">
              <video
                autoPlay
                playsInline
                className="w-full rounded-lg"
                ref={(element) => {
                  if (element) element.srcObject = stream;
                }}
              />
              <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                {participants.find(p => p.userId === userId)?.name || "Participant"}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`btn btn-circle ${isMuted ? "btn-error" : "btn-primary"}`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button
            onClick={toggleVideo}
            className={`btn btn-circle ${isVideoOff ? "btn-error" : "btn-primary"}`}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
          <button className="btn btn-circle btn-primary">
            <Users size={20} />
            <span className="ml-2">{participants.length + 1}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupCall;