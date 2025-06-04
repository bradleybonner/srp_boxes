const { db } = require('../src/database');

console.log('Setting initial quantities for all libraries...\n');

const quantities = {
  'Kids': 45,
  'EL': 35,
  'Teens': 20
};

// First, drop the trigger temporarily
db.run('DROP TRIGGER IF EXISTS update_inventory_history', (err) => {
  if (err) {
    console.error('Error dropping trigger:', err);
  } else {
    console.log('Temporarily disabled inventory history trigger.\n');
  }
  
  // Update all box inventory records
  db.all('SELECT id, name FROM libraries WHERE name != "Admin Library"', (err, libraries) => {
    if (err) {
      console.error('Error fetching libraries:', err);
      return;
    }
    
    console.log(`Found ${libraries.length} libraries to update.\n`);
    
    let toUpdate = libraries.length * 3; // 3 box types per library
    let updated = 0;
    let errors = 0;
    
    libraries.forEach(library => {
      Object.entries(quantities).forEach(([boxType, quantity]) => {
        db.run(
          'UPDATE box_inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE library_id = ? AND box_type = ?',
          [quantity, library.id, boxType],
          function(err) {
            if (err) {
              console.error(`Error updating ${library.name} - ${boxType}:`, err);
              errors++;
            } else if (this.changes > 0) {
              updated++;
              console.log(`✅ Set ${library.name} - ${boxType}: ${quantity}`);
            } else {
              console.log(`⚠️  No record found for ${library.name} - ${boxType}`);
            }
            
            // Check if we're done
            if (updated + errors >= toUpdate || updated + errors >= libraries.length * 3 - 10) {
              // Recreate the trigger
              setTimeout(() => {
                db.run(`CREATE TRIGGER IF NOT EXISTS update_inventory_history
                  AFTER UPDATE ON box_inventory
                  WHEN NEW.quantity != OLD.quantity
                  BEGIN
                    INSERT INTO inventory_history (library_id, box_type, quantity, changed_by)
                    VALUES (NEW.library_id, NEW.box_type, NEW.quantity, 1);
                  END`, (err) => {
                  if (err) {
                    console.error('Error recreating trigger:', err);
                  } else {
                    console.log('\nRe-enabled inventory history trigger.');
                  }
                  
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
                });
              }, 1000);
            }
          }
        );
      });
    });
  });
});