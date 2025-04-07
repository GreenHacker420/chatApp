# ChatApp

A modern, real-time chat application built with React, Node.js, and Socket.IO. This application supports both one-on-one and group chat functionality with features like message deletion, password reset, and email verification.

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

### User Experience
- Modern, responsive UI with dark/light theme support
- Profile picture management with Cloudinary integration
- Real-time typing indicators
- Message search functionality
- Mobile-responsive design

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- DaisyUI
- Socket.IO Client
- Axios
- React Router
- Zustand (State Management)

### Backend
- Node.js
- Express.js
- MongoDB
- Socket.IO
- JWT Authentication
- Cloudinary
- Nodemailer

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

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables in both backend and frontend directories.

5. Start the backend server:
```bash
cd backend
npm start
```

6. Start the frontend development server:
```bash
cd frontend
npm run dev
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
│   │   │   ├── ChatContainer.jsx
│   │   │   ├── ChatHeader.jsx
│   │   │   ├── MessageInput.jsx
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
│   │   └── store
│   │       ├── useAuthStore.js
│   │       ├── useChatStore.js
│   │       └── useThemeStore.js
│   ├── tailwind.config.js
│   └── vite.config.js
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
