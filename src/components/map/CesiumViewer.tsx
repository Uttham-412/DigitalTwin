import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { CesiumViewerManager } from '../../cesium/viewer';
import { enableWorldTerrain } from '../../cesium/terrain';
import { formatCoordinates, SelectedLocation } from '../../geospatial/coordinates';
import 'cesium/Build/Cesium/Widgets/widgets.css';

interface CesiumViewerProps {
  onCoordinatesUpdate?: (coords: string, altitude: string) => void;
  onTerrainLoaded?: (status: boolean) => void;
  onSelectLocation?: (location: SelectedLocation) => void;
}

export const CesiumViewerComponent: React.FC<CesiumViewerProps> = ({
  onCoordinatesUpdate,
  onTerrainLoaded,
  onSelectLocation,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Store callbacks in refs to decouple them from component re-renders
  const onCoordsRef = useRef(onCoordinatesUpdate);
  const onTerrainLoadedRef = useRef(onTerrainLoaded);
  const onSelectLocationRef = useRef(onSelectLocation);

  useEffect(() => {
    onCoordsRef.current = onCoordinatesUpdate;
    onTerrainLoadedRef.current = onTerrainLoaded;
    onSelectLocationRef.current = onSelectLocation;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const manager = CesiumViewerManager.getInstance();
    const viewer = manager.initialize({ container: containerRef.current });

    setIsInitializing(false);

    // Initialize 3D terrain asynchronously
    enableWorldTerrain(viewer).then((loaded) => {
      if (onTerrainLoadedRef.current) onTerrainLoadedRef.current(loaded);
    }).catch((err) => {
      console.warn('[CesiumViewer] Terrain provider notice:', err);
    });

    // Register globe click listener for real-world location selection
    manager.registerClickListener((loc) => {
      if (onSelectLocationRef.current) {
        onSelectLocationRef.current(loc);
      }
    });

    // Handle cursor movement for real-time lat/lng & elevation readout
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      if (!onCoordsRef.current) return;

      const cartesian = viewer.camera.pickEllipsoid(
        movement.endPosition,
        viewer.scene.globe.ellipsoid
      );

      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const lng = Cesium.Math.toDegrees(cartographic.longitude);
        const alt = viewer.camera.positionCartographic.height;

        const formattedCoords = formatCoordinates(lat, lng);
        const formattedAlt = alt > 1000 ? `${(alt / 1000).toFixed(1)} km` : `${alt.toFixed(0)} m`;

        onCoordsRef.current(formattedCoords, formattedAlt);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Initial resize to ensure correct canvas geometry
    viewer.resize();

    return () => {
      handler.destroy();
      // DO NOT destroy manager here; preserving the viewer instance prevents WebGL context loss and black screens!
    };
  }, []); // Run ONCE on mount!

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} className="cesium-viewer" />
      {isInitializing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-dark)',
            color: 'var(--text-secondary)',
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: '3px solid var(--bg-surface-border)',
                borderTopColor: 'var(--accent-forest)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px auto',
              }}
            />
            <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
              Initializing 3D terrain and globe...
            </p>
          </div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
};
