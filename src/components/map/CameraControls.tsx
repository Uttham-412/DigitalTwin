import React from 'react';
import { Plus, Minus, Compass, Move3d, Trees, Eye } from 'lucide-react';
import { CesiumViewerManager } from '../../cesium/viewer';
import { AmazonRegionControl } from './AmazonRegionControl';
import { FireFocusControl } from './FireFocusControl';
import { SelectedLocation } from '../../geospatial/coordinates';
import { AMAZON_STUDY_REGION } from '../../config/studyRegion';
import * as Cesium from 'cesium';

interface CameraControlsProps {
  onSelectLocation?: (loc: SelectedLocation) => void;
  onToggleForestPanel?: () => void;
  isForestPanelOpen?: boolean;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  onSelectLocation,
  onToggleForestPanel,
  isForestPanelOpen = false,
}) => {
  const manager = CesiumViewerManager.getInstance();

  const handleZoomIn = () => {
    const viewer = manager.getViewer();
    if (!viewer) return;
    viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.3);
    viewer.scene.requestRender();
  };

  const handleZoomOut = () => {
    const viewer = manager.getViewer();
    if (!viewer) return;
    viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.3);
    viewer.scene.requestRender();
  };

  const handleResetCamera = () => {
    manager.resetCameraToDefault();
  };

  const handleToggleTilt = () => {
    const viewer = manager.getViewer();
    if (!viewer) return;

    const currentPitch = Cesium.Math.toDegrees(viewer.camera.pitch);
    const targetPitch = currentPitch < -75 ? -45 : -89; // Toggle between 3D tilt perspective and top-down orthographic perspective

    viewer.camera.flyTo({
      destination: Cesium.Cartographic.toCartesian(viewer.camera.positionCartographic),
      orientation: {
        heading: viewer.camera.heading,
        pitch: Cesium.Math.toRadians(targetPitch),
        roll: 0,
      },
      duration: 1.0,
    });
  };

  const handleCanopyWalk = () => {
    manager.flyToCanopyLevel(
      AMAZON_STUDY_REGION.center.latitude,
      AMAZON_STUDY_REGION.center.longitude
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 20,
      }}
    >
      <button
        onClick={handleZoomIn}
        className="glass-button"
        title="Zoom In"
        style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}
      >
        <Plus size={20} />
      </button>

      <button
        onClick={handleZoomOut}
        className="glass-button"
        title="Zoom Out"
        style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}
      >
        <Minus size={20} />
      </button>

      <div style={{ height: '1px', background: 'var(--bg-surface-border)', margin: '4px 0' }} />

      <button
        onClick={handleResetCamera}
        className="glass-button"
        title="Reset View to Default Globe"
        style={{ width: '40px', height: '40px' }}
      >
        <Compass size={20} color="var(--accent-blue)" />
      </button>

      <button
        onClick={handleToggleTilt}
        className="glass-button"
        title="Toggle 3D Perspective Tilt"
        style={{ width: '40px', height: '40px' }}
      >
        <Move3d size={20} />
      </button>

      {/* Canopy Walk 3D View */}
      <button
        onClick={handleCanopyWalk}
        className="glass-button"
        title="Canopy Walk — Fly down to 3D Tree Crowns"
        style={{
          width: '40px',
          height: '40px',
          color: 'var(--accent-forest)',
          borderColor: 'var(--accent-forest-border)',
          background: 'var(--accent-forest-subtle)',
        }}
      >
        <Eye size={18} />
      </button>

      {/* Toggle 3D Rainforest Forest Panel */}
      {onToggleForestPanel && (
        <button
          onClick={onToggleForestPanel}
          className="glass-button"
          title="Toggle 3D Rainforest Vegetation & Scorch Panel"
          style={{
            width: '40px',
            height: '40px',
            color: isForestPanelOpen ? 'var(--accent-forest)' : 'var(--text-secondary)',
            borderColor: isForestPanelOpen ? 'var(--accent-forest)' : 'var(--border-color)',
            background: isForestPanelOpen ? 'var(--accent-forest-subtle)' : 'var(--bg-surface)',
          }}
        >
          <Trees size={18} />
        </button>
      )}

      <div style={{ height: '1px', background: 'var(--bg-surface-border)', margin: '4px 0' }} />

      <AmazonRegionControl onSelectLocation={onSelectLocation} />
      <FireFocusControl onSelectLocation={onSelectLocation} />
    </div>
  );
};
