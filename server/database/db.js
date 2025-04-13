const { Pool } = require('pg');

const pool = new Pool({
  user: 'probodasenarathne', // Explicitly use your username
  host: 'localhost',
  database: 'login_app',
  password: '', // Empty password for local macOS PostgreSQL setup
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
}; 