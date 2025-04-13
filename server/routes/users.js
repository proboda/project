const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../database/db');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register a new user
router.post('/signup', async (req, res) => {
  try {
    console.log('Signup request received:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if username already exists
    console.log('Checking if username exists...');
    const existingUser = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (existingUser.rows.length > 0) {
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
    
    // Insert user into database
    console.log('Inserting user into database...');
    const result = await query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING user_id',
      [username, hashedPassword]
    );
    
    // Generate JWT token
    console.log('Generating JWT token...');
    const token = jwt.sign(
      { userId: result.rows[0].user_id, username },
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

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user in database
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, username: user.username },
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

// Verify user (protected route)
router.get('/verify', auth, (req, res) => {
  res.json({ 
    message: 'Token is valid',
    user: req.user
  });
});

module.exports = router; 