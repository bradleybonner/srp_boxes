const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../src/database-pg');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all libraries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await db.any('SELECT * FROM libraries ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching libraries:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Create new library (admin only)
router.post('/', [
  authenticateToken,
  isAdmin,
  body('name').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name } = req.body;

  try {
    // Start a transaction
    await db.tx(async t => {
      // Insert the library and get the ID back
      const library = await t.one(
        'INSERT INTO libraries (name) VALUES ($1) RETURNING id',
        [name]
      );
      
      const libraryId = library.id;
      
      // Initialize inventory for all box types
      const boxTypes = ['EL', 'Kids', 'Teens'];
      const queries = boxTypes.map(boxType => 
        t.none(
          'INSERT INTO box_inventory (library_id, box_type, quantity) VALUES ($1, $2, 0)',
          [libraryId, boxType]
        )
      );
      
      await t.batch(queries);
      
      res.status(201).json({ id: libraryId, name });
    });
  } catch (err) {
    console.error('Error creating library:', err);
    if (err.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(400).json({ error: 'Library already exists' });
    }
    return res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;