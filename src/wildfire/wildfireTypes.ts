import { EventGeospatialMetadata } from '../geospatial/coordinates';

export enum LayerDataType {
  OBSERVED = 'OBSERVED',     // Satellite imagery, verified wildfire event labels, measured telemetry
  DERIVED = 'DERIVED',       // Model predictions (e.g. U-Net burned area mask), calculated vegetation indices
  SIMULATED = 'SIMULATED',   // Future fire-spread models, scenario projections
  RECONSTRUCTED = 'RECONSTRUCTED', // Visual 3D objects, vegetation representations
}

export interface WildfireEvent {
  id: string;
  title: string;
  locationName: string;
  metadata: EventGeospatialMetadata;
  patchInfo?: {
    patchName: string;
    row: number;
    col: number;
    patchSize: [number, number];
  };
  hasGroundTruth: boolean;
  hasUNetPrediction: boolean;
}

export interface LayerMetadata {
  id: string;
  name: string;
  dataType: LayerDataType;
  description: string;
  source: string;
  active: boolean;
}
