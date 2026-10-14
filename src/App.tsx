/**
 * LAND8FIRE — HYBRID WILDFIRE DIGITAL TWIN & GEOSPATIAL INTELLIGENCE PLATFORM
 *
 * Provides two unified, interconnected operational experiences:
 *
 * VIEW A — REGIONAL MAP (Geospatial Cesium Globe)
 * - Authoritative satellite imagery & terrain navigation
 * - Location selection & surface burnability validation
 * - Dynamic ignition point creation & validation (Rothermel / fuel classification)
 * - Time-dependent sectoral wave-front fire spread simulation (+0H to +24H)
 * - Environmental intelligence panel with ERA5-Land & CAMS telemetry
 * - Deep learning 15-channel U-Net satellite evidence inspection (mask & probability)
 * - Multi-scenario simulation vs observation comparison
 *
 * VIEW B — 3D FOREST DIGITAL TWIN (Photorealistic Local Amazon Ecosystem)
 * - High-resolution 3D virtual rainforest grounded in Copernicus DEM 30m elevation
 * - Towering emergent Kapok & Brazil nut trees with horizontal umbrella boughs
 * - Continuous dense upper canopy ("green ocean") with golden morning rim lighting
 * - Left-aligned meandering Rio Negro tributary with reflective water, boulders & rapids
 * - Physically coupled wildfire combustion front, billowing smoke column, and scorched trees
 * - Intuitive bottom camera toolbar: Canopy Flyover, Ground Walk, River Bank, Fire Front, Overview
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Satellite } from 'lucide-react';

// Cesium Geospatial & Map Components (View A)
import { CesiumViewerComponent } from './components/map/CesiumViewer';
import { CameraControls } from './components/map/CameraControls';
import { LocationPanel } from './components/ui/LocationPanel';
import { ImageryToggle } from './components/ui/ImageryToggle';
import { EnvironmentalFocusControl } from './components/map/EnvironmentalFocusControl';
import { ComparisonPanel } from './components/ui/ComparisonPanel';
import { FireSpreadPanel } from './components/ui/FireSpreadPanel';
import { EnvironmentalPanel } from './components/ui/EnvironmentalPanel';
import { UNetDetectionPanel } from './components/ui/UNetDetectionPanel';
import { EMSR239InfoPanel } from './components/ui/EMSR239InfoPanel';
import { FireObservationPanel } from './components/wildfire/FireObservationPanel';

// Cesium Layer Managers & Services
import { SelectedLocation } from './geospatial/coordinates';
import { SelectionMarkerManager } from './cesium/selectionMarker';
import { FireMarkerManager } from './cesium/fireMarker';
import { WildfireLayerManager } from './cesium/wildfireLayer';
import { SpreadLayerManager } from './cesium/spreadLayer';
import { StudyRegionLayerManager } from './cesium/studyRegionLayer';
import { uNetPredictionLayerManager } from './cesium/unetPredictionLayer';
import { CesiumViewerManager } from './cesium/viewer';
import { ImageryType, setImageryLayer } from './cesium/imagery';
import { AMAZON_REAL_WILDFIRE_OBSERVATIONS } from './wildfire/fireObservation';
import { environmentalService } from './environmental/environmentalService';
import { EnvironmentalTimeline } from './environmental/environmentalTypes';
import { simulationClockManager } from './simulation/simulationClock';
import { SpreadHorizon, SpreadSimulationResult, FireState } from './simulation/fireScenarioTypes';
import {
  simulationAssessmentCoordinator,
  SimulationAssessmentRequest
} from './services/simulationAssessmentCoordinator';
import { amazonRainforestVegetationManager } from './cesium/amazonRainforestVegetation';
import { volumetricFireSystem } from './cesium/volumetricFireSystem';
import { fuelService } from './geospatial/fuelService';
import { terrainService } from './geospatial/terrainService';
import { fireSpreadModel } from './simulation/fireSpreadModel';
import { fireSimulationComparisonService, ComparisonMetrics } from './comparison/fireSimulationComparison';
import { GeoreferencedUNetOutput } from './geospatial/unetResultGeoReference';

// 3D Amazon Rainforest Engine & UI Components (View B)
import { AmazonForestViewport } from './components/forest/AmazonForestViewport';
import { AmazonHeader } from './components/forest/AmazonHeader';
import { ForestDigitalTwinPanel } from './components/forest/ForestDigitalTwinPanel';
import { CameraNavigationToolbar } from './components/forest/CameraNavigationToolbar';
import { AIEvidenceModal } from './components/forest/AIEvidenceModal';
import { AmazonForestScene, CameraPreset, TimeOfDay, IgnitionSelectionEvent } from './three/AmazonForestScene';
import { RothermelDiagnostics, RothermelInputs } from './three/AmazonRothermelModel';

export function App() {
  // Primary Experience: Default to Immersive 3D Forest Digital Twin
  const [viewMode, setViewMode] = useState<'3D_FOREST' | 'CESIUM_GLOBE'>('3D_FOREST');

  // 3D Scene Reference & Rothermel Simulation State
  const [forestScene, setForestScene] = useState<AmazonForestScene | null>(null);
  const [forestIgnitionCandidate, setForestIgnitionCandidate] = useState<IgnitionSelectionEvent | null>(null);
  const [isForestFireActive, setIsForestFireActive] = useState<boolean>(false);
  const [rothermelDiagnostics, setRothermelDiagnostics] = useState<RothermelDiagnostics | null>(null);

  // 3D Scene Atmosphere & Camera Preset Navigation
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('DAYTIME');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('CANOPY_FLYOVER');

  // Botanical & Visual Tier Visibility
  const [showCanopy, setShowCanopy] = useState<boolean>(true);
  const [showUnderstory, setShowUnderstory] = useState<boolean>(true);
  const [showForestFloor, setShowForestFloor] = useState<boolean>(true);
  const [showWaterBodies, setShowWaterBodies] = useState<boolean>(true);

  // Wildfire Simulation Visibility
  const [showActiveFireFront, setShowActiveFireFront] = useState<boolean>(true);
  const [showSmokePlume, setShowSmokePlume] = useState<boolean>(true);
  const [showBurnedArea, setShowBurnedArea] = useState<boolean>(true);
  const [showFireSpreadPrediction, setShowFireSpreadPrediction] = useState<boolean>(true);

  // Environmental Parameters (ERA5-Land & CAMS Provenance, Editable)
  const [temperatureCelsius, setTemperatureCelsius] = useState<number>(31.4);
  const [humidityPercent, setHumidityPercent] = useState<number>(78.0);
  const [windSpeedKmh, setWindSpeedKmh] = useState<number>(14.2);
  const [windDirectionDeg, setWindDirectionDeg] = useState<number>(45.0); // NE
  const [fuelMoisturePercent, setFuelMoisturePercent] = useState<number>(16.4);

  // Timeline & Playback
  const [selectedHorizon, setSelectedHorizon] = useState<SpreadHorizon>('+0H');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Modals & Panels
  const [isAIEvidenceOpen, setIsAIEvidenceOpen] = useState<boolean>(false);
  const [isDetectionPanelOpen, setIsDetectionPanelOpen] = useState<boolean>(false);
  const [isEnvPanelOpen, setIsEnvPanelOpen] = useState<boolean>(false);
  const [isForestPanelOpen, setIsForestPanelOpen] = useState<boolean>(false);

  // Cesium Geospatial & Simulation State
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [currentImagery, setCurrentImagery] = useState<ImageryType>(ImageryType.SATELLITE);
  const [envTimeline, setEnvTimeline] = useState<EnvironmentalTimeline | null>(null);
  const [isEnvLoading, setIsEnvLoading] = useState<boolean>(false);

  // Simulation & Assessment State
  const [isSimulatedFireActive, setIsSimulatedFireActive] = useState<boolean>(false);
  const [spreadResult, setSpreadResult] = useState<SpreadSimulationResult | null>(null);
  const [isSpreadLoading, setIsSpreadLoading] = useState<boolean>(false);
  const [isInferenceLoading, setIsInferenceLoading] = useState<boolean>(false);
  const [assessmentRequest, setAssessmentRequest] = useState<SimulationAssessmentRequest | null>(null);
  const [georefOutput, setGeorefOutput] = useState<GeoreferencedUNetOutput | null>(null);
  const [comparisonMetrics, setComparisonMetrics] = useState<ComparisonMetrics | null>(null);
  const [ignitionRejectionMessage, setIgnitionRejectionMessage] = useState<string | null>(null);

  // Cesium Layer Toggles
  const [showGroundTruthLayer, setShowGroundTruthLayer] = useState<boolean>(true);
  const [showSimulationLayer, setShowSimulationLayer] = useState<boolean>(true);
  const [showWaterContextLayer, setShowWaterContextLayer] = useState<boolean>(true);

  const weatherReqSeqRef = useRef<number>(0);
  const isSyncingHorizonRef = useRef<boolean>(false);
  const activeFireObservation = AMAZON_REAL_WILDFIRE_OBSERVATIONS[0];

  // Subscribe to simulation-triggered assessment coordinator updates
  useEffect(() => {
    const unsubscribe = simulationAssessmentCoordinator.subscribe((req) => {
      setAssessmentRequest(req);
      if (req && req.status === 'COMPLETED' && req.georeferencedOutput) {
        setGeorefOutput(req.georeferencedOutput);
        setIsDetectionPanelOpen(true);
        if (req.comparisonMetrics) {
          setComparisonMetrics(req.comparisonMetrics);
        }
        const manager = CesiumViewerManager.getInstance();
        const viewer = manager.getViewer();
        if (viewer) {
          uNetPredictionLayerManager.updateLayers(
            viewer,
            req.georeferencedOutput,
            showGroundTruthLayer,
            'QUALITY_CONTROL',
            false
          );
        }
      } else if (
        req &&
        (req.status === 'AWAITING_SATELLITE_OBSERVATION' ||
          req.status === 'FAILED' ||
          req.status === 'OBSERVATION_UNSUITABLE' ||
          req.status === 'DISCOVERING_OBSERVATION' ||
          req.status === 'ACQUIRING_RASTER' ||
          req.status === 'PREPROCESSING')
      ) {
        setGeorefOutput(null);
        const manager = CesiumViewerManager.getInstance();
        const viewer = manager.getViewer();
        if (viewer) {
          uNetPredictionLayerManager.clearLayers(viewer);
        }
      } else if (req && req.status === 'CANCELLED') {
        const manager = CesiumViewerManager.getInstance();
        const viewer = manager.getViewer();
        if (viewer) {
          uNetPredictionLayerManager.clearLayers(viewer);
        }
        setGeorefOutput(null);
        setIsDetectionPanelOpen(false);
      }
    });
    return unsubscribe;
  }, [showGroundTruthLayer]);

  // Automated Timeline Playback Loop
  useEffect(() => {
    if (!isPlaying) return;

    const horizons: SpreadHorizon[] = ['+0H', '+1H', '+2H', '+6H', '+12H', '+24H'];
    const intervalMs = Math.max(800, 3000 / playbackSpeed);

    const timer = setInterval(() => {
      setSelectedHorizon((prev) => {
        const currIdx = horizons.indexOf(prev);
        const nextIdx = (currIdx + 1) % horizons.length;
        return horizons[nextIdx];
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

  // Fetch real-time or historical weather when selected location changes
  const loadWeatherForLocation = useCallback(async (loc: SelectedLocation) => {
    const seq = ++weatherReqSeqRef.current;
    setIsEnvLoading(true);
    setEnvTimeline(null);
    try {
      const timeline = await environmentalService.fetchEnvironmentalTimeline(
        { latitude: loc.latitude, longitude: loc.longitude },
        loc.label,
        loc.eventDate
      );
      if (seq === weatherReqSeqRef.current) {
        setEnvTimeline(timeline);
        setIsEnvLoading(false);
      }
    } catch {
      if (seq === weatherReqSeqRef.current) {
        setIsEnvLoading(false);
      }
    }
  }, []);

  // Initial Location & Weather Load (Amazon Rainforest Study Region)
  useEffect(() => {
    const defaultLoc: SelectedLocation = {
      id: 'default_amazon',
      latitude: -3.119,
      longitude: -60.0217,
      height: 18000,
      source: 'AMAZON_REGION',
      label: 'Manaus & Anavilhanas Rainforest Reserve, Brazil',
      timestamp: new Date().toISOString()
    };
    setSelectedLocation(defaultLoc);
    loadWeatherForLocation(defaultLoc);
  }, [loadWeatherForLocation]);

  // Update weather whenever selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      loadWeatherForLocation(selectedLocation);
    }
  }, [selectedLocation, loadWeatherForLocation]);

  // Update 3D selection pin marker in Cesium
  useEffect(() => {
    const manager = CesiumViewerManager.getInstance();
    const viewer = manager.getViewer();
    if (viewer) {
      SelectionMarkerManager.getInstance().updateMarker(viewer, selectedLocation);
    }
  }, [selectedLocation]);

  // Render real active fire observation marker & EMSR239 GeoJSON layers
  useEffect(() => {
    const timer = setTimeout(() => {
      const manager = CesiumViewerManager.getInstance();
      const viewer = manager.getViewer();
      if (viewer) {
        FireMarkerManager.getInstance().renderFireObservations(viewer, AMAZON_REAL_WILDFIRE_OBSERVATIONS);
        WildfireLayerManager.getInstance().loadEMSR239Layers(viewer);
        StudyRegionLayerManager.getInstance().renderStudyRegionBoundary(viewer);

        amazonRainforestVegetationManager.initialize(viewer);
        amazonRainforestVegetationManager.generateForest();
        volumetricFireSystem.initialize(viewer);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Initial cinematic fly-to to Amazon Rainforest region
  useEffect(() => {
    const timer = setTimeout(() => {
      const manager = CesiumViewerManager.getInstance();
      manager.flyToAmazonRegion(3.5);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Globe click location selection
  const handleSelectLocation = useCallback((location: SelectedLocation) => {
    setSelectedLocation(location);
    setIgnitionRejectionMessage(null);
    setIsSimulatedFireActive(false);
    setSpreadResult(null);
    simulationAssessmentCoordinator.cancelActiveAssessment();
    volumetricFireSystem.clear();
    amazonRainforestVegetationManager.updateFireDamage(null);
    const manager = CesiumViewerManager.getInstance();
    const viewer = manager.getViewer();
    if (viewer) {
      SpreadLayerManager.getInstance().clearSpread(viewer);
      uNetPredictionLayerManager.clearLayers(viewer);
    }
  }, []);

  const handleClearLocation = useCallback(() => {
    setSelectedLocation(null);
    setIsSimulatedFireActive(false);
    setSpreadResult(null);
    setIgnitionRejectionMessage(null);
    simulationAssessmentCoordinator.cancelActiveAssessment();
    volumetricFireSystem.clear();
    amazonRainforestVegetationManager.updateFireDamage(null);
    const manager = CesiumViewerManager.getInstance();
    const viewer = manager.getViewer();
    if (viewer) {
      SelectionMarkerManager.getInstance().clear(viewer);
      SpreadLayerManager.getInstance().clearSpread(viewer);
      uNetPredictionLayerManager.clearLayers(viewer);
    }
  }, []);

  const handleSelectImagery = useCallback((type: ImageryType) => {
    setCurrentImagery(type);
    const manager = CesiumViewerManager.getInstance();
    const viewer = manager.getViewer();
    if (viewer) {
      setImageryLayer(viewer, type);
    }
  }, []);

  // Core fire-spread calculation function
  const executeSpreadSimulation = useCallback(async (
    timeline: EnvironmentalTimeline,
    loc: SelectedLocation,
    horizon: SpreadHorizon
  ) => {
    setIsSpreadLoading(true);
    setIgnitionRejectionMessage(null);

    const fuel = await fuelService.fetchFuelData({
      latitude: loc.latitude,
      longitude: loc.longitude
    });

    const validation = fuelService.validateIgnition(
      { latitude: loc.latitude, longitude: loc.longitude },
      fuel
    );

    if (!validation.valid) {
      setIgnitionRejectionMessage(validation.message);
      setIsSpreadLoading(false);
      setIsSimulatedFireActive(false);
      setSpreadResult(null);
      const manager = CesiumViewerManager.getInstance();
      const viewer = manager.getViewer();
      if (viewer) {
        SpreadLayerManager.getInstance().clearSpread(viewer);
      }
      return null;
    }

    const terrain = await terrainService.fetchTerrainData({
      latitude: loc.latitude,
      longitude: loc.longitude
    });

    const authTimestamp = (timeline.observations[timeline.selectedIndex])
      ? timeline.observations[timeline.selectedIndex].timestamp
      : (loc.eventDate || new Date().toISOString());

    const initialFire: FireState = {
      id: `ign_${Date.now()}`,
      source: 'SIMULATED',
      latitude: loc.latitude,
      longitude: loc.longitude,
      radiusMeters: 150,
      areaHectares: 7.1,
      timestamp: authTimestamp,
      provenance: 'EXPERIMENTAL FIRE-SPREAD SIMULATION'
    };

    const res = fireSpreadModel.runSimulation(initialFire, timeline, terrain, fuel);
    setSpreadResult(res);
    setIsSpreadLoading(false);

    // Update 3D spread visualization on Cesium for horizon
    const manager = CesiumViewerManager.getInstance();
    const viewer = manager.getViewer();
    if (viewer && res.timesteps[horizon]) {
      SpreadLayerManager.getInstance().renderSpreadPrediction(viewer, res.timesteps[horizon]);
      const currentEnv = (timeline && timeline.observations)
        ? timeline.observations[timeline.selectedIndex]
        : null;
      volumetricFireSystem.renderFireEffects(viewer, res.timesteps[horizon], currentEnv);
      amazonRainforestVegetationManager.updateFireDamage(res.timesteps[horizon]);
    }

    // Update active assessment with simulated fire perimeter
    simulationAssessmentCoordinator.updateAssessmentWithPerimeter(res, horizon);

    // Evaluate simulation vs observation comparison
    if (georefOutput) {
      const comp = fireSimulationComparisonService.compareSimulationWithObservation(
        res,
        georefOutput,
        horizon
      );
      setComparisonMetrics(comp);
    }

    return res;
  }, [georefOutput]);

  // Scenario Lifecycle: Create Ignition with surface burnability & water validation
  const handleCreateIgnition = useCallback(async () => {
    if (!selectedLocation) return;
    setIgnitionRejectionMessage(null);

    const fuel = await fuelService.fetchFuelData({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude
    });

    const validation = fuelService.validateIgnition(
      { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude },
      fuel
    );

    if (!validation.valid) {
      setIgnitionRejectionMessage(validation.message);
      setIsSimulatedFireActive(false);
      setSpreadResult(null);
      const manager = CesiumViewerManager.getInstance();
      const viewer = manager.getViewer();
      if (viewer) {
        SpreadLayerManager.getInstance().clearSpread(viewer);
      }
      return;
    }

    setIgnitionRejectionMessage(null);
    setIsSimulatedFireActive(true);
    setSpreadResult(null);

    const authTimestamp = (envTimeline && envTimeline.observations[envTimeline.selectedIndex])
      ? envTimeline.observations[envTimeline.selectedIndex].timestamp
      : (selectedLocation.timestamp || new Date().toISOString());

    simulationClockManager.initializeClock(authTimestamp);

    // Automatically initiate coordinated U-Net assessment workflow for newly started simulation
    const simId = `sim_${Date.now()}`;
    await simulationAssessmentCoordinator.startAssessmentForSimulation({
      simulationId: simId,
      ignitionLat: selectedLocation.latitude,
      ignitionLon: selectedLocation.longitude,
      simulationStartTime: authTimestamp,
      timelineTime: authTimestamp,
      selectedHorizon: selectedHorizon
    });

    // Execute spread simulation for selected horizon immediately
    if (envTimeline) {
      const simRes = await executeSpreadSimulation(envTimeline, selectedLocation, selectedHorizon);
      if (simRes) {
        await simulationAssessmentCoordinator.updateAssessmentWithPerimeter(simRes, selectedHorizon);
      }
    }
  }, [selectedLocation, envTimeline, selectedHorizon, executeSpreadSimulation]);

  // Scenario Lifecycle: Remove Fire / Clear Scenario
  const handleRemoveFire = useCallback(() => {
    setIsSimulatedFireActive(false);
    setSpreadResult(null);
    setComparisonMetrics(null);
    setIgnitionRejectionMessage(null);
    setIsDetectionPanelOpen(false);
    simulationClockManager.stopPlayback();
    simulationAssessmentCoordinator.cancelActiveAssessment();
    volumetricFireSystem.clear();
    amazonRainforestVegetationManager.updateFireDamage(null);
    const manager = CesiumViewerManager.getInstance();
    const viewer = manager.getViewer();
    if (viewer) {
      SpreadLayerManager.getInstance().clearSpread(viewer);
      uNetPredictionLayerManager.clearLayers(viewer);
    }
  }, []);

  // Scenario Lifecycle: Run Fire Spread Analysis
  const handleRunSpreadAnalysis = useCallback(async () => {
    if (!selectedLocation || !envTimeline) return;
    await executeSpreadSimulation(envTimeline, selectedLocation, selectedHorizon);
  }, [selectedLocation, envTimeline, selectedHorizon, executeSpreadSimulation]);

  // Recompute spread dynamically when user scrubs timeline slider during an active simulation
  useEffect(() => {
    if (isSyncingHorizonRef.current) {
      isSyncingHorizonRef.current = false;
      return;
    }
    if (isSimulatedFireActive && spreadResult && selectedLocation && envTimeline) {
      executeSpreadSimulation(envTimeline, selectedLocation, selectedHorizon);
    }
  }, [envTimeline?.selectedIndex]);

  // Update 3D spread visualization and timeline when forecast horizon tab changes
  const handleSelectHorizon = useCallback(async (h: SpreadHorizon) => {
    setSelectedHorizon(h);
    simulationClockManager.setHorizon(h);

    const horizonHoursMap: Record<SpreadHorizon, number> = {
      '+0H': 0,
      '+1H': 1,
      '+2H': 2,
      '+6H': 6,
      '+12H': 12,
      '+24H': 24
    };
    const offsetHours = horizonHoursMap[h] ?? 0;

    // Synchronize EnvironmentalPanel timeline index with selected horizon
    if (envTimeline && envTimeline.observations.length > 0) {
      const baseTime = new Date(envTimeline.observations[0].timestamp).getTime();
      const targetTime = baseTime + offsetHours * 3600 * 1000;

      let closestIdx = 0;
      let minDiff = Infinity;
      envTimeline.observations.forEach((obs, idx) => {
        const diff = Math.abs(new Date(obs.timestamp).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      isSyncingHorizonRef.current = true;
      setEnvTimeline((prev) => (prev ? { ...prev, selectedIndex: closestIdx } : null));
    }

    if (spreadResult && spreadResult.timesteps[h]) {
      const manager = CesiumViewerManager.getInstance();
      const viewer = manager.getViewer();
      if (viewer) {
        SpreadLayerManager.getInstance().renderSpreadPrediction(viewer, spreadResult.timesteps[h]);
        const currentEnv = (envTimeline && envTimeline.observations)
          ? envTimeline.observations[envTimeline.selectedIndex]
          : null;
        volumetricFireSystem.renderFireEffects(viewer, spreadResult.timesteps[h], currentEnv);
        amazonRainforestVegetationManager.updateFireDamage(spreadResult.timesteps[h]);
      }
      simulationAssessmentCoordinator.updateAssessmentWithPerimeter(spreadResult, h);
    }

    if (spreadResult && georefOutput) {
      const comp = fireSimulationComparisonService.compareSimulationWithObservation(
        spreadResult,
        georefOutput,
        h
      );
      setComparisonMetrics(comp);
    }
  }, [spreadResult, georefOutput, envTimeline]);

  // Execute Satellite U-Net Pipeline via Assessment Coordinator
  const handleRunInference = useCallback(async () => {
    if (!selectedLocation) return;
    setIsInferenceLoading(true);
    setIsDetectionPanelOpen(true);

    const authTimestamp = (envTimeline && envTimeline.observations[envTimeline.selectedIndex])
      ? envTimeline.observations[envTimeline.selectedIndex].timestamp
      : (selectedLocation.timestamp || new Date().toISOString());

    const simId = isSimulatedFireActive ? `sim_${Date.now()}` : `assess_${Date.now()}`;

    try {
      await simulationAssessmentCoordinator.startAssessmentForSimulation({
        simulationId: simId,
        ignitionLat: selectedLocation.latitude,
        ignitionLon: selectedLocation.longitude,
        simulationStartTime: authTimestamp,
        timelineTime: authTimestamp,
        selectedHorizon: selectedHorizon,
        spreadResult: spreadResult,
        forceRefresh: true
      });
    } catch (err) {
      console.error('[App] Assessment execution error:', err);
    } finally {
      setIsInferenceLoading(false);
    }
  }, [selectedLocation, envTimeline, isSimulatedFireActive, selectedHorizon, spreadResult]);

  // 3D Forest Rothermel Simulation Handlers
  const handleConfirmForestIgnition = useCallback(() => {
    if (!forestScene) return;
    const diag = forestScene.confirmIgnition();
    if (diag) {
      setIsForestFireActive(true);
      setRothermelDiagnostics(diag);
    }
  }, [forestScene]);

  const handleStepForestSimulation = useCallback(() => {
    if (!forestScene) return;
    const diag = forestScene.stepSimulation();
    setRothermelDiagnostics(diag);
  }, [forestScene]);

  const handleResetForestSimulation = useCallback(() => {
    if (!forestScene) return;
    forestScene.resetSimulation();
    setIsForestFireActive(false);
    setForestIgnitionCandidate(null);
    setRothermelDiagnostics(null);
    setIsPlaying(false);
  }, [forestScene]);

  const handleApplyForestEnvironmental = useCallback((inputs: Partial<RothermelInputs>) => {
    if (!forestScene) return;
    forestScene.applyEnvironmentalInputs(inputs);
    if (inputs.temperatureC !== undefined) setTemperatureCelsius(inputs.temperatureC);
    if (inputs.relativeHumidity !== undefined) setHumidityPercent(inputs.relativeHumidity);
    if (inputs.windSpeedKmh !== undefined) setWindSpeedKmh(inputs.windSpeedKmh);
    if (inputs.windDirectionDeg !== undefined) setWindDirectionDeg(inputs.windDirectionDeg);
    if (inputs.fuelMoisturePercent !== undefined) setFuelMoisturePercent(inputs.fuelMoisturePercent);
  }, [forestScene]);

  // View Mode switcher preserving Cesium WebGL context and preventing black screen
  const handleToggleViewMode = useCallback((mode: '3D_FOREST' | 'CESIUM_GLOBE') => {
    setViewMode(mode);
    if (mode === 'CESIUM_GLOBE') {
      setTimeout(() => {
        const viewer = CesiumViewerManager.getInstance().getViewer();
        if (viewer && !viewer.isDestroyed()) {
          viewer.resize();
          viewer.scene.requestRender();
        }
      }, 50);
    }
  }, []);

  // Automated playback loop for 3D Forest simulation
  useEffect(() => {
    if (!isPlaying || !forestScene || !isForestFireActive) return;
    const interval = setInterval(() => {
      const diag = forestScene.stepSimulation();
      setRothermelDiagnostics(diag);
    }, 1500 / Math.max(1, playbackSpeed));

    return () => clearInterval(interval);
  }, [isPlaying, forestScene, isForestFireActive, playbackSpeed]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 1. Slim Top Navigation Bar with View Switcher (3D Forest vs Regional Map) */}
      <AmazonHeader
        timeOfDay={timeOfDay}
        onSelectTimeOfDay={setTimeOfDay}
        temperatureCelsius={temperatureCelsius}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        onOpenInfo={() => setIsAIEvidenceOpen(true)}
      />

      {/* 2. Primary 3D Immersive Amazon Rainforest Workspace (View B) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: viewMode === '3D_FOREST' ? 'block' : 'none',
        }}
      >
        {/* Main Three.js Interactive 3D Rainforest Viewport */}
        <AmazonForestViewport
          timeOfDay={timeOfDay}
          cameraPreset={cameraPreset}
          selectedHorizon={selectedHorizon}
          showCanopy={showCanopy}
          showUnderstory={showUnderstory}
          showForestFloor={showForestFloor}
          showWaterBodies={showWaterBodies}
          showActiveFireFront={showActiveFireFront}
          showSmokePlume={showSmokePlume}
          windSpeedKmh={windSpeedKmh}
          windDirectionDeg={windDirectionDeg}
          onSceneReady={setForestScene}
          onIgnitionPointSelected={setForestIgnitionCandidate}
        />

        {/* Right-Hand Forest Digital Twin Panel Matching Reference Design */}
        <ForestDigitalTwinPanel
          temperatureCelsius={temperatureCelsius}
          humidityPercent={humidityPercent}
          windSpeedKmh={windSpeedKmh}
          windDirectionDeg={windDirectionDeg}
          fuelMoisturePercent={fuelMoisturePercent}
          selectedHorizon={selectedHorizon}
          onSelectHorizon={handleSelectHorizon}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((prev) => !prev)}
          onStop={() => {
            setIsPlaying(false);
            handleResetForestSimulation();
          }}
          playbackSpeed={playbackSpeed}
          onChangeSpeed={setPlaybackSpeed}
          showCanopy={showCanopy}
          onToggleCanopy={setShowCanopy}
          showUnderstory={showUnderstory}
          onToggleUnderstory={setShowUnderstory}
          showForestFloor={showForestFloor}
          onToggleForestFloor={setShowForestFloor}
          showWaterBodies={showWaterBodies}
          onToggleWaterBodies={setShowWaterBodies}
          showActiveFireFront={showActiveFireFront}
          onToggleActiveFireFront={setShowActiveFireFront}
          showSmokePlume={showSmokePlume}
          onToggleSmokePlume={setShowSmokePlume}
          showBurnedArea={showBurnedArea}
          onToggleBurnedArea={setShowBurnedArea}
          showFireSpreadPrediction={showFireSpreadPrediction}
          onToggleFireSpreadPrediction={setShowFireSpreadPrediction}
          onOpenAIEvidence={() => setIsAIEvidenceOpen(true)}
          ignitionCandidate={forestIgnitionCandidate}
          isFireActive={isForestFireActive}
          rothermelDiagnostics={rothermelDiagnostics}
          onConfirmIgnition={handleConfirmForestIgnition}
          onStepSimulation={handleStepForestSimulation}
          onResetSimulation={handleResetForestSimulation}
          onApplyEnvironmentalInputs={handleApplyForestEnvironmental}
        />

        {/* Bottom Camera Preset Toolbar */}
        <CameraNavigationToolbar
          activePreset={cameraPreset}
          onSelectPreset={setCameraPreset}
          onReset={() => setCameraPreset('CANOPY_FLYOVER')}
        />
      </div>

      {/* 3. Fully Restored Regional Geospatial Map (View A) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: viewMode === 'CESIUM_GLOBE' ? 'block' : 'none',
        }}
      >
          <CesiumViewerComponent
            onCoordinatesUpdate={() => {}}
            onTerrainLoaded={() => {}}
            onSelectLocation={handleSelectLocation}
          />

          {/* Left-Hand Geospatial Control Column */}
          <div
            style={{
              position: 'absolute',
              top: '64px',
              left: '20px',
              width: '380px',
              maxWidth: 'calc(50vw - 40px)',
              maxHeight: 'calc(100vh - 84px)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 35,
              pointerEvents: 'none'
            }}
          >
            {/* Location & Fire Ignition Panel */}
            <div style={{ pointerEvents: 'auto' }}>
              <LocationPanel
                location={selectedLocation}
                onClear={handleClearLocation}
                onRunInference={handleRunInference}
                isSimulatedFireActive={isSimulatedFireActive}
                onCreateIgnition={handleCreateIgnition}
                onRemoveFire={handleRemoveFire}
                onRunSpreadAnalysis={handleRunSpreadAnalysis}
                ignitionRejectionMessage={ignitionRejectionMessage}
                onOpenDetectionPanel={() => setIsDetectionPanelOpen(true)}
                assessmentRequest={assessmentRequest}
              />
            </div>

            {/* Simulation vs Satellite Observation Comparison Panel */}
            {(georefOutput || spreadResult) && (
              <div style={{ pointerEvents: 'auto' }}>
                <ComparisonPanel
                  simulationClockTime={simulationClockManager.getState().currentSimulationTime}
                  unetOutput={georefOutput}
                  comparisonMetrics={comparisonMetrics}
                  showGroundTruth={showGroundTruthLayer}
                  showSimulation={showSimulationLayer}
                  showWaterContext={showWaterContextLayer}
                  onToggleGroundTruth={() => setShowGroundTruthLayer((prev) => !prev)}
                  onToggleSimulation={() => setShowSimulationLayer((prev) => !prev)}
                  onToggleWaterContext={() => setShowWaterContextLayer((prev) => !prev)}
                />
              </div>
            )}

            {/* Directional Fire Spread Simulation Panel */}
            <div style={{ pointerEvents: 'auto' }}>
              <FireSpreadPanel
                simulationResult={spreadResult}
                selectedHorizon={selectedHorizon}
                onSelectHorizon={handleSelectHorizon}
                onClose={handleRemoveFire}
                isLoading={isSpreadLoading}
              />
            </div>

            {/* Historical EMSR239 Event Details */}
            {selectedLocation?.source === 'EMSR239_EVENT' && (
              <div style={{ pointerEvents: 'auto' }}>
                <EMSR239InfoPanel />
              </div>
            )}

            {/* Real Active Fire Observation Details */}
            {selectedLocation?.source === 'FIRMS_FIRE' && activeFireObservation && (
              <div style={{ pointerEvents: 'auto' }}>
                <FireObservationPanel observation={activeFireObservation} />
              </div>
            )}
          </div>

          {/* Environmental Parameters Panel (ERA5-Land, CAMS, FWI) */}
          <EnvironmentalPanel
            timeline={envTimeline}
            isOpen={isEnvPanelOpen}
            onClose={() => setIsEnvPanelOpen(false)}
            isLoading={isEnvLoading}
          />

          {/* Camera Controls & Study Region Centering */}
          <CameraControls
            onSelectLocation={handleSelectLocation}
            isForestPanelOpen={isForestPanelOpen}
            onToggleForestPanel={() => setIsForestPanelOpen((prev) => !prev)}
          />

          {/* Quick Action Button to Toggle Environmental Panel */}
          <div style={{ position: 'absolute', bottom: '24px', left: '20px', zIndex: 20 }}>
            <EnvironmentalFocusControl
              isOpen={isEnvPanelOpen}
              onToggle={() => setIsEnvPanelOpen((prev) => !prev)}
            />
          </div>

          {/* Basemap Imagery Switcher */}
          <ImageryToggle
            currentType={currentImagery}
            onSelectType={handleSelectImagery}
          />

          {/* Dedicated U-Net AI Satellite Detection Panel */}
          <UNetDetectionPanel
            isOpen={isDetectionPanelOpen}
            onClose={() => setIsDetectionPanelOpen(false)}
            assessmentRequest={assessmentRequest}
            georefOutput={georefOutput}
            currentIgnitionLat={selectedLocation?.latitude}
            currentIgnitionLon={selectedLocation?.longitude}
            isSimulatedFireActive={isSimulatedFireActive}
            selectedHorizon={selectedHorizon}
            onRetryAssessment={() => simulationAssessmentCoordinator.retryAssessment()}
            isLoading={isInferenceLoading}
          />

          {/* Floating Action Button for Fire Assessment */}
          {assessmentRequest && !isDetectionPanelOpen && (
            <div style={{ position: 'absolute', top: '70px', right: '24px', zIndex: 40 }}>
              <button
                onClick={() => setIsDetectionPanelOpen(true)}
                className="glass-button"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)',
                  background: 'var(--bg-surface)',
                  boxShadow: 'var(--shadow-floating)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <Satellite size={14} color="var(--accent-blue)" />
                <span>Fire assessment</span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background:
                      assessmentRequest.status === 'COMPLETED'
                        ? 'var(--status-success-bg)'
                        : 'var(--accent-blue-subtle)',
                    color:
                      assessmentRequest.status === 'COMPLETED'
                        ? 'var(--status-success)'
                        : 'var(--accent-blue)',
                    border:
                      assessmentRequest.status === 'COMPLETED'
                        ? '1px solid var(--status-success-border)'
                        : '1px solid var(--accent-blue-border)',
                  }}
                >
                  {assessmentRequest.status === 'COMPLETED' ? 'Ready' : 'In progress'}
                </span>
              </button>
            </div>
          )}
      </div>

      {/* 4. Verified U-Net AI Satellite Evidence & Scientific Provenance Modal */}
      <AIEvidenceModal
        isOpen={isAIEvidenceOpen}
        onClose={() => setIsAIEvidenceOpen(false)}
      />
    </div>
  );
}

export default App;
