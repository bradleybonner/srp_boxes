const { db } = require('../src/database');

console.log('Setting initial quantities for all libraries...\n');

const quantities = {
  'Kids': 45,
  'EL': 35,
  'Teens': 20
};

// Update all box inventory records
db.all('SELECT id, name FROM libraries WHERE name != "Admin Library"', (err, libraries) => {
  if (err) {
    console.error('Error fetching libraries:', err);
    return;
  }
  
  console.log(`Found ${libraries.length} libraries to update.\n`);
  
  let updated = 0;
  let errors = 0;
  
  libraries.forEach(library => {
    Object.entries(quantities).forEach(([boxType, quantity]) => {
      db.run(
        'UPDATE box_inventory SET quantity = ? WHERE library_id = ? AND box_type = ?',
        [quantity, library.id, boxType],
        function(err) {
          if (err) {
            console.error(`Error updating ${library.name} - ${boxType}:`, err);
            errors++;
          } else if (this.changes > 0) {
            updated++;
            console.log(`✅ Set ${library.name} - ${boxType}: ${quantity}`);
          }
        }
      );
    });
  });
  
  setTimeout(() => {
    console.log('\n====================================');
    console.log('Initial quantity setup complete!');
    console.log('====================================');
    console.log(`✅ Updated: ${updated} inventory records`);
    console.log(`❌ Errors: ${errors}`);
    console.log('\nAll libraries now have:');
    console.log('  Kids: 45 boxes');
    console.log('  EL: 35 boxes');
    console.log('  Teens: 20 boxes');
    process.exit(0);
  }, 2000);
});