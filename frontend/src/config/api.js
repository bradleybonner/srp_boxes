// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // In production, frontend is served by backend
  : 'http://localhost:3001';

export default API_BASE_URL;