import { LayerDataType } from '../wildfire/wildfireTypes';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface SelectedLocation {
  id: string;
  latitude: number;
  longitude: number;
  height: number; // Elevation in meters above WGS84 ellipsoid / terrain
  timestamp: string;
  source: 'CESIUM_GLOBE_PICK';
  classification: LayerDataType.OBSERVED;
}

export interface EventGeospatialMetadata {
  eventId: string;
  name: string;
  crs: string; // e.g. "EPSG:32630" (UTM Zone 30N) or "EPSG:4326"
  bounds: BoundingBox;
  resolution: [number, number]; // [xRes, yRes] in meters or degrees
  width: number;
  height: number;
  source: string;
  acquisitionTime?: string;
}

/**
 * Format latitude and longitude coordinates into a human-readable string.
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}
