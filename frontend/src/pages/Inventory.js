import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Inventory = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [libraries, setLibraries] = useState([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState(user.library_id);
  const [selectedLibraryName, setSelectedLibraryName] = useState(user.library_name);

  useEffect(() => {
    fetchLibraries();
    fetchInventory(user.library_id);
  }, []);

  useEffect(() => {
    if (selectedLibraryId) {
      fetchInventory(selectedLibraryId);
    }
  }, [selectedLibraryId]);

  const fetchLibraries = async () => {
    try {
      const response = await axios.get('/api/libraries');
      setLibraries(response.data);
    } catch (error) {
      toast.error('Failed to fetch libraries');
    }
  };

  const fetchInventory = async (libraryId) => {
    try {
      const response = await axios.get(`/api/inventory/library/${libraryId}`);
      setInventory(response.data);
    } catch (error) {
      toast.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (boxType, newQuantity) => {
    if (newQuantity < 0) return;
    
    // Show warning if updating another library's inventory
    if (selectedLibraryId !== user.library_id) {
      const confirmUpdate = window.confirm(
        `⚠️ WARNING: You are updating inventory for ${selectedLibraryName}, not your own library (${user.library_name}).\n\nAre you sure you want to continue?`
      );
      if (!confirmUpdate) return;
    }
    
    setUpdating({ ...updating, [boxType]: true });

    try {
      await axios.put('/api/inventory/update', {
        library_id: selectedLibraryId,
        box_type: boxType,
        quantity: parseInt(newQuantity)
      });
      
      toast.success(`${boxType} quantity updated successfully for ${selectedLibraryName}`);
      fetchInventory(selectedLibraryId);
    } catch (error) {
      toast.error('Failed to update quantity');
    } finally {
      setUpdating({ ...updating, [boxType]: false });
    }
  };

  const handleQuantityChange = (boxType, value) => {
    const updatedInventory = inventory.map(item => 
      item.box_type === boxType 
        ? { ...item, quantity: value } 
        : item
    );
    setInventory(updatedInventory);
  };


  if (loading) {
    return <div className="loading">Loading inventory...</div>;
  }

  const handleLibraryChange = (e) => {
    const libraryId = parseInt(e.target.value);
    const library = libraries.find(l => l.id === libraryId);
    setSelectedLibraryId(libraryId);
    setSelectedLibraryName(library?.name || '');
  };

  return (
    <div className="container">
      <h2>Manage Library Inventory</h2>
      
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>Select Library</h3>
        <div className="form-group">
          <select 
            value={selectedLibraryId} 
            onChange={handleLibraryChange}
            style={{ width: '100%', padding: '10px', fontSize: '16px' }}
          >
            <option value={user.library_id}>{user.library_name} (Your Library)</option>
            <optgroup label="Other Libraries">
              {libraries
                .filter(lib => lib.id !== user.library_id)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(lib => (
                  <option key={lib.id} value={lib.id}>{lib.name}</option>
                ))}
            </optgroup>
          </select>
        </div>
        
        {selectedLibraryId !== user.library_id && (
          <div className="alert alert-warning" style={{ marginTop: '15px' }}>
            <strong>⚠️ Warning:</strong> You are viewing/editing inventory for <strong>{selectedLibraryName}</strong>, 
            not your own library. Any changes will be logged and tracked.
          </div>
        )}
      </div>
      
      <div className="card">
        <h3>Current Box Quantities for {selectedLibraryName}</h3>
        
        <div style={{ display: 'grid', gap: '30px', marginTop: '20px' }}>
          {inventory.map(item => (
            <div key={item.box_type} style={{ 
              padding: '20px', 
              backgroundColor: item.quantity === 0 ? '#ffebee' : item.quantity <= 10 ? '#fff3e0' : '#f5f5f5',
              borderRadius: '8px',
              border: `2px solid ${item.quantity === 0 ? '#ef5350' : item.quantity <= 10 ? '#ff9800' : '#e0e0e0'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, fontSize: '20px' }}>{item.box_type} Boxes</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: item.quantity === 0 ? '#c62828' : item.quantity <= 10 ? '#ef6c00' : '#2e7d32' }}>
                  {item.quantity}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.box_type, e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      updateQuantity(item.box_type, item.quantity);
                    }
                  }}
                  min="0"
                  style={{ width: '100px', fontSize: '16px', padding: '8px' }}
                />
                <button
                  className="btn"
                  onClick={() => updateQuantity(item.box_type, item.quantity)}
                  disabled={updating[item.box_type]}
                >
                  {updating[item.box_type] ? 'Updating...' : 'Update'}
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const newQty = Math.max(0, parseInt(item.quantity) - 1);
                    handleQuantityChange(item.box_type, newQty);
                    updateQuantity(item.box_type, newQty);
                  }}
                  disabled={item.quantity === 0}
                  title="Decrease by 1"
                >
                  -1
                </button>
                
                <button
                  className="btn"
                  onClick={() => {
                    const newQty = parseInt(item.quantity) + 1;
                    handleQuantityChange(item.box_type, newQty);
                    updateQuantity(item.box_type, newQty);
                  }}
                  title="Increase by 1"
                >
                  +1
                </button>
                
                {item.quantity === 0 && (
                  <span style={{ color: '#c62828', fontWeight: 'bold', marginLeft: 'auto' }}>OUT OF STOCK</span>
                )}
                {item.quantity > 0 && item.quantity <= 10 && (
                  <span style={{ color: '#ef6c00', fontWeight: 'bold', marginLeft: 'auto' }}>LOW STOCK</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
          <h4 style={{ marginTop: 0 }}>Quick Set All</h4>
          <p style={{ marginBottom: '15px', color: '#666' }}>Set all box types to the same quantity:</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[0, 10, 25, 50, 100].map(preset => (
              <button
                key={preset}
                className={preset === 0 ? "btn btn-danger" : "btn btn-secondary"}
                onClick={async () => {
                  let confirmMessage = `Are you sure you want to set all quantities to ${preset}?`;
                  
                  if (selectedLibraryId !== user.library_id) {
                    confirmMessage = `⚠️ WARNING: You are about to set all quantities to ${preset} for ${selectedLibraryName}, not your own library!\n\nAre you sure you want to continue?`;
                  }
                  
                  if (!window.confirm(confirmMessage)) {
                    return;
                  }
                  
                  for (const item of inventory) {
                    await updateQuantity(item.box_type, preset);
                  }
                  toast.success(`All quantities set to ${preset} for ${selectedLibraryName}`);
                }}
              >
                Set All to {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;