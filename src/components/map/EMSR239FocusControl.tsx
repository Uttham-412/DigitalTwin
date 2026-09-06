import React from 'react';
import { Cpu } from 'lucide-react';
import { CesiumViewerManager } from '../../cesium/viewer';
import { SelectedLocation } from '../../geospatial/coordinates';
import { LayerDataType } from '../../wildfire/wildfireTypes';

interface EMSR239FocusControlProps {
  onSelectLocation?: (loc: SelectedLocation) => void;
}

export const EMSR239FocusControl: React.FC<EMSR239FocusControlProps> = ({ onSelectLocation }) => {
  const handleFlyToEMSR239 = () => {
    CesiumViewerManager.getInstance().flyToEMSR239Event(2.5);

    if (onSelectLocation) {
      onSelectLocation({
        id: `emsr239_${Date.now()}`,
        latitude: 37.844474,
        longitude: -6.004920,
        height: 8500,
        source: 'EMSR239_EVENT',
        label: 'EMSR239 — Almadén de la Plata, Spain',
        timestamp: new Date().toISOString(),
        eventDate: '2017-07-31T00:00:00Z',
        classification: LayerDataType.OBSERVED
      });
    }
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
