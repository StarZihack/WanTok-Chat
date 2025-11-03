# Stranger Chat - Video Chat Application

A real-time video chat application built with Node.js, Express, Socket.io, and WebRTC.

## Project Structure

```
WanTok/
├── server.js                       # Main server file with Express & Socket.io
├── package.json                    # Project dependencies
├── public/                         # Static files served to clients
│   ├── index.html                  # Authentication page (entry point - at root)
│   ├── pages/                      # Application pages
│   │   ├── main.html               # Main video chat app (protected)
│   │   └── profile.html            # User profile page (protected)
│   └── assets/                     # Static assets
│       ├── css/
│       │   └── styles.css          # Application styles
│       └── js/
│           ├── auth.js             # Authentication logic
│           ├── script.js           # Main application logic
│           └── profile.js          # Profile page logic
└── README.md                       # This file
```

## Routes

- `GET /` → Authentication page (index.html) - Entry point (auto-served)
- `GET /main` → Main application (pages/main.html) - Requires authentication
- `GET /profile` → User profile page (pages/profile.html) - Requires authentication
- `POST /api/login` → User login
- `POST /api/register` → User registration
- `GET /api/user/:id` → Get user profile
- `PUT /api/user/:id` → Update user profile

## Features

- **Real-time Video Chat**: WebRTC-based peer-to-peer video communication
- **User Authentication**: Login and registration system
- **User Profiles**: Customizable user profiles with personal information
- **Token System**: Earn tokens through ads and daily bonuses
- **Random Matching**: Connect with random strangers
- **Text Chat**: Built-in messaging during video calls
- **Responsive Design**: Works on desktop and mobile devices

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   node server.js
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Test Credentials

For testing purposes, you can use these pre-configured accounts:

- **User 1:** john@example.com / password123
- **User 2:** jane@example.com / password123
- **User 3:** alex@example.com / password123

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.io** - Real-time bidirectional communication
- **HTTP/HTTPS** - Server protocols

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with modern gradients and animations
- **Vanilla JavaScript** - Client-side logic
- **WebRTC** - Peer-to-peer video/audio communication
- **Font Awesome** - Icons
- **Google Fonts** - Typography (Roboto)

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration

### User Management
- `GET /api/user/:id` - Get user profile
- `PUT /api/user/:id` - Update user profile

## Socket.io Events

### Client → Server
- `findPartner` - Request to find a chat partner
- `offer` - WebRTC offer signal
- `answer` - WebRTC answer signal
- `ice-candidate` - ICE candidate for connection
- `message` - Text message to partner
- `endChat` - End current chat session

### Server → Client
- `waiting` - Waiting for a partner
- `paired` - Successfully paired with a partner
- `offer` - Receive WebRTC offer
- `answer` - Receive WebRTC answer
- `ice-candidate` - Receive ICE candidate
- `message` - Receive text message
- `partnerDisconnected` - Partner left the chat

## File Organization Best Practices

This project follows a clean separation of concerns:

- **Public HTML files** (`index.html`, `auth.html`) are at the root of `/public` for direct access
- **Static assets** (CSS, JS) are organized in `/public/assets/` by type
- **Server code** (`server.js`) is in the project root
- **Backend logic** (authentication, user management) is in `server.js` with the socket handling

## Production Deployment

For production deployment:

1. Set up environment variables:
   ```bash
   export PORT=3000
   export NODE_ENV=production
   ```

2. Use a process manager like PM2:
   ```bash
   pm2 start server.js --name stranger-chat
   ```

3. Set up HTTPS for secure WebRTC connections
4. Configure CORS properly for your domain
5. Replace dummy user database with a real database (MongoDB, PostgreSQL, etc.)
6. Implement proper session management and JWT tokens
7. Add rate limiting and security headers

## Security Considerations

⚠️ **This is a development version** - Before deploying to production:

- Replace in-memory user storage with a real database
- Hash passwords using bcrypt or similar
- Implement proper session management
- Add CSRF protection
- Set up HTTPS/TLS
- Implement rate limiting
- Add input validation and sanitization
- Configure proper CORS policies
- Use environment variables for sensitive data

## License

MIT License - Feel free to use this project for learning and development purposes.
