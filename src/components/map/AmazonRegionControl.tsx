import React from 'react';
import { Trees } from 'lucide-react';
import { CesiumViewerManager } from '../../cesium/viewer';

export const AmazonRegionControl: React.FC = () => {
  const handleFlyToAmazon = () => {
    const manager = CesiumViewerManager.getInstance();
    manager.flyToAmazonRegion(3.0);
  };

  return (
    <button
      onClick={handleFlyToAmazon}
      className="glass-button"
      title="Fly to Amazon Rainforest 3D Digital Twin"
      style={{
        width: '40px',
        height: '40px',
        background: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        color: '#34d399',
      }}
    >
      <Trees size={20} />
    </button>
  );
};
