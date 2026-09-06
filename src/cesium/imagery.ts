import * as Cesium from 'cesium';

export enum ImageryType {
  SATELLITE = 'SATELLITE',
  OPEN_STREET_MAP = 'OPEN_STREET_MAP',
}

export async function setImageryLayer(viewer: Cesium.Viewer, type: ImageryType): Promise<void> {
  const layers = viewer.imageryLayers;
  
  if (type === ImageryType.OPEN_STREET_MAP) {
    const osmProvider = new Cesium.OpenStreetMapImageryProvider({
      url: 'https://tile.openstreetmap.org/',
    });
    layers.removeAll();
    layers.addImageryProvider(osmProvider);
  } else if (type === ImageryType.SATELLITE) {
    const ionToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN;
    if (ionToken && ionToken.trim().length > 0) {
      try {
        const ionImagery = await Cesium.IonImageryProvider.fromAssetId(2); // Asset ID 2: Bing Maps Aerial / Ion Satellite
        layers.removeAll();
        layers.addImageryProvider(ionImagery);
      } catch (err) {
        console.warn('[Land8Fire] Could not load Ion Satellite imagery, using OSM default.', err);
      }
    }
  }
  
  viewer.scene.requestRender();
}
