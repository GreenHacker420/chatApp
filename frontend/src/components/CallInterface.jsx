import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { socket } from '../socket';

const CallInterface = () => {
  const {
    activeCall,
    endCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
    groupCallParticipants,
    addGroupCallParticipant,
    removeGroupCallParticipant,
    handleGroupCallInvitation,
    acceptGroupCallInvitation,
    rejectGroupCallInvitation,
    users
  } = useChatStore();
  const { selectedUser, socket: authSocket } = useAuthStore();
  const [callDuration, setCallDuration] = useState(0);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Handle component unmount
  useEffect(() => {
    return () => {
      cleanup();
      // Ensure we stop any active call when component unmounts
      if (activeCall) {
        endCall();
      }
    };
  }, [cleanup, activeCall, endCall]);

  // Handle media stream
  useEffect(() => {
    if (activeCall?.stream && localVideoRef.current) {
      localVideoRef.current.srcObject = activeCall.stream;
    }

    // Start call duration timer if call is connected
    if (activeCall?.connectedAt) {
      durationIntervalRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - activeCall.connectedAt) / 1000);
        setCallDuration(duration);
      }, 1000);
    }

    return cleanup;
  }, [activeCall?.stream, activeCall?.connectedAt, cleanup]);

  useEffect(() => {
    if (!activeCall) return;

    socket.on('groupCallInvitation', (invitation) => {
      handleGroupCallInvitation(invitation);
    });

    socket.on('participantJoined', (participant) => {
      addGroupCallParticipant(participant);
    });

    socket.on('participantLeft', (participantId) => {
      removeGroupCallParticipant(participantId);
    });

    return () => {
      socket.off('groupCallInvitation');
      socket.off('participantJoined');
      socket.off('participantLeft');
    };
  }, [activeCall]);

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

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCallStatus = () => {
    if (!activeCall) return "";
    
    if (activeCall.isOutgoing) {
      if (!activeCall.connectedAt) {
        return activeCall.isReceiverOnline ? "Ringing..." : "Calling...";
      }
      return "Connected";
    }
    return activeCall.connectedAt ? "Connected" : "Incoming Call";
  };

  if (!activeCall) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center animate-fadeIn">
      <div className="bg-base-100 p-4 rounded-lg w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">
              {getCallStatus()} - {selectedUser?.fullName}
            </h2>
            {activeCall?.startTime && (
              <p className="text-sm text-base-content/70">
                Duration: {formatDuration(callDuration)}
              </p>
            )}
            {activeCall?.isOutgoing && !activeCall?.isReceiverOnline && (
              <p className="text-sm text-base-content/70 mt-1">
                User is offline. They will be notified when they come online.
              </p>
            )}
          </div>
          <button 
            onClick={endCall} 
            className="btn btn-circle btn-error"
          >
            <PhoneOff size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Local Video */}
          {activeCall?.isVideo && (
            <div className="relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full rounded-lg ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-48 bg-base-300 rounded-lg flex items-center justify-center">
                  <span className="text-lg">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                You
              </div>
            </div>
          )}

          {/* Remote Video */}
          {activeCall?.isVideo && (
            <div className="relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                {selectedUser?.fullName}
              </div>
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`btn btn-circle ${isMuted ? 'btn-error' : 'btn-primary'}`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {activeCall?.isVideo && (
            <button
              onClick={toggleVideo}
              className={`btn btn-circle ${isVideoOff ? 'btn-error' : 'btn-primary'}`}
            >
              {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}

          <button
            onClick={handleAddParticipants}
            className="btn btn-circle btn-primary"
            title="Add Participants"
          >
            <Plus size={20} />
          </button>

          <button 
            onClick={endCall} 
            className="btn btn-circle btn-error"
          >
            <PhoneOff size={20} />
          </button>
        </div>

        {/* Add Participant Modal */}
        {showAddParticipant && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
            <div className="bg-base-100 p-4 rounded-lg w-96">
              <h3 className="text-lg font-bold mb-4">Add Participants</h3>
              <div className="max-h-60 overflow-y-auto">
                {selectedParticipants.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-2 hover:bg-base-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="avatar">
                        <div className="w-8 h-8 rounded-full">
                          <img
                            src={user.profilePic || "/avatar.png"}
                            alt={user.fullName}
                          />
                        </div>
                      </div>
                      <span>{user.fullName}</span>
                    </div>
                    <button
                      onClick={() => handleInviteParticipant(user._id)}
                      className="btn btn-sm btn-primary"
                    >
                      Invite
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowAddParticipant(false)}
                  className="btn btn-ghost"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {activeCall.isGroupCall && (
          <div className="mt-4">
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
                    src={participant.profilePic || "/avatar.png"}
                    alt={participant.fullName}
                    className="w-6 h-6 rounded-full mr-2"
                  />
                  <span className="text-sm">{participant.fullName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallInterface; 