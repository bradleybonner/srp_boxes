const { db } = require('../src/database');

console.log('Debugging Library IDs and Inventory...\n');

// First, let's see all libraries and their IDs
db.all('SELECT id, name, short_name FROM libraries ORDER BY id', (err, libraries) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log('=== ALL LIBRARIES ===');
  libraries.forEach(lib => {
    console.log(`ID: ${lib.id.toString().padStart(3)}, Name: ${lib.name.padEnd(30)}, Short: ${lib.short_name}`);
  });
  
  // Now let's check specific libraries
  console.log('\n=== CHECKING FEDERAL WAY AND BLACK DIAMOND ===');
  db.all(`
    SELECT l.id, l.name, l.short_name, 
           GROUP_CONCAT(bi.box_type || ':' || bi.quantity) as inventory
    FROM libraries l
    LEFT JOIN box_inventory bi ON l.id = bi.library_id
    WHERE l.name LIKE '%Federal Way%' OR l.name LIKE '%Black Diamond%'
    GROUP BY l.id
  `, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    results.forEach(r => {
      console.log(`\nLibrary: ${r.name}`);
      console.log(`ID: ${r.id}`);
      console.log(`Short Name: ${r.short_name}`);
      console.log(`Inventory: ${r.inventory}`);
    });
    
    // Check users for these libraries
    console.log('\n=== USERS FOR THESE LIBRARIES ===');
    db.all(`
      SELECT u.username, u.library_id, l.name as library_name
      FROM users u
      JOIN libraries l ON u.library_id = l.id
      WHERE l.name LIKE '%Federal Way%' OR l.name LIKE '%Black Diamond%'
    `, (err, users) => {
      if (err) {
        console.error('Error:', err);
        return;
      }
      
      users.forEach(u => {
        console.log(`User: ${u.username}, Library ID: ${u.library_id}, Library: ${u.library_name}`);
      });
      
      // Check box_inventory table structure
      console.log('\n=== BOX INVENTORY FOR FEDERAL WAY ===');
      db.all(`
        SELECT bi.*, l.name 
        FROM box_inventory bi
        JOIN libraries l ON bi.library_id = l.id
        WHERE l.name LIKE '%Federal Way%'
      `, (err, inv) => {
        if (err) {
          console.error('Error:', err);
          return;
        }
        
        inv.forEach(i => {
          console.log(`Library ID: ${i.library_id}, Name: ${i.name}, Box Type: ${i.box_type}, Quantity: ${i.quantity}`);
        });
        
        setTimeout(() => process.exit(0), 1000);
      });
    });
  });
});