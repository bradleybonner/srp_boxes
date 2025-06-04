const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('../src/database-pg');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const rows = await db.any(
      `SELECT u.id, u.username, u.library_id, u.is_admin, u.created_at, l.name as library_name
       FROM users u
       JOIN libraries l ON u.library_id = l.id
       ORDER BY u.username`
    );
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
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

  try {
    const result = await db.one(
      'INSERT INTO users (username, password, library_id, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, library_id, is_admin',
      [username, hashedPassword, library_id, is_admin]
    );

    res.status(201).json(result);
  } catch (err) {
    console.error('Database error:', err);
    if (err.code === '23505') { // PostgreSQL unique violation error code
      return res.status(400).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: 'Database error' });
  }
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

  try {
    const user = await db.one(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    const validPassword = await bcrypt.compare(current_password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(new_password, 10);
    
    await db.none(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedNewPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;