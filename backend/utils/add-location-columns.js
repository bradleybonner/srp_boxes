const { db } = require('../src/database');

const addLocationColumns = () => {
  console.log('Adding location columns to libraries table...');
  
  // Check if columns already exist
  db.get("PRAGMA table_info(libraries)", (err, info) => {
    if (err) {
      console.error('Error checking table info:', err);
      return;
    }
    
    // Add columns one by one (SQLite doesn't support adding multiple columns at once)
    const columnsToAdd = [
      { name: 'short_name', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'latitude', type: 'REAL' },
      { name: 'longitude', type: 'REAL' }
    ];
    
    let added = 0;
    columnsToAdd.forEach(column => {
      db.run(`ALTER TABLE libraries ADD COLUMN ${column.name} ${column.type}`, (err) => {
        if (err) {
          if (err.message.includes('duplicate column name')) {
            console.log(`Column ${column.name} already exists`);
          } else {
            console.error(`Error adding column ${column.name}:`, err);
          }
        } else {
          added++;
          console.log(`Added column: ${column.name}`);
        }
        
        // Check if all columns processed
        if (added + columnsToAdd.filter(c => c.name !== column.name).length === columnsToAdd.length) {
          console.log('\nMigration complete! You can now run the import-locations.js script.');
          process.exit(0);
        }
      });
    });
  });
};

// Run migration
setTimeout(addLocationColumns, 1000);

module.exports = { addLocationColumns };