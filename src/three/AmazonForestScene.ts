/**
 * LAND8FIRE — 3D AMAZON RAINFOREST SCENE & RENDER ARCHITECTURE (V3)
 *
 * Primary Three.js rendering engine reproducing the visual direction of the reference image:
 * - Lush, dense tropical rainforest extending across the Central Amazon Basin
 * - Grounded in Copernicus DEM 30m elevation and Sentinel-2 L2A BOA reflectance
 * - Warm equatorial golden sunlight skimming tree canopies
 * - Atmospheric linear depth preserving canopy textures and silhouettes
 * - Dynamic wildfire simulation with terrain-following combustion line and billowing smoke
 * - Ground-level and aerial camera navigation modes
 */

import * as THREE from 'three';
import { AmazonTerrainEngine } from './AmazonTerrainMesh';
import { AmazonWaterEngine } from './AmazonWaterMesh';
import { AmazonVegetationEngine } from './AmazonVegetationEngine';
import { LandscapeEcosystemManager } from './LandscapeEcosystemManager';
import { AmazonFireParticles } from './AmazonFireParticles';
import { AmazonRothermelModel, RothermelInputs, RothermelDiagnostics } from './AmazonRothermelModel';
import { SpreadHorizon } from '../simulation/fireScenarioTypes';

export type CameraPreset = 'CANOPY_FLYOVER' | 'SETTLEMENT' | 'GROUND_WALK' | 'RIVER_RAPIDS' | 'FIRE_FRONT' | 'REGIONAL_OVERVIEW';
export type TimeOfDay = 'DAYTIME' | 'GOLDEN_HOUR' | 'DUSK' | 'OVERCAST';

export interface IgnitionSelectionEvent {
  x: number;
  z: number;
  elevation: number;
  lat: number;
  lon: number;
  slopeDeg: number;
  aspectDeg: number;
  isBurnable: boolean;
  fuelClass: string;
  message: string;
}

export class AmazonForestScene {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  public terrain: AmazonTerrainEngine;
  public water: AmazonWaterEngine;
  public vegetation: AmazonVegetationEngine;
  public landscape: LandscapeEcosystemManager;
  public wildfire: AmazonFireParticles;
  public rothermel: AmazonRothermelModel;

  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.HemisphereLight;
  private mistGroup: THREE.Group;
  private skyMesh: THREE.Mesh;
  private ignitionBeaconGroup: THREE.Group;

  private isRunning: boolean = false;
  private clock: THREE.Clock;
  private animFrameId: number | null = null;

  // Selected ignition candidate state
  public selectedIgnitionCandidate: { x: number; z: number; elev: number; isBurnable: boolean } | null = null;
  public onIgnitionPointSelected?: (event: IgnitionSelectionEvent) => void;

  // Camera Orbit & Navigation State
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(-140, 24, -40);
  private isDragging: boolean = false;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private spherical: THREE.Spherical = new THREE.Spherical(550, Math.PI / 3.4, -Math.PI / 3.8);

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor('#94C8E8', 1.0);
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Atmosphere (Bright tropical daylight sky with soft depth)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#94C8E8'); // Clean daylight blue sky (eliminates black borders!)
    this.scene.fog = new THREE.Fog('#C8DFEC', 1200, 5200);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / container.clientHeight,
      1.0,
      6000
    );

    // 4. Lighting System (Warm, luminous equatorial daylight sun)
    const { sun, ambient } = this.setupLighting();
    this.sunLight = sun;
    this.ambientLight = ambient;

    // 5. Sky Atmosphere Dome
    this.skyMesh = this.buildSkyDome();
    this.scene.add(this.skyMesh);

    // 6. Environmental Subsystems
    this.terrain = new AmazonTerrainEngine(2560, 2560);
    this.scene.add(this.terrain.mesh);

    this.water = new AmazonWaterEngine(this.terrain);
    this.scene.add(this.water.waterGroup);

    this.landscape = new LandscapeEcosystemManager(this.terrain);
    this.scene.add(this.landscape.group);

    this.vegetation = new AmazonVegetationEngine(this.terrain, 4500);
    this.scene.add(this.vegetation.group);

    this.wildfire = new AmazonFireParticles(this.terrain);
    this.scene.add(this.wildfire.group);

    // 7. Physical Rothermel Simulation Engine & Ignition Beacon
    this.rothermel = new AmazonRothermelModel();
    this.ignitionBeaconGroup = this.buildIgnitionBeacon();
    this.scene.add(this.ignitionBeaconGroup);

    // 8. Low-lying River Valley Mist
    this.mistGroup = this.buildValleyMist();
    this.scene.add(this.mistGroup);

    // Initial Camera Preset: Canopy Flyover (Matching reference image composition)
    this.setCameraPreset('CANOPY_FLYOVER', false);

    // CRITICAL: Forest starts 100% PRISTINE AND UNBURNED on startup! Zero auto-ignition!

    // Controls & Listeners
    this.setupControls();
    window.addEventListener('resize', this.onWindowResize);

    this.start();
  }

  private setupLighting(): { sun: THREE.DirectionalLight; ambient: THREE.HemisphereLight } {
    // Hemispheric ambient light (Warm daylight sky + rich rainforest green ground bounce)
    const ambient = new THREE.HemisphereLight('#EAF4FC', '#4B7336', 1.35);
    this.scene.add(ambient);

    // Warm tropical daylight sun
    const sun = new THREE.DirectionalLight('#FFF5E0', 3.6);
    sun.position.set(-1100, 550, -850);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 50;
    sun.shadow.camera.far = 3400;
    const shadowDist = 1400;
    sun.shadow.camera.left = -shadowDist;
    sun.shadow.camera.right = shadowDist;
    sun.shadow.camera.top = shadowDist;
    sun.shadow.camera.bottom = -shadowDist;
    sun.shadow.bias = -0.0003;
    this.scene.add(sun);

    return { sun, ambient };
  }

  /**
   * Sky gradient dome matching the morning golden haze in the reference photograph
   */
  private buildSkyDome(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 512, 0, 0);
    grad.addColorStop(0.0, '#FFE0B0'); // Warm golden morning horizon glow
    grad.addColorStop(0.20, '#E8DCBE'); // Soft morning mist transition
    grad.addColorStop(0.55, '#BDD7E6'); // Gentle tropical azure
    grad.addColorStop(1.0, '#7FAFCF');  // Upper sky
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    const skyTex = new THREE.CanvasTexture(canvas);
    const skyGeom = new THREE.SphereGeometry(4500, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
    });

    const mesh = new THREE.Mesh(skyGeom, skyMat);
    mesh.name = 'AmazonSkyDome';
    return mesh;
  }

  /**
   * Low-lying atmospheric mist settling in the Amazon river valley
   */
  private buildValleyMist(): THREE.Group {
    const mistGroup = new THREE.Group();
    mistGroup.name = 'AtmosphericValleyMist';

    const mistCanvas = document.createElement('canvas');
    mistCanvas.width = 128;
    mistCanvas.height = 128;
    const ctx = mistCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    grad.addColorStop(0.0, 'rgba(242, 248, 240, 0.38)');
    grad.addColorStop(0.5, 'rgba(235, 244, 236, 0.14)');
    grad.addColorStop(1.0, 'rgba(230, 240, 230, 0.00)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    const mistTexture = new THREE.CanvasTexture(mistCanvas);
    const mistGeom = new THREE.PlaneGeometry(420, 240);
    mistGeom.rotateX(-Math.PI / 2);

    const mistMat = new THREE.MeshBasicMaterial({
      map: mistTexture,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    // Place mist patches along the river valley corridor
    const mistCount = 16;
    for (let i = 0; i < mistCount; i++) {
      const z = -980 + (i / mistCount) * 1960;
      const rx = AmazonWaterEngine.getRiverCenterX(z, 2560);

      const mistMesh = new THREE.Mesh(mistGeom, mistMat);
      mistMesh.position.set(rx + (Math.random() - 0.5) * 120, 23.0 + Math.random() * 6, z);
      mistMesh.rotation.y = Math.random() * Math.PI;
      const s = 1.0 + Math.random() * 0.8;
      mistMesh.scale.set(s, 1, s);
      mistGroup.add(mistMesh);
    }

    return mistGroup;
  }

  /**
   * Set Camera Viewpoint Presets
   */
  public setCameraPreset(preset: CameraPreset, animate: boolean = true): void {
    let targetPos: THREE.Vector3;
    let lookTarget: THREE.Vector3;

    switch (preset) {
      case 'CANOPY_FLYOVER':
        // High-altitude panoramic daylight view framing the entire landscape:
        // Curving turquoise river, timber bridge, and palms on left;
        // Rural settlement cabins, dirt road, and clearing in center;
        // Watchtower and forested hills on right!
        targetPos = new THREE.Vector3(-60, 240, 620);
        lookTarget = new THREE.Vector3(-140, 24, -40);
        break;

      case 'SETTLEMENT':
        // Overlooking the rural settlement cabins, watchtower, timber bridge, and clearing terrace
        targetPos = new THREE.Vector3(-45, 68, 140);
        lookTarget = new THREE.Vector3(30, 26.5, 10);
        break;

      case 'GROUND_WALK': {
        // First-person eye-level exploration on the forest floor beneath giant buttress trunks
        const gx = -130;
        const gz = 70;
        const groundY = this.terrain.getElevationAt(gx, gz);
        targetPos = new THREE.Vector3(gx, groundY + 2.2, gz);
        lookTarget = new THREE.Vector3(gx + 25, groundY + 2.0, gz - 90);
        break;
      }

      case 'RIVER_RAPIDS': {
        // Riverbank shoreline view showing turquoise water, river rocks, timber bridge and palms
        const rx = -250;
        const rz = 40;
        const groundY = this.terrain.getElevationAt(rx, rz);
        targetPos = new THREE.Vector3(rx, Math.max(groundY + 2.5, 21.5), rz);
        lookTarget = new THREE.Vector3(-275, 19.2, -120);
        break;
      }

      case 'FIRE_FRONT': {
        // Close aerial perspective focused on the advancing wildfire line and billowing smoke plume
        const fx = 290;
        const fz = -230;
        const groundY = this.terrain.getElevationAt(fx, fz);
        targetPos = new THREE.Vector3(fx, groundY + 34, fz);
        const lookGroundY = this.terrain.getElevationAt(460, -380);
        lookTarget = new THREE.Vector3(460, lookGroundY + 16, -380);
        break;
      }

      case 'REGIONAL_OVERVIEW':
        // High-altitude perspective showing entire landscape
        targetPos = new THREE.Vector3(0, 560, 520);
        lookTarget = new THREE.Vector3(0, 42, -60);
        break;
    }

    if (!animate) {
      this.camera.position.copy(targetPos);
      this.cameraTarget.copy(lookTarget);
      this.camera.lookAt(lookTarget);
    } else {
      this.smoothFlyTo(targetPos, lookTarget, 1.5);
    }
  }

  private smoothFlyTo(pos: THREE.Vector3, target: THREE.Vector3, durationSec: number): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.cameraTarget.clone();
    let elapsed = 0;

    const animateTransition = () => {
      elapsed += 0.016;
      const t = Math.min(1.0, elapsed / durationSec);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, pos, ease);
      this.cameraTarget.lerpVectors(startTarget, target, ease);
      this.camera.lookAt(this.cameraTarget);

      if (t < 1.0) {
        requestAnimationFrame(animateTransition);
      }
    };

    animateTransition();
  }

  /**
   * Set Time of Day Lighting
   */
  public setTimeOfDay(time: TimeOfDay): void {
    switch (time) {
      case 'DAYTIME':
        this.scene.background = new THREE.Color('#94C8E8');
        this.renderer.setClearColor('#94C8E8', 1.0);
        if (this.scene.fog instanceof THREE.Fog) {
          this.scene.fog.color.set('#C8DFEC');
        }
        this.sunLight.color.set('#FFF5E0');
        this.sunLight.intensity = 3.6;
        this.ambientLight.intensity = 1.35;
        this.ambientLight.color.set('#EAF4FC');
        this.sunLight.position.set(-1100, 550, -850);
        this.renderer.toneMappingExposure = 1.15;
        break;

      case 'GOLDEN_HOUR':
        this.scene.background = new THREE.Color('#D8A468');
        this.renderer.setClearColor('#D8A468', 1.0);
        if (this.scene.fog instanceof THREE.Fog) {
          this.scene.fog.color.set('#E8CFA8');
        }
        this.sunLight.color.set('#FFA84A');
        this.sunLight.intensity = 3.6;
        this.ambientLight.intensity = 1.05;
        this.sunLight.position.set(-1150, 320, -850);
        this.renderer.toneMappingExposure = 1.22;
        break;

      case 'DUSK':
        this.scene.background = new THREE.Color('#584D65');
        this.renderer.setClearColor('#584D65', 1.0);
        if (this.scene.fog instanceof THREE.Fog) {
          this.scene.fog.color.set('#786B85');
        }
        this.sunLight.color.set('#E06040');
        this.sunLight.intensity = 1.5;
        this.ambientLight.intensity = 0.65;
        this.sunLight.position.set(-1100, 140, -900);
        this.renderer.toneMappingExposure = 0.95;
        break;

      case 'OVERCAST':
        this.scene.background = new THREE.Color('#A8B4AA');
        this.renderer.setClearColor('#A8B4AA', 1.0);
        if (this.scene.fog instanceof THREE.Fog) {
          this.scene.fog.color.set('#B8C2B3');
        }
        this.sunLight.color.set('#EAEAEA');
        this.sunLight.intensity = 1.8;
        this.ambientLight.intensity = 0.85;
        this.sunLight.position.set(-300, 600, -300);
        this.renderer.toneMappingExposure = 1.02;
        break;
    }
  }

  /**
   * Builds the 3D holographic ignition cursor beacon pin
   */
  private buildIgnitionBeacon(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'IgnitionBeaconMarker';
    group.visible = false;

    // 1. Vertical glowing pillar
    const beamGeom = new THREE.CylinderGeometry(0.8, 0.8, 28, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#F59E0B',
      transparent: true,
      opacity: 0.85,
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.y = 14;
    group.add(beam);

    // 2. Apex glowing beacon sphere
    const sphereGeom = new THREE.SphereGeometry(2.2, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: '#FBBF24',
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    sphere.position.y = 28;
    group.add(sphere);

    // 3. Ground target ring
    const ringGeom = new THREE.RingGeometry(3.5, 5.0, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#F59E0B',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.90,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = 0.4;
    group.add(ring);

    return group;
  }

  /**
   * Selects an ignition candidate point on the 3D terrain via raycast click or direct coordinate
   */
  public selectIgnitionAt(x: number, z: number): IgnitionSelectionEvent {
    const elev = this.terrain.getElevationAt(x, z);

    // Geographic Lat/Lon transformation for Central Amazon study region
    // Center: -3.119043° S, -60.021716° W
    const centerLat = -3.119043;
    const centerLon = -60.021716;
    const lat = centerLat - (z / 111320.0);
    const lon = centerLon + (x / (111320.0 * Math.cos((centerLat * Math.PI) / 180)));

    // Calculate local terrain slope and aspect from elevation gradient
    const delta = 8.0;
    const elevN = this.terrain.getElevationAt(x, z - delta);
    const elevS = this.terrain.getElevationAt(x, z + delta);
    const elevE = this.terrain.getElevationAt(x + delta, z);
    const elevW = this.terrain.getElevationAt(x - delta, z);

    const dz_dx = (elevE - elevW) / (2 * delta);
    const dz_dz = (elevS - elevN) / (2 * delta);
    const slopeRad = Math.atan(Math.hypot(dz_dx, dz_dz));
    const slopeDeg = parseFloat(((slopeRad * 180) / Math.PI).toFixed(1));

    let aspectDeg = Math.round((Math.atan2(dz_dx, -dz_dz) * 180) / Math.PI);
    if (aspectDeg < 0) aspectDeg += 360;

    const fuel = this.landscape.getFuelTypeAt(x, z);
    const isBurnable = fuel.isBurnable;
    const fuelClass = fuel.name;
    const message = isBurnable
      ? `Valid combustible fuel bed: ${fuel.name} (Fuel Load: ${fuel.fuelLoadKgM2} kg/m², Moisture of Extinction: ${fuel.moistureOfExtinction}%). Ready for manual ignition confirmation.`
      : `${fuel.name}: ${fuel.description} Ignition rejected (non-combustible surface/firebreak).`;

    this.selectedIgnitionCandidate = { x, z, elev, isBurnable };

    // Update 3D beacon position and visual color state
    this.ignitionBeaconGroup.position.set(x, elev, z);
    this.ignitionBeaconGroup.visible = true;

    const beaconColor = isBurnable ? new THREE.Color('#F59E0B') : new THREE.Color('#EF4444');
    this.ignitionBeaconGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && child.material.color) {
        child.material.color.copy(beaconColor);
      }
    });

    const eventData: IgnitionSelectionEvent = {
      x,
      z,
      elevation: parseFloat(elev.toFixed(1)),
      lat: parseFloat(lat.toFixed(6)),
      lon: parseFloat(lon.toFixed(6)),
      slopeDeg,
      aspectDeg,
      isBurnable,
      fuelClass,
      message,
    };

    if (this.onIgnitionPointSelected) {
      this.onIgnitionPointSelected(eventData);
    }

    return eventData;
  }

  /**
   * Confirms ignition from the selected candidate point and initializes Rothermel physical spread
   */
  public confirmIgnition(): RothermelDiagnostics | null {
    if (!this.selectedIgnitionCandidate || !this.selectedIgnitionCandidate.isBurnable) {
      return null;
    }

    const { x, z, elev } = this.selectedIgnitionCandidate;
    this.rothermel.ignite(x, z, elev);

    // Physically couple VFX, glTF botanical ecosystem, and vegetation scorch
    this.wildfire.updateFromRothermel(this.rothermel);
    this.landscape.updateWildfireDamage(this.rothermel);
    this.vegetation.updateWildfireFromRothermel(this.rothermel);
    this.terrain.updateBurnedFromSimulation((px, pz) => this.rothermel.isPointInsideBurnedArea(px, pz));

    return this.rothermel.getDiagnostics();
  }

  /**
   * Advances the Rothermel physical fire simulation by one step (+timeStepMinutes)
   */
  public stepSimulation(): RothermelDiagnostics {
    if (!this.rothermel.isIgnited) {
      return this.rothermel.getDiagnostics();
    }

    this.rothermel.step(
      (x, z) => this.terrain.getElevationAt(x, z),
      (x, z) => this.terrain.isWaterAt(x, z),
      (x, z) => this.landscape.getFuelTypeAt(x, z)
    );

    // Synchronize 3D visuals
    this.wildfire.updateFromRothermel(this.rothermel);
    this.landscape.updateWildfireDamage(this.rothermel);
    this.vegetation.updateWildfireFromRothermel(this.rothermel);
    this.terrain.updateBurnedFromSimulation((px, pz) => this.rothermel.isPointInsideBurnedArea(px, pz));

    return this.rothermel.getDiagnostics();
  }

  /**
   * Restores pristine, unburned forest state
   */
  public resetSimulation(): void {
    this.rothermel.reset();
    this.wildfire.reset();
    this.landscape.reset();
    this.vegetation.resetWildfire();
    this.terrain.resetBurnedArea();
    this.selectedIgnitionCandidate = null;
    this.ignitionBeaconGroup.visible = false;
  }

  /**
   * User-configured environmental inputs updater
   */
  public applyEnvironmentalInputs(inputs: Partial<RothermelInputs>): void {
    Object.assign(this.rothermel.inputs, inputs);
    this.wildfire.config.windSpeedKmh = this.rothermel.inputs.windSpeedKmh;
    this.wildfire.config.windDirectionDeg = this.rothermel.inputs.windDirectionDeg;

    // If already ignited, recalculate current propagation state
    if (this.rothermel.isIgnited) {
      this.wildfire.updateFromRothermel(this.rothermel);
      this.landscape.updateWildfireDamage(this.rothermel);
    }
  }

  /**
   * Retrieve active Rothermel diagnostics
   */
  public getDiagnostics(): RothermelDiagnostics {
    return this.rothermel.getDiagnostics();
  }

  /**
   * Updates Wildfire Simulation Horizon (+0H to +24H)
   * Backed by physical Rothermel integration when fire is confirmed
   */
  public updateSimulationHorizon(horizon: SpreadHorizon): void {
    if (!this.rothermel.isIgnited) {
      // Unburned state: zero fire rendering
      return;
    }

    const horizonMinutesMap: Record<SpreadHorizon, number> = {
      '+0H': 0,
      '+1H': 60,
      '+2H': 120,
      '+6H': 360,
      '+12H': 720,
      '+24H': 1440,
    };

    const targetMinutes = horizonMinutesMap[horizon] ?? 0;
    this.rothermel.elapsedMinutes = 0;
    // Re-propagate up to target duration
    const steps = Math.max(1, Math.round(targetMinutes / this.rothermel.inputs.timeStepMinutes));
    for (let s = 0; s < steps; s++) {
      this.rothermel.step(
        (x, z) => this.terrain.getElevationAt(x, z),
        (x, z) => this.terrain.isWaterAt(x, z),
        (x, z) => this.landscape.getFuelTypeAt(x, z)
      );
    }

    this.wildfire.updateFromRothermel(this.rothermel);
    this.landscape.updateWildfireDamage(this.rothermel);
    this.vegetation.updateWildfireFromRothermel(this.rothermel);
    this.terrain.updateBurnedFromSimulation((px, pz) => this.rothermel.isPointInsideBurnedArea(px, pz));
  }

  /**
   * Layer Visibility Controls
   */
  public setCanopyVisible(val: boolean): void {
    this.vegetation.setCanopyVisible(val);
    this.landscape.group.visible = val;
  }

  public setUnderstoryVisible(val: boolean): void {
    this.vegetation.setUnderstoryVisible(val);
  }

  public setForestFloorVisible(val: boolean): void {
    this.vegetation.setForestFloorVisible(val);
  }

  public setWaterBodiesVisible(val: boolean): void {
    this.water.waterGroup.visible = val;
  }

  public setActiveFireVisible(val: boolean): void {
    this.wildfire.setFireVisible(val);
  }

  public setSmokeVisible(val: boolean): void {
    this.wildfire.setSmokeVisible(val);
  }

  public setBurnedAreaVisible(val: boolean): void {
    if (!val) {
      this.landscape.reset();
      this.vegetation.resetWildfire();
      this.terrain.resetBurnedArea();
    } else if (this.rothermel.isIgnited) {
      this.landscape.updateWildfireDamage(this.rothermel);
      this.vegetation.updateWildfireFromRothermel(this.rothermel);
      this.terrain.updateBurnedFromSimulation((px, pz) => this.rothermel.isPointInsideBurnedArea(px, pz));
    }
  }

  // Interactive Mouse & Touch Controls
  private setupControls(): void {
    const el = this.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    el.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isDragging) {
        this.isDragging = false;

        // Check if movement was minimal (< 6px) indicating an intentional click on terrain
        const moveDist = Math.hypot(e.clientX - this.mouseDownPos.x, e.clientY - this.mouseDownPos.y);
        if (moveDist < 6 && e.button === 0) {
          const rect = el.getBoundingClientRect();
          mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(mouse, this.camera);
          const intersects = raycaster.intersectObject(this.terrain.mesh);
          if (intersects.length > 0) {
            const pt = intersects[0].point;
            this.selectIgnitionAt(pt.x, pt.z);
          }
        }
      }
    });

    el.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.prevMouseX;
      const deltaY = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      if (e.buttons === 1) {
        // Left click drag: Orbit camera
        const rotSpeed = 0.0035;
        const offset = this.camera.position.clone().sub(this.cameraTarget);
        this.spherical.setFromVector3(offset);
        this.spherical.theta -= deltaX * rotSpeed;
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.05, this.spherical.phi - deltaY * rotSpeed));
        offset.setFromSpherical(this.spherical);
        this.camera.position.copy(this.cameraTarget).add(offset);
        this.camera.lookAt(this.cameraTarget);
      } else if (e.buttons === 2) {
        // Right click drag: Pan camera
        const panSpeed = 0.35;
        const right = new THREE.Vector3();
        this.camera.getWorldDirection(right);
        right.cross(this.camera.up).normalize();

        const up = this.camera.up.clone();
        const pan = right.multiplyScalar(-deltaX * panSpeed).add(up.multiplyScalar(deltaY * panSpeed));
        this.camera.position.add(pan);
        this.cameraTarget.add(pan);
      }
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.0 + e.deltaY * 0.0012;
      const offset = this.camera.position.clone().sub(this.cameraTarget);
      offset.multiplyScalar(zoomFactor);
      if (offset.length() > 20 && offset.length() < 2200) {
        this.camera.position.copy(this.cameraTarget).add(offset);
      }
    }, { passive: false });

    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onWindowResize = (): void => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();

    const loop = () => {
      if (!this.isRunning) return;
      const delta = this.clock.getDelta();

      // Update animated water ripples and wildfire smoke/flames
      this.water.update(delta);
      this.wildfire.update(delta);

      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(loop);
    };

    loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
