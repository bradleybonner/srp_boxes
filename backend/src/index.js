require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase, seedAdmin } = require('./database-pg');

// Import routes
const authRoutes = require('../routes/auth');
const libraryRoutes = require('../routes/libraries');
const inventoryRoutes = require('../routes/inventory');
const userRoutes = require('../routes/users');

const app = express();
const PORT = process.env.PORT || 3001;
const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    await seedAdmin();
    console.log('Database initialized and admin user seeded');
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
};

startServer();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});