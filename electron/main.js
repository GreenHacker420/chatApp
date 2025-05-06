const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const url = require('url');

// Keep a global reference to prevent garbage collection
let mainWindow;
let tray;

// LAN discovery service
let lanUsers = [];
let offlineMessageQueue = [];
let lanConnections = new Map(); // Store active LAN connections

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icons', 'icon.png'),
    show: false, // Don't show until ready
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:5173'
    : url.format({
        pathname: path.join(__dirname, '../frontend/dist/index.html'),
        protocol: 'file:',
        slashes: true
      });

  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Create tray icon
  createTray();

  // Handle window close - minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });
}

function createTray() {
  // Create tray icon
  const iconPath = path.join(__dirname, 'icons', 'tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open GutarGU',
      click: () => mainWindow.show()
    },
    {
      label: 'Check LAN Users',
      click: () => {
        scanLanForUsers();
        mainWindow.webContents.send('show-lan-users', lanUsers);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('GutarGU Chat');
  tray.setContextMenu(contextMenu);

  // Show window on tray icon click
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// Scan LAN for other users
function scanLanForUsers() {
  // This is a placeholder for actual LAN scanning logic
  // In a real implementation, this would use network discovery protocols
  console.log('Scanning LAN for users...');

  // For demo purposes, we'll just simulate finding users
  // In a real app, this would use mDNS, SSDP, or other discovery protocols
  lanUsers = [
    { id: 'lan-user-1', name: 'LAN User 1', ip: '192.168.1.101' },
    { id: 'lan-user-2', name: 'LAN User 2', ip: '192.168.1.102' },
  ];

  return lanUsers;
}

// Show notification
function showNotification(title, body) {
  new Notification({
    title,
    body,
    icon: path.join(__dirname, 'icons', 'icon.png')
  }).show();
}

// Send a message over LAN
async function sendLanMessage(messageData) {
  const { message, receiverId, senderId } = messageData;

  // Find the receiver in lanUsers
  const receiver = lanUsers.find(user => user.id === receiverId);
  if (!receiver) {
    console.error(`Receiver ${receiverId} not found in LAN users`);
    return { success: false, error: 'Receiver not found on LAN' };
  }

  try {
    // In a real implementation, this would use UDP or TCP to send the message directly
    // For this example, we'll just simulate it
    console.log(`Sending LAN message to ${receiver.name} at ${receiver.ip}`);

    // Store in offline queue if needed
    offlineMessageQueue.push({
      ...messageData,
      timestamp: Date.now(),
      status: 'pending'
    });

    // Simulate successful delivery
    setTimeout(() => {
      // Update message status
      const messageIndex = offlineMessageQueue.findIndex(
        m => m.message.content === message.content &&
             m.receiverId === receiverId &&
             m.senderId === senderId
      );

      if (messageIndex !== -1) {
        offlineMessageQueue[messageIndex].status = 'delivered';
      }

      // Notify the renderer
      if (mainWindow) {
        mainWindow.webContents.send('lan-message-status', {
          messageId: message._id || Date.now().toString(),
          status: 'delivered',
          receiverId
        });
      }
    }, 500);

    return { success: true };
  } catch (error) {
    console.error('Error sending LAN message:', error);
    return { success: false, error: error.message };
  }
}

// Process offline message queue
async function processOfflineQueue() {
  const pendingMessages = offlineMessageQueue.filter(m => m.status === 'pending');
  console.log(`Processing ${pendingMessages.length} pending messages`);

  const results = [];

  for (const messageData of pendingMessages) {
    try {
      const result = await sendLanMessage(messageData);
      results.push({
        messageId: messageData.message._id || Date.now().toString(),
        success: result.success,
        error: result.error
      });
    } catch (error) {
      results.push({
        messageId: messageData.message._id || Date.now().toString(),
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

// IPC handlers
function setupIPC() {
  // Handle notification requests from renderer
  ipcMain.on('show-notification', (event, { title, body }) => {
    showNotification(title, body);
  });

  // Handle LAN scan requests
  ipcMain.handle('scan-lan', async () => {
    return scanLanForUsers();
  });

  // Handle minimize to tray
  ipcMain.on('minimize-to-tray', () => {
    mainWindow.hide();
  });

  // Handle LAN message sending
  ipcMain.handle('send-lan-message', async (event, messageData) => {
    return await sendLanMessage(messageData);
  });

  // Handle offline queue processing
  ipcMain.handle('process-offline-queue', async () => {
    return await processOfflineQueue();
  });
}

// App lifecycle events
app.on('ready', () => {
  createWindow();
  setupIPC();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle quit from dock on macOS
app.on('before-quit', () => {
  app.isQuitting = true;
});
