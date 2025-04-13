const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Allow all origins with CORS
app.use(cors());
app.use(express.json());

// Basic route for testing
app.get('/', (req, res) => {
  console.log('GET request received');
  res.json({ message: 'Test server is running' });
});

app.post('/test', (req, res) => {
  console.log('POST request received:', req.body);
  res.json({ message: 'Test POST received', data: req.body });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
}); 