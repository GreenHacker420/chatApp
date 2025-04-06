import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users } from "lucide-react";
import toast from "react-hot-toast";

const GroupCall = ({ groupId, groupName, onEndCall }) => {
  const { authUser, socket } = useAuthStore();
  const { selectedGroup } = useChatStore();
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});

  useEffect(() => {
    if (!socket || !groupId) return;

    // Join the group call room
    socket.emit("joinGroupCall", { groupId, userId: authUser._id });

    // Handle participants joining
    socket.on("participantJoined", ({ userId, stream }) => {
      setParticipants(prev => [...prev, { userId, stream }]);
      toast.success("New participant joined the call");
    });

    // Handle participants leaving
    socket.on("participantLeft", ({ userId }) => {
      setParticipants(prev => prev.filter(p => p.userId !== userId));
      toast.info("A participant left the call");
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
  }, [socket, groupId, authUser._id]);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Notify other participants
      socket.emit("startGroupCall", { 
        groupId, 
        userId: authUser._id,
        stream 
      });
    } catch (error) {
      toast.error("Failed to access camera/microphone");
      console.error("Error starting call:", error);
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    socket.emit("endGroupCall", { groupId });
    onEndCall();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!isVideoOff);
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
          {participants.map((participant) => (
            <div key={participant.userId} className="relative">
              <video
                autoPlay
                playsInline
                className="w-full rounded-lg"
                srcObject={participant.stream}
              />
              <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                {participant.userId === authUser._id ? "You" : "Participant"}
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