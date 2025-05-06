const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    // Notifications
    showNotification: (options) => {
      ipcRenderer.send('show-notification', options);
    },

    // LAN scanning
    scanLan: async () => {
      return await ipcRenderer.invoke('scan-lan');
    },

    // Window management
    minimizeToTray: () => {
      ipcRenderer.send('minimize-to-tray');
    },

    // LAN messaging
    sendLanMessage: (messageData) => {
      return ipcRenderer.invoke('send-lan-message', messageData);
    },

    // Offline queue
    processOfflineQueue: () => {
      return ipcRenderer.invoke('process-offline-queue');
    },

    // Listen for events from main process
    onLanUsersUpdate: (callback) => {
      ipcRenderer.on('show-lan-users', (_, users) => callback(users));
      return () => {
        ipcRenderer.removeAllListeners('show-lan-users');
      };
    },

    // Listen for LAN messages
    onLanMessage: (callback) => {
      ipcRenderer.on('lan-message', (_, message) => callback(message));
      return () => {
        ipcRenderer.removeAllListeners('lan-message');
      };
    },

    // Listen for connection status changes
    onConnectionStatusChange: (callback) => {
      ipcRenderer.on('connection-status-change', (_, status) => callback(status));
      return () => {
        ipcRenderer.removeAllListeners('connection-status-change');
      };
    }
  }
);
