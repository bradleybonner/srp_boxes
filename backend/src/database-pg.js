const pgp = require('pg-promise')();
const bcrypt = require('bcryptjs');

// Database connection
console.log('Environment:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

const connection = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/srp_tracker',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

console.log('Connecting to database:', connection.connectionString.replace(/:[^:@]+@/, ':****@'));

const db = pgp(connection);

const initDatabase = async () => {
  try {
    // Create tables
    await db.none(`
      CREATE TABLE IF NOT EXISTS libraries (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        short_name TEXT,
        address TEXT,
        latitude REAL,
        longitude REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.none(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        library_id INTEGER NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (library_id) REFERENCES libraries (id)
      )
    `);

    await db.none(`
      CREATE TABLE IF NOT EXISTS box_inventory (
        id SERIAL PRIMARY KEY,
        library_id INTEGER NOT NULL,
        box_type TEXT NOT NULL CHECK(box_type IN ('EL', 'Kids', 'Teens')),
        quantity INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (library_id) REFERENCES libraries (id),
        UNIQUE(library_id, box_type)
      )
    `);

    await db.none(`
      CREATE TABLE IF NOT EXISTS inventory_history (
        id SERIAL PRIMARY KEY,
        library_id INTEGER NOT NULL,
        box_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        changed_by INTEGER NOT NULL,
        change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (library_id) REFERENCES libraries (id),
        FOREIGN KEY (changed_by) REFERENCES users (id)
      )
    `);

    // Create function for updating timestamp
    await db.none(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger for updating timestamp
    await db.none(`
      DROP TRIGGER IF EXISTS update_box_inventory_updated_at ON box_inventory;
      CREATE TRIGGER update_box_inventory_updated_at
      BEFORE UPDATE ON box_inventory
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Helper function to seed initial admin user
const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const adminExists = await db.oneOrNone('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create admin library if it doesn't exist
    const library = await db.one(
      `INSERT INTO libraries (name) VALUES ($1) 
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
       RETURNING id`,
      ['Admin Library']
    );
    
    // Create admin user
    await db.none(
      `INSERT INTO users (username, password, library_id, is_admin) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      ['admin', hashedPassword, library.id, true]
    );
    
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error seeding admin:', error);
    throw error;
  }
};

module.exports = { db, initDatabase, seedAdmin };