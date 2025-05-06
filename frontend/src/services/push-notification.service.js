/**
 * Push Notification Service
 * Handles push notifications for mobile apps
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

class PushNotificationService {
  constructor() {
    this.isCapacitor = Capacitor.isPluginAvailable('PushNotifications');
    this.hasPermission = false;
    this.initialized = false;
  }

  /**
   * Initialize push notifications
   * @returns {Promise<boolean>} - True if initialized successfully
   */
  async initialize() {
    if (!this.isCapacitor || this.initialized) return false;

    try {
      // Request permission
      const permissionStatus = await PushNotifications.requestPermissions();
      this.hasPermission = permissionStatus.receive === 'granted';

      if (!this.hasPermission) {
        console.warn('Push notification permission not granted');
        return false;
      }

      // Register with FCM/APNS
      await PushNotifications.register();

      // Setup listeners
      this.setupListeners();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  /**
   * Setup push notification listeners
   */
  setupListeners() {
    // On registration success
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success:', token.value);
      this.updateDeviceToken(token.value);
    });

    // On registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // On push notification received
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      this.handleNotification(notification);
    });

    // On push notification action clicked
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push notification action performed:', action);
      this.handleNotificationAction(action);
    });
  }

  /**
   * Update device token on server
   * @param {string} token - Device token
   */
  async updateDeviceToken(token) {
    const { user, authAxios } = useAuthStore.getState();
    if (!user || !token) return;

    try {
      await authAxios.post('/users/device-token', { token });
      console.log('Device token updated on server');
    } catch (error) {
      console.error('Error updating device token:', error);
    }
  }

  /**
   * Handle incoming notification
   * @param {Object} notification - Notification data
   */
  handleNotification(notification) {
    const { title, body, data } = notification;

    // Check if app is in foreground
    if (document.visibilityState === 'visible') {
      // Show local notification
      this.showLocalNotification(title, body, data);
    }

    // Process notification data
    if (data && data.type) {
      switch (data.type) {
        case 'message':
          this.handleMessageNotification(data);
          break;
        case 'call':
          this.handleCallNotification(data);
          break;
        default:
          console.log('Unknown notification type:', data.type);
      }
    }
  }

  /**
   * Handle notification action
   * @param {Object} action - Action data
   */
  handleNotificationAction(action) {
    const { notification } = action;
    const data = notification.data;

    if (data && data.type) {
      switch (data.type) {
        case 'message':
          this.openChat(data.senderId);
          break;
        case 'call':
          this.handleCallAction(data);
          break;
        default:
          console.log('Unknown notification action type:', data.type);
      }
    }
  }

  /**
   * Handle message notification
   * @param {Object} data - Message data
   */
  handleMessageNotification(data) {
    const { senderId, message } = data;
    const { addNotification } = useChatStore.getState();

    // Add to notifications
    if (senderId && message) {
      addNotification({
        sender: {
          _id: senderId,
          fullName: data.senderName || 'User',
          profilePic: data.senderProfilePic || '/avatar.png'
        },
        content: message,
        createdAt: new Date().toISOString()
      }, senderId);
    }
  }

  /**
   * Handle call notification
   * @param {Object} data - Call data
   */
  handleCallNotification(data) {
    const { handleIncomingCall } = useChatStore.getState();

    // Handle incoming call
    if (data.callerId && data.callerName) {
      handleIncomingCall({
        userId: data.callerId,
        userName: data.callerName,
        isVideo: data.isVideo === 'true',
        profilePic: data.callerProfilePic || '/avatar.png'
      });
    }
  }

  /**
   * Open chat with user
   * @param {string} userId - User ID
   */
  openChat(userId) {
    const { users, setSelectedUser } = useChatStore.getState();
    const user = users.find(u => u._id === userId);

    if (user) {
      setSelectedUser(user);
    }
  }

  /**
   * Handle call action
   * @param {Object} data - Call data
   */
  handleCallAction(data) {
    const { handleIncomingCall } = useChatStore.getState();

    if (data.action === 'accept' && data.callerId) {
      // Auto-accept call
      handleIncomingCall({
        userId: data.callerId,
        userName: data.callerName || 'Caller',
        isVideo: data.isVideo === 'true',
        profilePic: data.callerProfilePic || '/avatar.png',
        autoAccept: true
      });
    }
  }

  /**
   * Show local notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Notification data
   */
  async showLocalNotification(title, body, data = {}) {
    if (!this.isCapacitor) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            extra: data,
            sound: 'notification.wav',
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#4F46E5'
          }
        ]
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }
}

// Create a singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
