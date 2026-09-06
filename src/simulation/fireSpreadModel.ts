import { Coordinates } from '../environmental/environmentalTypes';
import {
  FireState,
  TerrainData,
  FuelData,
  SpreadHorizon,
  SpreadTimestepResult,
  SpreadSimulationResult
} from './fireScenarioTypes';
import { EnvironmentalTimeline, EnvironmentalObservation } from '../environmental/environmentalTypes';

/**
 * ============================================================================
 * EXPERIMENTAL FIRE-SPREAD BASELINE MODEL — FORMULATION & EQUATIONS
 * ============================================================================
 *
 * 1. Environmental Wind Vector (\vec{W}):
 *    Wind direction theta_wind (deg) is converted to vector pushing fire TOWARD theta_towards = (theta_wind + 180) mod 360:
 *    W_x = WindSpeed * sin(theta_towards * pi / 180)
 *    W_y = WindSpeed * cos(theta_towards * pi / 180)
 *
 * 2. Terrain Slope Vector (\vec{S}):
 *    Terrain slope magnitude S_mag (deg) and aspect theta_aspect (deg):
 *    S_x = (S_mag * 0.6) * sin(theta_aspect * pi / 180)
 *    S_y = (S_mag * 0.6) * cos(theta_aspect * pi / 180)
 *    If slope/aspect is null or unavailable, \vec{S} = (0, 0).
 *
 * 3. Net Propagation Vector (\vec{V}_{net}):
 *    \vec{V}_{net} = \vec{W} + \vec{S}
 *    Magnitude: V_mag = sqrt(V_x^2 + V_y^2)
 *    Orientation: theta_net = atan2(V_x, V_y) * 180 / pi (normalized to 0..360 deg)
 *
 * 4. Moisture & Temperature Damping Factor (M_factor):
 *    HumidityFactor = max(0.1, 1 - RelativeHumidity / 120)
 *    PrecipDamping = max(0.0, 1 - Precipitation / 5)
 *    TempBoost = max(0.5, 1 + (Temperature - 20) / 40)
 *    M_factor = HumidityFactor * PrecipDamping * TempBoost
 *
 * 5. Rate of Spread (ROS in m/min):
 *    ROS = baseROS (2.5) * FuelBurnability * (1 + V_mag * 0.08) * M_factor
 *    If fuel is unavailable, FuelBurnability = 1.0 (baseline).
 *
 * 6. Hourly Forecast Weather Lookup:
 *    For timestep t + k (where k in {1, 2, 6, 12, 24} hours), the model queries
 *    the exact forecast hourly observation from Open-Meteo matching timestamp t + k.
 * ============================================================================
 */
export class FireSpreadModel {
  private static instance: FireSpreadModel;

  private constructor() {}

  public static getInstance(): FireSpreadModel {
    if (!FireSpreadModel.instance) {
      FireSpreadModel.instance = new FireSpreadModel();
    }
    return FireSpreadModel.instance;
  }

  /**
   * Execute experimental fire-spread simulation using real time-aware forecast weather,
   * derived terrain gradients, and land cover fuel classes.
   */
  public runSimulation(
    initialFire: FireState,
    envTimeline: EnvironmentalTimeline,
    terrain: TerrainData,
    fuel: FuelData
  ): SpreadSimulationResult {
    const horizons: { horizon: SpreadHorizon; hours: number }[] = [
      { horizon: '+1H', hours: 1 },
      { horizon: '+2H', hours: 2 },
      { horizon: '+6H', hours: 6 },
      { horizon: '+12H', hours: 12 },
      { horizon: '+24H', hours: 24 }
    ];

    const timesteps: Record<string, SpreadTimestepResult> = {};
    const obsList = envTimeline.observations;

    horizons.forEach(({ horizon, hours }) => {
      // Find exact forecast hourly weather observation at timestamp (t + hours)
      const baseMs = new Date(initialFire.timestamp).getTime();
      const targetMs = baseMs + hours * 3600 * 1000;

      let envObs: EnvironmentalObservation = obsList[envTimeline.selectedIndex] || obsList[0];
      if (obsList.length > 0) {
        let minDiff = Infinity;
        obsList.forEach((obs) => {
          const diff = Math.abs(new Date(obs.timestamp).getTime() - targetMs);
          if (diff < minDiff) {
            minDiff = diff;
            envObs = obs;
          }
        });
      }

      // 1. Calculate Environmental Wind Vector
      const windTowardsDeg = (envObs.windDirection + 180) % 360;
      const windRad = (windTowardsDeg * Math.PI) / 180;
      const windSpeed = envObs.windSpeed;

      const wX = windSpeed * Math.sin(windRad);
      const wY = windSpeed * Math.cos(windRad);

      // 2. Calculate Terrain Slope Vector (if terrain available)
      let sX = 0;
      let sY = 0;
      let slopeMagnitude = 0;

      if (terrain.isAvailable && terrain.slopeDegrees !== null && terrain.aspectDegrees !== null) {
        slopeMagnitude = terrain.slopeDegrees * 0.6;
        const aspectRad = (terrain.aspectDegrees * Math.PI) / 180;
        sX = slopeMagnitude * Math.sin(aspectRad);
        sY = slopeMagnitude * Math.cos(aspectRad);
      }

      // 3. Net Vector Combination (Wind + Slope)
      const netX = wX + sX;
      const netY = wY + sY;
      const netMagnitude = Math.sqrt(netX * netX + netY * netY);

      let netOrientationDeg = Math.round((Math.atan2(netX, netY) * 180) / Math.PI);
      if (netOrientationDeg < 0) netOrientationDeg += 360;

      // 4. Moisture & Temperature Damping Factor
      const humidityFactor = Math.max(0.1, 1 - envObs.relativeHumidity / 120);
      const precipDamping = Math.max(0.0, 1 - envObs.precipitation / 5);
      const tempBoost = Math.max(0.5, 1 + (envObs.temperature - 20) / 40);

      const moistureFactor = humidityFactor * precipDamping * tempBoost;

      // 5. Rate of Spread (ROS in m/min)
      const burnFactor = fuel.isAvailable && fuel.burnabilityFactor !== null ? fuel.burnabilityFactor : 1.0;
      const baseROS = 2.5;
      const rosMetersPerMin = Math.max(
        0.3,
        baseROS * burnFactor * (1 + netMagnitude * 0.08) * moistureFactor
      );

      // 6. Calculate Spread Ellipse Dimensions for Horizon
      const initialRadius = initialFire.radiusMeters || 100;
      const expansionMeters = rosMetersPerMin * 60 * hours;

      const majorAxisMeters = Math.round(initialRadius + expansionMeters);
      const minorAxisMeters = Math.round(initialRadius + expansionMeters * 0.55);

      const areaHectares = Math.round(
        (Math.PI * (majorAxisMeters / 1000) * (minorAxisMeters / 1000) * 100) * 10
      ) / 10;

      // 7. Calculate center shift along net vector
      const shiftDistanceMeters = expansionMeters * 0.3;
      const deltaLat = (shiftDistanceMeters * Math.cos((netOrientationDeg * Math.PI) / 180)) / 111320;
      const deltaLng =
        (shiftDistanceMeters * Math.sin((netOrientationDeg * Math.PI) / 180)) /
        (111320 * Math.cos((initialFire.latitude * Math.PI) / 180));

      const centerCoordinates: Coordinates = {
        latitude: parseFloat((initialFire.latitude + deltaLat).toFixed(6)),
        longitude: parseFloat((initialFire.longitude + deltaLng).toFixed(6))
      };

      let dominantFactor = 'Environmental Wind Vector';
      if (!terrain.isAvailable || terrain.slopeDegrees === null) {
        dominantFactor = 'Environmental Wind Vector (Terrain Slope Unavailable)';
      } else if (slopeMagnitude > windSpeed) {
        dominantFactor = 'Terrain Slope & Aspect Gradient Vector';
      }

      timesteps[horizon] = {
        horizon,
        hoursAhead: hours,
        timestamp: new Date(targetMs).toISOString(),
        centerCoordinates,
        majorAxisMeters,
        minorAxisMeters,
        orientationDegrees: netOrientationDeg,
        affectedAreaHectares: areaHectares,
        rateOfSpreadMetersPerMin: Math.round(rosMetersPerMin * 10) / 10,
        dominantFactor,
        environmentalState: envObs
      };
    });

    return {
      scenarioId: `spread_${Date.now()}`,
      initialFireState: initialFire,
      terrain,
      fuel,
      timesteps: timesteps as Record<SpreadHorizon, SpreadTimestepResult>,
      provenance: 'SIMULATED / EXPERIMENTAL FIRE-SPREAD SIMULATION',
      disclaimer:
        'This is a research/experimental prediction based on available environmental, terrain and land-cover data. It is not an operational emergency forecasting system.'
    };
  }
}

export const fireSpreadModel = FireSpreadModel.getInstance();
