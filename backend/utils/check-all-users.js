const { db } = require('../src/database');

console.log('Checking all users and their library assignments...\n');

db.all(`
  SELECT u.id, u.username, u.library_id, u.is_admin, l.name as library_name
  FROM users u
  LEFT JOIN libraries l ON u.library_id = l.id
  ORDER BY u.id
`, (err, users) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log('=== ALL USERS ===');
  console.log('User ID | Username         | Library ID | Library Name                  | Admin');
  console.log('--------|------------------|------------|-------------------------------|------');
  
  users.forEach(user => {
    console.log(
      `${user.id.toString().padStart(7)} | ` +
      `${user.username.padEnd(16)} | ` +
      `${user.library_id.toString().padStart(10)} | ` +
      `${(user.library_name || 'N/A').padEnd(30)} | ` +
      `${user.is_admin ? 'Yes' : 'No'}`
    );
  });
  
  console.log('\n=== POTENTIAL ISSUES ===');
  
  // Check for library_id = 18 (Federal Way)
  const federalWayUsers = users.filter(u => u.library_id === 18);
  if (federalWayUsers.length === 0) {
    console.log('⚠️  No users assigned to Federal Way (ID: 18)');
    console.log('   You might be logging in as a user from a different library');
  } else {
    console.log('✓ Federal Way users:', federalWayUsers.map(u => u.username).join(', '));
  }
  
  // Check if any user has library_id that doesn't match any library
  const orphanUsers = users.filter(u => !u.library_name && u.username !== 'admin');
  if (orphanUsers.length > 0) {
    console.log('\n⚠️  Users with invalid library_id:');
    orphanUsers.forEach(u => {
      console.log(`   - ${u.username} (library_id: ${u.library_id})`);
    });
  }
  
  setTimeout(() => process.exit(0), 1000);
});