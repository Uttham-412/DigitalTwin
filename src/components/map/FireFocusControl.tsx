import React from 'react';
import { Flame } from 'lucide-react';
import { AMAZON_REAL_WILDFIRE_OBSERVATIONS } from '../../wildfire/fireObservation';
import { CesiumViewerManager } from '../../cesium/viewer';

export const FireFocusControl: React.FC = () => {
  const activeFire = AMAZON_REAL_WILDFIRE_OBSERVATIONS[0];

  const handleFocusFire = () => {
    if (activeFire) {
      CesiumViewerManager.getInstance().flyToFireObservation(activeFire, 2.5);
    }
  };

  return (
    <button
      onClick={handleFocusFire}
      className="glass-button"
      title="Focus Camera on Active Fire Observation"
      style={{
        width: '40px',
        height: '40px',
        background: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        color: '#ef4444',
      }}
    >
      <Flame size={20} />
    </button>
  );
};
