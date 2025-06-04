const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { db } = require('../src/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all libraries
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM libraries ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create new library (admin only)
router.post('/', [
  authenticateToken,
  isAdmin,
  body('name').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name } = req.body;

  db.run(
    'INSERT INTO libraries (name) VALUES (?)',
    [name],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Library already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }

      const libraryId = this.lastID;
      
      // Initialize inventory for all box types
      const boxTypes = ['EL', 'Kids', 'Teens'];
      boxTypes.forEach(boxType => {
        db.run(
          'INSERT INTO box_inventory (library_id, box_type, quantity) VALUES (?, ?, 0)',
          [libraryId, boxType]
        );
      });

      res.status(201).json({ id: libraryId, name });
    }
  );
});

module.exports = router;