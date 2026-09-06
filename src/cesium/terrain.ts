import * as Cesium from 'cesium';

export async function enableWorldTerrain(viewer: Cesium.Viewer): Promise<boolean> {
  try {
    const ionToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN;
    if (!ionToken || ionToken.trim().length === 0) {
      console.info('[Land8Fire] Terrain skipping: No Cesium Ion token configured.');
      return false;
    }

    // Attempt loading Cesium World Terrain asynchronously
    const terrainProvider = await Cesium.createWorldTerrainAsync({
      requestWaterMask: true,
      requestVertexNormals: true,
    });

    viewer.terrainProvider = terrainProvider;
    viewer.scene.requestRender();
    console.log('[Land8Fire] Real-world 3D Terrain loaded successfully.');
    return true;
  } catch (error) {
    console.warn('[Land8Fire] Could not load Cesium World Terrain. Falling back to ellipsoid terrain.', error);
    return false;
  }
}
