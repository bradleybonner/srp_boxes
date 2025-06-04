import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBoxTypeDisplayName } from '../utils/boxTypes';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const Map = () => {
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoxType, setSelectedBoxType] = useState('total');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchMapData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMapData = async () => {
    try {
      const response = await axios.get('/api/inventory/map');
      setMapData(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      toast.error('Failed to fetch map data');
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (library) => {
    let quantity = 0;
    if (selectedBoxType === 'total') {
      quantity = library.total_boxes;
    } else {
      quantity = library.inventory[selectedBoxType] || 0;
    }

    if (quantity === 0) return '#d32f2f'; // Red for out of stock
    if (quantity <= 10) return '#f57c00'; // Orange for low stock
    if (quantity <= 30) return '#fbc02d'; // Yellow for medium
    return '#388e3c'; // Green for good stock
  };

  const getMarkerSize = (library) => {
    let quantity = 0;
    if (selectedBoxType === 'total') {
      quantity = library.total_boxes;
    } else {
      quantity = library.inventory[selectedBoxType] || 0;
    }

    if (quantity === 0) return 10;
    if (quantity <= 10) return 15;
    if (quantity <= 50) return 20;
    if (quantity <= 100) return 25;
    return 30;
  };

  if (loading) {
    return <div className="loading">Loading map...</div>;
  }

  // Center map on Seattle area
  const center = [47.6062, -122.3321];

  return (
    <div className="container">
      <h2>Library Inventory Map {selectedBoxType !== 'total' && `- ${selectedBoxType} Boxes`}</h2>
      
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '10px' }}>Filter by Box Type</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={selectedBoxType === 'total' ? 'btn' : 'btn btn-secondary'}
                onClick={() => setSelectedBoxType('total')}
              >
                Total Boxes
              </button>
              <button 
                className={selectedBoxType === 'EL' ? 'btn' : 'btn btn-secondary'}
                onClick={() => setSelectedBoxType('EL')}
              >
                Early Learning
              </button>
              <button 
                className={selectedBoxType === 'Kids' ? 'btn' : 'btn btn-secondary'}
                onClick={() => setSelectedBoxType('Kids')}
              >
                Kids
              </button>
              <button 
                className={selectedBoxType === 'Teens' ? 'btn' : 'btn btn-secondary'}
                onClick={() => setSelectedBoxType('Teens')}
              >
                Teens
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={fetchMapData}
              disabled={loading}
            >
              Refresh Map
            </button>
            <span style={{ fontSize: '12px', color: '#666' }}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', marginTop: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#d32f2f' }}></div>
            <span>Out of Stock (0)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#f57c00' }}></div>
            <span>Low Stock (1-10)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fbc02d' }}></div>
            <span>Medium Stock (11-30)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#388e3c' }}></div>
            <span>Good Stock (31+)</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ height: '600px', padding: '0' }}>
        <MapContainer 
          center={center} 
          zoom={10} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {mapData.map((library) => (
            <CircleMarker
              key={`${library.library_id}-${selectedBoxType}`}
              center={[library.latitude, library.longitude]}
              radius={getMarkerSize(library)}
              fillColor={getMarkerColor(library)}
              color="#000"
              weight={1}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>{library.library_name}</h4>
                  <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                    {library.address}
                  </p>
                  <div style={{ marginTop: '10px' }}>
                    <strong>Inventory:</strong>
                    <table style={{ width: '100%', marginTop: '5px' }}>
                      <tbody>
                        <tr>
                          <td>Early Learning:</td>
                          <td style={{ textAlign: 'right', fontWeight: library.inventory.EL <= 10 ? 'bold' : 'normal', color: library.inventory.EL === 0 ? '#d32f2f' : library.inventory.EL <= 10 ? '#f57c00' : 'inherit' }}>
                            {library.inventory.EL || 0}
                          </td>
                        </tr>
                        <tr>
                          <td>Kids:</td>
                          <td style={{ textAlign: 'right', fontWeight: library.inventory.Kids <= 10 ? 'bold' : 'normal', color: library.inventory.Kids === 0 ? '#d32f2f' : library.inventory.Kids <= 10 ? '#f57c00' : 'inherit' }}>
                            {library.inventory.Kids || 0}
                          </td>
                        </tr>
                        <tr>
                          <td>Teens:</td>
                          <td style={{ textAlign: 'right', fontWeight: library.inventory.Teens <= 10 ? 'bold' : 'normal', color: library.inventory.Teens === 0 ? '#d32f2f' : library.inventory.Teens <= 10 ? '#f57c00' : 'inherit' }}>
                            {library.inventory.Teens || 0}
                          </td>
                        </tr>
                        <tr style={{ borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                          <td><strong>Total:</strong></td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            {library.total_boxes}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default Map;