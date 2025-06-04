const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const { db, initDatabase, seedAdmin } = require('../src/database');

// Initialize database first
console.log('Initializing database...');
initDatabase();

// Wait for database to be ready, then import data
setTimeout(async () => {
  console.log('Starting data import...\n');
  
  // Step 1: Seed admin user
  try {
    await seedAdmin();
    console.log('Admin user created successfully');
  } catch (err) {
    console.error('Error creating admin user:', err);
  }

  // Step 2: Import libraries
  console.log('\nImporting libraries...');
  const librariesCsvPath = path.join(__dirname, '../../../Library_Delivery_Quantities_Round_1.csv');
  const librariesContent = fs.readFileSync(librariesCsvPath, 'utf-8');
  const lines = librariesContent.split('\n');
  
  const libraries = lines.slice(1)
    .map(line => line.trim())
    .filter(line => line)
    .map(line => {
      const [library, quantity] = line.split(',');
      return {
        name: library.trim(),
        quantity: quantity ? parseFloat(quantity) : 0
      };
    })
    .filter(lib => lib.quantity > 0);

  let importedLibraries = 0;
  const libraryIds = {};

  for (const lib of libraries) {
    await new Promise((resolve) => {
      db.run(
        'INSERT OR IGNORE INTO libraries (name) VALUES (?)',
        [lib.name],
        function(err) {
          if (err) {
            console.error(`Error importing ${lib.name}:`, err);
            resolve();
            return;
          }
          
          if (this.changes > 0) {
            importedLibraries++;
            const libraryId = this.lastID;
            libraryIds[lib.name] = libraryId;
            
            // Initialize inventory for each box type
            const boxTypes = ['EL', 'Kids', 'Teens'];
            const quantityPerType = Math.floor(lib.quantity / 3);
            
            boxTypes.forEach(boxType => {
              db.run(
                'INSERT OR REPLACE INTO box_inventory (library_id, box_type, quantity) VALUES (?, ?, ?)',
                [libraryId, boxType, quantityPerType]
              );
            });
            
            console.log(`Imported: ${lib.name} with ${quantityPerType} boxes per type`);
          } else {
            // Get existing library ID
            db.get('SELECT id FROM libraries WHERE name = ?', [lib.name], (err, row) => {
              if (row) {
                libraryIds[lib.name] = row.id;
              }
            });
          }
          resolve();
        }
      );
    });
  }

  console.log(`\nImported ${importedLibraries} new libraries`);

  // Step 3: Import locations after a short delay
  console.log('\nImporting library locations...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const locationsCsvPath = path.join(__dirname, '../../../library_locations.csv');
  const locationsContent = fs.readFileSync(locationsCsvPath, 'utf-8');
  
  const locations = csv.parse(locationsContent, {
    columns: true,
    skip_empty_lines: true
  });

  let updatedLocations = 0;

  // Create name mapping
  const nameMapping = {
    'Algona-Pacific': ['Algona', 'Algona Pacific'],
    'Boulevard Park': ['Boulevard Park'],
    'Federal Way 320th': ['320th', 'Federal Way 320th'],
    'White Center': ['White Center'],
    'Kent Panther Lake': ['Kent Panther', 'Kent Panther Lake'],
    'Maple Valley': ['Maple Valley'],
    'North Bend': ['North Bend'],
    'Fall City': ['Fall City'],
    'Snoqualmie': ['Snoqualmie'],
    'Valley View': ['Valley View'],
    'Woodmont': ['Woodmont'],
    'Woodinville': ['Woodinville'],
    'Richmond Beach': ['Richmond Beach'],
    'Lake Forest Park': ['Lake Forest Park'],
    'Renton Highlands': ['Renton Highlands'],
    'Normandy Park': ['Normandy Park'],
    'Vashon': ['Vashon'],
    'Des Moines': ['Des Moines'],
    'Federal Way': ['Federal Way'],
    'Kent': ['Kent'],
    'Bellevue': ['Bellevue'],
    'Newcastle': ['Newcastle'],
    'Renton': ['Renton'],
    'Skyway': ['Skyway'],
    'Tukwila': ['Tukwila'],
    'Issaquah': ['Issaquah'],
    'Covington': ['Covington'],
    'Black Diamond': ['Black Diamond'],
    'Enumclaw': ['Enumclaw'],
    'Muckleshoot': ['Muckleshoot'],
    'Auburn': ['Auburn'],
    'Shoreline': ['Shoreline'],
    'Kenmore': ['Kenmore'],
    'Bothell': ['Bothell'],
    'Lake Hills': ['Lake Hills'],
    'Crossroads': ['Crossroads'],
    'Newport Way': ['Newport Way'],
    'Kirkland': ['Kirkland'],
    'Mercer Island': ['Mercer Island'],
    'Redmond': ['Redmond'],
    'Kingsgate': ['Kingsgate'],
    'Duvall': ['Duvall'],
    'Carnation': ['Carnation'],
    'Fairwood': ['Fairwood'],
    'Southcenter': ['South Center', 'Southcenter'],
    'Greenbridge': ['Greenbridge'],
    'Burien': ['Burien'],
    'Sammamish': ['Sammamish'],
    'Redmond Ridge': ['Redmond Ridge']
  };

  for (const record of locations) {
    const libraryName = record.library_official_name;
    const shortName = record.library_short_name;
    const address = record.mailing_address_long;
    const latitude = parseFloat(record.mailing_latitude);
    const longitude = parseFloat(record.mailing_longitude);

    // Skip service center entries and entries without valid data
    if (record.region_2020 === 'Service Center' || !address || !latitude || !longitude) {
      continue;
    }

    // Get possible name variations
    const possibleNames = nameMapping[libraryName] || [libraryName];
    
    for (const name of possibleNames) {
      await new Promise((resolve) => {
        db.run(
          `UPDATE libraries 
           SET short_name = ?, address = ?, latitude = ?, longitude = ?
           WHERE name = ? AND (latitude IS NULL OR longitude IS NULL)`,
          [shortName, address, latitude, longitude, name],
          function(err) {
            if (err) {
              console.error(`Error updating ${name}:`, err);
            } else if (this.changes > 0) {
              updatedLocations++;
              console.log(`Updated location for: ${name}`);
            }
            resolve();
          }
        );
      });
    }
  }

  console.log(`\nUpdated ${updatedLocations} library locations`);
  
  // Create some sample users
  console.log('\nCreating sample users...');
  const bcrypt = require('bcryptjs');
  
  // Get a few library IDs to assign users to
  db.all('SELECT id, name FROM libraries LIMIT 5', async (err, libraries) => {
    if (err || !libraries.length) {
      console.log('No libraries found for sample users');
      return;
    }

    for (let i = 0; i < Math.min(3, libraries.length); i++) {
      const library = libraries[i];
      const username = library.name.toLowerCase().replace(/\s+/g, '') + '_user';
      const password = await bcrypt.hash('password123', 10);
      
      db.run(
        'INSERT OR IGNORE INTO users (username, password, library_id, is_admin) VALUES (?, ?, ?, ?)',
        [username, password, library.id, 0],
        (err) => {
          if (!err) {
            console.log(`Created user: ${username} for ${library.name}`);
          }
        }
      );
    }
  });

  console.log('\n====================================');
  console.log('Data import complete!');
  console.log('====================================');
  console.log('\nDefault logins:');
  console.log('Admin: username="admin", password="admin123"');
  console.log('Sample users: password="password123"');
  console.log('\nYou can now start the application!');
  
  setTimeout(() => process.exit(0), 3000);
}, 2000);