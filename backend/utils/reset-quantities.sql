-- SQL script to reset all box quantities
-- Can be run directly in PostgreSQL client

-- Update all Kids boxes to 45
UPDATE box_inventory 
SET quantity = 45, updated_at = CURRENT_TIMESTAMP 
WHERE box_type = 'Kids' 
AND library_id IN (SELECT id FROM libraries WHERE name != 'Admin Library');

-- Update all EL boxes to 35
UPDATE box_inventory 
SET quantity = 35, updated_at = CURRENT_TIMESTAMP 
WHERE box_type = 'EL' 
AND library_id IN (SELECT id FROM libraries WHERE name != 'Admin Library');

-- Update all Teens boxes to 20
UPDATE box_inventory 
SET quantity = 20, updated_at = CURRENT_TIMESTAMP 
WHERE box_type = 'Teens' 
AND library_id IN (SELECT id FROM libraries WHERE name != 'Admin Library');

-- Show results
SELECT 
  l.name as library_name,
  bi.box_type,
  bi.quantity,
  bi.updated_at
FROM box_inventory bi
JOIN libraries l ON bi.library_id = l.id
WHERE l.name != 'Admin Library'
ORDER BY l.name, bi.box_type;