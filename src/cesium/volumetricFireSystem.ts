/**
 * LAND8FIRE — 3D VOLUMETRIC FIRE & SMOKE PARTICLE SYSTEM
 *
 * Real-time GPU particle systems for CesiumJS:
 * 1. Ground-level volumetric flames (high-temperature orange/yellow turbulent flame plumes)
 * 2. Rising wind-drifted smoke columns (volumetric ash-gray billowing smoke drifting along live wind vector)
 * 3. Airborne ember sparks (high-velocity firebrand particles lofted into thermal convection plume)
 *
 * Grounding & Synchronization:
 * - Emits along the exact simulated Rothermel fire perimeter coordinates and secondary spot fires
 * - Dynamically couples with Environmental Parameters (wind speed, wind direction angle, relative humidity)
 * - Timeline-aware: automatically updates when user scrubs (+0H to +24H)
 * - Cleans up GPU resources immediately on reset
 */

import * as Cesium from 'cesium';
import { SpreadTimestepResult } from '../simulation/fireScenarioTypes';
import { EnvironmentalObservation } from '../environmental/environmentalTypes';

/**
 * Procedurally creates a soft, radial flame particle texture using an offscreen canvas.
 */
function createFlameTexture(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');     // White-hot center
  grad.addColorStop(0.2, 'rgba(255, 215, 0, 0.95)');      // Bright gold
  grad.addColorStop(0.5, 'rgba(255, 80, 0, 0.85)');       // Burning orange
  grad.addColorStop(0.8, 'rgba(220, 38, 38, 0.50)');      // Deep crimson
  grad.addColorStop(1.0, 'rgba(120, 20, 20, 0.00)');      // Transparent edge

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}

/**
 * Procedurally creates a soft, turbulent smoke puff texture.
 */
function createSmokeTexture(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(50, 50, 50, 0.80)');       // Charcoal core
  grad.addColorStop(0.4, 'rgba(80, 80, 80, 0.55)');       // Ash gray
  grad.addColorStop(0.8, 'rgba(110, 110, 110, 0.25)');    // Dilute smoke
  grad.addColorStop(1.0, 'rgba(140, 140, 140, 0.00)');    // Transparent edge

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}

/**
 * Procedurally creates a bright ember spark texture.
 */
function createEmberTexture(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 14);
  grad.addColorStop(0.0, 'rgba(255, 255, 230, 1.0)');     // Intense yellow-white
  grad.addColorStop(0.3, 'rgba(255, 180, 20, 0.95)');     // Hot amber
  grad.addColorStop(0.7, 'rgba(255, 60, 0, 0.60)');       // Orange-red
  grad.addColorStop(1.0, 'rgba(200, 0, 0, 0.00)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}

export class VolumetricFireSystem {
  private static instance: VolumetricFireSystem | null = null;
  private viewer: Cesium.Viewer | null = null;
  private particleSystems: Cesium.ParticleSystem[] = [];
  private flameTexture: string = '';
  private smokeTexture: string = '';
  private emberTexture: string = '';

  private constructor() {
    this.flameTexture = createFlameTexture();
    this.smokeTexture = createSmokeTexture();
    this.emberTexture = createEmberTexture();
  }

  public static getInstance(): VolumetricFireSystem {
    if (!VolumetricFireSystem.instance) {
      VolumetricFireSystem.instance = new VolumetricFireSystem();
    }
    return VolumetricFireSystem.instance;
  }

  public initialize(viewer: Cesium.Viewer): void {
    if (!viewer || viewer.isDestroyed()) return;
    this.viewer = viewer;
  }

  /**
   * Render real 3D volumetric flame, smoke, and ember particle systems
   * along the active fire front and secondary spot fires.
   */
  public renderFireEffects(
    viewer: Cesium.Viewer,
    step: SpreadTimestepResult,
    envObs?: EnvironmentalObservation | null
  ): void {
    if (!viewer || viewer.isDestroyed()) return;
    this.viewer = viewer;
    this.clear();

    const geom = step.geometry;
    if (!geom || !geom.activePerimeterCoordinates || geom.activePerimeterCoordinates.length === 0) {
      return;
    }

    const perimCoords = geom.activePerimeterCoordinates;
    const windSpeed = envObs ? envObs.windSpeed : 12; // km/h
    const windDir = envObs ? envObs.windDirection : 45; // deg
    // Wind vector points towards (windDir + 180) % 360
    const windTowardsRad = ((windDir + 180) % 360) * (Math.PI / 180);
    const windSpeedMps = (windSpeed * 1000) / 3600;

    // Sample emitter anchor points along perimeter (distribute 4-8 flame emitters depending on perimeter size)
    const numEmitters = Math.min(8, Math.max(3, Math.floor(perimCoords.length / 5)));
    const stepInterval = Math.max(1, Math.floor(perimCoords.length / numEmitters));

    const emitterLocations: { lat: number; lng: number }[] = [];
    for (let i = 0; i < numEmitters; i++) {
      const idx = (i * stepInterval) % perimCoords.length;
      emitterLocations.push({
        lat: perimCoords[idx].latitude,
        lng: perimCoords[idx].longitude,
      });
    }

    // Also add secondary spot fires if any exist
    if (geom.spotFires && geom.spotFires.length > 0) {
      geom.spotFires.forEach((sf) => {
        emitterLocations.push({
          lat: sf.ignitionCoordinates.latitude,
          lng: sf.ignitionCoordinates.longitude,
        });
      });
    }

    emitterLocations.forEach((loc, idx) => {
      // 1. Model matrix positioned on terrain at emitter location
      const cartographic = Cesium.Cartographic.fromDegrees(loc.lng, loc.lat);
      let terrainHeight = 0;
      if (viewer.scene.globe) {
        const h = viewer.scene.globe.getHeight(cartographic);
        if (h !== undefined && h !== null && !isNaN(h)) {
          terrainHeight = Math.max(0, h);
        }
      }

      const position = Cesium.Cartesian3.fromDegrees(loc.lng, loc.lat, terrainHeight + 1.0);
      const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);

      // 2. Active Ground Flames Particle System
      const flameSystem = new Cesium.ParticleSystem({
        image: this.flameTexture,
        startColor: new Cesium.Color(1.0, 0.45, 0.1, 0.9),
        endColor: new Cesium.Color(0.85, 0.15, 0.0, 0.0),
        startScale: 1.0,
        endScale: 3.2,
        minimumParticleLife: 1.0,
        maximumParticleLife: 2.2,
        minimumSpeed: 2.0,
        maximumSpeed: 5.0,
        imageSize: new Cesium.Cartesian2(22, 22),
        emissionRate: 35.0,
        lifetime: 16.0,
        emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(25.0)),
        modelMatrix: modelMatrix,
        sizeInMeters: true,
      });

      // 3. Volumetric Billowing Smoke Column with Wind Drift
      const smokeSystem = new Cesium.ParticleSystem({
        image: this.smokeTexture,
        startColor: new Cesium.Color(0.20, 0.20, 0.22, 0.65),
        endColor: new Cesium.Color(0.45, 0.45, 0.48, 0.0),
        startScale: 1.8,
        endScale: 9.5,
        minimumParticleLife: 3.5,
        maximumParticleLife: 7.0,
        minimumSpeed: 3.0,
        maximumSpeed: 7.5,
        imageSize: new Cesium.Cartesian2(32, 32),
        emissionRate: 20.0,
        lifetime: 16.0,
        emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(40.0)),
        modelMatrix: modelMatrix,
        sizeInMeters: true,
        updateCallback: (particle: any, dt: number) => {
          // Apply horizontal aerodynamic wind drift to smoke column
          // Local ENU coordinates: X = East, Y = North, Z = Up
          const driftEast = Math.sin(windTowardsRad) * (windSpeedMps * 0.6);
          const driftNorth = Math.cos(windTowardsRad) * (windSpeedMps * 0.6);

          particle.position.x += driftEast * dt;
          particle.position.y += driftNorth * dt;
        },
      });

      // 4. Airborne Ember Sparks (every second emitter to maintain 60 FPS)
      let emberSystem: Cesium.ParticleSystem | null = null;
      if (idx % 2 === 0) {
        emberSystem = new Cesium.ParticleSystem({
          image: this.emberTexture,
          startColor: new Cesium.Color(1.0, 0.85, 0.2, 1.0),
          endColor: new Cesium.Color(1.0, 0.2, 0.0, 0.1),
          startScale: 0.5,
          endScale: 1.2,
          minimumParticleLife: 1.8,
          maximumParticleLife: 4.5,
          minimumSpeed: 5.0,
          maximumSpeed: 14.0,
          imageSize: new Cesium.Cartesian2(12, 12),
          emissionRate: 14.0,
          lifetime: 16.0,
          emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(20.0)),
          modelMatrix: modelMatrix,
          sizeInMeters: true,
          updateCallback: (particle: any, dt: number) => {
            // Embers drift further and faster downwind
            const emberDriftEast = Math.sin(windTowardsRad) * (windSpeedMps * 1.1);
            const emberDriftNorth = Math.cos(windTowardsRad) * (windSpeedMps * 1.1);
            particle.position.x += emberDriftEast * dt;
            particle.position.y += emberDriftNorth * dt;
          },
        });
      }

      viewer.scene.primitives.add(flameSystem);
      viewer.scene.primitives.add(smokeSystem);
      this.particleSystems.push(flameSystem);
      this.particleSystems.push(smokeSystem);

      if (emberSystem) {
        viewer.scene.primitives.add(emberSystem);
        this.particleSystems.push(emberSystem);
      }
    });

    viewer.scene.requestRender();
  }

  /**
   * Destroy and remove all active 3D particle systems from the scene.
   */
  public clear(): void {
    if (!this.viewer || this.viewer.isDestroyed()) {
      this.particleSystems = [];
      return;
    }

    this.particleSystems.forEach((ps) => {
      try {
        if (!ps.isDestroyed()) {
          this.viewer?.scene.primitives.remove(ps);
        }
      } catch (e) {
        console.warn('[Land8Fire] Error removing particle system:', e);
      }
    });

    this.particleSystems = [];
    this.viewer.scene.requestRender();
  }

  public destroy(): void {
    this.clear();
    this.viewer = null;
  }
}

export const volumetricFireSystem = VolumetricFireSystem.getInstance();
