import { Coordinates } from '../environmental/environmentalTypes';
import {
  FireState,
  TerrainData,
  FuelData,
  SpreadHorizon,
  SpreadTimestepResult,
  SpreadSimulationResult
} from './fireScenarioTypes';
import { EnvironmentalTimeline } from '../environmental/environmentalTypes';

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
   * Execute experimental fire-spread simulation based on real environmental, terrain, and fuel factors.
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
      // Find closest forecast/observed weather timestep for horizon
      const baseMs = new Date(initialFire.timestamp).getTime();
      const targetMs = baseMs + hours * 3600 * 1000;

      let envObs = obsList[envTimeline.selectedIndex] || obsList[0];
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

      // 1. Calculate Environmental Wind Vector (wind pushes in direction wind is blowing towards)
      const windTowardsDeg = (envObs.windDirection + 180) % 360;
      const windRad = (windTowardsDeg * Math.PI) / 180;
      const windSpeed = envObs.windSpeed;

      const wX = windSpeed * Math.sin(windRad);
      const wY = windSpeed * Math.cos(windRad);

      // 2. Calculate Terrain Slope Vector (fire moves faster uphill in aspect direction)
      const aspectRad = (terrain.aspectDegrees * Math.PI) / 180;
      const slopeMagnitude = terrain.slopeDegrees * 0.6; // slope scaling

      const sX = slopeMagnitude * Math.sin(aspectRad);
      const sY = slopeMagnitude * Math.cos(aspectRad);

      // 3. Net Vector Combination (Wind + Slope)
      const netX = wX + sX;
      const netY = wY + sY;
      const netMagnitude = Math.sqrt(netX * netX + netY * netY);

      let netOrientationDeg = Math.round((Math.atan2(netX, netY) * 180) / Math.PI);
      if (netOrientationDeg < 0) netOrientationDeg += 360;

      // 4. Moisture & Weather Damping Factor
      const humidityFactor = Math.max(0.1, 1 - envObs.relativeHumidity / 120);
      const precipDamping = Math.max(0.0, 1 - envObs.precipitation / 5);
      const tempBoost = Math.max(0.5, 1 + (envObs.temperature - 20) / 40);

      const moistureFactor = humidityFactor * precipDamping * tempBoost;

      // 5. Rate of Spread (ROS) in meters per minute
      const baseROS = 2.5; // m/min base
      const rosMetersPerMin = Math.max(
        0.5,
        baseROS * fuel.burnabilityFactor * (1 + netMagnitude * 0.08) * moistureFactor
      );

      // 6. Calculate Spread Ellipse Dimensions for Horizon
      const initialRadius = initialFire.radiusMeters || 100;
      const expansionMeters = rosMetersPerMin * 60 * hours;

      const majorAxisMeters = Math.round(initialRadius + expansionMeters);
      const minorAxisMeters = Math.round(initialRadius + expansionMeters * 0.55);

      const areaHectares = Math.round(
        (Math.PI * (majorAxisMeters / 1000) * (minorAxisMeters / 1000) * 100) * 10
      ) / 10;

      // 7. Calculate center shift along vector
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
      if (slopeMagnitude > windSpeed) {
        dominantFactor = 'Terrain Slope & Aspect Uphill Vector';
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
        'This is an experimental fire-spread simulation based on available environmental, terrain and fuel factors. It is not an operational emergency forecasting system.'
    };
  }
}

export const fireSpreadModel = FireSpreadModel.getInstance();
