# chatApp



structure

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
