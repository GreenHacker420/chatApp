/**
 * WebRTC Service
 * Handles WebRTC connections, ICE candidates, and media streams
 * Supports LAN connections for better call quality when users are on the same network
 */

// Configuration for RTCPeerConnection with LAN support
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all', // Allow both relay and direct connections
  rtcpMuxPolicy: 'require',
};

// Enhanced configuration for LAN connections
const lanRtcConfig = {
  ...rtcConfig,
  // Prioritize local network candidates
  iceTransportPolicy: 'all',
  // Increase ICE candidate pool for more options
  iceCandidatePoolSize: 15,
};

class WebRTCService {
  constructor(socket) {
    this.socket = socket;
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.localStream = null;
    this.remoteStreams = new Map(); // userId -> MediaStream
    this.onRemoteStreamUpdate = null; // Callback when remote streams change
    this.isLanConnection = false; // Flag for LAN connection
    this.lanIpAddresses = new Set(); // Set of LAN IP addresses
    this.setupSocketListeners();
    this.detectLanConnection();
  }

  /**
   * Detect if users are on the same local network
   * This uses WebRTC to gather local IP addresses
   */
  async detectLanConnection() {
    try {
      // Create a temporary RTCPeerConnection to gather ICE candidates
      const pc = new RTCPeerConnection({
        iceServers: [] // No STUN/TURN servers needed for local detection
      });

      // Add a dummy data channel to trigger ICE candidate gathering
      pc.createDataChannel('lan-detection');

      // Create an offer to start ICE gathering
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Listen for ICE candidates to extract local IP addresses
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;

        // Extract IP address from candidate string
        const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(event.candidate.candidate);
        if (ipMatch && ipMatch[1]) {
          const ip = ipMatch[1];

          // Check if this is a private IP address (LAN)
          if (this.isPrivateIp(ip)) {
            console.log('Detected LAN IP address:', ip);
            this.lanIpAddresses.add(ip);
            this.isLanConnection = true;
          }
        }
      };

      // Clean up after 5 seconds (should be enough time to gather candidates)
      setTimeout(() => {
        pc.close();
        console.log('LAN detection complete. LAN connection:', this.isLanConnection);
        console.log('LAN IP addresses:', [...this.lanIpAddresses]);

        // Emit event to server to share LAN information
        if (this.socket && this.isLanConnection) {
          this.socket.emit('lan-connection-info', {
            lanIpAddresses: [...this.lanIpAddresses]
          });
        }
      }, 5000);
    } catch (error) {
      console.error('Error detecting LAN connection:', error);
    }
  }

  /**
   * Check if an IP address is a private (LAN) address
   * @param {string} ip - IP address to check
   * @returns {boolean} - True if private IP
   */
  isPrivateIp(ip) {
    // Check for private IP ranges
    return /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(ip);
  }

  setupSocketListeners() {
    if (!this.socket) return;

    // Handle incoming offer
    this.socket.on('webrtc-offer', async ({ from, offer, isLanConnection = false }) => {
      console.log('Received WebRTC offer from:', from, 'LAN connection:', isLanConnection);
      // Update LAN connection status if the peer indicates they're on LAN
      if (isLanConnection) {
        this.isLanConnection = true;
      }
      await this.handleOffer(from, offer);
    });

    // Handle incoming answer
    this.socket.on('webrtc-answer', async ({ from, answer, isLanConnection = false }) => {
      console.log('Received WebRTC answer from:', from, 'LAN connection:', isLanConnection);
      // Update LAN connection status if the peer indicates they're on LAN
      if (isLanConnection) {
        this.isLanConnection = true;
      }
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

    // Handle LAN connection information from other users
    this.socket.on('lan-connection-info', ({ userId, lanIpAddresses }) => {
      console.log('Received LAN info from user:', userId, lanIpAddresses);

      // Check if we share any LAN IP addresses with the other user
      if (lanIpAddresses && Array.isArray(lanIpAddresses)) {
        const sharedLan = lanIpAddresses.some(ip =>
          this.lanIpAddresses.has(ip) || this.isPrivateIp(ip)
        );

        if (sharedLan) {
          console.log('Detected shared LAN with user:', userId);
          this.isLanConnection = true;

          // If we already have a connection with this user, consider restarting it
          // to take advantage of the LAN connection
          if (this.peerConnections.has(userId)) {
            console.log('Restarting connection to use LAN with user:', userId);
            this.restartIce(userId);
          }
        }
      }
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

    // Use LAN-optimized config if on the same network
    const config = this.isLanConnection ? lanRtcConfig : rtcConfig;
    console.log('Creating peer connection with config:', config, 'LAN connection:', this.isLanConnection);

    const peerConnection = new RTCPeerConnection(config);
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

      // Include LAN connection information in the offer
      this.socket.emit('webrtc-offer', {
        to: userId,
        offer,
        isLanConnection: this.isLanConnection,
        lanIpAddresses: [...this.lanIpAddresses]
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  /**
   * Restart ICE for a connection to improve quality or recover from failures
   * @param {string} userId - User ID to restart connection with
   */
  async restartIce(userId) {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (!peerConnection) return;

      console.log('Restarting ICE connection with user:', userId);

      // Create a new offer with ICE restart flag
      const offer = await peerConnection.createOffer({
        iceRestart: true,
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await peerConnection.setLocalDescription(offer);

      // Send the new offer
      this.socket.emit('webrtc-offer', {
        to: userId,
        offer,
        isLanConnection: this.isLanConnection,
        lanIpAddresses: [...this.lanIpAddresses]
      });
    } catch (error) {
      console.error('Error restarting ICE:', error);
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

      // Include LAN connection information in the answer
      this.socket.emit('webrtc-answer', {
        to: userId,
        answer,
        isLanConnection: this.isLanConnection,
        lanIpAddresses: [...this.lanIpAddresses]
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
    try {
      if (!this.localStream) {
        console.warn("Cannot toggle audio: No local stream available");
        return false;
      }

      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn("Cannot toggle audio: No audio tracks found");
        return false;
      }

      const audioTrack = audioTracks[0];
      const newState = !audioTrack.enabled;
      audioTrack.enabled = newState;

      console.log(`Audio ${newState ? 'muted' : 'unmuted'}`);
      return !newState; // Return true when muted (track disabled)
    } catch (error) {
      console.error("Error toggling audio:", error);
      return false;
    }
  }

  /**
   * Toggle video state
   * @returns {boolean} - New video state (true = video off)
   */
  toggleVideo() {
    try {
      if (!this.localStream) {
        console.warn("Cannot toggle video: No local stream available");
        return false;
      }

      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.warn("Cannot toggle video: No video tracks found");
        return false;
      }

      const videoTrack = videoTracks[0];
      const newState = !videoTrack.enabled;
      videoTrack.enabled = newState;

      console.log(`Video ${newState ? 'disabled' : 'enabled'}`);
      return !newState; // Return true when video is off (track disabled)
    } catch (error) {
      console.error("Error toggling video:", error);
      return false;
    }
  }

  /**
   * Get all remote streams
   * @returns {Map<string, MediaStream>} - Map of user IDs to remote streams
   */
  getRemoteStreams() {
    return this.remoteStreams;
  }

  /**
   * Check if the current connection is using LAN
   * @returns {boolean} - True if using LAN connection
   */
  isUsingLanConnection() {
    return this.isLanConnection;
  }

  /**
   * Get connection quality information
   * @param {string} userId - User ID to get connection info for
   * @returns {Object} - Connection quality information
   */
  getConnectionQuality(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) {
      return { quality: 'unknown', isLan: false };
    }

    const quality = this.isLanConnection ? 'high' : 'standard';
    const connectionState = peerConnection.connectionState || 'unknown';
    const iceConnectionState = peerConnection.iceConnectionState || 'unknown';

    return {
      quality,
      isLan: this.isLanConnection,
      connectionState,
      iceConnectionState
    };
  }
}

export default WebRTCService;
