const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const { db } = require('../src/database');

const importLocations = () => {
  const csvPath = path.join(__dirname, '../../../library_locations.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Found ${records.length} location records`);

  let updated = 0;
  let errors = 0;

  // Create a name mapping for common variations
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
    'Vashon': ['Vashon']
  };

  records.forEach(record => {
    const libraryName = record.library_official_name;
    const shortName = record.library_short_name;
    const address = record.mailing_address_long;
    const latitude = parseFloat(record.mailing_latitude);
    const longitude = parseFloat(record.mailing_longitude);

    // Skip service center entries and entries without valid coordinates
    if (record.region_2020 === 'Service Center' || !address || !latitude || !longitude) {
      return;
    }

    // Get possible name variations
    const possibleNames = nameMapping[libraryName] || [libraryName];
    
    // Try each possible name
    possibleNames.forEach(name => {
      db.run(
        `UPDATE libraries 
         SET short_name = ?, address = ?, latitude = ?, longitude = ?
         WHERE name = ? AND (latitude IS NULL OR longitude IS NULL)`,
        [shortName, address, latitude, longitude, name],
        function(err) {
          if (err) {
            console.error(`Error updating ${name}:`, err);
            errors++;
          } else if (this.changes > 0) {
            updated++;
            console.log(`Updated location for: ${name} (${libraryName})`);
          }
        }
      );
    });
  });

  setTimeout(() => {
    console.log(`\nLocation import complete:`);
    console.log(`- Updated: ${updated} libraries`);
    console.log(`- Errors: ${errors}`);
    process.exit(0);
  }, 3000);
};

// Add csv-parse dependency first
console.log('Note: You need to install csv-parse first:');
console.log('cd srp-tracker/backend && npm install csv-parse');

// Wait for database to be initialized
setTimeout(importLocations, 2000);

module.exports = { importLocations };