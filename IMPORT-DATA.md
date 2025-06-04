# Data Import Guide for Railway PostgreSQL

This guide explains how to import your library data into the Railway PostgreSQL database.

## Prerequisites

1. Your app is deployed on Railway
2. PostgreSQL database is connected
3. You have the CSV files:
   - `Library_Delivery_Quantities_Round_1.csv`
   - `library_locations.csv` (optional)

## Method 1: Import from Local Machine

### Step 1: Get your DATABASE_URL

1. Go to your Railway project dashboard
2. Click on the **PostgreSQL** service
3. Go to **Variables** tab
4. Copy the `DATABASE_URL` value

### Step 2: Clone the repository locally

```bash
git clone https://github.com/bradleybonner/srp_boxes.git
cd srp_boxes/srp-tracker
```

### Step 3: Install dependencies

```bash
cd backend
npm install
```

### Step 4: Run the import script

```bash
# From the backend directory
DATABASE_URL="your-railway-database-url" node utils/import-remote.js
```

Replace `your-railway-database-url` with the actual URL from Railway.

## Method 2: Import Using Railway Shell

### Step 1: Access Railway Shell

```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to your project directory
cd srp_boxes/srp-tracker

# Open shell to your deployed service
railway run
```

### Step 2: Run import in Railway environment

```bash
cd backend
node utils/import-remote.js
```

## Method 3: Manual Import via SQL

If the above methods don't work, you can manually import data:

### Step 1: Connect to PostgreSQL

Use Railway's database credentials with a PostgreSQL client like:
- pgAdmin
- TablePlus
- DBeaver
- psql command line

### Step 2: Run these SQL commands

```sql
-- Create admin user (password: admin123)
INSERT INTO libraries (name) VALUES ('Admin Library');
INSERT INTO users (username, password, library_id, is_admin) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere', 1, true);

-- Import libraries
INSERT INTO libraries (name) VALUES 
('Federal Way'),
('Kent'),
('Renton'),
-- Add more libraries...
;

-- Set initial inventory
INSERT INTO box_inventory (library_id, box_type, quantity)
SELECT id, 'EL', 10 FROM libraries WHERE name != 'Admin Library'
UNION ALL
SELECT id, 'Kids', 10 FROM libraries WHERE name != 'Admin Library'
UNION ALL
SELECT id, 'Teens', 10 FROM libraries WHERE name != 'Admin Library';
```

## Troubleshooting

### Connection Refused Error

If you get `ECONNREFUSED` error:
1. Make sure you're using the correct DATABASE_URL
2. Check if your IP is allowed (Railway databases are publicly accessible)
3. Ensure SSL is enabled (should be automatic)

### Permission Denied

If you get permission errors:
1. Make sure the database user has CREATE/INSERT permissions
2. Check that tables were created successfully

### Data Already Exists

The import script will ask for confirmation if data already exists. You can:
- Choose 'y' to update existing data
- Choose 'n' to cancel

## Verify Import

After import, verify your data:

1. Login to your app as admin
2. Go to the Admin section
3. Check that libraries are listed
4. Verify inventory counts

## Next Steps

1. Change the admin password immediately
2. Create user accounts for each library
3. Update inventory quantities as needed
4. Test the application functionality

## Support

If you encounter issues:
1. Check the Railway logs for errors
2. Ensure DATABASE_URL is correctly set
3. Verify CSV files are in the correct location
4. Check database connection settings