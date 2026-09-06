import * as Cesium from 'cesium';
import { SelectedLocation } from '../geospatial/coordinates';

export class SelectionMarkerManager {
  private static instance: SelectionMarkerManager | null = null;
  private markerEntity: Cesium.Entity | null = null;

  public static getInstance(): SelectionMarkerManager {
    if (!SelectionMarkerManager.instance) {
      SelectionMarkerManager.instance = new SelectionMarkerManager();
    }
    return SelectionMarkerManager.instance;
  }

  public updateMarker(viewer: Cesium.Viewer, location: SelectedLocation | null): void {
    if (!viewer || viewer.isDestroyed()) return;

    if (!location) {
      if (this.markerEntity) {
        viewer.entities.remove(this.markerEntity);
        this.markerEntity = null;
        viewer.scene.requestRender();
      }
      return;
    }

    const position = Cesium.Cartesian3.fromDegrees(
      location.longitude,
      location.latitude,
      location.height
    );

    if (this.markerEntity) {
      this.markerEntity.position = new Cesium.ConstantPositionProperty(position);
    } else {
      this.markerEntity = viewer.entities.add({
        name: 'Selected Target Location',
        position: position,
        point: {
          pixelSize: 12,
          color: Cesium.Color.fromCssColorString('#00e5ff'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY, // Ensure pin is visible above terrain
        },
        ellipse: {
          semiMinorAxis: 150.0,
          semiMajorAxis: 150.0,
          material: Cesium.Color.fromCssColorString('#00e5ff').withAlpha(0.25),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#00e5ff'),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });
    }

    viewer.scene.requestRender();
  }

  public clear(viewer: Cesium.Viewer): void {
    if (viewer && !viewer.isDestroyed() && this.markerEntity) {
      viewer.entities.remove(this.markerEntity);
      this.markerEntity = null;
      viewer.scene.requestRender();
    }
  }
}
