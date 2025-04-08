import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import toast from "react-hot-toast";

const CallInterface = () => {
  const { activeCall, endCall } = useChatStore();
  const { selectedUser } = useChatStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!activeCall?.isVideo);
  const [callDuration, setCallDuration] = useState(0);
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
    if (activeCall?.startTime) {
      durationIntervalRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - activeCall.startTime) / 1000);
        setCallDuration(duration);
      }, 1000);
    }

    return cleanup;
  }, [activeCall?.stream, activeCall?.startTime, cleanup]);

  const toggleMute = useCallback(() => {
    if (activeCall?.stream) {
      const audioTrack = activeCall.stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!isMuted);
    }
  }, [activeCall?.stream, isMuted]);

  const toggleVideo = useCallback(() => {
    if (activeCall?.stream && activeCall.isVideo) {
      const videoTrack = activeCall.stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!isVideoOff);
    }
  }, [activeCall?.stream, activeCall?.isVideo, isVideoOff]);

  const handleEndCall = useCallback(() => {
    cleanup();
    endCall();
    toast.success("Call ended");
  }, [cleanup, endCall]);

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCallStatus = () => {
    if (!activeCall) return "";
    
    if (activeCall.isOutgoing) {
      return activeCall.isReceiverOnline ? "Ringing..." : "Calling...";
    }
    return "Incoming Call";
  };

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
            onClick={handleEndCall} 
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
            onClick={handleEndCall} 
            className="btn btn-circle btn-error"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallInterface; 