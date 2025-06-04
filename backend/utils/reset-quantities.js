// Script to reset box quantities to specified values
// Usage: DATABASE_URL=your-railway-url node reset-quantities.js

require('dotenv').config();
const { db } = require('../src/database-pg');

async function resetQuantities() {
  const newQuantities = {
    'Kids': 45,
    'EL': 35,
    'Teens': 20
  };

  try {
    console.log('Connecting to database...');
    console.log('Database URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
    
    // Get all libraries
    const libraries = await db.many('SELECT id, name FROM libraries WHERE name != $1', ['Admin Library']);
    console.log(`Found ${libraries.length} libraries to update\n`);
    
    // Update quantities for each library
    let updated = 0;
    for (const library of libraries) {
      console.log(`Updating ${library.name}...`);
      
      for (const [boxType, quantity] of Object.entries(newQuantities)) {
        await db.none(
          `INSERT INTO box_inventory (library_id, box_type, quantity) 
           VALUES ($1, $2, $3)
           ON CONFLICT (library_id, box_type) 
           DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP`,
          [library.id, boxType, quantity]
        );
      }
      
      updated++;
      console.log(`✓ ${library.name} - Kids: ${newQuantities.Kids}, EL: ${newQuantities.EL}, Teens: ${newQuantities.Teens}`);
    }
    
    console.log('\n====================================');
    console.log(`Successfully updated ${updated} libraries!`);
    console.log('====================================');
    console.log('\nNew quantities:');
    console.log('- Kids: 45 boxes');
    console.log('- EL: 35 boxes');
    console.log('- Teens: 20 boxes');
    
    // Show summary
    const summary = await db.one(`
      SELECT 
        COUNT(DISTINCT library_id) as libraries,
        SUM(quantity) as total_boxes,
        SUM(CASE WHEN box_type = 'Kids' THEN quantity ELSE 0 END) as total_kids,
        SUM(CASE WHEN box_type = 'EL' THEN quantity ELSE 0 END) as total_el,
        SUM(CASE WHEN box_type = 'Teens' THEN quantity ELSE 0 END) as total_teens
      FROM box_inventory
      WHERE library_id IN (SELECT id FROM libraries WHERE name != 'Admin Library')
    `);
    
    console.log('\nInventory Summary:');
    console.log(`- Total Libraries: ${summary.libraries}`);
    console.log(`- Total Boxes: ${summary.total_boxes}`);
    console.log(`- Total Kids Boxes: ${summary.total_kids}`);
    console.log(`- Total EL Boxes: ${summary.total_el}`);
    console.log(`- Total Teens Boxes: ${summary.total_teens}`);
    
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nMake sure you are using the PUBLIC DATABASE_URL from Railway');
      console.error('It should look like: postgresql://postgres:xxx@viaduct.proxy.rlwy.net:12345/railway');
    }
    process.exit(1);
  }
}

// Run the reset
resetQuantities().then(() => {
  console.log('\nQuantities reset successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});