# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SRP-Tracker is a Summer Reading Prize Box Tracker for libraries. It's a full-stack web application with:
- React frontend (SPA)
- Express.js backend with SQLite database
- JWT authentication
- Multi-library support with user accounts

## Essential Commands

### Backend Development
```bash
cd srp-tracker/backend
npm install                         # Install dependencies
npm run dev                         # Development server with auto-reload (nodemon)
npm start                          # Production server
node utils/import-libraries.js     # Import library data from CSV
```

### Frontend Development
```bash
cd srp-tracker/frontend
npm install                         # Install dependencies
npm start                          # Development server (port 3000)
npm run build                      # Production build
```

### Database Management
The SQLite database (`srp_tracker.db`) has these main tables:
- `libraries` - Library info with geolocation
- `users` - User accounts linked to libraries
- `box_inventory` - Current box counts (EL, Kids, Teens)
- `inventory_history` - Automatic tracking via triggers

Default admin credentials: username: `admin`, password: `admin123`

## Architecture Notes

### API Structure
Backend routes in `/backend/routes/`:
- `/api/auth/*` - Login/authentication
- `/api/inventory/*` - Box inventory CRUD
- `/api/libraries/*` - Library management
- `/api/users/*` - User management

All protected routes require JWT token in Authorization header.

### Frontend State Management
- Authentication context in `/frontend/src/context/AuthContext.js`
- Protected routes via `PrivateRoute` component
- Axios interceptor adds auth token automatically

### Key Dependencies
- Backend: Express, SQLite3, bcryptjs, jsonwebtoken, express-validator
- Frontend: React 18, React Router 6, Axios, Chart.js, Leaflet