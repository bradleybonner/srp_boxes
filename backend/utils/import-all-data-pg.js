const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const bcrypt = require('bcryptjs');
const { db, initDatabase, seedAdmin } = require('../src/database-pg');

// Main import function
async function importAllData() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    
    console.log('Starting data import...\n');
    
    // Step 1: Seed admin user
    await seedAdmin();
    console.log('Admin user created successfully\n');

    // Step 2: Import libraries
    console.log('Importing libraries...');
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

    // Import libraries and set initial inventory
    for (const lib of libraries) {
      try {
        // Insert library or get existing
        const result = await db.one(
          `INSERT INTO libraries (name) VALUES ($1) 
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
           RETURNING id`,
          [lib.name]
        );
        
        libraryIds[lib.name] = result.id;
        importedLibraries++;
        
        // Initialize inventory for each box type
        const boxTypes = ['EL', 'Kids', 'Teens'];
        const quantityPerType = Math.floor(lib.quantity / 3);
        
        for (const boxType of boxTypes) {
          await db.none(
            `INSERT INTO box_inventory (library_id, box_type, quantity) 
             VALUES ($1, $2, $3)
             ON CONFLICT (library_id, box_type) 
             DO UPDATE SET quantity = EXCLUDED.quantity`,
            [result.id, boxType, quantityPerType]
          );
        }
        
        console.log(`Imported: ${lib.name} with ${quantityPerType} boxes per type`);
      } catch (err) {
        console.error(`Error importing ${lib.name}:`, err.message);
      }
    }

    console.log(`\nImported ${importedLibraries} libraries`);

    // Step 3: Import locations
    console.log('\nImporting library locations...');
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
        try {
          const result = await db.result(
            `UPDATE libraries 
             SET short_name = $1, address = $2, latitude = $3, longitude = $4
             WHERE name = $5 AND (latitude IS NULL OR longitude IS NULL)`,
            [shortName, address, latitude, longitude, name]
          );
          
          if (result.rowCount > 0) {
            updatedLocations++;
            console.log(`Updated location for: ${name}`);
          }
        } catch (err) {
          console.error(`Error updating ${name}:`, err.message);
        }
      }
    }

    console.log(`\nUpdated ${updatedLocations} library locations`);
    
    // Create sample users
    console.log('\nCreating sample users...');
    
    // Get a few library IDs to assign users to
    const sampleLibraries = await db.manyOrNone('SELECT id, name FROM libraries LIMIT 5');
    
    for (let i = 0; i < Math.min(3, sampleLibraries.length); i++) {
      const library = sampleLibraries[i];
      const username = library.name.toLowerCase().replace(/\s+/g, '') + '_user';
      const password = await bcrypt.hash('password123', 10);
      
      try {
        await db.none(
          `INSERT INTO users (username, password, library_id, is_admin) 
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (username) DO NOTHING`,
          [username, password, library.id, false]
        );
        console.log(`Created user: ${username} for ${library.name}`);
      } catch (err) {
        console.error(`Error creating user ${username}:`, err.message);
      }
    }

    console.log('\n====================================');
    console.log('Data import complete!');
    console.log('====================================');
    console.log('\nDefault logins:');
    console.log('Admin: username="admin", password="admin123"');
    console.log('Sample users: password="password123"');
    
  } catch (error) {
    console.error('Fatal error during import:', error);
    process.exit(1);
  }
}

// Run import
importAllData().then(() => {
  console.log('\nImport finished successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});