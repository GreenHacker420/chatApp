# GutarGU Chat

A modern, real-time chat application built with React, Node.js, and Socket.IO. This application supports both one-on-one and group chat functionality with features like audio/video calls, offline messaging, LAN communication, and cross-platform support.

## Features

### Authentication
- User registration with email verification
- Secure login system
- Password reset functionality
- Google OAuth integration
- JWT-based authentication

### Chat Features
- Real-time messaging using Socket.IO
- One-on-one private chats
- Group chat functionality
- Message deletion options:
  - Delete for me
  - Delete for everyone (in group chats)
- Online/offline status indicators
- Message read receipts
- Offline message queue with automatic sending when back online
- LAN-based messaging without internet connection

### Call Features
- Audio and video calls using WebRTC
- Group calls with multiple participants
- Screen sharing
- LAN-optimized calls for better quality on local networks
- Call notifications and history

### File Sharing
- Image and video sharing in chats
- File sharing over LAN for faster transfers
- Preview of shared media

### Cross-Platform Support
- Web application
- Desktop application (Electron)
- Mobile application (Capacitor)
- Offline functionality on all platforms

### User Experience
- Modern, responsive UI with dark/light theme support
- Profile picture management with Cloudinary integration
- Real-time typing indicators
- Message search functionality
- Mobile-responsive design
- Desktop notifications
- Push notifications on mobile

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- DaisyUI
- Socket.IO Client
- Axios
- React Router
- Zustand (State Management)
- WebRTC for audio/video calls

### Backend
- Node.js
- Express.js
- MongoDB
- Socket.IO
- JWT Authentication
- Cloudinary
- Nodemailer

### Desktop Application
- Electron
- IPC for native system integration
- System tray integration
- Native notifications

### Mobile Application
- Capacitor
- Push notifications
- Camera and file system access
- Native device APIs

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Cloudinary account
- SMTP server for email functionality

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
BASE_URL=your_backend_url
CLIENT_URL=your_frontend_url
```

### Frontend (.env)
```
VITE_API_URL=your_backend_url
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chatApp.git
cd chatApp
```

2. Install all dependencies:
```bash
npm install
```
This will install dependencies for the backend, frontend, and Electron app.

3. Set up environment variables in both backend and frontend directories.

4. Start the development servers:

**Web Application:**
```bash
# Start both backend and frontend
npm run dev
```

**Desktop Application:**
```bash
# Start Electron app
npm run electron:dev
```

**Build Desktop Application:**
```bash
# Build Electron app for distribution
npm run electron:build
```

**Mobile Application:**
```bash
# Add Android platform
npx cap add android
npx cap sync

# Add iOS platform
npx cap add ios
npx cap sync

# Open in native IDEs
npx cap open android
npx cap open ios
```

## Project Structure

```
.
├── LICENSE
├── README.md
├── backend
│   ├── package-lock.json
│   ├── package.json
│   └── src
│       ├── controllers
│       │   ├── auth.controller.js
│       │   └── message.controller.js
│       ├── index.js
│       ├── lib
│       │   ├── cloudinary.js
│       │   ├── db.js
│       │   ├── passport.js
│       │   ├── socket.js
│       │   └── utils.js
│       ├── middleware
│       │   └── auth.middleware.js
│       ├── models
│       │   ├── message.model.js
│       │   ├── token.model.js
│       │   └── user.model.js
│       ├── routes
│       │   ├── auth.route.js
│       │   └── message.route.js
│       └── utils
│           └── sendEmail.js
├── frontend
│   ├── README.md
│   ├── capacitor.config.json
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── public
│   │   ├── avatar.png
│   │   ├── logo.png
│   │   └── logobg.jpeg
│   ├── src
│   │   ├── App.jsx
│   │   ├── components
│   │   │   ├── AuthImagePattern.jsx
│   │   │   ├── CallInterface.jsx
│   │   │   ├── ChatContainer.jsx
│   │   │   ├── ChatHeader.jsx
│   │   │   ├── GroupCall.jsx
│   │   │   ├── LanUsers.jsx
│   │   │   ├── MessageInput.jsx
│   │   │   ├── MessageStatus.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── NoChatSelected.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── skeletons
│   │   │       ├── MessageSkeleton.jsx
│   │   │       └── SidebarSkeleton.jsx
│   │   ├── constants
│   │   │   └── index.js
│   │   ├── index.css
│   │   ├── lib
│   │   │   ├── axios.js
│   │   │   └── utils.js
│   │   ├── main.jsx
│   │   ├── pages
│   │   │   ├── GoogleAuthSuccess.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── SignUpPage.jsx
│   │   ├── services
│   │   │   ├── electron.service.js
│   │   │   ├── offline-queue.service.js
│   │   │   ├── push-notification.service.js
│   │   │   └── webrtc.service.js
│   │   └── store
│   │       ├── useAuthStore.js
│   │       ├── useChatStore.js
│   │       └── useThemeStore.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── electron
│   ├── README.md
│   ├── icons
│   │   ├── README.md
│   │   ├── icon.svg
│   │   ├── png
│   │   └── tray-icon.svg
│   ├── main.js
│   ├── package.json
│   └── preload.js
├── capacitor.config.json
├── package-lock.json
└── package.json
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
