const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('../src/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', authenticateToken, isAdmin, (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.library_id, u.is_admin, u.created_at, l.name as library_name
     FROM users u
     JOIN libraries l ON u.library_id = l.id
     ORDER BY u.username`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Create new user (admin only)
router.post('/', [
  authenticateToken,
  isAdmin,
  body('username').notEmpty().trim(),
  body('password').isLength({ min: 6 }),
  body('library_id').isInt(),
  body('is_admin').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, library_id, is_admin = false } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    'INSERT INTO users (username, password, library_id, is_admin) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, library_id, is_admin ? 1 : 0],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(201).json({ 
        id: this.lastID, 
        username, 
        library_id, 
        is_admin 
      });
    }
  );
});

// Change password
router.put('/change-password', [
  authenticateToken,
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  db.get(
    'SELECT password FROM users WHERE id = ?',
    [userId],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const validPassword = await bcrypt.compare(current_password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedNewPassword = await bcrypt.hash(new_password, 10);
      
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedNewPassword, userId],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ error: 'Failed to update password' });
          }
          res.json({ message: 'Password changed successfully' });
        }
      );
    }
  );
});

module.exports = router;