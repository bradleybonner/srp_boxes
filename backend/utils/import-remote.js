// Import script for Railway PostgreSQL
// Usage: DATABASE_URL=your-railway-url node import-remote.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const bcrypt = require('bcryptjs');

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  console.error('Usage: DATABASE_URL=postgresql://... node import-remote.js');
  process.exit(1);
}

// Import database module
const { db, initDatabase, seedAdmin } = require('../src/database-pg');

// Main import function
async function importData() {
  try {
    console.log('Connecting to database...');
    console.log('Database URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
    
    // Initialize database tables
    console.log('\nInitializing database tables...');
    await initDatabase();
    
    // Seed admin user
    console.log('\nCreating admin user...');
    await seedAdmin();
    
    // Check if libraries already exist
    const existingLibraries = await db.oneOrNone('SELECT COUNT(*) as count FROM libraries');
    if (existingLibraries && existingLibraries.count > 1) {
      console.log(`\nDatabase already contains ${existingLibraries.count} libraries.`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('Do you want to continue and add/update data? (y/N): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('Import cancelled.');
        process.exit(0);
      }
    }
    
    // Import libraries
    console.log('\nImporting libraries from CSV...');
    const librariesCsvPath = path.join(__dirname, '../../../Library_Delivery_Quantities_Round_1.csv');
    
    if (!fs.existsSync(librariesCsvPath)) {
      console.error(`ERROR: Could not find ${librariesCsvPath}`);
      console.error('Make sure Library_Delivery_Quantities_Round_1.csv is in the parent directory');
      process.exit(1);
    }
    
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

    console.log(`Found ${libraries.length} libraries to import`);
    
    let imported = 0;
    for (const lib of libraries) {
      try {
        const result = await db.one(
          `INSERT INTO libraries (name) VALUES ($1) 
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
           RETURNING id`,
          [lib.name]
        );
        
        // Set initial inventory
        const quantityPerType = Math.floor(lib.quantity / 3);
        const boxTypes = ['EL', 'Kids', 'Teens'];
        
        for (const boxType of boxTypes) {
          await db.none(
            `INSERT INTO box_inventory (library_id, box_type, quantity) 
             VALUES ($1, $2, $3)
             ON CONFLICT (library_id, box_type) 
             DO UPDATE SET quantity = EXCLUDED.quantity`,
            [result.id, boxType, quantityPerType]
          );
        }
        
        imported++;
        process.stdout.write(`\rImported: ${imported}/${libraries.length}`);
      } catch (err) {
        console.error(`\nError importing ${lib.name}:`, err.message);
      }
    }
    
    console.log(`\n\nSuccessfully imported ${imported} libraries`);
    
    // Import locations if file exists
    const locationsCsvPath = path.join(__dirname, '../../../library_locations.csv');
    if (fs.existsSync(locationsCsvPath)) {
      console.log('\nImporting library locations...');
      const locationsContent = fs.readFileSync(locationsCsvPath, 'utf-8');
      const locations = csv.parse(locationsContent, {
        columns: true,
        skip_empty_lines: true
      });
      
      let updated = 0;
      for (const record of locations) {
        if (record.region_2020 === 'Service Center') continue;
        
        const latitude = parseFloat(record.mailing_latitude);
        const longitude = parseFloat(record.mailing_longitude);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          try {
            const result = await db.result(
              `UPDATE libraries 
               SET short_name = $1, address = $2, latitude = $3, longitude = $4
               WHERE name = $5`,
              [
                record.library_short_name,
                record.mailing_address_long,
                latitude,
                longitude,
                record.library_official_name
              ]
            );
            
            if (result.rowCount > 0) {
              updated++;
            }
          } catch (err) {
            // Silent fail for location updates
          }
        }
      }
      console.log(`Updated ${updated} library locations`);
    }
    
    console.log('\n====================================');
    console.log('Import complete!');
    console.log('====================================');
    console.log('\nDefault admin login:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\nDon\'t forget to change the admin password!');
    
  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nCould not connect to database. Make sure:');
      console.error('1. DATABASE_URL is correct');
      console.error('2. Database is accessible from your network');
      console.error('3. SSL settings are correct');
    }
    process.exit(1);
  }
}

// Run import
importData().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});