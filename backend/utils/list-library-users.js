// Script to list all libraries and their usernames
// Usage: DATABASE_URL=your-railway-url node list-library-users.js

require('dotenv').config();
const { db } = require('../src/database-pg');

async function listLibraryUsers() {
  try {
    console.log('Connecting to database...');
    
    // Get all libraries with their users
    const data = await db.manyOrNone(`
      SELECT 
        l.id,
        l.name as library_name,
        l.short_name,
        u.username,
        u.is_admin,
        u.created_at as user_created
      FROM libraries l
      LEFT JOIN users u ON l.id = u.library_id
      WHERE l.name != 'Admin Library'
      ORDER BY l.name, u.username
    `);
    
    console.log('\n====================================');
    console.log('Library Users Report');
    console.log('====================================\n');
    
    // Group by library
    const libraries = {};
    data.forEach(row => {
      if (!libraries[row.library_name]) {
        libraries[row.library_name] = {
          id: row.id,
          short_name: row.short_name,
          users: []
        };
      }
      if (row.username) {
        libraries[row.library_name].users.push({
          username: row.username,
          is_admin: row.is_admin,
          created: row.user_created
        });
      }
    });
    
    // Display results
    let totalLibraries = 0;
    let librariesWithUsers = 0;
    let librariesWithoutUsers = 0;
    
    Object.entries(libraries).forEach(([libraryName, info]) => {
      totalLibraries++;
      
      console.log(`\n${libraryName}`);
      console.log(`ID: ${info.id}, Short Name: ${info.short_name || 'N/A'}`);
      
      if (info.users.length > 0) {
        librariesWithUsers++;
        info.users.forEach(user => {
          console.log(`  - Username: ${user.username} (Created: ${new Date(user.created).toLocaleDateString()})`);
        });
      } else {
        librariesWithoutUsers++;
        console.log('  - No users assigned');
      }
    });
    
    console.log('\n====================================');
    console.log('Summary:');
    console.log('====================================');
    console.log(`Total Libraries: ${totalLibraries}`);
    console.log(`Libraries with users: ${librariesWithUsers}`);
    console.log(`Libraries without users: ${librariesWithoutUsers}`);
    
    // List libraries without users
    if (librariesWithoutUsers > 0) {
      console.log('\nLibraries needing users:');
      Object.entries(libraries).forEach(([libraryName, info]) => {
        if (info.users.length === 0) {
          console.log(`  - ${libraryName}`);
        }
      });
    }
    
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nMake sure you are using the PUBLIC DATABASE_URL from Railway');
    }
    process.exit(1);
  }
}

// Run the script
listLibraryUsers().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});