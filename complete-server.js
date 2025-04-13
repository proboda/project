const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5001;

// In-memory user storage (replace with PostgreSQL when it's working)
let users = [
  { id: 1, username: 'user', password: '$2b$10$ixlPY3AAd4ty1wlFXWwZYeIBnvmkzOWO2tT5wMnM.f/KT6miKXJZu' } // password: 'password'
];

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'login-app-secret-key';

// Online users tracking
const onlineUsers = new Map(); // userId -> { username, lastActive }

// Add this after the Map declaration
console.log('Online users tracking initialized');

// Function to clean up inactive users (called every minute)
const cleanupInactiveUsers = () => {
  const now = Date.now();
  const inactiveThreshold = 5 * 60 * 1000; // Increase to 5 minutes
  const beforeCount = onlineUsers.size;
  
  for (const [userId, userData] of onlineUsers.entries()) {
    if (now - userData.lastActive > inactiveThreshold) {
      onlineUsers.delete(userId);
      console.log(`User ${userData.username} marked as offline (inactive for >5min)`);
    }
  }
  
  // Only log if there was a change
  if (beforeCount !== onlineUsers.size) {
    console.log(`Cleanup: removed ${beforeCount - onlineUsers.size} users, ${onlineUsers.size} remaining`);
  }
};

// Cleanup inactive users every minute
setInterval(cleanupInactiveUsers, 60 * 1000);

// Allow all origins with CORS
app.use(cors());
app.use(express.json());

// Middleware to log all requests with more details
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// Basic route for testing
app.get('/', (req, res) => {
  console.log('GET request received');
  res.json({ message: 'Server is running' });
});

// Test route
app.post('/test', (req, res) => {
  console.log('POST test received:', req.body);
  res.json({ message: 'Test POST received', data: req.body });
});

// Auth middleware
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Convert userId to string to ensure consistent key type
    const userId = String(decoded.userId);
    
    // Record user as online
    onlineUsers.set(userId, {
      username: decoded.username,
      lastActive: Date.now()
    });
    
    console.log(`User ${decoded.username} (ID: ${userId}) marked online. Total count: ${onlineUsers.size}`);
    console.log('Current online users:', Array.from(onlineUsers.keys()));
    
    req.user = {
      id: userId,
      username: decoded.username
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// User registration
app.post('/api/users/signup', async (req, res) => {
  try {
    console.log('Signup request received:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if username already exists
    console.log('Checking if username exists...');
    const existingUser = users.find(user => user.username === username);
    
    if (existingUser) {
      console.log('Username already exists');
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Validate password length
    if (password.length < 6) {
      console.log('Password too short');
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }
    
    // Hash password
    console.log('Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    console.log('Creating new user...');
    const userId = users.length + 1;
    const newUser = { 
      id: userId, 
      username, 
      password: hashedPassword 
    };
    
    users.push(newUser);
    
    // Generate JWT token
    console.log('Generating JWT token...');
    const token = jwt.sign(
      { userId: userId, username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('User registered successfully');
    res.status(201).json({ 
      message: 'User registered successfully',
      token
    });
  } catch (error) {
    console.error('Registration error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Server error during registration',
      details: error.message 
    });
  }
});

// User login
app.post('/api/users/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { username, password } = req.body;
    
    // Find user
    const user = users.find(user => user.username === username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Mark user as online
    const userId = String(user.id);
    onlineUsers.set(userId, {
      username: user.username,
      lastActive: Date.now()
    });
    
    console.log(`User ${username} logged in and marked as online. Total: ${onlineUsers.size}`);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({ 
      message: 'Login successful',
      token,
      onlineCount: onlineUsers.size
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Verify user token
app.get('/api/users/verify', auth, (req, res) => {
  res.json({ 
    message: 'Token is valid',
    user: req.user
  });
});

// Add a new endpoint to get online users count
app.get('/api/users/online', (req, res) => {
  console.log(`Returning online users count: ${onlineUsers.size}`);
  console.log('Users:', Array.from(onlineUsers.values()).map(u => u.username));
  
  res.json({ 
    count: onlineUsers.size,
    users: Array.from(onlineUsers.values()).map(u => ({ username: u.username }))
  });
});

// Add a heartbeat endpoint to keep users marked as online
app.post('/api/users/heartbeat', auth, (req, res) => {
  // Update the user's lastActive timestamp explicitly
  const userId = String(req.user.id);
  
  // Make sure the user exists in the onlineUsers map
  if (onlineUsers.has(userId)) {
    const userData = onlineUsers.get(userId);
    onlineUsers.set(userId, {
      ...userData,
      lastActive: Date.now()
    });
    console.log(`Heartbeat received from ${req.user.username}, updated lastActive timestamp`);
  } else {
    // If not in map yet, add them
    onlineUsers.set(userId, {
      username: req.user.username,
      lastActive: Date.now()
    });
    console.log(`User ${req.user.username} added to online users from heartbeat`);
  }
  
  res.json({ 
    success: true,
    onlineCount: onlineUsers.size
  });
});

// Add a logout endpoint that removes user from online list
app.post('/api/users/logout', auth, (req, res) => {
  const userId = String(req.user.id);
  onlineUsers.delete(userId);
  console.log(`User ${req.user.username} logged out. Remaining online: ${onlineUsers.size}`);
  
  res.json({ message: 'Logged out successfully' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Something went wrong on the server' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});