import { useState, useCallback, useEffect } from 'react';
import { CesiumViewerComponent } from './components/map/CesiumViewer';
import { CameraControls } from './components/map/CameraControls';
import { Header } from './components/ui/Header';
import { LocationPanel } from './components/ui/LocationPanel';
import { ImageryToggle } from './components/ui/ImageryToggle';
import { AmazonInfoPanel } from './components/ui/AmazonInfoPanel';
import { FireObservationPanel } from './components/wildfire/FireObservationPanel';
import { EMSR239InfoPanel } from './components/ui/EMSR239InfoPanel';
import { EnvironmentalPanel } from './components/ui/EnvironmentalPanel';
import { EnvironmentalFocusControl } from './components/map/EnvironmentalFocusControl';
import { SelectedLocation } from './geospatial/coordinates';
import { SelectionMarkerManager } from './cesium/selectionMarker';
import { FireMarkerManager } from './cesium/fireMarker';
import { WildfireLayerManager } from './cesium/wildfireLayer';
import { CesiumViewerManager } from './cesium/viewer';
import { ImageryType, setImageryLayer } from './cesium/imagery';
import { AMAZON_REAL_WILDFIRE_OBSERVATIONS } from './wildfire/fireObservation';
import { environmentalService } from './environmental/environmentalService';
import { EnvironmentalTimeline } from './environmental/environmentalTypes';

export function App() {
  const [coordinates, setCoordinates] = useState<string>('---, ---');
  const [altitude, setAltitude] = useState<string>('---');
  const [isTerrainLoaded, setIsTerrainLoaded] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [currentImagery, setCurrentImagery] = useState<ImageryType>(ImageryType.SATELLITE);

  // Environmental Intelligence State
  const [envTimeline, setEnvTimeline] = useState<EnvironmentalTimeline | null>(null);
  const [isEnvPanelOpen, setIsEnvPanelOpen] = useState<boolean>(true);
  const [isEnvLoading, setIsEnvLoading] = useState<boolean>(false);

  const activeFireObservation = AMAZON_REAL_WILDFIRE_OBSERVATIONS[0];

  const handleCoordinatesUpdate = useCallback((coords: string, alt: string) => {
    setCoordinates(coords);
    setAltitude(alt);
  }, []);

  const handleTerrainLoaded = useCallback((status: boolean) => {
    setIsTerrainLoaded(status);
  }, []);

  // Fetch real-time weather when location is selected or initialized
  const loadWeatherForCoords = useCallback(async (lat: number, lng: number, name?: string) => {
    setIsEnvLoading(true);
    const timeline = await environmentalService.fetchEnvironmentalTimeline(
      { latitude: lat, longitude: lng },
      name
    );
    setEnvTimeline(timeline);
    setIsEnvLoading(false);
  }, []);

  // Initial Weather Load (Default to Amazon Rainforest target region)
  useEffect(() => {
    loadWeatherForCoords(-3.3842, -60.1985, 'Amazon Rainforest (Manaus Corridor)');
  }, [loadWeatherForCoords]);

  // Update weather when user clicks on globe
  useEffect(() => {
    if (selectedLocation) {
      loadWeatherForCoords(
        selectedLocation.latitude,
        selectedLocation.longitude,
        `Selected Pin (${selectedLocation.latitude.toFixed(4)}°, ${selectedLocation.longitude.toFixed(4)}°)`
      );
    }
  }, [selectedLocation, loadWeatherForCoords]);

  // Update 3D selection pin marker in Cesium when location state changes
  useEffect(() => {
    const manager = CesiumViewerManager.getInstance();
    const viewer = manager.getViewer();
    if (viewer) {
      SelectionMarkerManager.getInstance().updateMarker(viewer, selectedLocation);
    }
  }, [selectedLocation]);

  // Render real active fire observation marker & EMSR239 U-Net AI GeoJSON layers in Cesium
  useEffect(() => {
    const timer = setTimeout(() => {
      const manager = CesiumViewerManager.getInstance();
      const viewer = manager.getViewer();
      if (viewer) {
        FireMarkerManager.getInstance().renderFireObservations(viewer, AMAZON_REAL_WILDFIRE_OBSERVATIONS);
        WildfireLayerManager.getInstance().loadEMSR239Layers(viewer);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Initial cinematic fly-to to Amazon Rainforest region on load
  useEffect(() => {
    const timer = setTimeout(() => {
      const manager = CesiumViewerManager.getInstance();
      manager.flyToAmazonRegion(3.5);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Handle globe click selection callback registration
  const handleSelectLocation = useCallback((location: SelectedLocation) => {
    setSelectedLocation(location);
  }, []);

  const handleClearLocation = useCallback(() => {
    setSelectedLocation(null);
    const manager = CesiumViewerManager.getInstance();
    const viewer = manager.getViewer();
    if (viewer) {
      SelectionMarkerManager.getInstance().clear(viewer);
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

  const handleSelectEnvIndex = useCallback((index: number) => {
    setEnvTimeline((prev) => (prev ? { ...prev, selectedIndex: index } : null));
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Top Header */}
      <Header
        coordinates={coordinates}
        altitude={altitude}
        isTerrainLoaded={isTerrainLoaded}
        selectedLocation={selectedLocation}
      />

      {/* Amazon Rainforest Information Panel */}
      <AmazonInfoPanel />

      {/* EMSR239 U-Net AI Layer Information Panel */}
      <EMSR239InfoPanel />

      {/* Real NASA FIRMS Wildfire Observation Panel */}
      {activeFireObservation && (
        <FireObservationPanel observation={activeFireObservation} />
      )}

      {/* Time-Aware Environmental Intelligence Panel */}
      <EnvironmentalPanel
        timeline={envTimeline}
        onSelectIndex={handleSelectEnvIndex}
        isOpen={isEnvPanelOpen}
        onClose={() => setIsEnvPanelOpen(false)}
        isLoading={isEnvLoading}
      />

      {/* Main 3D Cesium Map Canvas */}
      <CesiumViewerComponent
        onCoordinatesUpdate={handleCoordinatesUpdate}
        onTerrainLoaded={handleTerrainLoaded}
        onSelectLocation={handleSelectLocation}
      />

      {/* Floating Navigation Controls */}
      <CameraControls />

      {/* Quick Action Button to Toggle Environmental Intelligence Panel */}
      <div style={{ position: 'absolute', bottom: '24px', left: '20px', zIndex: 20 }}>
        <EnvironmentalFocusControl
          isOpen={isEnvPanelOpen}
          onToggle={() => setIsEnvPanelOpen((prev) => !prev)}
        />
      </div>

      {/* Basemap Imagery Layer Switcher */}
      <ImageryToggle
        currentType={currentImagery}
        onSelectType={handleSelectImagery}
      />

      {/* Slide-in Selected Location Telemetry Panel */}
      <LocationPanel
        location={selectedLocation}
        onClear={handleClearLocation}
      />
    </div>
  );
}

export default App;
