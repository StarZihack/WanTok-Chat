// Configuration for different environments
const CONFIG = {
  // Backend API URL - Change this to your Render backend URL in production
  BACKEND_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://your-render-backend.onrender.com', // UPDATE THIS after deploying to Render

  // Socket.IO connection
  SOCKET_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://your-render-backend.onrender.com' // UPDATE THIS after deploying to Render
};
