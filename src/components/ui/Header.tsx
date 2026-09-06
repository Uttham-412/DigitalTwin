import React from 'react';
import { Flame, Globe, Mountain, Key, MapPin } from 'lucide-react';
import { SelectedLocation } from '../../geospatial/coordinates';

interface HeaderProps {
  coordinates?: string;
  altitude?: string;
  isTerrainLoaded?: boolean;
  selectedLocation?: SelectedLocation | null;
}

export const Header: React.FC<HeaderProps> = ({
  coordinates = '---, ---',
  altitude = '---',
  isTerrainLoaded = false,
  selectedLocation = null,
}) => {
  const hasToken = Boolean(
    import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN &&
      import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN.trim().length > 0
  );

  return (
    <header
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 30,
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)',
          }}
        >
          <Flame size={20} color="#ffffff" />
        </div>
        <div>
          <h1
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            LAND8FIRE
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '2px 6px',
                borderRadius: '4px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Amazon Digital Twin
            </span>
          </h1>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Real-World Geospatial Intelligence Platform — Manaus Reserve, Brazil
          </p>
        </div>
      </div>

      {/* Real-time Telemetry & Engine Status Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Coordinates Readout */}
        <div
          className="glass-panel"
          style={{
            padding: '4px 12px',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          <Globe size={14} color="var(--accent-cyan)" />
          <span>{coordinates}</span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>ALT {altitude}</span>
        </div>

        {/* Terrain Status */}
        <div
          className="glass-panel"
          style={{
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isTerrainLoaded ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            borderColor: isTerrainLoaded ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
            color: isTerrainLoaded ? '#34d399' : '#fbbf24',
          }}
        >
          <Mountain size={14} />
          <span>{isTerrainLoaded ? '3D Terrain Active' : 'Ellipsoid Baseline'}</span>
        </div>

        {/* Selected Location Target Indicator */}
        {selectedLocation && (
          <div
            className="glass-panel"
            style={{
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 229, 255, 0.15)',
              borderColor: 'rgba(0, 229, 255, 0.35)',
              color: 'var(--accent-cyan)',
            }}
          >
            <MapPin size={14} />
            <span>Target Selected</span>
          </div>
        )}

        {/* Cesium Ion Token Indicator */}
        <div
          className="glass-panel"
          style={{
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: hasToken ? 'rgba(59, 130, 246, 0.15)' : 'rgba(107, 114, 128, 0.15)',
            borderColor: hasToken ? 'rgba(59, 130, 246, 0.3)' : 'rgba(107, 114, 128, 0.3)',
            color: hasToken ? '#60a5fa' : '#9ca3af',
          }}
        >
          <Key size={14} />
          <span>{hasToken ? 'Ion Token Connected' : 'Ion Token Pending (.env.local)'}</span>
        </div>
      </div>
    </header>
  );
};
