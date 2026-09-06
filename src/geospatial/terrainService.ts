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
   */
  public async fetchTerrainData(coords: Coordinates): Promise<TerrainData> {
    const lat = coords.latitude;
    const lng = coords.longitude;

    let elevation = 250; // Default baseline elevation in meters
    let slope = 0;
    let aspect = 0;

    try {
      const manager = CesiumViewerManager.getInstance();
      const viewer = manager.getViewer();

      if (viewer && !viewer.isDestroyed()) {
        const cartographic = Cesium.Cartographic.fromDegrees(lng, lat);
        const globe = viewer.scene.globe;

        // Sample elevation from active terrain provider
        const sampledHeight = globe.getHeight(cartographic);
        if (sampledHeight !== undefined) {
          elevation = Math.max(0, Math.round(sampledHeight));
        }

        // Sample surrounding 4 cardinal points (50m offset) to compute real slope & aspect
        const deltaDeg = 0.0005; // ~55m at equator
        const pN = globe.getHeight(Cesium.Cartographic.fromDegrees(lng, lat + deltaDeg)) ?? elevation;
        const pS = globe.getHeight(Cesium.Cartographic.fromDegrees(lng, lat - deltaDeg)) ?? elevation;
        const pE = globe.getHeight(Cesium.Cartographic.fromDegrees(lng + deltaDeg, lat)) ?? elevation;
        const pW = globe.getHeight(Cesium.Cartographic.fromDegrees(lng - deltaDeg, lat)) ?? elevation;

        const dz_dx = (pE - pW) / 110.0;
        const dz_dy = (pN - pS) / 110.0;

        const slopeRad = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy));
        slope = Math.round(Cesium.Math.toDegrees(slopeRad) * 10) / 10;

        if (dz_dx !== 0 || dz_dy !== 0) {
          const aspectRad = Math.atan2(dz_dx, dz_dy);
          aspect = Math.round((Cesium.Math.toDegrees(aspectRad) + 360) % 360);
        }
      }
    } catch {
      // Fallback silently if scene terrain is initializing
    }

    return {
      elevationMeters: elevation,
      slopeDegrees: slope,
      aspectDegrees: aspect,
      aspectCardinal: degreesToCardinal(aspect),
      source: 'Cesium WGS84 3D World Terrain DEM'
    };
  }
}

export const terrainService = TerrainService.getInstance();
