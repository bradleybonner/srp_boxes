const bcrypt = require('bcryptjs');
const { db } = require('../src/database');

async function createAllLibraryUsers() {
  console.log('Creating users for all libraries...\n');
  
  const password = await bcrypt.hash('L1brary1', 10);
  
  // Get all libraries except Admin Library
  db.all(`
    SELECT id, name, short_name 
    FROM libraries 
    WHERE name != 'Admin Library' 
      AND short_name IS NOT NULL 
      AND short_name NOT LIKE 'P%'  -- Skip locker entries
    ORDER BY name
  `, async (err, libraries) => {
    if (err) {
      console.error('Error fetching libraries:', err);
      return;
    }
    
    console.log(`Found ${libraries.length} libraries to create users for.\n`);
    
    let created = 0;
    let errors = 0;
    
    for (const library of libraries) {
      const username = library.short_name.toLowerCase();
      
      await new Promise((resolve) => {
        // First check if user already exists
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, existing) => {
          if (existing) {
            console.log(`⚠️  User '${username}' already exists for ${library.name}`);
            resolve();
            return;
          }
          
          // Create new user
          db.run(
            'INSERT INTO users (username, password, library_id, is_admin) VALUES (?, ?, ?, ?)',
            [username, password, library.id, 0],
            function(err) {
              if (err) {
                console.error(`❌ Error creating user for ${library.name}:`, err.message);
                errors++;
              } else {
                console.log(`✅ Created user '${username}' for ${library.name} (ID: ${library.id})`);
                created++;
              }
              resolve();
            }
          );
        });
      });
    }
    
    console.log('\n====================================');
    console.log('User creation complete!');
    console.log('====================================');
    console.log(`✅ Created: ${created} users`);
    console.log(`⚠️  Skipped: ${libraries.length - created - errors} (already existed)`);
    console.log(`❌ Errors: ${errors}`);
    console.log('\nAll users have password: L1brary1');
    console.log('Username format: 2-letter library code in lowercase');
    console.log('\nExample logins:');
    console.log('  Federal Way: fw / L1brary1');
    console.log('  Black Diamond: bd / L1brary1');
    console.log('  Auburn: au / L1brary1');
    
    setTimeout(() => process.exit(0), 2000);
  });
}

// Wait for DB to be ready
setTimeout(createAllLibraryUsers, 1000);