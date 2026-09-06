import { LayerDataType } from '../../wildfire/wildfireTypes';
import { BoundingBox } from '../../geospatial/coordinates';

export interface AmazonRegionMetadata {
  id: string;
  name: string;
  subRegion: string;
  country: string;
  state: string;
  latitude: number; // Degrees South (negative value)
  longitude: number; // Degrees West (negative value)
  viewingHeight: number; // Meters above ellipsoid
  pitchDegrees: number;
  headingDegrees: number;
  bounds: BoundingBox;
  description: string;
  dataSources: {
    terrain: string;
    imagery: string;
    threeDContent: string;
    wildfireAI: string;
  };
  provenance: {
    classification: LayerDataType.OBSERVED;
    type: 'GEOGRAPHIC_REFERENCE';
    description: 'Verified real-world satellite observation & 3D terrain reference';
  };
}

export const AMAZON_RAINFOREST_REGION: AmazonRegionMetadata = {
  id: 'amazon_manaus_anavilhanas',
  name: 'Manaus & Anavilhanas Rainforest Reserve',
  subRegion: 'Central Amazon Basin',
  country: 'Brazil',
  state: 'Amazonas',
  latitude: -3.119, // 3.1190° S
  longitude: -60.0217, // 60.0217° W
  viewingHeight: 18000, // 18 km altitude for regional view
  pitchDegrees: -45, // 45 degree tilt for realistic 3D depth perception
  headingDegrees: 0,
  bounds: {
    west: -60.5,
    south: -3.5,
    east: -59.5,
    north: -2.5,
  },
  description:
    'Real-world 3D Digital Twin centered over the central Amazon rainforest basin at the confluence of the Rio Negro and Solimões (Amazon River), encompassing protected tropical rainforest reserves.',
  dataSources: {
    terrain: 'Cesium World Terrain (WGS84 DEM)',
    imagery: 'Cesium Ion High-Resolution Satellite Aerial Imagery',
    threeDContent: 'Satellite-Observed Land Cover Terrain',
    wildfireAI: 'NOT CONNECTED YET',
  },
  provenance: {
    classification: LayerDataType.OBSERVED,
    type: 'GEOGRAPHIC_REFERENCE',
    description: 'Verified real-world satellite observation & 3D terrain reference',
  },
};
