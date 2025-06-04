const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { db } = require('../src/database');
const { authenticateToken } = require('../middleware/auth');

// Get all inventory counts
router.get('/', authenticateToken, (req, res) => {
  db.all(
    `SELECT 
      bi.*, 
      l.name as library_name,
      l.latitude,
      l.longitude,
      l.address,
      bi.updated_at
     FROM box_inventory bi
     JOIN libraries l ON bi.library_id = l.id
     ORDER BY l.name, bi.box_type`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Get inventory for a specific library
router.get('/library/:libraryId', authenticateToken, (req, res) => {
  const { libraryId } = req.params;
  
  db.all(
    `SELECT * FROM box_inventory WHERE library_id = ? ORDER BY box_type`,
    [libraryId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Update inventory count
router.put('/update', [
  authenticateToken,
  body('library_id').isInt(),
  body('box_type').isIn(['EL', 'Kids', 'Teens']),
  body('quantity').isInt({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { library_id, box_type, quantity } = req.body;
  
  // For non-admin users, always use their own library_id to prevent mix-ups
  const targetLibraryId = req.user.is_admin ? library_id : req.user.library_id;
  
  // Additional validation
  if (!targetLibraryId) {
    return res.status(400).json({ error: 'Invalid library ID' });
  }

  console.log(`Updating inventory: User ${req.user.username} (library_id: ${req.user.library_id}) updating library_id: ${targetLibraryId}, box_type: ${box_type}, quantity: ${quantity}`);

  db.run(
    `INSERT OR REPLACE INTO box_inventory (library_id, box_type, quantity, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [targetLibraryId, box_type, quantity],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Log the change in history
      db.run(
        `INSERT INTO inventory_history (library_id, box_type, quantity, changed_by)
         VALUES (?, ?, ?, ?)`,
        [library_id, box_type, quantity, req.user.id],
        (histErr) => {
          if (histErr) {
            console.error('Failed to log history:', histErr);
          }
        }
      );

      res.json({ message: 'Inventory updated successfully' });
    }
  );
});

// Get inventory history
router.get('/history/:libraryId?', authenticateToken, (req, res) => {
  const { libraryId } = req.params;
  let query = `
    SELECT 
      ih.*,
      l.name as library_name,
      u.username as changed_by_user
    FROM inventory_history ih
    JOIN libraries l ON ih.library_id = l.id
    JOIN users u ON ih.changed_by = u.id
  `;
  
  const params = [];
  if (libraryId) {
    query += ' WHERE ih.library_id = ?';
    params.push(libraryId);
  }
  
  query += ' ORDER BY ih.change_date DESC LIMIT 100';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get inventory with locations for map
router.get('/map', authenticateToken, (req, res) => {
  db.all(
    `SELECT 
      l.id as library_id,
      l.name as library_name,
      l.latitude,
      l.longitude,
      l.address,
      GROUP_CONCAT(bi.box_type || ':' || bi.quantity) as inventory,
      SUM(bi.quantity) as total_boxes
     FROM libraries l
     LEFT JOIN box_inventory bi ON l.id = bi.library_id
     WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL
     GROUP BY l.id`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Parse inventory data
      const mapData = rows.map(row => {
        const inventory = {};
        if (row.inventory) {
          row.inventory.split(',').forEach(item => {
            const [type, quantity] = item.split(':');
            inventory[type] = parseInt(quantity);
          });
        }
        
        return {
          library_id: row.library_id,
          library_name: row.library_name,
          latitude: row.latitude,
          longitude: row.longitude,
          address: row.address,
          inventory,
          total_boxes: row.total_boxes || 0
        };
      });
      
      res.json(mapData);
    }
  );
});

module.exports = router;