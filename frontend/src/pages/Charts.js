import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getBoxTypeDisplayName, BOX_TYPE_COLORS } from '../utils/boxTypes';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Charts = () => {
  const [history, setHistory] = useState([]);
  const [currentInventory, setCurrentInventory] = useState([]);
  const [selectedLibrary, setSelectedLibrary] = useState('all');
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [historyRes, inventoryRes, librariesRes] = await Promise.all([
        axios.get('/api/inventory/history'),
        axios.get('/api/inventory'),
        axios.get('/api/libraries')
      ]);
      
      setHistory(historyRes.data);
      setCurrentInventory(inventoryRes.data);
      setLibraries(librariesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredHistory = () => {
    if (selectedLibrary === 'all') return history;
    return history.filter(h => h.library_id === parseInt(selectedLibrary));
  };

  const prepareTimeSeriesData = () => {
    const filteredHistory = getFilteredHistory();
    const grouped = {};
    
    filteredHistory.forEach(record => {
      const date = new Date(record.change_date).toLocaleDateString();
      const key = `${record.library_name}-${record.box_type}`;
      
      if (!grouped[key]) {
        grouped[key] = {};
      }
      grouped[key][date] = record.quantity;
    });

    const datasets = Object.entries(grouped).map(([key, data]) => {
      const [library, boxType] = key.split('-');
      const color = BOX_TYPE_COLORS[boxType] || '#999999';
      
      return {
        label: `${library} - ${getBoxTypeDisplayName(boxType)}`,
        data: Object.entries(data).map(([date, quantity]) => ({ x: date, y: quantity })),
        borderColor: color,
        backgroundColor: color + '20',
        tension: 0.1
      };
    });

    const allDates = [...new Set(filteredHistory.map(r => new Date(r.change_date).toLocaleDateString()))];
    
    return {
      labels: allDates.sort(),
      datasets
    };
  };

  const prepareBarChartData = () => {
    const filteredInventory = selectedLibrary === 'all' 
      ? currentInventory 
      : currentInventory.filter(i => i.library_id === parseInt(selectedLibrary));

    const grouped = {};
    filteredInventory.forEach(item => {
      if (!grouped[item.library_name]) {
        grouped[item.library_name] = {};
      }
      grouped[item.library_name][item.box_type] = item.quantity;
    });

    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          label: 'Early Learning',
          data: Object.values(grouped).map(lib => lib.EL || 0),
          backgroundColor: '#4CAF50'
        },
        {
          label: 'Kids',
          data: Object.values(grouped).map(lib => lib.Kids || 0),
          backgroundColor: '#2196F3'
        },
        {
          label: 'Teens',
          data: Object.values(grouped).map(lib => lib.Teens || 0),
          backgroundColor: '#FF9800'
        }
      ]
    };
  };

  if (loading) {
    return <div className="loading">Loading charts...</div>;
  }

  const timeSeriesData = prepareTimeSeriesData();
  const barChartData = prepareBarChartData();

  return (
    <div className="container">
      <h2>Inventory Analytics</h2>
      
      <div className="card">
        <div className="form-group">
          <label>Filter by Library</label>
          <select 
            value={selectedLibrary} 
            onChange={(e) => setSelectedLibrary(e.target.value)}
          >
            <option value="all">All Libraries</option>
            {libraries.map(lib => (
              <option key={lib.id} value={lib.id}>{lib.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <h3>Current Inventory Levels</h3>
        <div style={{ height: '400px', position: 'relative' }}>
          <Bar
            data={barChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      </div>

      <div className="card">
        <h3>Inventory Over Time</h3>
        <div style={{ height: '400px', position: 'relative' }}>
          <Line
            data={timeSeriesData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      </div>

      <div className="card">
        <h3>Low Stock Summary</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Library</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Box Type</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Quantity</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentInventory
              .filter(item => item.quantity <= 10)
              .sort((a, b) => a.quantity - b.quantity)
              .map(item => (
                <tr key={`${item.library_id}-${item.box_type}`} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{item.library_name}</td>
                  <td style={{ padding: '10px' }}>{item.box_type}</td>
                  <td style={{ padding: '10px' }}>{item.quantity}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      color: item.quantity === 0 ? '#c62828' : '#ef6c00',
                      fontWeight: 'bold'
                    }}>
                      {item.quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Charts;