// server.js - WanTok Video Chat Server with Supabase Integration

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs'); // For potential HTTPS in dev, but optional
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const db = require('./database'); // Supabase database helper functions

const app = express();

// Session configuration (required for passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'wantok-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Cross-site for production
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.getUserById(id);
    if (user) {
      const { password, ...userData } = user;
      done(null, userData);
    } else {
      done(new Error('User not found'), null);
    }
  } catch (error) {
    console.error('[Passport] Error deserializing user:', error);
    done(error, null);
  }
});

// Configure Google OAuth Strategy
// IMPORTANT: Replace with your actual Google OAuth credentials
// Get these from: https://console.cloud.google.com/apis/credentials
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists by Google ID
      let user = await db.getUserByGoogleId(profile.id);

      if (user) {
        // Existing Google user
        console.log('[Google Auth] Existing user logged in:', user.email);
        const { password, ...userData } = user;
        return done(null, userData);
      }

      // Check if email already exists (linking accounts)
      user = await db.getUserByEmail(profile.emails[0].value);

      if (user) {
        // Link Google account to existing user
        const updatedUser = await db.updateUser(user.id, { google_id: profile.id });
        console.log('[Google Auth] Linked Google account to existing user:', user.email);
        const { password, ...userData } = updatedUser;
        return done(null, userData);
      }

      // Create new user from Google profile
      const newUser = await db.createUser({
        google_id: profile.id,
        email: profile.emails[0].value,
        full_name: profile.displayName,
        username: null, // Will be set in age verification
        gender: null,
        age: null,
        dob: null,
        country: null,
        tokens: 20, // Starting bonus
        profile_complete: false,
        password: null // No password for Google users
      });

      console.log('[Google Auth] New user created:', newUser.email);
      const { password, ...userData } = newUser;
      return done(null, userData);

    } catch (error) {
      console.error('[Google Auth] Error:', error);
      return done(error, null);
    }
  }
));

const server = http.createServer(app);

// Production CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware to parse JSON
app.use(express.json());

let waitingUsers = []; // Queue for waiting users
let onlineUsers = []; // Track all online users

// Note: User data and moderation data are stored in Supabase database

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Store user info when authenticated user connects
  socket.on('authenticate', (userData) => {
    socket.userData = userData;
    console.log(`User ${userData.fullName} authenticated on socket ${socket.id}`);

    // Add user to online users list (track by user ID for unique users)
    const existingUserIndex = onlineUsers.findIndex(u => u.id === userData.id);
    if (existingUserIndex === -1) {
      onlineUsers.push({
        id: userData.id,
        socketId: socket.id,
        fullName: userData.fullName,
        username: userData.username,
        gender: userData.gender,
        country: userData.country,
        status: 'online' // online, chatting, waiting
      });
    } else {
      // Update socket ID if user reconnects
      onlineUsers[existingUserIndex].socketId = socket.id;
      onlineUsers[existingUserIndex].status = 'online';
    }

    // Broadcast updated online users list to all clients
    io.emit('onlineUsersUpdate', onlineUsers);
  });

  socket.on('findPartner', (filters = {}) => {
    // Only allow authenticated users to match
    if (!socket.userData) {
      socket.emit('error', { message: 'Please login to use chat' });
      return;
    }

    // Store filters with socket
    socket.filters = {
      genderFilter: filters.genderFilter || 'any',
      countryFilter: filters.countryFilter || 'any'
    };

    // Function to check if two users match based on filters
    const isMatch = (user1, user2) => {
      // Check if user1's filters match user2's data
      const user1Matches =
        (user1.filters.genderFilter === 'any' || user1.filters.genderFilter === user2.userData.gender) &&
        (user1.filters.countryFilter === 'any' || user1.filters.countryFilter === user2.userData.country);

      // Check if user2's filters match user1's data
      const user2Matches =
        (user2.filters.genderFilter === 'any' || user2.filters.genderFilter === user1.userData.gender) &&
        (user2.filters.countryFilter === 'any' || user2.filters.countryFilter === user1.userData.country);

      return user1Matches && user2Matches;
    };

    // Try to find a matching partner in waiting queue
    let partnerIndex = -1;
    for (let i = 0; i < waitingUsers.length; i++) {
      if (isMatch(socket, waitingUsers[i])) {
        partnerIndex = i;
        break;
      }
    }

    if (partnerIndex !== -1) {
      // Found a match!
      const partner = waitingUsers.splice(partnerIndex, 1)[0];
      socket.partner = partner;
      partner.partner = socket;

      // Send partner info to both users
      socket.emit('paired', {
        initiator: true,
        partnerInfo: {
          fullName: partner.userData.fullName,
          username: partner.userData.username,
          gender: partner.userData.gender,
          country: partner.userData.country,
          age: partner.userData.age
        }
      });

      partner.emit('paired', {
        initiator: false,
        partnerInfo: {
          fullName: socket.userData.fullName,
          username: socket.userData.username,
          gender: socket.userData.gender,
          country: socket.userData.country,
          age: socket.userData.age
        }
      });

      console.log(`Paired ${socket.userData.fullName} with ${partner.userData.fullName} (filtered match)`);

      // Update both users' status to chatting
      const socketUserIndex = onlineUsers.findIndex(u => u.id === socket.userData.id);
      const partnerUserIndex = onlineUsers.findIndex(u => u.id === partner.userData.id);
      if (socketUserIndex !== -1) onlineUsers[socketUserIndex].status = 'chatting';
      if (partnerUserIndex !== -1) onlineUsers[partnerUserIndex].status = 'chatting';
      io.emit('onlineUsersUpdate', onlineUsers);
    } else {
      // No match found, add to waiting queue
      waitingUsers.push(socket);
      socket.emit('waiting');
      console.log(`${socket.userData.fullName} waiting with filters: Gender=${socket.filters.genderFilter}, Country=${socket.filters.countryFilter}`);

      // Update user status to waiting
      const userIndex = onlineUsers.findIndex(u => u.id === socket.userData.id);
      if (userIndex !== -1) {
        onlineUsers[userIndex].status = 'waiting';
        io.emit('onlineUsersUpdate', onlineUsers);
      }
    }
  });

  // WebRTC signaling
  socket.on('offer', (offer) => {
    if (socket.partner) socket.partner.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    if (socket.partner) socket.partner.emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate) => {
    if (socket.partner) socket.partner.emit('ice-candidate', candidate);
  });

  // Text messages
  socket.on('message', (msg) => {
    if (socket.partner) socket.partner.emit('message', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.partner) {
      socket.partner.emit('partnerDisconnected');
      socket.partner.partner = null;

      // Update partner's status back to online
      if (socket.partner && socket.partner.userData) {
        const partnerIndex = onlineUsers.findIndex(u => u.id === socket.partner.userData.id);
        if (partnerIndex !== -1) {
          onlineUsers[partnerIndex].status = 'online';
        }
      }
    }
    waitingUsers = waitingUsers.filter(user => user.id !== socket.id);

    // Remove user from online users list
    if (socket.userData) {
      onlineUsers = onlineUsers.filter(u => u.id !== socket.userData.id);
      io.emit('onlineUsersUpdate', onlineUsers);
    }
  });

  socket.on('endChat', () => {
    if (socket.partner) {
      socket.partner.emit('partnerDisconnected');

      // Update partner's status back to online
      if (socket.partner && socket.partner.userData) {
        const partnerIndex = onlineUsers.findIndex(u => u.id === socket.partner.userData.id);
        if (partnerIndex !== -1) {
          onlineUsers[partnerIndex].status = 'online';
        }
      }

      socket.partner.partner = null;
      socket.partner = null;
    }

    // Update current user's status back to online
    if (socket.userData) {
      const userIndex = onlineUsers.findIndex(u => u.id === socket.userData.id);
      if (userIndex !== -1) {
        onlineUsers[userIndex].status = 'online';
      }
    }

    io.emit('onlineUsersUpdate', onlineUsers);
  });

  // Request online users statistics
  socket.on('requestOnlineUsers', () => {
    socket.emit('onlineUsersUpdate', onlineUsers);
  });
});

// Google OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Store user in localStorage via client-side script
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authenticating...</title>
      </head>
      <body>
        <script>
          const user = ${JSON.stringify(req.user)};
          localStorage.setItem('currentUser', JSON.stringify(user));

          // Check if profile needs to be completed
          if (!user.profileComplete || !user.age || !user.gender || !user.country) {
            window.location.href = '/verify-age';
          } else {
            window.location.href = '/main';
          }
        </script>
      </body>
      </html>
    `);
  }
);

// Logout route
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    req.session.destroy();
    res.redirect('/');
  });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

// Authentication API endpoints
// Login endpoint
// Login endpoint using Supabase Auth
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate inputs
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Use Supabase Auth to sign in
    const authResult = await db.signInUser(username, password);

    if (authResult && authResult.profile) {
      res.json({ success: true, user: authResult.profile, session: authResult.session });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('[Login] Error:', error);

    // Handle specific Supabase Auth errors
    if (error.message && error.message.includes('Invalid login credentials')) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// Register endpoint using Supabase Auth
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, password, country } = req.body;

    // Validate required fields
    if (!fullName || !email || !password || !country) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Use Supabase Auth to register user
    const newUser = await db.registerUser(email, password, fullName, country);

    console.log('[Register] User created:', newUser.id);
    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error('[Register] Error:', error);

    // Handle specific Supabase errors
    if (error.message && error.message.includes('already registered')) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Get user profile endpoint
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);

    if (user) {
      const { password, ...userData } = user;
      res.json({ success: true, user: userData });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('[Get User] Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user profile endpoint
app.put('/api/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate username if being updated
    if (req.body.username) {
      // Validate username format (no spaces, alphanumeric + underscore only)
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(req.body.username)) {
        return res.status(400).json({ success: false, message: 'Username can only contain letters, numbers, and underscores (no spaces)' });
      }

      // Validate username length
      if (req.body.username.length < 3 || req.body.username.length > 20) {
        return res.status(400).json({ success: false, message: 'Username must be 3-20 characters long' });
      }

      // Check username uniqueness
      const existingUser = await db.getUserByUsername(req.body.username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ success: false, message: 'Username already taken' });
      }
    }

    // Update user data
    const updatedUser = await db.updateUser(userId, req.body);

    const { password, ...userData } = updatedUser;
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('[Update User] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// Token Management Endpoints

// Add tokens to user (for rewards, purchases, etc.)
app.post('/api/user/:id/tokens/add', async (req, res) => {
  try {
    const userId = req.params.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid token amount' });
    }

    const updatedUser = await db.addTokensToUser(userId, amount);
    const { password, ...userData } = updatedUser;

    console.log(`[Tokens] Added ${amount} tokens to user ${userId}. New balance: ${updatedUser.tokens}`);
    res.json({ success: true, user: userData, tokensAdded: amount });
  } catch (error) {
    console.error('[Add Tokens] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to add tokens' });
  }
});

// Deduct tokens from user (for using filters, etc.)
app.post('/api/user/:id/tokens/deduct', async (req, res) => {
  try {
    const userId = req.params.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid token amount' });
    }

    const updatedUser = await db.deductTokensFromUser(userId, amount);
    const { password, ...userData } = updatedUser;

    console.log(`[Tokens] Deducted ${amount} tokens from user ${userId}. New balance: ${updatedUser.tokens}`);
    res.json({ success: true, user: userData, tokensDeducted: amount });
  } catch (error) {
    console.error('[Deduct Tokens] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to deduct tokens' });
  }
});

// Update user tokens (set exact amount)
app.put('/api/user/:id/tokens', async (req, res) => {
  try {
    const userId = req.params.id;
    const { tokens } = req.body;

    if (tokens === undefined || tokens < 0) {
      return res.status(400).json({ success: false, message: 'Invalid token amount' });
    }

    const updatedUser = await db.updateUserTokens(userId, tokens);
    const { password, ...userData } = updatedUser;

    console.log(`[Tokens] Set tokens for user ${userId} to ${tokens}`);
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('[Update Tokens] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update tokens' });
  }
});

// Serve static files from public directory
// Serve static files only in development (Vercel handles this in production)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static('public'));
}

// Page routes
app.get('/main', (req, res) => {
  res.sendFile(__dirname + '/public/pages/main.html');
});

app.get('/profile', (req, res) => {
  res.sendFile(__dirname + '/public/pages/profile.html');
});

app.get('/purchase', (req, res) => {
  res.sendFile(__dirname + '/public/pages/purchase.html');
});

app.get('/online-users', (req, res) => {
  res.sendFile(__dirname + '/public/pages/online-users.html');
});

app.get('/verify-age', (req, res) => {
  res.sendFile(__dirname + '/public/pages/verify-age.html');
});

app.get('/about', (req, res) => {
  res.sendFile(__dirname + '/public/pages/about.html');
});

app.get('/privacy', (req, res) => {
  res.sendFile(__dirname + '/public/pages/privacy.html');
});

app.get('/terms', (req, res) => {
  res.sendFile(__dirname + '/public/pages/terms.html');
});

// Complete profile endpoint (age verification)
app.post('/api/complete-profile', async (req, res) => {
  try {
    const { userId, username, gender, dob } = req.body;

    // Validate required fields - username is optional if user already has one
    if (!userId || !gender || !dob) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Validate gender
    if (gender !== 'Male' && gender !== 'Female') {
      return res.status(400).json({ success: false, message: 'Invalid gender' });
    }

    // Find user
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user already has a username
    const hasUsername = user.username;

    // If username is provided and user doesn't have one, or user wants to change it
    if (username) {
      // Validate username format (no spaces, alphanumeric + underscore only)
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ success: false, message: 'Username can only contain letters, numbers, and underscores (no spaces)' });
      }

      // Validate username length
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ success: false, message: 'Username must be 3-20 characters long' });
      }

      // Check if username is already taken by another user
      const existingUsername = await db.getUserByUsername(username);
      if (existingUsername && existingUsername.id !== userId) {
        return res.status(400).json({ success: false, message: 'Username already taken' });
      }
    } else if (!hasUsername) {
      // Username is required for new users who don't have one
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    // Calculate age from DOB
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Validate age (must be 18+)
    if (age < 18) {
      return res.status(400).json({ success: false, message: 'You must be at least 18 years old' });
    }

    // Format age display
    const ageDisplay = `${age} years old (DOB: ${new Date(dob).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })})`;

    // Update user profile
    const updatedUser = await db.updateUser(userId, {
      username: username || user.username,
      gender,
      age: ageDisplay,
      dob,
      profile_complete: true
    });

    // Don't send password to client
    const { password, ...userData } = updatedUser;
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('[Complete Profile] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete profile' });
  }
});

// Moderation API endpoints
// Note: Moderation data is now stored in Supabase database

// Log user report
app.post('/api/log-report', async (req, res) => {
  try {
    const { reporterId, reportedUserId, reportedUsername, reason } = req.body;

    const report = await db.createReport({
      reporter_id: reporterId || null,
      reported_user_id: reportedUserId,
      reported_username: reportedUsername,
      reason,
      status: 'pending'
    });

    console.log('[Moderation] Report logged:', report);
    res.json({ success: true, reportId: report.id });
  } catch (error) {
    console.error('[Log Report] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to log report' });
  }
});

// Log moderation violation (auto-detected or confirmed)
// Moderation violation endpoint - Now uses Supabase
app.post('/api/moderation-violation', async (req, res) => {
  try {
    const { userId, reason, source, username } = req.body;

    console.log('[Moderation] Violation logged:', { userId, reason, source });

    // Determine suspension type based on violation severity
    let suspensionType = 'permanent'; // Default to permanent ban
    let suspensionDuration = null; // null = permanent

    // Severity check based on reason
    if (reason.toLowerCase().includes('minor') || reason.toLowerCase().includes('child')) {
      suspensionType = 'permanent';
      console.log('[Moderation] CRITICAL: Minor-related violation - PERMANENT BAN');
    } else if (reason.toLowerCase().includes('nudity') || reason.toLowerCase().includes('sexual')) {
      suspensionType = 'permanent';
      console.log('[Moderation] Nudity/sexual content violation - PERMANENT BAN');
    } else if (reason.toLowerCase().includes('weapon') || reason.toLowerCase().includes('drug')) {
      suspensionType = 'temporary';
      suspensionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      console.log('[Moderation] Weapon/drug violation - 7 DAY SUSPENSION');
    } else {
      suspensionType = 'temporary';
      suspensionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      console.log('[Moderation] Other violation - 24 HOUR SUSPENSION');
    }

    // Calculate expiration date for temporary suspensions
    const expiresAt = suspensionDuration ? new Date(Date.now() + suspensionDuration) : null;

    // Create suspension in database
    const suspension = await db.createSuspension({
      user_id: userId,
      username: username || userId,
      reason: reason,
      suspension_type: suspensionType,
      expires_at: expiresAt,
      created_by: 'system'
    });

    console.log(`[Moderation] User ${userId} suspended in database: ${suspensionType}`);

    // Disconnect user if they're online
    const socketToDisconnect = Array.from(io.sockets.sockets.values()).find(
      s => s.userData && (s.userData.id === userId || s.userData.username === userId)
    );

    if (socketToDisconnect) {
      socketToDisconnect.emit('account-suspended', {
        reason,
        suspensionType,
        expiresAt: expiresAt ? expiresAt.toISOString() : null
      });
      socketToDisconnect.disconnect(true);
      console.log(`[Moderation] Disconnected suspended user ${userId}`);
    }

    res.json({
      success: true,
      suspended: true,
      suspensionType,
      expiresAt: suspension.expires_at
    });
  } catch (error) {
    console.error('[Moderation] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to process violation' });
  }
});

// Check if user is suspended
app.post('/api/check-suspension', async (req, res) => {
  try {
    const { userId, username } = req.body;

    // Get active suspension from database
    const suspension = await db.getActiveSuspension(userId);

    if (!suspension) {
      return res.json({ suspended: false });
    }

    // User is suspended
    res.json({
      suspended: true,
      suspensionType: suspension.suspension_type,
      reason: suspension.reason,
      suspendedAt: suspension.created_at,
      expiresAt: suspension.expires_at
    });
  } catch (error) {
    console.error('[Check Suspension] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to check suspension' });
  }
});

// Get moderation reports (admin endpoint - add auth in production)
app.get('/api/admin/reports', async (req, res) => {
  try {
    // Get all pending reports from database
    const reports = await db.getPendingReports();

    res.json({
      success: true,
      reports: reports
    });
  } catch (error) {
    console.error('[Admin Reports] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get reports' });
  }
});

// Get all users (admin endpoint)
app.get('/api/users', (req, res) => {
  const usersWithoutPasswords = users.map(u => {
    const { password, ...userData } = u;
    return userData;
  });

  res.json({
    success: true,
    users: usersWithoutPasswords
  });
});

// Unban user (admin endpoint)
app.post('/api/admin/unban', async (req, res) => {
  try {
    const { userId } = req.body;

    // Delete suspension from database
    await db.deleteSuspension(userId);
    console.log(`[Admin] User ${userId} has been unbanned`);

    res.json({ success: true, message: 'User unbanned successfully' });
  } catch (error) {
    console.error('[Admin Unban] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to unban user' });
  }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Get admin user from database
    const admin = await db.getAdminByEmail(email);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await db.updateAdminLastLogin(admin.id);

    // Log activity
    await db.logAdminActivity({
      admin_id: admin.id,
      action: 'login',
      ip_address: req.ip || req.connection.remoteAddress
    });

    console.log(`[Admin] ${admin.email} logged in successfully`);

    // Return admin data (without password hash)
    const { password_hash, ...adminData } = admin;
    res.json({
      success: true,
      admin: adminData
    });
  } catch (error) {
    console.error('[Admin Login] Error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Admin analytics endpoint
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const analytics = await db.getAnalytics();

    if (!analytics) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics'
      });
    }

    res.json({
      success: true,
      analytics: analytics
    });
  } catch (error) {
    console.error('[Admin Analytics] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get analytics' });
  }
});

// Admin get all suspensions
app.get('/api/admin/suspensions', async (req, res) => {
  try {
    const filters = {};
    if (req.query.type) {
      filters.type = req.query.type;
    }

    const suspensions = await db.getAllSuspensions(filters);

    res.json({
      success: true,
      suspensions: suspensions
    });
  } catch (error) {
    console.error('[Admin Suspensions] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get suspensions' });
  }
});

// Admin get all reports
app.get('/api/admin/all-reports', async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }

    const reports = await db.getAllReports(filters);

    res.json({
      success: true,
      reports: reports
    });
  } catch (error) {
    console.error('[Admin All Reports] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get reports' });
  }
});

// Admin get all users
app.get('/api/admin/all-users', async (req, res) => {
  try {
    const users = await db.getAllUsers();

    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('[Admin All Users] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
});

// Get online users count
app.get('/api/online-count', (req, res) => {
  res.json({ count: onlineUsers.length });
});

// Admin page route
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/pages/admin.html');
});

// Admin login page route
app.get('/admin-login', (req, res) => {
  res.sendFile(__dirname + '/public/pages/admin-login.html');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});