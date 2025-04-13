const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5001;

// In-memory user storage (replace with PostgreSQL when it's working)
let users = [
  { id: 1, username: 'user', password: '$2b$10$ixlPY3AAd4ty1wlFXWwZYeIBnvmkzOWO2tT5wMnM.f/KT6miKXJZu' } // password: 'password'
];

// Secret key for JWT
const JWT_SECRET = 'login-app-secret-key';

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
    
    req.user = {
      id: decoded.userId,
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
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({ 
      message: 'Login successful',
      token
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Something went wrong on the server' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});