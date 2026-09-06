/**
 * LAND8FIRE — AMAZON RAINFOREST DIGITAL TWIN STUDY REGION CONFIGURATION
 *
 * Centralized scientific definition for the operational Amazon Digital Twin study region.
 *
 * SCIENTIFIC CLASSIFICATION:
 * Type: APPROXIMATE_OPERATIONAL_BOUNDING_BOX
 * Description: Operational geographic study region used by Land8Fire for Amazon Rainforest wildfire analysis.
 */

export interface StudyRegionMetadata {
  name: string;
  type: string;
  description: string;
  boundingBox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  center: {
    latitude: number;
    longitude: number;
    altitudeMeters: number;
  };
}

export const AMAZON_STUDY_REGION: StudyRegionMetadata = {
  name: 'Amazon Rainforest Digital Twin Study Region',
  type: 'APPROXIMATE_OPERATIONAL_BOUNDING_BOX',
  description:
    'Operational geographic study region used by Land8Fire for Amazon Rainforest wildfire analysis.',
  boundingBox: {
    west: -79.0,
    south: -18.0,
    east: -46.0,
    north: 6.0
  },
  center: {
    latitude: -3.3842,
    longitude: -60.1985,
    altitudeMeters: 2500000 // 2,500 km altitude overview
  }
};

/**
 * Authoritative scientific gate to evaluate whether coordinates fall within
 * the operational Amazon Rainforest Digital Twin study region.
 */
export function isPointInAmazonStudyRegion(lat: number, lon: number): boolean {
  const bbox = AMAZON_STUDY_REGION.boundingBox;
  return (
    lat >= bbox.south &&
    lat <= bbox.north &&
    lon >= bbox.west &&
    lon <= bbox.east
  );
}
