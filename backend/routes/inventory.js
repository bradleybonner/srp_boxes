const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { db } = require('../src/database-pg');
const { authenticateToken } = require('../middleware/auth');

// Get all inventory counts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await db.manyOrNone(
      `SELECT 
        bi.*, 
        l.name as library_name,
        l.latitude,
        l.longitude,
        l.address,
        bi.updated_at
       FROM box_inventory bi
       JOIN libraries l ON bi.library_id = l.id
       ORDER BY l.name, bi.box_type`
    );
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Get inventory for a specific library
router.get('/library/:libraryId', authenticateToken, async (req, res) => {
  const { libraryId } = req.params;
  
  try {
    const rows = await db.manyOrNone(
      `SELECT * FROM box_inventory WHERE library_id = $1 ORDER BY box_type`,
      [libraryId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Update inventory count
router.put('/update', [
  authenticateToken,
  body('library_id').isInt(),
  body('box_type').isIn(['EL', 'Kids', 'Teens']),
  body('quantity').isInt({ min: 0 })
], async (req, res) => {
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

  try {
    // Use transaction for both operations
    await db.tx(async t => {
      // Upsert inventory
      await t.none(
        `INSERT INTO box_inventory (library_id, box_type, quantity, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (library_id, box_type) 
         DO UPDATE SET quantity = $3, updated_at = CURRENT_TIMESTAMP`,
        [targetLibraryId, box_type, quantity]
      );

      // Log the change in history
      await t.none(
        `INSERT INTO inventory_history (library_id, box_type, quantity, changed_by)
         VALUES ($1, $2, $3, $4)`,
        [library_id, box_type, quantity, req.user.id]
      );
    });

    res.json({ message: 'Inventory updated successfully' });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Get inventory history
router.get('/history/:libraryId?', authenticateToken, async (req, res) => {
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
    query += ' WHERE ih.library_id = $1';
    params.push(libraryId);
  }
  
  query += ' ORDER BY ih.change_date DESC LIMIT 100';
  
  try {
    const rows = await db.manyOrNone(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Get inventory with locations for map
router.get('/map', authenticateToken, async (req, res) => {
  try {
    const rows = await db.manyOrNone(
      `SELECT 
        l.id as library_id,
        l.name as library_name,
        l.latitude,
        l.longitude,
        l.address,
        STRING_AGG(bi.box_type || ':' || bi.quantity, ',') as inventory,
        SUM(bi.quantity) as total_boxes
       FROM libraries l
       LEFT JOIN box_inventory bi ON l.id = bi.library_id
       WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL
       GROUP BY l.id, l.name, l.latitude, l.longitude, l.address`
    );
    
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
        total_boxes: parseInt(row.total_boxes) || 0
      };
    });
    
    res.json(mapData);
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;