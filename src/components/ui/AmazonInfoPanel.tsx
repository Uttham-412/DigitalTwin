import React, { useState } from 'react';
import { Trees, ShieldCheck, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Crosshair } from 'lucide-react';
import { AMAZON_RAINFOREST_REGION } from '../../regions/amazon/amazonRegion';
import { CesiumViewerManager } from '../../cesium/viewer';

export const AmazonInfoPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const handleFlyToAmazon = () => {
    CesiumViewerManager.getInstance().flyToAmazonRegion(2.5);
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '84px',
        left: '16px',
        width: '360px',
        maxWidth: 'calc(100vw - 32px)',
        padding: '16px',
        zIndex: 25,
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trees size={18} color="#34d399" />
          </div>
          <div>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Amazon Rainforest
            </h2>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Real-World 3D Digital Twin
            </p>
          </div>
        </div>

        <button
          className="glass-button"
          style={{ width: '26px', height: '26px', padding: 0 }}
          title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Scientific Provenance Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              marginBottom: '12px',
              fontSize: '0.72rem',
              color: '#34d399',
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={14} />
            <span>PROVENANCE: {AMAZON_RAINFOREST_REGION.provenance.classification} / {AMAZON_RAINFOREST_REGION.provenance.type}</span>
          </div>

          {/* Region Details */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              marginBottom: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Region Name:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{AMAZON_RAINFOREST_REGION.name}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Location:</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {AMAZON_RAINFOREST_REGION.state}, {AMAZON_RAINFOREST_REGION.country}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Center Coords:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                3.1190° S, 60.0217° W
              </span>
            </div>
          </div>

          {/* Layer Availability Matrix */}
          <div style={{ marginBottom: '14px' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
                display: 'block',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              Data Layer Availability Matrix
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '4px',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>Satellite Imagery</span>
                <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> {AMAZON_RAINFOREST_REGION.dataSources.imagery.includes('Cesium') ? 'AVAILABLE' : 'STANDBY'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '4px',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>3D World Terrain</span>
                <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> AVAILABLE
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '4px',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>3D Photogrammetry</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                  LAND COVER
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '4px',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>Wildfire AI U-Net</span>
                <span style={{ color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> NOT CONNECTED YET
                </span>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleFlyToAmazon}
            className="glass-button"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'rgba(16, 185, 129, 0.35)',
              color: '#34d399',
            }}
          >
            <Crosshair size={14} />
            Center Amazon Rainforest Region
          </button>
        </div>
      )}
    </div>
  );
};
