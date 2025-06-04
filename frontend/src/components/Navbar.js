import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1>SRP Box Tracker</h1>
        <div className="navbar-nav">
          <Link to="/">Dashboard</Link>
          <Link to="/inventory">My Inventory</Link>
          <Link to="/charts">Charts</Link>
          <Link to="/map">Map</Link>
          {user?.is_admin === 1 && <Link to="/admin">Admin</Link>}
          <span>Welcome, {user?.username} ({user?.library_name})</span>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;