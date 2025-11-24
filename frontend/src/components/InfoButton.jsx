// src/components/InfoButton.jsx
import React, { useState } from 'react';

const InfoButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.3rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          color: '#3b82f6',
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        aria-label="About this dashboard"
      >
        ?
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '38px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            color: '#374151',
            padding: '14px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            width: '320px',
            fontSize: '0.95rem',
            zIndex: 1001,
            border: '1px solid #e5e7eb'
          }}
        >
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            This dashboard visualizes alcohol-impaired traffic fatalities in the U.S. using data from the 
            <strong> Fatality Analysis Reporting System (FARS)</strong>. 
            Click any state to compare its trend with the national average.
          </p>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              marginTop: '10px',
              background: '#eff6ff',
              color: '#2563eb',
              border: 'none',
              borderRadius: '5px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
};

export default InfoButton;