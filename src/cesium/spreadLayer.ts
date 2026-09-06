import * as Cesium from 'cesium';
import { SpreadTimestepResult } from '../simulation/fireScenarioTypes';

export class SpreadLayerManager {
  private static instance: SpreadLayerManager | null = null;
  private spreadEntity: Cesium.Entity | null = null;

  public static getInstance(): SpreadLayerManager {
    if (!SpreadLayerManager.instance) {
      SpreadLayerManager.instance = new SpreadLayerManager();
    }
    return SpreadLayerManager.instance;
  }

  /**
   * Render predicted fire spread ellipse on Cesium 3D Globe.
   */
  public renderSpreadPrediction(viewer: Cesium.Viewer, step: SpreadTimestepResult): void {
    this.clearSpread(viewer);

    const position = Cesium.Cartesian3.fromDegrees(
      step.centerCoordinates.longitude,
      step.centerCoordinates.latitude
    );

    this.spreadEntity = viewer.entities.add({
      name: `Predicted Wildfire Spread (${step.horizon})`,
      position,
      ellipse: {
        semiMajorAxis: step.majorAxisMeters,
        semiMinorAxis: step.minorAxisMeters,
        rotation: Cesium.Math.toRadians(90 - step.orientationDegrees),
        material: new Cesium.ColorMaterialProperty(
          Cesium.Color.fromCssColorString('#F97316').withAlpha(0.35)
        ),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#EF4444').withAlpha(0.9),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      },
      description: `
        <div style="font-family: Inter, sans-serif; padding: 10px;">
          <h4 style="color: #F97316; margin: 0 0 6px 0;">EXPERIMENTAL FIRE SPREAD (${step.horizon})</h4>
          <p><strong>Affected Area:</strong> ${step.affectedAreaHectares} ha</p>
          <p><strong>Rate of Spread:</strong> ${step.rateOfSpreadMetersPerMin} m/min</p>
          <p><strong>Dominant Factor:</strong> ${step.dominantFactor}</p>
          <p><strong>Provenance:</strong> SIMULATED / PREDICTED SPREAD</p>
        </div>
      `
    });

    viewer.scene.requestRender();
  }

  /**
   * Clear active spread simulation layer from Cesium.
   */
  public clearSpread(viewer: Cesium.Viewer): void {
    if (this.spreadEntity) {
      viewer.entities.remove(this.spreadEntity);
      this.spreadEntity = null;
      viewer.scene.requestRender();
    }
  }
}
