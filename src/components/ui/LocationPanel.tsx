import React from 'react';
import { MapPin, X, Mountain, ShieldCheck, Crosshair, ExternalLink } from 'lucide-react';
import { SelectedLocation, formatCoordinates } from '../../geospatial/coordinates';
import { CesiumViewerManager } from '../../cesium/viewer';

interface LocationPanelProps {
  location: SelectedLocation | null;
  onClear: () => void;
  onRunInference?: () => void;
  isSimulatedFireActive?: boolean;
  onCreateIgnition?: () => void;
  onRemoveFire?: () => void;
  onRunSpreadAnalysis?: () => void;
}

export const LocationPanel: React.FC<LocationPanelProps> = ({
  location,
  onClear,
  onRunInference,
  isSimulatedFireActive = false,
  onCreateIgnition,
  onRemoveFire,
  onRunSpreadAnalysis
}) => {
  if (!location) return null;

  const handleFlyTo = () => {
    const manager = CesiumViewerManager.getInstance();
    manager.flyToLocation(location.latitude, location.longitude, location.height);
  };

  const heightVal = location.height ?? 0;
  const elevationFeet = (heightVal * 3.28084).toFixed(0);

  return (
    <div
      className="glass-panel"
      style={{
        position: 'relative',
        width: '380px',
        maxWidth: 'calc(100vw - 48px)',
        padding: '20px',
        zIndex: 35,
        borderRadius: 'var(--radius-lg)',
        border: isSimulatedFireActive
          ? '1px solid rgba(249, 115, 22, 0.5)'
          : '1px solid rgba(0, 229, 255, 0.25)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isSimulatedFireActive ? 'rgba(249, 115, 22, 0.15)' : 'rgba(0, 229, 255, 0.15)',
              border: isSimulatedFireActive ? '1px solid #F97316' : '1px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={18} color={isSimulatedFireActive ? '#F97316' : 'var(--accent-cyan)'} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {location.label || 'Selected Location'}
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Real-World Geographic Target
            </span>
          </div>
        </div>

        <button
          onClick={onClear}
          className="glass-button"
          style={{ width: '28px', height: '28px', borderRadius: '50%' }}
          title="Deselect Location"
        >
          <X size={16} />
        </button>
      </div>

      {/* Provenance Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          borderRadius: 'var(--radius-sm)',
          background: isSimulatedFireActive
            ? 'rgba(249, 115, 22, 0.15)'
            : 'rgba(16, 185, 129, 0.12)',
          border: isSimulatedFireActive
            ? '1px solid rgba(249, 115, 22, 0.35)'
            : '1px solid rgba(16, 185, 129, 0.25)',
          marginBottom: '16px',
          fontSize: '0.72rem',
          color: isSimulatedFireActive ? '#FDBA74' : '#34d399',
          fontWeight: 600,
        }}
      >
        <ShieldCheck size={14} />
        <span>PROVENANCE: {isSimulatedFireActive ? 'SIMULATED / USER-DEFINED SCENARIO' : `${location.classification || 'OBSERVED'} / USER_SELECTED`}</span>
      </div>

      {/* Telemetry Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        {/* Coordinates */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            COORDINATES (WGS84)
          </span>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
            }}
          >
            {formatCoordinates(location.latitude, location.longitude)}
          </span>
        </div>

        {/* Elevation */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Mountain size={12} color="var(--text-muted)" />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TERRAIN ELEVATION</span>
          </div>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
            }}
          >
            {heightVal.toLocaleString()} m{' '}
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              ({elevationFeet} ft)
            </span>
          </span>
        </div>
      </div>

      {/* Metadata Readout */}
      <div
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          marginBottom: '16px',
          background: 'rgba(255,255,255,0.02)',
          padding: '8px 10px',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div>
          <strong style={{ color: 'var(--text-secondary)' }}>Source:</strong> {location.source}
        </div>
        <div>
          <strong style={{ color: 'var(--text-secondary)' }}>Timestamp:</strong>{' '}
          {new Date(location.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleFlyTo}
            className="glass-button"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.78rem',
              fontWeight: 500,
              gap: '6px',
            }}
          >
            <Crosshair size={14} color="var(--accent-cyan)" />
            Center Camera
          </button>

          {onRunInference && (
            <button
              onClick={onRunInference}
              className="glass-button"
              style={{
                flex: 1.4,
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                gap: '6px',
                color: '#EF4444',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)'
              }}
              title="Run U-Net AI Burned-Area Segmentation Inference"
            >
              <ExternalLink size={14} color="#EF4444" />
              Analyze with U-Net AI
            </button>
          )}
        </div>

        {/* Scenario Ignition & Spread Analysis Controls */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
          {!isSimulatedFireActive ? (
            <button
              onClick={onCreateIgnition}
              className="glass-button"
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#F97316',
                borderColor: 'rgba(249, 115, 22, 0.5)',
                background: 'rgba(249, 115, 22, 0.15)'
              }}
              title="Place a hypothetical ignition point at selected location"
            >
              🔥 CREATE FIRE SCENARIO
            </button>
          ) : (
            <>
              {onRunSpreadAnalysis && (
                <button
                  onClick={onRunSpreadAnalysis}
                  className="glass-button"
                  style={{
                    flex: 1.2,
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#FDBA74',
                    borderColor: 'rgba(249, 115, 22, 0.6)',
                    background: 'rgba(249, 115, 22, 0.25)'
                  }}
                  title="Calculate fire spread simulation based on environmental & terrain vectors"
                >
                  ⚡ SPREAD ANALYSIS
                </button>
              )}
              {onRemoveFire && (
                <button
                  onClick={onRemoveFire}
                  className="glass-button"
                  style={{
                    flex: 0.8,
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#94A3B8',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    background: 'rgba(30, 41, 59, 0.6)'
                  }}
                  title="Remove simulated fire ignition and clear scenario"
                >
                  REMOVE FIRE
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
