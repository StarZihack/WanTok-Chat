// Shared socket connection for all pages
// This keeps the user online across different pages

// Check if user is logged in
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Function to refresh currentUser from localStorage
function refreshCurrentUser() {
  currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
  return currentUser;
}

// Initialize socket connection
// In production (Vercel), this will connect to your Render backend via CONFIG
// In development (localhost), it connects to the same host automatically
let socket;

if (typeof CONFIG !== 'undefined' && CONFIG.SOCKET_URL) {
  // Use CONFIG if available (production)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    // Development: connect to same host
    socket = io();
  } else {
    // Production: connect to Render backend
    socket = io(CONFIG.SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
  }
} else {
  // Fallback: connect to same host
  socket = io();
}

// Function to authenticate user on socket
function authenticateSocket() {
  if (currentUser && socket.connected) {
    socket.emit('authenticate', currentUser);
    console.log('Socket authenticated:', currentUser.email);
  }
}

// Authenticate on socket connection
socket.on('connect', () => {
  console.log('Socket connected');
  // Ensure currentUser is loaded
  refreshCurrentUser();
  authenticateSocket();
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

// Authenticate immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    refreshCurrentUser();
    authenticateSocket();
  });
} else {
  // DOM already loaded
  refreshCurrentUser();
  authenticateSocket();
}

// Online Users Display - Update count on all pages
socket.on('onlineUsersUpdate', (users) => {
  updateOnlineCount(users);
});

function updateOnlineCount(users) {
  const onlineCountEl = document.getElementById('onlineCount');
  if (!onlineCountEl) return;

  // Filter out current user from the list and update count
  const otherUsers = users.filter(u => u.id !== currentUser?.id);
  onlineCountEl.textContent = otherUsers.length;
}
