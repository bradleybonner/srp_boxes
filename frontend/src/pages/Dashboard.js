import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getBoxTypeDisplayName } from '../utils/boxTypes';

const Dashboard = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [libraryGroups, setLibraryGroups] = useState({});

  const formatLastUpdated = (dateString) => {
    if (!dateString) return 'Never updated';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    fetchInventory();
    
    // Refresh data every 30 seconds to show latest updates
    const interval = setInterval(() => {
      fetchInventory();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get('/api/inventory');
      setInventory(response.data);
      
      // Group by library
      const groups = {};
      response.data.forEach(item => {
        if (!groups[item.library_id]) {
          groups[item.library_id] = {
            library_name: item.library_name,
            items: []
          };
        }
        groups[item.library_id].items.push(item);
      });
      setLibraryGroups(groups);
    } catch (error) {
      toast.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (quantity) => {
    if (quantity === 0) return 'out';
    if (quantity <= 10) return 'low';
    return '';
  };

  const getAlerts = () => {
    const alerts = [];
    Object.values(libraryGroups).forEach(library => {
      library.items.forEach(item => {
        if (item.quantity === 0) {
          alerts.push({
            type: 'danger',
            message: `${library.library_name} is OUT of ${getBoxTypeDisplayName(item.box_type)} boxes!`
          });
        } else if (item.quantity <= 10) {
          alerts.push({
            type: 'warning',
            message: `${library.library_name} is running LOW on ${getBoxTypeDisplayName(item.box_type)} boxes (${item.quantity} remaining)`
          });
        }
      });
    });
    return alerts;
  };

  if (loading) {
    return <div className="loading">Loading inventory...</div>;
  }

  const alerts = getAlerts();

  // Get the current user's library data
  const userLibrary = libraryGroups[user.library_id];

  return (
    <div className="container">
      <h2>All Libraries Inventory Dashboard</h2>

      {userLibrary && (
        <div className="card" style={{ 
          marginBottom: '30px', 
          backgroundColor: '#e3f2fd',
          border: '2px solid #2196F3'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#1976d2' }}>
            Your Library: {user.library_name}
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '15px',
            marginBottom: '10px'
          }}>
            {userLibrary.items.map(item => (
              <div 
                key={item.id}
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  backgroundColor: item.quantity === 0 ? '#ffebee' : item.quantity <= 10 ? '#fff3e0' : 'white',
                  borderRadius: '8px',
                  border: `2px solid ${item.quantity === 0 ? '#ef5350' : item.quantity <= 10 ? '#ff9800' : '#4caf50'}`,
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '500',
                  color: item.quantity === 0 ? '#c62828' : item.quantity <= 10 ? '#ef6c00' : '#666',
                  lineHeight: '1.2'
                }}>
                  {getBoxTypeDisplayName(item.box_type, true)}
                </div>
                <div style={{ 
                  fontSize: '42px', 
                  fontWeight: 'bold',
                  color: item.quantity === 0 ? '#c62828' : item.quantity <= 10 ? '#ef6c00' : '#2e7d32',
                  lineHeight: '1'
                }}>
                  {item.quantity}
                </div>
                {item.quantity === 0 && (
                  <div style={{ fontSize: '12px', color: '#c62828', fontWeight: 'bold' }}>OUT OF STOCK</div>
                )}
                {item.quantity > 0 && item.quantity <= 10 && (
                  <div style={{ fontSize: '12px', color: '#ef6c00', fontWeight: 'bold' }}>LOW STOCK</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
            Last updated: {(() => {
              const mostRecent = userLibrary.items.reduce((latest, item) => {
                if (!item.updated_at) return latest;
                const itemDate = new Date(item.updated_at);
                return itemDate > latest ? itemDate : latest;
              }, new Date(0));
              
              return mostRecent.getTime() === 0 ? 'Never' : formatLastUpdated(mostRecent);
            })()}
          </div>
        </div>
      )}

      <div className="inventory-grid">
        {Object.entries(libraryGroups)
          .sort(([, a], [, b]) => a.library_name.localeCompare(b.library_name))
          .map(([libraryId, library]) => (
          <div key={libraryId} className="inventory-card">
            <h3>{library.library_name}</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '10px',
              marginTop: '15px'
            }}>
              {library.items.map(item => (
                <div 
                  key={item.id} 
                  style={{
                    backgroundColor: item.quantity === 0 ? '#ffebee' : item.quantity <= 10 ? '#fff3e0' : '#f5f5f5',
                    border: `2px solid ${item.quantity === 0 ? '#ef5350' : item.quantity <= 10 ? '#ff9800' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    padding: '15px',
                    position: 'relative',
                    textAlign: 'center',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  {item.quantity === 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      backgroundColor: '#d32f2f',
                      color: 'white',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      borderBottomLeftRadius: '4px'
                    }}>
                      OUT
                    </div>
                  )}
                  {item.quantity > 0 && item.quantity <= 10 && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      backgroundColor: '#f57c00',
                      color: 'white',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      borderBottomLeftRadius: '4px'
                    }}>
                      LOW
                    </div>
                  )}
                  <div style={{ 
                    fontSize: '14px',
                    fontWeight: item.quantity <= 10 ? '600' : '500',
                    color: item.quantity === 0 ? '#c62828' : item.quantity <= 10 ? '#ef6c00' : '#666',
                    lineHeight: '1.2',
                    marginBottom: '8px'
                  }}>
                    {getBoxTypeDisplayName(item.box_type)}
                  </div>
                  <div style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: item.quantity === 0 ? '#c62828' : item.quantity <= 10 ? '#ef6c00' : '#2e7d32',
                    lineHeight: '1'
                  }}>
                    {item.quantity}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              Last updated: {(() => {
                const mostRecent = library.items.reduce((latest, item) => {
                  if (!item.updated_at) return latest;
                  const itemDate = new Date(item.updated_at);
                  return itemDate > latest ? itemDate : latest;
                }, new Date(0));
                
                return mostRecent.getTime() === 0 ? 'Never' : formatLastUpdated(mostRecent);
              })()}
            </div>
          </div>
        ))}
      </div>
      
      {alerts.length > 0 && (
        <div className="alerts-section" style={{ marginTop: '30px' }}>
          <h3 style={{ marginBottom: '15px' }}>Inventory Alerts</h3>
          {alerts.map((alert, index) => (
            <div key={index} className={`alert alert-${alert.type}`}>
              {alert.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;