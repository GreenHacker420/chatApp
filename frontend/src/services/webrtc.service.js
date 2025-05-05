/**
 * WebRTC Service
 * Handles WebRTC connections, ICE candidates, and media streams
 */

// Configuration for RTCPeerConnection
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

class WebRTCService {
  constructor(socket) {
    this.socket = socket;
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.localStream = null;
    this.remoteStreams = new Map(); // userId -> MediaStream
    this.onRemoteStreamUpdate = null; // Callback when remote streams change
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    if (!this.socket) return;

    // Handle incoming offer
    this.socket.on('webrtc-offer', async ({ from, offer }) => {
      console.log('Received WebRTC offer from:', from);
      await this.handleOffer(from, offer);
    });

    // Handle incoming answer
    this.socket.on('webrtc-answer', async ({ from, answer }) => {
      console.log('Received WebRTC answer from:', from);
      await this.handleAnswer(from, answer);
    });

    // Handle incoming ICE candidate
    this.socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
      console.log('Received ICE candidate from:', from);
      await this.handleIceCandidate(from, candidate);
    });

    // Handle user leaving call
    this.socket.on('webrtc-user-disconnected', ({ userId }) => {
      console.log('User disconnected from call:', userId);
      this.closeConnection(userId);
    });
  }

  /**
   * Initialize local media stream
   * @param {boolean} video - Whether to include video
   * @returns {Promise<MediaStream>} - Local media stream
   */
  async initLocalStream(video = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video,
      });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  /**
   * Create a new peer connection for a user
   * @param {string} userId - User ID to connect with
   * @returns {RTCPeerConnection} - The created peer connection
   */
  createPeerConnection(userId) {
    if (this.peerConnections.has(userId)) {
      return this.peerConnections.get(userId);
    }

    const peerConnection = new RTCPeerConnection(rtcConfig);
    this.peerConnections.set(userId, peerConnection);

    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          to: userId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${userId}:`, peerConnection.connectionState);
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${userId}:`, peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'disconnected' || 
          peerConnection.iceConnectionState === 'failed' ||
          peerConnection.iceConnectionState === 'closed') {
        this.closeConnection(userId);
      }
    };

    // Handle remote tracks
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from:', userId);
      const [remoteStream] = event.streams;
      this.remoteStreams.set(userId, remoteStream);
      
      if (this.onRemoteStreamUpdate) {
        this.onRemoteStreamUpdate(userId, remoteStream);
      }
    };

    return peerConnection;
  }

  /**
   * Initiate a call to another user
   * @param {string} userId - User ID to call
   */
  async callUser(userId) {
    try {
      const peerConnection = this.createPeerConnection(userId);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      await peerConnection.setLocalDescription(offer);
      
      this.socket.emit('webrtc-offer', {
        to: userId,
        offer,
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  /**
   * Handle an incoming offer
   * @param {string} userId - User ID who sent the offer
   * @param {RTCSessionDescriptionInit} offer - The offer
   */
  async handleOffer(userId, offer) {
    try {
      const peerConnection = this.createPeerConnection(userId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      this.socket.emit('webrtc-answer', {
        to: userId,
        answer,
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  /**
   * Handle an incoming answer
   * @param {string} userId - User ID who sent the answer
   * @param {RTCSessionDescriptionInit} answer - The answer
   */
  async handleAnswer(userId, answer) {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  /**
   * Handle an incoming ICE candidate
   * @param {string} userId - User ID who sent the candidate
   * @param {RTCIceCandidateInit} candidate - The ICE candidate
   */
  async handleIceCandidate(userId, candidate) {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  /**
   * Close a peer connection
   * @param {string} userId - User ID to close connection with
   */
  closeConnection(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
    
    this.remoteStreams.delete(userId);
    
    if (this.onRemoteStreamUpdate) {
      this.onRemoteStreamUpdate(userId, null);
    }
  }

  /**
   * Close all peer connections
   */
  closeAllConnections() {
    for (const userId of this.peerConnections.keys()) {
      this.closeConnection(userId);
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  /**
   * Toggle audio mute state
   * @returns {boolean} - New mute state (true = muted)
   */
  toggleAudio() {
    if (!this.localStream) return false;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled;
    }
    return false;
  }

  /**
   * Toggle video state
   * @returns {boolean} - New video state (true = video off)
   */
  toggleVideo() {
    if (!this.localStream) return false;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return !videoTrack.enabled;
    }
    return false;
  }

  /**
   * Get all remote streams
   * @returns {Map<string, MediaStream>} - Map of user IDs to remote streams
   */
  getRemoteStreams() {
    return this.remoteStreams;
  }
}

export default WebRTCService;
