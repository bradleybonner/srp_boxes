import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    library_id: '',
    is_admin: false
  });
  const [newLibrary, setNewLibrary] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, librariesRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/libraries')
      ]);
      setUsers(usersRes.data);
      setLibraries(librariesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users', {
        ...newUser,
        library_id: parseInt(newUser.library_id)
      });
      toast.success('User created successfully');
      setNewUser({ username: '', password: '', library_id: '', is_admin: false });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleCreateLibrary = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/libraries', { name: newLibrary });
      toast.success('Library created successfully');
      setNewLibrary('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create library');
    }
  };

  const handleImportLibraries = async () => {
    try {
      const result = await axios.post('/api/admin/import-libraries');
      toast.success(result.data.message);
      fetchData();
    } catch (error) {
      toast.error('Failed to import libraries');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <h2>Admin Dashboard</h2>

      <div className="card">
        <h3>Create New Library</h3>
        <form onSubmit={handleCreateLibrary}>
          <div className="form-group">
            <label>Library Name</label>
            <input
              type="text"
              value={newLibrary}
              onChange={(e) => setNewLibrary(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn">Create Library</button>
        </form>
      </div>

      <div className="card">
        <h3>Create New User</h3>
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
              minLength="6"
            />
          </div>
          <div className="form-group">
            <label>Library</label>
            <select
              value={newUser.library_id}
              onChange={(e) => setNewUser({ ...newUser, library_id: e.target.value })}
              required
            >
              <option value="">Select Library</option>
              {libraries.map(lib => (
                <option key={lib.id} value={lib.id}>{lib.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={newUser.is_admin}
                onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
              />
              {' '}Admin User
            </label>
          </div>
          <button type="submit" className="btn">Create User</button>
        </form>
      </div>

      <div className="card">
        <h3>All Users</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Username</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Library</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{user.username}</td>
                <td style={{ padding: '10px' }}>{user.library_name}</td>
                <td style={{ padding: '10px' }}>{user.is_admin ? 'Admin' : 'User'}</td>
                <td style={{ padding: '10px' }}>{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>All Libraries</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {libraries.map(library => (
              <tr key={library.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{library.id}</td>
                <td style={{ padding: '10px' }}>{library.name}</td>
                <td style={{ padding: '10px' }}>{new Date(library.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin;