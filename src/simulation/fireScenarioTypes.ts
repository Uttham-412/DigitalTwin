import { Coordinates } from '../environmental/environmentalTypes';
import { EnvironmentalObservation } from '../environmental/environmentalTypes';

export type SpreadHorizon = '+1H' | '+2H' | '+6H' | '+12H' | '+24H';

export interface FireState {
  id: string;
  source: 'FIRMS' | 'UNET' | 'SIMULATED';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  areaHectares: number;
  timestamp: string;
  provenance: string; // e.g. "SIMULATED / USER-DEFINED SCENARIO"
}

export interface TerrainData {
  elevationMeters: number | null;
  slopeDegrees: number | null;
  aspectDegrees: number | null;
  aspectCardinal: string | null;
  isAvailable: boolean;
  source: string; // e.g. "Cesium 3D World Terrain DEM"
  statusMessage?: string;
}

export interface FuelData {
  fuelClass: string; // e.g. "Tree Cover", "Shrubland", "Grassland", "DATA UNAVAILABLE"
  burnabilityFactor: number | null; // 0.0 (non-burnable) to 1.0 (high fuel) or null if unavailable
  fuelLoadTonsPerHectare: number | null;
  isBurnable: boolean;
  isAvailable: boolean;
  isDerivedEstimate?: boolean;
  source: string;
  statusMessage?: string;
}

export interface SpreadTimestepResult {
  horizon: SpreadHorizon;
  hoursAhead: number;
  timestamp: string;
  centerCoordinates: Coordinates;
  majorAxisMeters: number; // Semi-major axis along wind/slope vector
  minorAxisMeters: number; // Semi-minor axis perpendicular to vector
  orientationDegrees: number; // Bearing of fire expansion
  affectedAreaHectares: number;
  rateOfSpreadMetersPerMin: number;
  dominantFactor: string;
  environmentalState: EnvironmentalObservation;
}

export interface SpreadSimulationResult {
  scenarioId: string;
  initialFireState: FireState;
  terrain: TerrainData;
  fuel: FuelData;
  timesteps: Record<SpreadHorizon, SpreadTimestepResult>;
  provenance: string; // "SIMULATED / EXPERIMENTAL FIRE-SPREAD SIMULATION"
  disclaimer: string;
}
