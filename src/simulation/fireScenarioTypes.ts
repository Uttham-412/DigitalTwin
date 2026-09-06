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
  elevationMeters: number;
  slopeDegrees: number;
  aspectDegrees: number;
  aspectCardinal: string;
  source: string; // e.g. "Cesium WGS84 / 3D World Terrain DEM"
}

export interface FuelData {
  fuelClass: string; // e.g. "Dense Forest", "Shrubland", "Grassland", "Urban / Built-Up", "Water Body"
  burnabilityFactor: number; // 0.0 (non-burnable) to 1.0 (high fuel)
  fuelLoadTonsPerHectare: number;
  isBurnable: boolean;
  source: string;
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
