import * as Cesium from 'cesium';
import { FireObservation } from '../wildfire/fireObservation';

export class FireMarkerManager {
  private static instance: FireMarkerManager | null = null;
  private fireEntities: Map<string, Cesium.Entity> = new Map();

  public static getInstance(): FireMarkerManager {
    if (!FireMarkerManager.instance) {
      FireMarkerManager.instance = new FireMarkerManager();
    }
    return FireMarkerManager.instance;
  }

  public renderFireObservations(viewer: Cesium.Viewer, observations: FireObservation[]): void {
    if (!viewer || viewer.isDestroyed()) return;

    this.clearAll(viewer);

    observations.forEach((fire) => {
      const position = Cesium.Cartesian3.fromDegrees(fire.longitude, fire.latitude, 0);

      const entity = viewer.entities.add({
        id: fire.id,
        name: `${fire.name} (${fire.source})`,
        position: position,
        point: {
          pixelSize: 14,
          color: Cesium.Color.fromCssColorString('#ef4444'), // Fire Red/Orange
          outlineColor: Cesium.Color.fromCssColorString('#f59e0b'), // Amber outline
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY, // Ensure point marker stays visible above terrain
        },
        ellipse: {
          semiMinorAxis: 250.0, // 250m detection radius precision
          semiMajorAxis: 250.0,
          material: Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.3),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#f59e0b'),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        description: `
          <div style="font-family: sans-serif; color: #333;">
            <h3>${fire.name}</h3>
            <p><strong>Source:</strong> ${fire.source}</p>
            <p><strong>Instrument:</strong> ${fire.satelliteInstrument}</p>
            <p><strong>Observation Time:</strong> ${new Date(fire.observationTime).toUTCString()}</p>
            <p><strong>Coordinates:</strong> ${fire.latitude}° N, ${fire.longitude}° E</p>
            <p><strong>Confidence:</strong> ${fire.confidence}</p>
            <p><strong>Brightness Temp:</strong> ${fire.brightnessTempK} K</p>
            <p><strong>Fire Radiative Power (FRP):</strong> ${fire.frpMW} MW</p>
          </div>
        `,
      });

      this.fireEntities.set(fire.id, entity);
    });

    viewer.scene.requestRender();
  }

  public clearAll(viewer: Cesium.Viewer): void {
    if (!viewer || viewer.isDestroyed()) return;

    this.fireEntities.forEach((entity) => {
      viewer.entities.remove(entity);
    });
    this.fireEntities.clear();
    viewer.scene.requestRender();
  }
}
