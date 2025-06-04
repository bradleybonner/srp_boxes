const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database(path.join(__dirname, '../srp_tracker.db'));

const initDatabase = () => {
  db.serialize(() => {
    // Libraries table
    db.run(`CREATE TABLE IF NOT EXISTS libraries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      short_name TEXT,
      address TEXT,
      latitude REAL,
      longitude REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      library_id INTEGER NOT NULL,
      is_admin BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (library_id) REFERENCES libraries (id)
    )`);

    // Box inventory table
    db.run(`CREATE TABLE IF NOT EXISTS box_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      library_id INTEGER NOT NULL,
      box_type TEXT NOT NULL CHECK(box_type IN ('EL', 'Kids', 'Teens')),
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (library_id) REFERENCES libraries (id),
      UNIQUE(library_id, box_type)
    )`);

    // Inventory history table for tracking changes over time
    db.run(`CREATE TABLE IF NOT EXISTS inventory_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      library_id INTEGER NOT NULL,
      box_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      changed_by INTEGER NOT NULL,
      change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (library_id) REFERENCES libraries (id),
      FOREIGN KEY (changed_by) REFERENCES users (id)
    )`);

    // Create trigger to update inventory history
    db.run(`CREATE TRIGGER IF NOT EXISTS update_inventory_history
      AFTER UPDATE ON box_inventory
      WHEN NEW.quantity != OLD.quantity
      BEGIN
        INSERT INTO inventory_history (library_id, box_type, quantity, changed_by)
        VALUES (NEW.library_id, NEW.box_type, NEW.quantity, 
          (SELECT id FROM users WHERE id = NEW.library_id LIMIT 1));
      END`);
  });
};

// Helper function to seed initial admin user
const seedAdmin = async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  return new Promise((resolve, reject) => {
    db.run(`INSERT OR IGNORE INTO libraries (name) VALUES ('Admin Library')`, [], function(err) {
      if (err) return reject(err);
      
      const libraryId = this.lastID || 1;
      
      db.run(
        `INSERT OR IGNORE INTO users (username, password, library_id, is_admin) 
         VALUES (?, ?, ?, ?)`,
        ['admin', hashedPassword, libraryId, 1],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  });
};

module.exports = { db, initDatabase, seedAdmin };