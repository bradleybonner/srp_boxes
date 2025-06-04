const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const bcrypt = require('bcryptjs');
const { db, initDatabase, seedAdmin } = require('../src/database');

// Initialize database first
console.log('Initializing database...');
initDatabase();

// Wait for database to be ready, then import data
setTimeout(async () => {
  console.log('Starting data import from library_locations.csv...\n');
  
  // Step 1: Seed admin user
  try {
    await seedAdmin();
    console.log('Admin user created successfully');
  } catch (err) {
    console.error('Error creating admin user:', err);
  }

  // Step 2: Import libraries from locations CSV
  console.log('\nImporting libraries from locations file...');
  const locationsCsvPath = path.join(__dirname, '../../../library_locations.csv');
  const locationsContent = fs.readFileSync(locationsCsvPath, 'utf-8');
  
  const records = csv.parse(locationsContent, {
    columns: true,
    skip_empty_lines: true
  });

  let importedLibraries = 0;
  const libraryIds = {};

  for (const record of records) {
    // Skip service center and test entries
    if (record.region_2020 === 'Service Center' || 
        !record.mailing_address_long || 
        !record.mailing_latitude || 
        !record.mailing_longitude ||
        record.library_short_name.includes('Locker')) {
      continue;
    }

    const libraryName = record.library_official_name;
    const shortName = record.library_short_name;
    const address = record.mailing_address_long;
    const latitude = parseFloat(record.mailing_latitude);
    const longitude = parseFloat(record.mailing_longitude);

    await new Promise((resolve) => {
      db.run(
        'INSERT OR IGNORE INTO libraries (name, short_name, address, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
        [libraryName, shortName, address, latitude, longitude],
        function(err) {
          if (err) {
            console.error(`Error importing ${libraryName}:`, err);
            resolve();
            return;
          }
          
          if (this.changes > 0) {
            importedLibraries++;
            const libraryId = this.lastID;
            libraryIds[libraryName] = libraryId;
            
            // Initialize inventory with 0 for each box type
            const boxTypes = ['EL', 'Kids', 'Teens'];
            
            boxTypes.forEach(boxType => {
              db.run(
                'INSERT INTO box_inventory (library_id, box_type, quantity) VALUES (?, ?, ?)',
                [libraryId, boxType, 0],
                (err) => {
                  if (err) console.error(`Error initializing inventory for ${libraryName}:`, err);
                }
              );
            });
            
            console.log(`Imported: ${libraryName} (${shortName})`);
          }
          resolve();
        }
      );
    });
  }

  console.log(`\nImported ${importedLibraries} libraries`);

  // Step 3: Create sample users
  console.log('\nCreating sample users...');
  
  // Wait a bit for all libraries to be inserted
  setTimeout(async () => {
    // Get a few libraries to create users for
    db.all('SELECT id, name, short_name FROM libraries WHERE name NOT LIKE "%Admin%" ORDER BY name LIMIT 5', async (err, libraries) => {
      if (err || !libraries.length) {
        console.log('No libraries found for sample users');
        return;
      }

      for (const library of libraries) {
        const username = library.short_name.toLowerCase() + '_user';
        const password = await bcrypt.hash('password123', 10);
        
        await new Promise((resolve) => {
          db.run(
            'INSERT OR IGNORE INTO users (username, password, library_id, is_admin) VALUES (?, ?, ?, ?)',
            [username, password, library.id, 0],
            (err) => {
              if (!err) {
                console.log(`Created user: ${username} for ${library.name}`);
              }
              resolve();
            }
          );
        });
      }

      console.log('\n====================================');
      console.log('Data import complete!');
      console.log('====================================');
      console.log('\nDefault logins:');
      console.log('Admin: username="admin", password="admin123"');
      console.log('Sample library users: password="password123"');
      console.log('\nAll libraries start with 0 inventory.');
      console.log('\nYou can now start the application!');
      
      setTimeout(() => process.exit(0), 2000);
    });
  }, 2000);
}, 2000);