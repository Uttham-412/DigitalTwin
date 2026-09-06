import { Coordinates, degreesToCardinal } from '../environmental/environmentalTypes';
import { TerrainData } from '../simulation/fireScenarioTypes';
import { CesiumViewerManager } from '../cesium/viewer';
import * as Cesium from 'cesium';

class TerrainService {
  private static instance: TerrainService;

  private constructor() {}

  public static getInstance(): TerrainService {
    if (!TerrainService.instance) {
      TerrainService.instance = new TerrainService();
    }
    return TerrainService.instance;
  }

  /**
   * Extract real terrain elevation, slope, and aspect for specified coordinates.
   * Calculates slope and aspect using central difference gradient over neighboring DEM elevation samples.
   */
  public async fetchTerrainData(coords: Coordinates): Promise<TerrainData> {
    const lat = coords.latitude;
    const lng = coords.longitude;

    try {
      const manager = CesiumViewerManager.getInstance();
      const viewer = manager.getViewer();

      if (viewer && !viewer.isDestroyed()) {
        const globe = viewer.scene.globe;

        const cartCenter = Cesium.Cartographic.fromDegrees(lng, lat);
        const sampledHeight = globe.getHeight(cartCenter);

        // If height is available from active Cesium DEM
        if (sampledHeight !== undefined && sampledHeight !== null && !isNaN(sampledHeight)) {
          const elevation = Math.round(sampledHeight);

          // Grid delta ~55m at equator
          const deltaDeg = 0.0005;
          const pN = globe.getHeight(Cesium.Cartographic.fromDegrees(lng, lat + deltaDeg));
          const pS = globe.getHeight(Cesium.Cartographic.fromDegrees(lng, lat - deltaDeg));
          const pE = globe.getHeight(Cesium.Cartographic.fromDegrees(lng + deltaDeg, lat));
          const pW = globe.getHeight(Cesium.Cartographic.fromDegrees(lng - deltaDeg, lat));

          let slope: number | null = null;
          let aspect: number | null = null;
          let aspectCardinal: string | null = null;

          // Derive slope & aspect only if all 4 neighbor heights are available
          if (pN !== undefined && pS !== undefined && pE !== undefined && pW !== undefined) {
            const dz_dx = (pE - pW) / 110.0;
            const dz_dy = (pN - pS) / 110.0;

            const slopeRad = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy));
            slope = Math.round(Cesium.Math.toDegrees(slopeRad) * 10) / 10;

            if (dz_dx !== 0 || dz_dy !== 0) {
              const aspectRad = Math.atan2(dz_dx, dz_dy);
              aspect = Math.round((Cesium.Math.toDegrees(aspectRad) + 360) % 360);
              aspectCardinal = degreesToCardinal(aspect);
            } else {
              aspect = 0;
              aspectCardinal = 'N';
            }
          }

          return {
            elevationMeters: elevation,
            slopeDegrees: slope,
            aspectDegrees: aspect,
            aspectCardinal,
            isAvailable: true,
            source: 'Cesium WGS84 3D World Terrain DEM'
          };
        }
      }
    } catch {
      // Fallback silently if scene terrain is initializing
    }

    return {
      elevationMeters: null,
      slopeDegrees: null,
      aspectDegrees: null,
      aspectCardinal: null,
      isAvailable: false,
      source: 'Cesium 3D World Terrain DEM',
      statusMessage: 'TERRAIN DATA UNAVAILABLE'
    };
  }
}

export const terrainService = TerrainService.getInstance();
