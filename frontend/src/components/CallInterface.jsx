import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users, Plus } from "lucide-react";
import toast from "react-hot-toast";

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
  
  const { socket } = useAuthStore();

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  useEffect(() => {
    if (!activeCall || !socket) return;

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
  }, [activeCall, socket]);

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
    <div className="fixed bottom-0 right-0 w-80 bg-white rounded-lg shadow-lg p-4 m-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <img
            src={activeCall.caller.avatar}
            alt={activeCall.caller.name}
            className="w-10 h-10 rounded-full mr-2"
          />
          <div>
            <h3 className="font-semibold">{activeCall.caller.name}</h3>
            <p className="text-sm text-gray-500">
              {activeCall.isGroupCall ? 'Group Call' : 'Calling...'}
            </p>
          </div>
        </div>
        <button
          onClick={endCall}
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

      <div className="flex justify-center space-x-4">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full ${
            isMuted ? 'bg-red-500 text-white' : 'bg-gray-200'
          }`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${
            isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-200'
          }`}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
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