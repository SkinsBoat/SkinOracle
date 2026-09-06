import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function MaintenanceScreen() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#050505',
      color: '#FFF',
      padding: '40px',
      textAlign: 'center',
    }}>
      <div style={{
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '50%',
        width: '80px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
      }}>
        <ShieldAlert size={40} color="#eab308" />
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '16px', letterSpacing: '-0.5px' }}>
        System Under Maintenance
      </h1>
      
      <p style={{ fontSize: '15px', color: '#9ca3af', maxWidth: '400px', lineHeight: 1.6, marginBottom: '32px' }}>
        SkinOracle is currently undergoing scheduled maintenance to improve system performance and reliability. All services are temporarily paused.
      </p>

      <button
        onClick={handleReload}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 24px',
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
        }}
      >
        <RefreshCw size={18} />
        Check Status
      </button>
    </div>
  );
}
