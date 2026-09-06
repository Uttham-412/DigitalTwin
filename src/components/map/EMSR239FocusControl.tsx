import React from 'react';
import { Cpu } from 'lucide-react';
import { CesiumViewerManager } from '../../cesium/viewer';

export const EMSR239FocusControl: React.FC = () => {
  const handleFlyToEMSR239 = () => {
    CesiumViewerManager.getInstance().flyToEMSR239Event(2.5);
  };

  return (
    <button
      onClick={handleFlyToEMSR239}
      className="glass-button"
      title="Fly to EMSR239 U-Net AI Layer (Spain)"
      style={{
        width: '40px',
        height: '40px',
        background: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
        color: '#f59e0b',
      }}
    >
      <Cpu size={20} />
    </button>
  );
};
