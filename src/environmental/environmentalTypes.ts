export interface Coordinates {
  latitude: number;
  longitude: number;
}

export enum EnvironmentalProvenance {
  OBSERVED = 'OBSERVED',
  FORECAST = 'FORECAST',
  DERIVED = 'DERIVED'
}

export interface EnvironmentalObservation {
  location: Coordinates;
  locationName?: string;
  timestamp: string; // ISO 8601 string, e.g. "2026-09-06T14:00:00Z"
  formattedTime: string; // e.g. "14:00" or "Sep 6, 14:00"
  temperature: number; // °C
  relativeHumidity: number; // %
  windSpeed: number; // km/h
  windDirection: number; // degrees (0-360, 0 = N, 90 = E, 180 = S, 270 = W)
  windDirectionCardinal: string; // e.g., "N", "NE", "SSW"
  precipitation: number; // mm
  surfacePressure?: number; // hPa
  cloudCover?: number; // %
  provenance: EnvironmentalProvenance;
  source: string; // e.g., "Open-Meteo (DWD-ICON / NOAA-GFS)"
}

export interface EnvironmentalTimeline {
  location: Coordinates;
  locationName?: string;
  observations: EnvironmentalObservation[];
  selectedIndex: number;
  lastUpdated: string;
  isAvailable: boolean;
  errorMessage?: string;
}

/**
 * Data Interface prepared for future FireSpreadModel (Phase 7+)
 * EnvironmentalState(T) -> FireSpreadModel -> PredictedFireState(T + dt)
 */
export interface EnvironmentalStateInput {
  timestamp: string;
  location: Coordinates;
  temperature_c: number;
  relative_humidity_pct: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  precipitation_mm: number;
  surface_pressure_hpa?: number;
}

/**
 * Convert wind direction degrees (0-360) to 16-point cardinal direction string.
 */
export function degreesToCardinal(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}
