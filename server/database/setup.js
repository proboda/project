const fs = require('fs');
const path = require('path');
const { query } = require('./db');

async function setupDatabase() {
  try {
    // Read the schema SQL file
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8'
    );

    // Execute the SQL commands
    await query(schemaSQL);
    console.log('Database tables created successfully!');
  } catch (err) {
    console.error('Error setting up database:', err);
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase; 