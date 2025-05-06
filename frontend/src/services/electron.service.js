/**
 * Electron Service
 * Provides integration with Electron desktop app features
 */

class ElectronService {
  constructor() {
    this.isElectron = this.checkIsElectron();
    this.electron = this.isElectron ? window.electron : null;
  }

  /**
   * Check if the app is running in Electron
   * @returns {boolean} - True if running in Electron
   */
  checkIsElectron() {
    return window && window.electron !== undefined;
  }

  /**
   * Show a desktop notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   */
  showNotification(title, body) {
    if (!this.isElectron) return;
    
    this.electron.showNotification({ title, body });
  }

  /**
   * Scan LAN for other users
   * @returns {Promise<Array>} - Array of LAN users
   */
  async scanLan() {
    if (!this.isElectron) return [];
    
    return await this.electron.scanLan();
  }

  /**
   * Minimize the app to system tray
   */
  minimizeToTray() {
    if (!this.isElectron) return;
    
    this.electron.minimizeToTray();
  }

  /**
   * Register a callback for LAN users updates
   * @param {Function} callback - Callback function
   * @returns {Function} - Cleanup function
   */
  onLanUsersUpdate(callback) {
    if (!this.isElectron) return () => {};
    
    return this.electron.onLanUsersUpdate(callback);
  }
}

// Create a singleton instance
const electronService = new ElectronService();

export default electronService;
