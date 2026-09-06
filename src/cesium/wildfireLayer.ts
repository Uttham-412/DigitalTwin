import * as Cesium from 'cesium';

export class WildfireLayerManager {
  private static instance: WildfireLayerManager | null = null;
  private predictionDataSource: Cesium.GeoJsonDataSource | null = null;
  private gtDataSource: Cesium.GeoJsonDataSource | null = null;
  private patchBoundaryEntity: Cesium.Entity | null = null;

  public static getInstance(): WildfireLayerManager {
    if (!WildfireLayerManager.instance) {
      WildfireLayerManager.instance = new WildfireLayerManager();
    }
    return WildfireLayerManager.instance;
  }

  public async loadEMSR239Layers(viewer: Cesium.Viewer): Promise<void> {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      // 1. Load AI Prediction GeoJSON
      this.predictionDataSource = await Cesium.GeoJsonDataSource.load('/data/emsr239_prediction.json', {
        stroke: Cesium.Color.fromCssColorString('#ef4444'),
        fill: Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.45),
        strokeWidth: 2,
        clampToGround: true,
      });

      // 2. Load Ground Truth GeoJSON
      this.gtDataSource = await Cesium.GeoJsonDataSource.load('/data/emsr239_ground_truth.json', {
        stroke: Cesium.Color.fromCssColorString('#10b981'),
        fill: Cesium.Color.fromCssColorString('#10b981').withAlpha(0.35),
        strokeWidth: 2,
        clampToGround: true,
      });

      viewer.dataSources.add(this.predictionDataSource);
      viewer.dataSources.add(this.gtDataSource);

      // 3. Add Patch 433 Boundary Rectangle
      // Bounds: UL (37.855987, -6.019492), LR (37.832961, -5.990349)
      this.patchBoundaryEntity = viewer.entities.add({
        name: 'Patch 433 Boundary (r128_c512)',
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(-6.019492, 37.832961, -5.990349, 37.855987),
          material: Cesium.Color.TRANSPARENT,
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#00e5ff'),
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });

      viewer.scene.requestRender();
      console.log('[Land8Fire] EMSR239 U-Net AI Layer and Ground Truth loaded successfully into Cesium 3D.');
    } catch (err) {
      console.error('[Land8Fire] Failed to load EMSR239 GeoJSON layers in Cesium:', err);
    }
  }

  public setPredictionVisibility(visible: boolean): void {
    if (this.predictionDataSource) {
      this.predictionDataSource.show = visible;
    }
  }

  public setGroundTruthVisibility(visible: boolean): void {
    if (this.gtDataSource) {
      this.gtDataSource.show = visible;
    }
  }

  public setBoundaryVisibility(visible: boolean): void {
    if (this.patchBoundaryEntity) {
      this.patchBoundaryEntity.show = visible;
    }
  }
}
