// Script to create users for each library using their short codes
// Usage: DATABASE_URL=your-railway-url node create-library-users.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('../src/database-pg');

async function createLibraryUsers() {
  const password = 'L1brary1';
  
  try {
    console.log('Connecting to database...');
    console.log('Database URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
    
    // Hash the password once
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('\nPassword hashed successfully');
    
    // Get all libraries with their short names
    const libraries = await db.many(`
      SELECT id, name, short_name 
      FROM libraries 
      WHERE name != 'Admin Library' 
      ORDER BY name
    `);
    
    console.log(`\nFound ${libraries.length} libraries\n`);
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const library of libraries) {
      // Determine username
      let username;
      
      if (library.short_name && library.short_name.trim().length > 0) {
        // Use short_name if available
        username = library.short_name.trim().toLowerCase();
      } else {
        // Generate a 2-letter code from the library name
        const words = library.name.split(/\s+/);
        if (words.length >= 2) {
          // Use first letter of first two words
          username = (words[0][0] + words[1][0]).toLowerCase();
        } else {
          // Use first two letters of the name
          username = library.name.substring(0, 2).toLowerCase();
        }
      }
      
      // Ensure username is at least 2 characters
      if (username.length < 2) {
        username = library.name.substring(0, 2).toLowerCase();
      }
      
      try {
        // Check if user already exists
        const existingUser = await db.oneOrNone(
          'SELECT id FROM users WHERE username = $1',
          [username]
        );
        
        if (existingUser) {
          console.log(`⚠️  User '${username}' already exists for ${library.name}`);
          skipped++;
        } else {
          // Create the user
          await db.none(
            `INSERT INTO users (username, password, library_id, is_admin) 
             VALUES ($1, $2, $3, $4)`,
            [username, hashedPassword, library.id, false]
          );
          
          console.log(`✓ Created user '${username}' for ${library.name}`);
          created++;
        }
      } catch (err) {
        console.error(`✗ Error creating user for ${library.name}:`, err.message);
        errors++;
        
        // If username conflict, try with library ID suffix
        if (err.code === '23505') {
          const altUsername = `${username}${library.id}`;
          try {
            await db.none(
              `INSERT INTO users (username, password, library_id, is_admin) 
               VALUES ($1, $2, $3, $4)`,
              [altUsername, hashedPassword, library.id, false]
            );
            
            console.log(`✓ Created user '${altUsername}' for ${library.name} (alternative username)`);
            created++;
            errors--; // Undo the error count since we recovered
          } catch (err2) {
            console.error(`✗ Also failed with alternative username:`, err2.message);
          }
        }
      }
    }
    
    console.log('\n====================================');
    console.log('User Creation Summary:');
    console.log('====================================');
    console.log(`✓ Created: ${created} users`);
    console.log(`⚠️  Skipped: ${skipped} users (already exist)`);
    console.log(`✗ Errors: ${errors} users`);
    console.log(`\nTotal libraries processed: ${libraries.length}`);
    console.log('\nAll users have password: L1brary1');
    
    // Show all library users
    console.log('\n====================================');
    console.log('All Library Users:');
    console.log('====================================');
    
    const allUsers = await db.manyOrNone(`
      SELECT u.username, l.name as library_name, u.created_at
      FROM users u
      JOIN libraries l ON u.library_id = l.id
      WHERE u.is_admin = false
      ORDER BY l.name
    `);
    
    allUsers.forEach(user => {
      console.log(`${user.username} - ${user.library_name}`);
    });
    
  } catch (error) {
    console.error('\nFatal error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nMake sure you are using the PUBLIC DATABASE_URL from Railway');
      console.error('It should look like: postgresql://postgres:xxx@viaduct.proxy.rlwy.net:12345/railway');
    }
    process.exit(1);
  }
}

// Run the script
createLibraryUsers().then(() => {
  console.log('\nScript completed successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});