import React, { useState } from 'react';
import { Flame, ShieldCheck, Crosshair, AlertTriangle, ChevronUp, ChevronDown, Satellite, Thermometer, Zap } from 'lucide-react';
import { FireObservation } from '../../wildfire/fireObservation';
import { CesiumViewerManager } from '../../cesium/viewer';

interface FireObservationPanelProps {
  observation: FireObservation;
}

export const FireObservationPanel: React.FC<FireObservationPanelProps> = ({ observation }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const handleFocusFire = () => {
    CesiumViewerManager.getInstance().flyToFireObservation(observation, 2.5);
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '84px',
        right: '16px',
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        padding: '16px',
        zIndex: 25,
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
      }}
    >
      {/* Header */}
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
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.3)',
            }}
          >
            <Flame size={18} color="#ef4444" />
          </div>
          <div>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Active Fire Observation
            </h2>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {observation.source}
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
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              marginBottom: '12px',
              fontSize: '0.72rem',
              color: '#ef4444',
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={14} />
            <span>PROVENANCE: {observation.classification} / SATELLITE_THERMAL_DETECTION</span>
          </div>

          {/* Telemetry Metrics */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Satellite size={12} color="var(--accent-cyan)" /> Satellite Instrument:
              </span>
              <strong style={{ color: 'var(--text-primary)' }}>{observation.satelliteInstrument}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Coordinates:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {Math.abs(observation.latitude).toFixed(4)}° S, {Math.abs(observation.longitude).toFixed(4)}° W
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Observation Time:</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {new Date(observation.observationTime).toUTCString()}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Thermometer size={12} color="#f59e0b" /> Brightness Temp:
              </span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>{observation.brightnessTempK} K</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={12} color="#ef4444" /> Fire Radiative Power (FRP):
              </span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>{observation.frpMW} MW</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Detection Confidence:</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>{observation.confidence}</span>
            </div>
          </div>

          {/* AI Analysis Status Pill */}
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              marginBottom: '14px',
              fontSize: '0.72rem',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={14} />
            <span>AI U-NET SEGMENTATION ANALYSIS: NOT RUN</span>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleFocusFire}
            className="glass-button"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
            }}
          >
            <Crosshair size={14} />
            Focus Camera on Fire Observation
          </button>
        </div>
      )}
    </div>
  );
};
