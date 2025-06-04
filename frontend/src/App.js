import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Charts from './pages/Charts';
import Admin from './pages/Admin';
import Map from './pages/Map';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><><Navbar /><Dashboard /></></PrivateRoute>} />
            <Route path="/inventory" element={<PrivateRoute><><Navbar /><Inventory /></></PrivateRoute>} />
            <Route path="/charts" element={<PrivateRoute><><Navbar /><Charts /></></PrivateRoute>} />
            <Route path="/map" element={<PrivateRoute><><Navbar /><Map /></></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute adminOnly><><Navbar /><Admin /></></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <ToastContainer position="bottom-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;