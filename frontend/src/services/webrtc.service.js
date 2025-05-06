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
    this.peerConnections = {};
    this.dataChannels = {}; // For file transfer
    this.localStream = null;
    this.remoteStreams = new Map(); // userId -> MediaStream
    this.onRemoteStreamUpdate = null; // Callback when remote streams change
    this.isLanConnection = false; // Flag for LAN connection
    this.lanIpAddresses = new Set(); // Set of LAN IP addresses
    this.availableFiles = new Map(); // Map of files available for sharing
    this.fileTransfers = new Map(); // Track ongoing file transfers
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    };
    this.setupSocketListeners();
    this.detectLanConnection();
  }

  /**
   * Detect if users are on the same local network
   * This uses WebRTC to gather local IP addresses
   * @returns {Promise<boolean>} - True if LAN connection is detected
   */
  async detectLanConnection() {
    return new Promise((resolve) => {
      try {
        // Create a temporary RTCPeerConnection to gather ICE candidates
        const pc = new RTCPeerConnection({
          iceServers: [] // No STUN/TURN servers needed for local detection
        });

        // Add a dummy data channel to trigger ICE candidate gathering
        pc.createDataChannel('lan-detection');

        // Create an offer to start ICE gathering
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .catch(err => {
            console.error('Error creating offer:', err);
            resolve(false);
          });

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

        // Set a timeout to resolve the promise
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

          resolve(this.isLanConnection);
        }, 3000); // Reduced to 3 seconds for better UX
      } catch (error) {
        console.error('Error detecting LAN connection:', error);
        resolve(false);
      }
    });
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
      await this.handleOffer({ target: from, sdp: offer });
    });

    // Handle incoming answer
    this.socket.on('webrtc-answer', async ({ from, answer, isLanConnection = false }) => {
      console.log('Received WebRTC answer from:', from, 'LAN connection:', isLanConnection);
      // Update LAN connection status if the peer indicates they're on LAN
      if (isLanConnection) {
        this.isLanConnection = true;
      }
      await this.handleAnswer({ target: from, sdp: answer });
    });

    // Handle incoming ICE candidate
    this.socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
      console.log('Received ICE candidate from:', from);
      await this.handleIceCandidate({ target: from, candidate });
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
          if (this.peerConnections.hasOwnProperty(userId)) {
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
      const constraints = {
        audio: true,
        video: video ? {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
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
    if (this.peerConnections.hasOwnProperty(userId)) {
      return this.peerConnections[userId];
    }

    // Use LAN-optimized config if on the same network
    const config = this.isLanConnection ? lanRtcConfig : rtcConfig;
    console.log('Creating peer connection with config:', config, 'LAN connection:', this.isLanConnection);

    const peerConnection = new RTCPeerConnection(config);
    this.peerConnections[userId] = peerConnection;

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
          target: userId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        this.closeConnection(userId);
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${userId}:`, peerConnection.iceConnectionState);
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
      this.peerConnections[userId] = peerConnection;

      // Add local stream tracks to the peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream);
        });
      }

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
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
      const peerConnection = this.peerConnections[userId];
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
  async handleOffer({ target, sdp }) {
    try {
      const peerConnection = this.createPeerConnection(target);
      this.peerConnections[target] = peerConnection;

      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream);
        });
      }

      // Set remote description and create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.socket.emit('webrtc-answer', {
        to: target,
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
  async handleAnswer({ target, sdp }) {
    try {
      const peerConnection = this.peerConnections[target];
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
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
  async handleIceCandidate({ target, candidate }) {
    try {
      const peerConnection = this.peerConnections[target];
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
    const peerConnection = this.peerConnections[userId];
    if (peerConnection) {
      peerConnection.close();
      delete this.peerConnections[userId];
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
    for (const userId in this.peerConnections) {
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
    if (this.localStream) {
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
    }
    return false;
  }

  /**
   * Toggle video state
   * @returns {boolean} - New video state (true = video off)
   */
  toggleVideo() {
    if (this.localStream) {
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

  /**
   * Check if the current connection is using LAN
   * @returns {boolean} - True if using LAN connection
   */
  isUsingLanConnection() {
    return this.isLanConnection;
  }

  /**
   * Handle LAN connection information from other users
   * @param {Object} data - LAN connection data
   */
  handleLanInfo(data) {
    const { userId, lanIpAddresses } = data;

    if (!userId || !lanIpAddresses || !Array.isArray(lanIpAddresses)) {
      console.warn('Invalid LAN info received:', data);
      return;
    }

    // Check if we share any LAN IP addresses with the other user
    const sharedLan = lanIpAddresses.some(ip =>
      this.lanIpAddresses.has(ip) || this.isPrivateIp(ip)
    );

    if (sharedLan) {
      console.log('Detected shared LAN with user:', userId);
      this.isLanConnection = true;

      // If we already have a connection with this user, consider restarting it
      // to take advantage of the LAN connection
      if (this.peerConnections.hasOwnProperty(userId)) {
        console.log('Restarting connection to use LAN with user:', userId);
        this.restartIce(userId);
      }
    }
  }

  /**
   * Get connection quality information
   * @param {string} userId - User ID to get connection info for
   * @returns {Object} - Connection quality information
   */
  getConnectionQuality(userId) {
    const peerConnection = this.peerConnections[userId];
    if (!peerConnection) {
      return { quality: 'unknown', isLan: false };
    }

    const stats = peerConnection.getStats();
    if (!stats) return { quality: 'unknown', isLan: false };

    return stats.then(stats => {
      let quality = 'standard';
      let isLan = false;

      stats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          const localCandidate = stats.get(report.localCandidateId);
          const remoteCandidate = stats.get(report.remoteCandidateId);

          if (localCandidate && remoteCandidate) {
            // Check if it's a LAN connection
            isLan = localCandidate.candidateType === 'host' && remoteCandidate.candidateType === 'host';

            // Determine quality based on round-trip time
            if (report.currentRoundTripTime < 0.1) {
              quality = 'high';
            } else if (report.currentRoundTripTime < 0.3) {
              quality = 'standard';
            } else {
              quality = 'low';
            }
          }
        }
      });

      return { quality, isLan };
    });
  }

  /**
   * Create a data channel for file transfer
   * @param {string} userId - User ID to create data channel with
   * @returns {RTCDataChannel} - The created data channel
   */
  createDataChannel(userId) {
    if (!this.peerConnections[userId]) {
      this.createPeerConnection(userId);
    }

    if (this.dataChannels[userId]) {
      return this.dataChannels[userId];
    }

    try {
      const dataChannel = this.peerConnections[userId].createDataChannel('fileTransfer', {
        ordered: true
      });

      this.setupDataChannel(dataChannel, userId);
      this.dataChannels[userId] = dataChannel;

      return dataChannel;
    } catch (error) {
      console.error('Error creating data channel:', error);
      throw error;
    }
  }

  /**
   * Set up data channel event handlers
   * @param {RTCDataChannel} dataChannel - The data channel to set up
   * @param {string} userId - User ID associated with this data channel
   */
  setupDataChannel(dataChannel, userId) {
    dataChannel.onopen = () => {
      console.log(`Data channel with ${userId} opened`);
    };

    dataChannel.onclose = () => {
      console.log(`Data channel with ${userId} closed`);
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error with ${userId}:`, error);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'file-info':
            this.handleFileInfo(message, userId);
            break;
          case 'file-request':
            this.handleFileRequest(message, userId);
            break;
          case 'file-data':
            this.handleFileData(message, userId);
            break;
          case 'file-complete':
            this.handleFileComplete(message, userId);
            break;
          case 'file-error':
            this.handleFileError(message, userId);
            break;
          default:
            console.warn('Unknown data channel message type:', message.type);
        }
      } catch (error) {
        console.error('Error handling data channel message:', error);
      }
    };
  }

  /**
   * Handle file info message
   * @param {Object} message - File info message
   * @param {string} userId - User ID who sent the message
   */
  handleFileInfo(message, userId) {
    const { fileId, fileName, fileSize, fileType } = message;

    // Store file info
    if (!this.availableFiles.has(userId)) {
      this.availableFiles.set(userId, new Map());
    }

    this.availableFiles.get(userId).set(fileId, {
      id: fileId,
      name: fileName,
      size: fileSize,
      type: fileType,
      chunks: [],
      receivedSize: 0
    });

    // Notify that a file is available
    if (this.socket) {
      this.socket.emit('fileAvailable', {
        fileId,
        fileName,
        fileSize,
        fileType,
        senderId: userId
      });
    }
  }

  /**
   * Handle file request message
   * @param {Object} message - File request message
   * @param {string} userId - User ID who sent the message
   */
  handleFileRequest(message, userId) {
    const { fileId } = message;
    const fileTransfer = this.fileTransfers.get(fileId);

    if (fileTransfer) {
      this.sendFileChunks(fileId, userId);
    } else {
      // File not found
      this.sendDataChannelMessage(userId, {
        type: 'file-error',
        fileId,
        error: 'File not found'
      });
    }
  }

  /**
   * Handle file data message
   * @param {Object} message - File data message
   * @param {string} userId - User ID who sent the message
   */
  handleFileData(message, userId) {
    const { fileId, chunkIndex, chunk, totalChunks } = message;

    if (!this.availableFiles.has(userId) || !this.availableFiles.get(userId).has(fileId)) {
      console.warn(`Received chunk for unknown file: ${fileId}`);
      return;
    }

    const fileInfo = this.availableFiles.get(userId).get(fileId);

    // Store the chunk
    if (!fileInfo.chunks) {
      fileInfo.chunks = [];
    }

    // Convert base64 chunk to array buffer
    const binaryChunk = this.base64ToArrayBuffer(chunk);
    fileInfo.chunks[chunkIndex] = binaryChunk;
    fileInfo.receivedSize += binaryChunk.byteLength;

    // Calculate progress
    const progress = (fileInfo.receivedSize / fileInfo.size) * 100;

    // Update file info
    this.availableFiles.get(userId).set(fileId, fileInfo);

    // Notify progress
    if (fileInfo.onProgress) {
      fileInfo.onProgress(progress);
    }

    // Check if all chunks received
    if (fileInfo.chunks.length === totalChunks &&
        fileInfo.chunks.filter(Boolean).length === totalChunks) {
      // All chunks received, reconstruct the file
      this.reconstructFile(fileId, userId);
    }
  }

  /**
   * Handle file complete message
   * @param {Object} message - File complete message
   * @param {string} userId - User ID who sent the message
   */
  handleFileComplete(message, userId) {
    const { fileId } = message;

    const fileTransfer = this.fileTransfers.get(fileId);
    if (fileTransfer && fileTransfer.onComplete) {
      fileTransfer.onComplete();
    }

    // Clean up
    this.fileTransfers.delete(fileId);
  }

  /**
   * Handle file error message
   * @param {Object} message - File error message
   * @param {string} userId - User ID who sent the message
   */
  handleFileError(message, userId) {
    const { fileId, error } = message;

    const fileTransfer = this.fileTransfers.get(fileId);
    if (fileTransfer && fileTransfer.onError) {
      fileTransfer.onError(error);
    }

    // Clean up
    this.fileTransfers.delete(fileId);
  }

  /**
   * Reconstruct a file from chunks
   * @param {string} fileId - File ID
   * @param {string} userId - User ID who sent the file
   */
  reconstructFile(fileId, userId) {
    const fileInfo = this.availableFiles.get(userId).get(fileId);

    // Combine chunks
    const fileBlob = new Blob(fileInfo.chunks, { type: fileInfo.type });

    // Notify completion
    if (fileInfo.onComplete) {
      fileInfo.onComplete(fileBlob);
    }

    // Send acknowledgment
    this.sendDataChannelMessage(userId, {
      type: 'file-complete',
      fileId
    });
  }

  /**
   * Send a message through the data channel
   * @param {string} userId - User ID to send message to
   * @param {Object} message - Message to send
   */
  sendDataChannelMessage(userId, message) {
    if (!this.dataChannels[userId] || this.dataChannels[userId].readyState !== 'open') {
      console.warn(`Data channel to ${userId} not open`);
      return false;
    }

    try {
      this.dataChannels[userId].send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending data channel message:', error);
      return false;
    }
  }

  /**
   * Send files to another user
   * @param {string} userId - User ID to send files to
   * @param {File[]} files - Files to send
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} - Result of the file transfer
   */
  async sendFiles(userId, files, onProgress) {
    if (!this.isLanConnection) {
      return { success: false, error: 'LAN connection required for file transfer' };
    }

    if (!this.dataChannels[userId]) {
      try {
        this.createDataChannel(userId);
      } catch (error) {
        return { success: false, error: 'Failed to create data channel' };
      }
    }

    if (this.dataChannels[userId].readyState !== 'open') {
      return { success: false, error: 'Data channel not open' };
    }

    try {
      // Process each file
      for (const file of files) {
        const fileId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Store file transfer info
        this.fileTransfers.set(fileId, {
          file,
          sentChunks: 0,
          totalChunks: 0,
          onProgress
        });

        // Send file info
        this.sendDataChannelMessage(userId, {
          type: 'file-info',
          fileId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });

        // Wait a bit to ensure file info is processed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Start sending chunks
        await this.sendFileChunks(fileId, userId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending files:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send file chunks
   * @param {string} fileId - File ID
   * @param {string} userId - User ID to send chunks to
   */
  async sendFileChunks(fileId, userId) {
    const fileTransfer = this.fileTransfers.get(fileId);
    if (!fileTransfer) {
      console.warn(`File transfer ${fileId} not found`);
      return;
    }

    const { file, onProgress } = fileTransfer;
    const chunkSize = 16 * 1024; // 16KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);

    fileTransfer.totalChunks = totalChunks;

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();

    // Send chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = arrayBuffer.slice(start, end);

      // Convert chunk to base64
      const base64Chunk = this.arrayBufferToBase64(chunk);

      // Send chunk
      this.sendDataChannelMessage(userId, {
        type: 'file-data',
        fileId,
        chunkIndex: i,
        totalChunks,
        chunk: base64Chunk
      });

      // Update progress
      fileTransfer.sentChunks++;
      const progress = (fileTransfer.sentChunks / totalChunks) * 100;
      if (onProgress) {
        onProgress(progress);
      }

      // Small delay to prevent flooding
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Send completion message
    this.sendDataChannelMessage(userId, {
      type: 'file-complete',
      fileId
    });
  }

  /**
   * Request a file from another user
   * @param {string} userId - User ID to request file from
   * @param {string} fileId - File ID to request
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} - Result of the file transfer
   */
  requestFile(userId, fileId, onProgress) {
    return new Promise((resolve, reject) => {
      if (!this.isLanConnection) {
        reject(new Error('LAN connection required for file transfer'));
        return;
      }

      if (!this.availableFiles.has(userId) || !this.availableFiles.get(userId).has(fileId)) {
        reject(new Error('File not available'));
        return;
      }

      const fileInfo = this.availableFiles.get(userId).get(fileId);

      // Set callbacks
      fileInfo.onProgress = onProgress;
      fileInfo.onComplete = (file) => {
        resolve({ success: true, file });
      };
      fileInfo.onError = (error) => {
        reject(new Error(error));
      };

      // Update file info
      this.availableFiles.get(userId).set(fileId, fileInfo);

      // Request the file
      this.sendDataChannelMessage(userId, {
        type: 'file-request',
        fileId
      });
    });
  }

  /**
   * Convert array buffer to base64
   * @param {ArrayBuffer} buffer - Array buffer to convert
   * @returns {string} - Base64 string
   */
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
  }

  /**
   * Convert base64 to array buffer
   * @param {string} base64 - Base64 string to convert
   * @returns {ArrayBuffer} - Array buffer
   */
  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  }
}

export default WebRTCService;
