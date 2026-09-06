import React from 'react';
import { Layers, Map, Satellite } from 'lucide-react';
import { ImageryType } from '../../cesium/imagery';

interface ImageryToggleProps {
  currentType: ImageryType;
  onSelectType: (type: ImageryType) => void;
}

export const ImageryToggle: React.FC<ImageryToggleProps> = ({
  currentType,
  onSelectType,
}) => {
  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        padding: '4px',
        gap: '4px',
        zIndex: 25,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 8px',
          color: 'var(--text-muted)',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        <Layers size={14} color="var(--accent-cyan)" />
        <span style={{ display: 'none' }}>BASEMAP</span>
      </div>

      <button
        onClick={() => onSelectType(ImageryType.SATELLITE)}
        className="glass-button"
        style={{
          padding: '6px 12px',
          fontSize: '0.75rem',
          fontWeight: 500,
          gap: '6px',
          background:
            currentType === ImageryType.SATELLITE
              ? 'rgba(0, 229, 255, 0.2)'
              : 'transparent',
          borderColor:
            currentType === ImageryType.SATELLITE
              ? 'rgba(0, 229, 255, 0.4)'
              : 'transparent',
          color: currentType === ImageryType.SATELLITE ? '#ffffff' : 'var(--text-secondary)',
        }}
      >
        <Satellite size={14} />
        Satellite
      </button>

      <button
        onClick={() => onSelectType(ImageryType.OPEN_STREET_MAP)}
        className="glass-button"
        style={{
          padding: '6px 12px',
          fontSize: '0.75rem',
          fontWeight: 500,
          gap: '6px',
          background:
            currentType === ImageryType.OPEN_STREET_MAP
              ? 'rgba(0, 229, 255, 0.2)'
              : 'transparent',
          borderColor:
            currentType === ImageryType.OPEN_STREET_MAP
              ? 'rgba(0, 229, 255, 0.4)'
              : 'transparent',
          color: currentType === ImageryType.OPEN_STREET_MAP ? '#ffffff' : 'var(--text-secondary)',
        }}
      >
        <Map size={14} />
        Vector GIS
      </button>
    </div>
  );
};
