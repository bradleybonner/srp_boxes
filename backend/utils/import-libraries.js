const fs = require('fs');
const path = require('path');
const { db } = require('../src/database');

const importLibraries = () => {
  const csvPath = path.join(__dirname, '../../../Library_Delivery_Quantities_Round_1.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  // Skip header and filter out empty lines
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
    .filter(lib => lib.quantity > 0); // Only import libraries with actual quantities

  console.log(`Found ${libraries.length} libraries to import`);

  let imported = 0;
  
  libraries.forEach(lib => {
    db.run(
      'INSERT OR IGNORE INTO libraries (name) VALUES (?)',
      [lib.name],
      function(err) {
        if (err) {
          console.error(`Error importing ${lib.name}:`, err);
          return;
        }
        
        if (this.changes > 0) {
          imported++;
          const libraryId = this.lastID;
          
          // Initialize inventory for each box type
          const boxTypes = ['EL', 'Kids', 'Teens'];
          
          // Distribute the initial quantity across box types
          const quantityPerType = Math.floor(lib.quantity / 3);
          
          boxTypes.forEach(boxType => {
            db.run(
              'INSERT OR REPLACE INTO box_inventory (library_id, box_type, quantity) VALUES (?, ?, ?)',
              [libraryId, boxType, quantityPerType],
              (invErr) => {
                if (invErr) {
                  console.error(`Error setting inventory for ${lib.name} - ${boxType}:`, invErr);
                }
              }
            );
          });
          
          console.log(`Imported: ${lib.name} with ${quantityPerType} boxes per type`);
        }
      }
    );
  });
  
  setTimeout(() => {
    console.log(`Import complete. Imported ${imported} new libraries.`);
    process.exit(0);
  }, 3000);
};

// Wait for database to be initialized
setTimeout(importLibraries, 2000);

module.exports = { importLibraries };