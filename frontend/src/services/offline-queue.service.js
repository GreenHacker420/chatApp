/**
 * Offline Message Queue Service
 * Handles storing and syncing messages when offline
 */

class OfflineQueueService {
  constructor() {
    this.storageKey = 'offline_message_queue';
    this.queue = this.loadQueue();
    this.isOnline = navigator.onLine;
    this.setupListeners();
  }

  /**
   * Set up online/offline event listeners
   */
  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Load the queue from localStorage
   * @returns {Array} - The message queue
   */
  loadQueue() {
    try {
      const queueData = localStorage.getItem(this.storageKey);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Error loading offline queue:', error);
      return [];
    }
  }

  /**
   * Save the queue to localStorage
   */
  saveQueue() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  /**
   * Add a message to the queue
   * @param {Object} message - The message to queue
   * @param {Function} sendFunction - Function to call when online
   */
  addToQueue(message, sendFunction) {
    this.queue.push({
      message,
      sendFunction: sendFunction.toString(), // Store function as string
      timestamp: Date.now(),
      attempts: 0
    });
    this.saveQueue();

    // If online, try to process immediately
    if (this.isOnline) {
      this.processQueue();
    }

    return {
      id: Date.now().toString(),
      ...message,
      status: 'queued',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Process the queue when online
   */
  async processQueue() {
    if (!this.isOnline || this.queue.length === 0) return;

    // Process each item in the queue
    const processPromises = this.queue.map(async (item, index) => {
      try {
        // Convert string function back to executable function
        const sendFn = new Function('return ' + item.sendFunction)();
        
        // Call the send function with the message
        await sendFn(item.message);
        
        // Remove from queue on success
        this.queue.splice(index, 1);
        return true;
      } catch (error) {
        console.error('Error processing queued message:', error);
        
        // Increment attempt count
        item.attempts += 1;
        
        // Remove from queue if too many attempts
        if (item.attempts > 5) {
          this.queue.splice(index, 1);
        }
        return false;
      }
    });

    await Promise.all(processPromises);
    this.saveQueue();
  }

  /**
   * Get all queued messages
   * @returns {Array} - The message queue
   */
  getQueuedMessages() {
    return this.queue.map(item => ({
      ...item.message,
      timestamp: item.timestamp,
      attempts: item.attempts
    }));
  }

  /**
   * Clear the queue
   */
  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Check if there are messages in the queue
   * @returns {boolean} - True if queue has messages
   */
  hasQueuedMessages() {
    return this.queue.length > 0;
  }

  /**
   * Get the number of queued messages
   * @returns {number} - Number of queued messages
   */
  getQueueLength() {
    return this.queue.length;
  }
}

// Create a singleton instance
const offlineQueueService = new OfflineQueueService();

export default offlineQueueService;
