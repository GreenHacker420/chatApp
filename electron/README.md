# GutarGU Chat Desktop App

This is the Electron-based desktop application for GutarGU Chat, providing enhanced features like:

- LAN-based communication for better call quality
- Offline messaging capabilities
- File sharing over LAN
- System tray integration
- Desktop notifications
- Automatic LAN user discovery

## Development

To start the development environment:

```bash
# From the root directory
npm run electron:dev
```

This will start both the frontend development server and the Electron app in development mode.

## Building

To build the desktop application:

```bash
# From the root directory
npm run electron:build
```

This will create platform-specific builds in the `electron/dist` directory.

## Architecture

The desktop app consists of:

1. **Main Process** (`main.js`): Handles native desktop functionality like system tray, notifications, and window management.
2. **Preload Script** (`preload.js`): Provides a secure bridge between the renderer process and the main process.
3. **Renderer Process**: The React web application running in an Electron window.

## LAN Features

The desktop app includes special features for local network communication:

- **LAN User Discovery**: Automatically finds other GutarGU users on the same network
- **Direct Connection**: Establishes direct WebRTC connections between LAN users for better quality
- **File Sharing**: Allows sharing files directly between users on the same network
- **Offline Messaging**: Enables messaging even when internet connection is unavailable

## System Requirements

- Windows 10/11, macOS 10.13+, or Linux
- 4GB RAM minimum
- 100MB disk space
