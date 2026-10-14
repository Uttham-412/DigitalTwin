/**
 * LAND8FIRE — 3D AMAZON RAINFOREST VIEWPORT
 *
 * React wrapper hosting the Three.js AmazonForestScene:
 * - Full-screen WebGL canvas
 * - Responsive render loop
 * - Dynamic coupling to wildfire timeline, environmental parameters, and botanical layer visibility
 */

import React, { useEffect, useRef } from 'react';
import { AmazonForestScene, CameraPreset, TimeOfDay, IgnitionSelectionEvent } from '../../three/AmazonForestScene';
import { SpreadHorizon } from '../../simulation/fireScenarioTypes';

interface AmazonForestViewportProps {
  timeOfDay: TimeOfDay;
  cameraPreset: CameraPreset;
  selectedHorizon: SpreadHorizon;
  showCanopy: boolean;
  showUnderstory: boolean;
  showForestFloor: boolean;
  showWaterBodies: boolean;
  showActiveFireFront: boolean;
  showSmokePlume: boolean;
  windSpeedKmh: number;
  windDirectionDeg: number;
  onStatsUpdate?: (stats: any) => void;
  onSceneReady?: (scene: AmazonForestScene) => void;
  onIgnitionPointSelected?: (event: IgnitionSelectionEvent) => void;
}

export const AmazonForestViewport: React.FC<AmazonForestViewportProps> = ({
  timeOfDay,
  cameraPreset,
  selectedHorizon,
  showCanopy,
  showUnderstory,
  showForestFloor,
  showWaterBodies,
  showActiveFireFront,
  showSmokePlume,
  windSpeedKmh,
  windDirectionDeg,
  onStatsUpdate,
  onSceneReady,
  onIgnitionPointSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AmazonForestScene | null>(null);

  // 1. Initialize Scene on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new AmazonForestScene(containerRef.current);
    sceneRef.current = scene;

    if (onIgnitionPointSelected) {
      scene.onIgnitionPointSelected = onIgnitionPointSelected;
    }
    if (onSceneReady) {
      onSceneReady(scene);
    }

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // 2. Sync Time of Day Lighting
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTimeOfDay(timeOfDay);
    }
  }, [timeOfDay]);

  // 3. Sync Camera Preset Transitions
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setCameraPreset(cameraPreset, true);
    }
  }, [cameraPreset]);

  // 4. Sync Botanical Tier Visibility
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setCanopyVisible(showCanopy);
    }
  }, [showCanopy]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setUnderstoryVisible(showUnderstory);
    }
  }, [showUnderstory]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setForestFloorVisible(showForestFloor);
    }
  }, [showForestFloor]);

  // 5. Sync River Visibility
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setWaterBodiesVisible(showWaterBodies);
    }
  }, [showWaterBodies]);

  // 6. Sync Wildfire Simulation Horizon & Tree Damage State Machine
  useEffect(() => {
    if (!sceneRef.current) return;

    sceneRef.current.wildfire.config.windSpeedKmh = windSpeedKmh;
    sceneRef.current.wildfire.config.windDirectionDeg = windDirectionDeg;

    sceneRef.current.updateSimulationHorizon(selectedHorizon);

    if (onStatsUpdate) {
      onStatsUpdate(sceneRef.current.vegetation.stats);
    }
  }, [selectedHorizon, showActiveFireFront, windSpeedKmh, windDirectionDeg, onStatsUpdate]);

  // 7. Sync Wildfire Visibility Toggles
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setActiveFireVisible(showActiveFireFront);
      sceneRef.current.setSmokeVisible(showSmokePlume);
    }
  }, [showActiveFireFront, showSmokePlume]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
        cursor: 'grab',
      }}
    />
  );
};
