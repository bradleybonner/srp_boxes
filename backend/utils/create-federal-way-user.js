const bcrypt = require('bcryptjs');
const { db } = require('../src/database');

async function createFederalWayUser() {
  const password = await bcrypt.hash('password123', 10);
  
  // First check if Federal Way exists and get its ID
  db.get('SELECT id, name FROM libraries WHERE name = "Federal Way"', async (err, library) => {
    if (err) {
      console.error('Error finding library:', err);
      return;
    }
    
    if (!library) {
      console.error('Federal Way library not found!');
      process.exit(1);
    }
    
    console.log(`Found Federal Way library with ID: ${library.id}`);
    
    // Create user
    db.run(
      'INSERT OR REPLACE INTO users (username, password, library_id, is_admin) VALUES (?, ?, ?, ?)',
      ['federalway_user', password, library.id, 0],
      function(err) {
        if (err) {
          console.error('Error creating user:', err);
          process.exit(1);
        }
        
        console.log('\n✅ Created Federal Way user successfully!');
        console.log('Username: federalway_user');
        console.log('Password: password123');
        console.log(`Library ID: ${library.id}`);
        console.log('Library Name: Federal Way');
        
        process.exit(0);
      }
    );
  });
}

// Wait for DB to be ready
setTimeout(createFederalWayUser, 1000);