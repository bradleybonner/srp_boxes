const { db } = require('../src/database');

console.log('Checking database integrity...\n');

// Check libraries
console.log('=== LIBRARIES ===');
db.all('SELECT id, name FROM libraries ORDER BY id', (err, libraries) => {
  if (err) {
    console.error('Error fetching libraries:', err);
    return;
  }
  
  libraries.forEach(lib => {
    console.log(`ID: ${lib.id}, Name: ${lib.name}`);
  });
  
  console.log('\n=== USERS ===');
  // Check users
  db.all('SELECT u.id, u.username, u.library_id, l.name as library_name FROM users u JOIN libraries l ON u.library_id = l.id ORDER BY u.id', (err, users) => {
    if (err) {
      console.error('Error fetching users:', err);
      return;
    }
    
    users.forEach(user => {
      console.log(`User: ${user.username}, Library ID: ${user.library_id}, Library Name: ${user.library_name}`);
    });
    
    console.log('\n=== BOX INVENTORY ===');
    // Check inventory
    db.all(`
      SELECT bi.*, l.name as library_name 
      FROM box_inventory bi 
      JOIN libraries l ON bi.library_id = l.id 
      WHERE l.name IN ('Federal Way', 'Woodmont')
      ORDER BY l.name, bi.box_type
    `, (err, inventory) => {
      if (err) {
        console.error('Error fetching inventory:', err);
        return;
      }
      
      inventory.forEach(item => {
        console.log(`Library: ${item.library_name} (ID: ${item.library_id}), Type: ${item.box_type}, Quantity: ${item.quantity}`);
      });
      
      setTimeout(() => process.exit(0), 1000);
    });
  });
});