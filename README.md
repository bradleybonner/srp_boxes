# Summer Reading Prize Box Tracker

A web application for libraries to track and manage their Summer Reading Prize Box inventory.

## Features

- **Multi-library support**: Each library has its own login and inventory
- **Real-time inventory tracking**: Track quantities for EL (Early Learning), Kids, and Teens boxes
- **Low stock alerts**: Visual warnings when inventory is low (≤10) or out of stock
- **Dashboard view**: See all libraries' inventory at a glance
- **Historical tracking**: View inventory changes over time with charts
- **Admin panel**: Manage users and libraries

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm

### Backend Setup

1. Navigate to the backend directory:
```bash
cd srp-tracker/backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm start
```

The backend will run on http://localhost:3001

### Frontend Setup

1. In a new terminal, navigate to the frontend directory:
```bash
cd srp-tracker/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will run on http://localhost:3000

### Import Library Data

To import the initial library data from the CSV file:

```bash
cd srp-tracker/backend
node utils/import-libraries.js
```

## Default Login

- **Username**: admin
- **Password**: admin123

## Usage

1. Login with the admin account
2. Go to the Admin panel to create new libraries and users
3. Each library user can:
   - View all libraries' inventory on the Dashboard
   - Update their own library's inventory
   - View historical charts and analytics

## Box Types

The system tracks three types of prize boxes:
- **EL**: Early Learning
- **Kids**: Kids
- **Teens**: Teens

## Features Detail

### Dashboard
- View all libraries' current inventory
- See alerts for low stock (≤10 boxes) and out of stock items
- Color-coded status indicators

### My Inventory
- Update your library's box counts
- Quick increment/decrement buttons
- Real-time stock status

### Charts
- View inventory levels over time
- Current inventory bar chart
- Low stock summary table
- Filter by individual library or view all

### Admin Panel
- Create new libraries
- Create new users (assign to libraries)
- View all users and libraries
- Import libraries from CSV