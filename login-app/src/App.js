import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// API base URL
// const API_URL = 'http://localhost:5001';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: ''
  });
  const [onlineUsers, setOnlineUsers] = useState({
    count: 0,
    users: []
  });

  // Check password strength
  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength({ score: 0, message: '' });
      return;
    }

    let score = 0;
    let message = '';

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character variety checks
    if (/[A-Z]/.test(password)) score++; // Has uppercase
    if (/[a-z]/.test(password)) score++; // Has lowercase
    if (/[0-9]/.test(password)) score++; // Has number
    if (/[^A-Za-z0-9]/.test(password)) score++; // Has special char

    // Determine message based on score
    if (score < 3) {
      message = 'Weak';
    } else if (score < 5) {
      message = 'Medium';
    } else {
      message = 'Strong';
    }

    setPasswordStrength({ score, message });
  };

  // Handle password change
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (isSignup) {
      checkPasswordStrength(newPassword);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Verify token with backend
  const verifyToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(true);
        setUsername(data.user.username);
      } else {
        // If token is invalid, clear localStorage and state
        localStorage.removeItem('token');
        setToken(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Token verification error:', error.message);
      localStorage.removeItem('token');
      setToken(null);
      setIsLoggedIn(false);
    }
  }, [token]);

  // Check if token is valid on app load
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token, verifyToken]);

  // Add a function to fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    try {
      console.log('Fetching online users...');
      const response = await fetch(`${API_URL}/api/users/online`);
      
      if (!response.ok) {
        console.error(`Failed to fetch online users: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      console.log('Online users data:', data);
      
      setOnlineUsers(data);
    } catch (error) {
      console.error('Failed to fetch online users:', error);
    }
  }, [API_URL]);

  // Send heartbeat every 30 seconds while logged in
  useEffect(() => {
    if (!isLoggedIn || !token) return;

    const sendHeartbeat = async () => {
      try {
        console.log('Sending heartbeat...');
        const response = await fetch(`${API_URL}/api/users/heartbeat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          console.log('Heartbeat successful');
        } else {
          console.warn('Heartbeat failed:', response.status);
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();
    
    // Set up interval for heartbeat
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);
    
    // Cleanup on unmount or when logged out
    return () => clearInterval(heartbeatInterval);
  }, [isLoggedIn, token, API_URL]);

  // Fetch online users count periodically
  useEffect(() => {
    fetchOnlineUsers();
    
    const fetchInterval = setInterval(fetchOnlineUsers, 10000);
    
    return () => clearInterval(fetchInterval);
  }, [fetchOnlineUsers]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      console.log('Login attempt - sending request to:', `${API_URL}/api/users/login`);
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: username.trim(), 
          password 
        })
      });
      
      console.log('Login response status:', response.status);
      
      try {
        const data = await response.json();
        console.log('Login response data:', data);
        
        if (!response.ok) {
          setError(data.error || 'Login failed');
          return;
        }
        
        // Save token to localStorage
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setIsLoggedIn(true);
        
        // Update online count if provided by the server
        if (data.onlineCount) {
          setOnlineUsers(prevState => ({
            ...prevState,
            count: data.onlineCount,
            users: [...prevState.users, { username }]
          }));
        }
        
        setError('');
        
        // Clear sensitive data
        setPassword('');
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Login network error:', error);
      setError(`Network error: ${error.message}`);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    
    // Sanitize inputs
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    // Enhanced password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (passwordStrength.score < 3) {
      setError('Please choose a stronger password');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/users/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: trimmedUsername, 
          password 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      setToken(data.token);
      
      // Switch to logged in state
      setIsLoggedIn(true);
      setError('');
      
      // Clear sensitive data
      setPassword('');
    } catch (error) {
      console.error('Signup error:', error.message);
      setError('Network error. Please try again.');
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch(`${API_URL}/api/users/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    localStorage.removeItem('token');
    setToken(null);
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setPasswordStrength({ score: 0, message: '' });
  };

  const toggleSignup = () => {
    setIsSignup(!isSignup);
    setUsername('');
    setPassword('');
    setError('');
    setPasswordStrength({ score: 0, message: '' });
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <div className="login-container">
          <h1>{isSignup ? 'Sign Up' : 'Login'}</h1>
          {error && <p className="error">{error}</p>}
          <form onSubmit={isSignup ? handleSignup : handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  autoComplete={isSignup ? "new-password" : "current-password"}
                />
                <button 
                  type="button" 
                  className="toggle-password" 
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {isSignup && passwordStrength.message && (
                <div className={`password-strength strength-${passwordStrength.message.toLowerCase()}`}>
                  Password strength: {passwordStrength.message}
                </div>
              )}
            </div>
            <button type="submit">{isSignup ? 'Sign Up' : 'Login'}</button>
          </form>
          <p className="toggle-form">
            {isSignup ? 'Already have an account?' : 'Don\'t have an account?'} 
            <button className="link-button" onClick={toggleSignup}>
              {isSignup ? 'Log In' : 'Sign Up'}
            </button>
          </p>
          <div className="online-users">
            <p>{onlineUsers.count} user{onlineUsers.count !== 1 ? 's' : ''} online</p>
          </div>
        </div>
      ) : (
        <div className="welcome-container">
          <h1>Welcome, {username}!</h1>
          <div className="online-users-container">
            <h3>{onlineUsers.count} user{onlineUsers.count !== 1 ? 's' : ''} online</h3>
            <ul className="online-users-list">
              {onlineUsers.users.map((user, index) => (
                <li key={index}>
                  <span className="online-indicator"></span>
                  {user.username} {user.username === username ? '(you)' : ''}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );
}

export default App;
