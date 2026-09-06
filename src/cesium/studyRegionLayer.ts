import * as Cesium from 'cesium';
import { AMAZON_STUDY_REGION } from '../config/studyRegion';

export class StudyRegionLayerManager {
  private static instance: StudyRegionLayerManager;
  private boundaryEntity: Cesium.Entity | null = null;
  private labelEntity: Cesium.Entity | null = null;

  private constructor() {}

  public static getInstance(): StudyRegionLayerManager {
    if (!StudyRegionLayerManager.instance) {
      StudyRegionLayerManager.instance = new StudyRegionLayerManager();
    }
    return StudyRegionLayerManager.instance;
  }

  /**
   * Render the operational Amazon Digital Twin study region boundary polygon on Cesium globe.
   */
  public renderStudyRegionBoundary(viewer: Cesium.Viewer): void {
    if (!viewer || viewer.isDestroyed()) return;

    this.clear(viewer);

    const bbox = AMAZON_STUDY_REGION.boundingBox;

    // Polygon hierarchy for operational bounding box rectangle
    const degrees = [
      bbox.west, bbox.north,
      bbox.east, bbox.north,
      bbox.east, bbox.south,
      bbox.west, bbox.south
    ];

    this.boundaryEntity = viewer.entities.add({
      id: 'amazon_study_region_boundary',
      name: AMAZON_STUDY_REGION.name,
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(degrees),
        material: Cesium.Color.fromCssColorString('#10B981').withAlpha(0.08), // Semi-transparent emerald fill
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#10B981').withAlpha(0.8), // Vibrant emerald outline
        outlineWidth: 2,
        height: 0
      }
    });

    // Label entity at Northern boundary
    this.labelEntity = viewer.entities.add({
      id: 'amazon_study_region_label',
      position: Cesium.Cartesian3.fromDegrees(
        (bbox.west + bbox.east) / 2,
        bbox.north - 0.5,
        15000
      ),
      label: {
        text: 'AMAZON STUDY REGION — OPERATIONAL BOUNDING BOX',
        font: 'bold 11px Inter, sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#34D399'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
  }

  /**
   * Clear study region boundary entities.
   */
  public clear(viewer: Cesium.Viewer): void {
    if (!viewer || viewer.isDestroyed()) return;

    if (this.boundaryEntity) {
      viewer.entities.remove(this.boundaryEntity);
      this.boundaryEntity = null;
    }
    if (this.labelEntity) {
      viewer.entities.remove(this.labelEntity);
      this.labelEntity = null;
    }
  }
}
