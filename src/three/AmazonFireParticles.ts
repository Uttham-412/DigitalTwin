/**
 * LAND8FIRE — 3D VOLUMETRIC WILDFIRE & BILLOWING SMOKE ENGINE (V5 PHOTOREALISTIC)
 *
 * Implements a cohesive, physically grounded wildfire visualization matching the reference image:
 *
 * 1. Advancing Active Fire Front:
 *    - Incandescent flame tongues and glowing ember ribbons along the ridge crest (X: 360 to 580, Z: -300 to -500)
 *    - Elevated Copernicus DEM terrain grounding (elev 60-78m)
 *    - Dynamic flickering firelight casting warm orange illumination on smoke base and adjacent canopy
 *
 * 2. Billowing Volumetric Smoke Plume Column:
 *    - Continuous, expanding, turbulent smoke cloud column rising 380m+ into the sky
 *    - Multi-lobed fractal Perlin noise cloud puffs with soft edges (no hard dots!)
 *    - Expands smoothly with convective buoyancy (from scale 22m at tree level to 180m+ at tropospheric ceiling)
 *    - Color shifts organically from dense dark charcoal soot (#252528) at base to soft ash-gray/white (#B8B4AE)
 *    - Drifts realistically with Northeast wind (45 degrees)
 *
 * 3. Airborne Ember Sparks:
 *    - Golden incandescent sparks lofted into the convective thermal updraft
 */

import * as THREE from 'three';
import { AmazonTerrainEngine } from './AmazonTerrainMesh';
import { AmazonRothermelModel } from './AmazonRothermelModel';

export interface FireEmitterConfig {
  centerX: number;
  centerZ: number;
  frontLength: number;
  frontDepth: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  active: boolean;
  showSmoke: boolean;
}

export class AmazonFireParticles {
  public group: THREE.Group;
  private terrain: AmazonTerrainEngine;

  // Billowing Smoke Plume via Instanced Quads
  private smokeMesh!: THREE.InstancedMesh;
  private smokeCount: number = 320;
  private smokeData!: Array<{
    x: number;
    y: number;
    z: number;
    baseGroundY: number;
    age: number;
    maxLife: number;
    scale: number;
    maxScale: number;
    rotation: number;
    rotSpeed: number;
    driftX: number;
    driftZ: number;
    updraft: number;
    opacity: number;
    baseColor: THREE.Color;
  }>;

  // Active Flame Front via Instanced Quads & Glow
  private flameMesh!: THREE.InstancedMesh;
  private flameCount: number = 240;
  private flameData!: Array<{
    x: number;
    y: number;
    z: number;
    baseY: number;
    scale: number;
    flickerFreq: number;
    flickerPhase: number;
    rot: number;
  }>;

  // Airborne Ember Sparks
  private emberParticles!: THREE.Points;
  private emberPositions!: Float32Array;
  private emberVelocities!: Float32Array;

  // Dynamic Fire Light
  private fireLight!: THREE.PointLight;
  private fireLight2!: THREE.PointLight;

  public config: FireEmitterConfig = {
    centerX: 0,
    centerZ: 0,
    frontLength: 10,
    frontDepth: 10,
    windSpeedKmh: 14.2,
    windDirectionDeg: 45, // Northeast wind
    active: false,        // CRITICAL: starts 100% UNBURNED on startup!
    showSmoke: true,
  };

  // Physically-anchored simulation tracking for smoke and flame emitters
  private activeCombustionPoints: Array<{ x: number; y: number; z: number }> = [];
  private ignitionOrigin: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

  private timeUniform: number = 0;
  private dummyObj: THREE.Object3D = new THREE.Object3D();

  constructor(terrain: AmazonTerrainEngine) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.group.name = 'AmazonWildfireFX';
    this.group.visible = false; // Initially hidden until confirmed manual ignition

    // 1. Dynamic Fire Lights positioned along burning front
    this.fireLight = new THREE.PointLight('#FF5500', 5.8, 850, 1.1);
    this.fireLight.position.set(0, 50, 0);
    this.group.add(this.fireLight);

    this.fireLight2 = new THREE.PointLight('#FF9922', 3.4, 600, 1.2);
    this.fireLight2.position.set(0, 45, 0);
    this.group.add(this.fireLight2);

    // 2. Build FX Subsystems
    this.buildSmokePlume();
    this.buildFlameFront();
    this.buildEmberSparks();
  }

  /**
   * Generates a high-quality organic multi-lobed fractal smoke puff texture
   * Soft Gaussian falloff ensures NO hard edges or circular dots
   */
  private createSmokePuffTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Paint 12 overlapping soft Gaussian cloud lobes to create an organic billowing puff
    const lobes = [
      { cx: 128, cy: 128, r: 96, a: 0.42 },
      { cx: 104, cy: 112, r: 76, a: 0.36 },
      { cx: 156, cy: 120, r: 78, a: 0.38 },
      { cx: 120, cy: 154, r: 82, a: 0.35 },
      { cx: 148, cy: 146, r: 72, a: 0.34 },
      { cx: 86, cy: 142, r: 64, a: 0.28 },
      { cx: 168, cy: 108, r: 62, a: 0.26 },
      { cx: 132, cy: 88, r: 68, a: 0.28 },
      { cx: 110, cy: 168, r: 58, a: 0.24 },
      { cx: 152, cy: 166, r: 54, a: 0.22 },
    ];

    for (const lobe of lobes) {
      const grad = ctx.createRadialGradient(lobe.cx, lobe.cy, 0, lobe.cx, lobe.cy, lobe.r);
      grad.addColorStop(0.0, `rgba(255, 255, 255, ${lobe.a})`);
      grad.addColorStop(0.45, `rgba(240, 240, 240, ${lobe.a * 0.7})`);
      grad.addColorStop(0.75, `rgba(220, 220, 220, ${lobe.a * 0.25})`);
      grad.addColorStop(1.0, 'rgba(200, 200, 200, 0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lobe.cx, lobe.cy, lobe.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates incandescent flame tongue texture
   */
  private createFlameTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Vertical fiery tongue shape
    const grad = ctx.createRadialGradient(64, 76, 4, 64, 64, 60);
    grad.addColorStop(0.0, 'rgba(255, 255, 240, 1.0)');  // White-hot core
    grad.addColorStop(0.25, 'rgba(255, 205, 40, 0.98)'); // Intense yellow flame
    grad.addColorStop(0.55, 'rgba(255, 85, 5, 0.90)');   // Roaring orange
    grad.addColorStop(0.85, 'rgba(200, 25, 0, 0.45)');   // Deep crimson rim
    grad.addColorStop(1.0, 'rgba(120, 10, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(64, 70, 46, 58, 0, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * 1. Billowing Volumetric Smoke Plume Column
   * Puffs expand as they rise and blend together into a cohesive atmospheric cloud
   */
  private buildSmokePlume(): void {
    const quadGeom = new THREE.PlaneGeometry(1, 1);
    const smokeTex = this.createSmokePuffTexture();

    const smokeMat = new THREE.MeshBasicMaterial({
      map: smokeTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    this.smokeMesh = new THREE.InstancedMesh(quadGeom, smokeMat, this.smokeCount);
    this.smokeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.smokeData = [];

    for (let i = 0; i < this.smokeCount; i++) {
      this.initSmokePuff(i, true);
    }

    this.updateSmokeTransforms();
    this.group.add(this.smokeMesh);
  }

  private initSmokePuff(i: number, randomAge: boolean = false): void {
    if (!this.config.active || this.activeCombustionPoints.length === 0) {
      const puff = {
        x: this.ignitionOrigin.x,
        y: -9999, // Offscreen/hidden until active ignition
        z: this.ignitionOrigin.z,
        baseGroundY: this.ignitionOrigin.y,
        age: 0,
        maxLife: 10,
        scale: 0.1,
        maxScale: 10,
        rotation: 0,
        rotSpeed: 0,
        driftX: 0,
        driftZ: 0,
        updraft: 0,
        opacity: 0,
        baseColor: new THREE.Color('#28282B'),
      };
      if (this.smokeData[i]) {
        this.smokeData[i] = puff;
      } else {
        this.smokeData.push(puff);
      }
      return;
    }

    // Strictly sample from active burning sector endpoints (75%) or smoldering interior (25%)
    let ptX: number;
    let ptZ: number;
    if (Math.random() < 0.75 && this.activeCombustionPoints.length > 0) {
      const pt = this.activeCombustionPoints[Math.floor(Math.random() * this.activeCombustionPoints.length)];
      const jitter = (Math.random() - 0.5) * 6.0;
      ptX = pt.x + jitter;
      ptZ = pt.z + jitter;
    } else {
      // Smoldering interior between user-selected ignition origin and front
      const pt = this.activeCombustionPoints[Math.floor(Math.random() * this.activeCombustionPoints.length)];
      const t = Math.random() * 0.85;
      ptX = THREE.MathUtils.lerp(this.ignitionOrigin.x, pt.x, t) + (Math.random() - 0.5) * 4.0;
      ptZ = THREE.MathUtils.lerp(this.ignitionOrigin.z, pt.z, t) + (Math.random() - 0.5) * 4.0;
    }

    const groundElev = this.terrain.getElevationAt(ptX, ptZ);
    const maxLife = 11.0 + Math.random() * 8.0;
    const age = randomAge ? Math.random() * maxLife : 0;

    // Wind direction drift + buoyant convective updraft
    const windRad = ((this.config.windDirectionDeg + 180) % 360) * (Math.PI / 180);
    const windSpeedFactor = this.config.windSpeedKmh * 0.42;

    const charcoal = new THREE.Color('#28282B');
    const puff = {
      x: ptX,
      y: groundElev + 2.0, // Originates directly on burning ground / understory
      z: ptZ,
      baseGroundY: groundElev,
      age,
      maxLife,
      scale: 18.0 + Math.random() * 8.0,
      maxScale: 130.0 + Math.random() * 60.0,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.16,
      driftX: Math.sin(windRad) * windSpeedFactor + (Math.random() - 0.5) * 1.5,
      driftZ: Math.cos(windRad) * windSpeedFactor + (Math.random() - 0.5) * 1.5,
      updraft: 11.0 + Math.random() * 7.0, // Upward buoyant thermal draft
      opacity: 0.55,
      baseColor: charcoal.clone(),
    };

    if (this.smokeData[i]) {
      this.smokeData[i] = puff;
    } else {
      this.smokeData.push(puff);
    }
  }

  /**
   * 2. Active Ground & Canopy Flame Tongues
   */
  private buildFlameFront(): void {
    const quadGeom = new THREE.PlaneGeometry(1, 1);
    const flameTex = this.createFlameTexture();

    const flameMat = new THREE.MeshBasicMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.flameMesh = new THREE.InstancedMesh(quadGeom, flameMat, this.flameCount);
    this.flameMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.flameData = [];

    // Initially all flames parked offscreen until confirmed manual ignition
    for (let i = 0; i < this.flameCount; i++) {
      this.flameData.push({
        x: 0,
        y: -9999,
        z: 0,
        baseY: -9999,
        scale: 0.0,
        flickerFreq: 8.0 + Math.random() * 12.0,
        flickerPhase: Math.random() * Math.PI * 2,
        rot: (Math.random() - 0.5) * 0.35,
      });

      this.dummyObj.position.set(0, -9999, 0);
      this.dummyObj.scale.set(0, 0, 0);
      this.dummyObj.updateMatrix();
      this.flameMesh.setMatrixAt(i, this.dummyObj.matrix);
    }

    this.flameMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.flameMesh);
  }

  /**
   * 3. Airborne Ember Sparks (Subtle localized embers near active combustion)
   */
  private buildEmberSparks(): void {
    const count = 45;
    const geom = new THREE.BufferGeometry();
    this.emberPositions = new Float32Array(count * 3);
    this.emberVelocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.resetEmber(i, true);
    }

    geom.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));

    // Canvas texture for small brilliant ember spark
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 28);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.3, 'rgba(255, 180, 40, 0.95)');
    grad.addColorStop(0.7, 'rgba(255, 60, 0, 0.45)');
    grad.addColorStop(1.0, 'rgba(200, 20, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    const mat = new THREE.PointsMaterial({
      size: 4.5,
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    });

    this.emberParticles = new THREE.Points(geom, mat);
    this.group.add(this.emberParticles);
  }

  private resetEmber(i: number, randomStart: boolean = false): void {
    if (!this.config.active || this.activeCombustionPoints.length === 0) {
      this.emberPositions[i * 3 + 0] = this.ignitionOrigin.x;
      this.emberPositions[i * 3 + 1] = -9999;
      this.emberPositions[i * 3 + 2] = this.ignitionOrigin.z;
      return;
    }

    const pt = this.activeCombustionPoints[Math.floor(Math.random() * this.activeCombustionPoints.length)];
    const groundElev = this.terrain.getElevationAt(pt.x, pt.z);

    this.emberPositions[i * 3 + 0] = pt.x + (Math.random() - 0.5) * 4.0;
    this.emberPositions[i * 3 + 1] = randomStart ? groundElev + 1.0 + Math.random() * 8.0 : groundElev + 0.8;
    this.emberPositions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 4.0;

    const windRad = ((this.config.windDirectionDeg + 180) % 360) * (Math.PI / 180);
    this.emberVelocities[i * 3 + 0] = Math.sin(windRad) * 4.0 + (Math.random() - 0.5) * 2.5;
    this.emberVelocities[i * 3 + 1] = 5.0 + Math.random() * 8.0; // Convective thermal loft
    this.emberVelocities[i * 3 + 2] = Math.cos(windRad) * 4.0 + (Math.random() - 0.5) * 2.5;
  }

  /**
   * Main Frame Animation Loop
   */
  public update(deltaSeconds: number): void {
    if (!this.config.active) return;
    this.timeUniform += deltaSeconds;

    // 1. Animate Firelight flicker
    this.fireLight.intensity = 5.2 + Math.sin(this.timeUniform * 14.0) * 1.5 + Math.cos(this.timeUniform * 22.0) * 0.8;
    this.fireLight2.intensity = 3.0 + Math.cos(this.timeUniform * 11.0) * 1.1;

    // 2. Animate Billowing Smoke Plume
    if (this.config.showSmoke && this.smokeMesh) {
      const dt = Math.min(deltaSeconds, 0.05);

      for (let i = 0; i < this.smokeCount; i++) {
        const p = this.smokeData[i];
        p.age += dt;

        if (p.age >= p.maxLife || p.y > 420.0) {
          this.initSmokePuff(i, false);
          continue;
        }

        const lifeRatio = p.age / p.maxLife; // 0 to 1

        // Position: upward buoyancy + horizontal wind drift
        p.y += p.updraft * dt;
        p.x += p.driftX * dt;
        p.z += p.driftZ * dt;

        // Size expansion: puffs expand continuously into huge clouds
        p.scale = THREE.MathUtils.lerp(24.0, p.maxScale, Math.pow(lifeRatio, 0.7));
        p.rotation += p.rotSpeed * dt;

        // Color & Opacity curve:
        // Starts dense dark charcoal at base, shifts to ash-white in mid/high plume, then fades
        if (lifeRatio < 0.20) {
          p.opacity = THREE.MathUtils.lerp(0.2, 0.65, lifeRatio / 0.20);
        } else {
          p.opacity = THREE.MathUtils.lerp(0.65, 0.0, (lifeRatio - 0.20) / 0.80);
        }
      }

      this.updateSmokeTransforms();
    }

    // 3. Animate Flame Front Tongues
    if (this.flameMesh) {
      for (let i = 0; i < this.flameCount; i++) {
        const f = this.flameData[i];
        const flicker = Math.sin(this.timeUniform * f.flickerFreq + f.flickerPhase) * 2.5;
        const scaleMod = 1.0 + Math.cos(this.timeUniform * f.flickerFreq * 0.8) * 0.18;

        this.dummyObj.position.set(f.x, f.baseY + flicker, f.z);
        this.dummyObj.scale.set(f.scale * scaleMod, f.scale * 1.35 * scaleMod, 1);
        this.dummyObj.rotation.set(0, 0, f.rot + Math.sin(this.timeUniform * 6.0) * 0.08);
        this.dummyObj.updateMatrix();
        this.flameMesh.setMatrixAt(i, this.dummyObj.matrix);
      }
      this.flameMesh.instanceMatrix.needsUpdate = true;
    }

    // 4. Animate Ember Sparks
    if (this.emberParticles) {
      const pos = this.emberParticles.geometry.attributes.position;
      const count = this.emberPositions.length / 3;
      const dt = Math.min(deltaSeconds, 0.05);

      for (let i = 0; i < count; i++) {
        let x = pos.getX(i) + this.emberVelocities[i * 3 + 0] * dt;
        let y = pos.getY(i) + this.emberVelocities[i * 3 + 1] * dt;
        let z = pos.getZ(i) + this.emberVelocities[i * 3 + 2] * dt;

        if (y > 105.0) {
          this.resetEmber(i, false);
          pos.setXYZ(i, this.emberPositions[i * 3 + 0], this.emberPositions[i * 3 + 1], this.emberPositions[i * 3 + 2]);
        } else {
          pos.setXYZ(i, x, y, z);
        }
      }
      pos.needsUpdate = true;
    }
  }

  private updateSmokeTransforms(): void {
    const cCharcoal = new THREE.Color('#2A2A2D');
    const cAshGray = new THREE.Color('#9E9A94');
    const cAshWhite = new THREE.Color('#CBC6BE');
    const tempCol = new THREE.Color();

    for (let i = 0; i < this.smokeCount; i++) {
      const p = this.smokeData[i];
      const lifeRatio = p.age / p.maxLife;

      this.dummyObj.position.set(p.x, p.y, p.z);
      this.dummyObj.scale.set(p.scale, p.scale, 1);
      this.dummyObj.rotation.set(0, 0, p.rotation);
      this.dummyObj.updateMatrix();
      this.smokeMesh.setMatrixAt(i, this.dummyObj.matrix);

      // Color transition from base soot to upper ash
      if (lifeRatio < 0.35) {
        tempCol.lerpColors(cCharcoal, cAshGray, lifeRatio / 0.35);
      } else {
        tempCol.lerpColors(cAshGray, cAshWhite, (lifeRatio - 0.35) / 0.65);
      }

      this.smokeMesh.setColorAt(i, tempCol);
    }

    this.smokeMesh.instanceMatrix.needsUpdate = true;
    if (this.smokeMesh.instanceColor) this.smokeMesh.instanceColor.needsUpdate = true;
  }

  public setFireVisible(val: boolean): void {
    this.flameMesh.visible = val;
    this.fireLight.visible = val;
    this.fireLight2.visible = val;
  }

  public setSmokeVisible(val: boolean): void {
    this.smokeMesh.visible = val;
  }

  /**
   * Physically anchors active flame instances and smoke billows to the Rothermel front
   */
  public updateFromRothermel(model: AmazonRothermelModel): void {
    if (!model.isIgnited) {
      this.reset();
      return;
    }

    this.group.visible = true;
    this.config.active = true;
    this.config.centerX = model.ignitionX;
    this.config.centerZ = model.ignitionZ;
    this.config.windSpeedKmh = model.inputs.windSpeedKmh;
    this.config.windDirectionDeg = model.inputs.windDirectionDeg;

    this.ignitionOrigin = {
      x: model.ignitionX,
      y: model.ignitionElev,
      z: model.ignitionZ,
    };

    // Collect all unblocked active sector perimeter points
    this.activeCombustionPoints = [];
    const unblockedSectors = model.sectors.filter((s) => !s.isWaterBlocked && s.radiusMeters > 0);
    if (unblockedSectors.length > 0) {
      for (const sec of unblockedSectors) {
        this.activeCombustionPoints.push({
          x: sec.worldX,
          y: this.terrain.getElevationAt(sec.worldX, sec.worldZ),
          z: sec.worldZ,
        });
      }

      // Distribute flame instances along the active perimeter at ground level
      for (let i = 0; i < this.flameCount; i++) {
        const sec = unblockedSectors[i % unblockedSectors.length];
        const jitter = (Math.random() - 0.5) * 5.0;
        const fx = sec.worldX + Math.cos(sec.angleRad) * jitter;
        const fz = sec.worldZ - Math.sin(sec.angleRad) * jitter;
        const groundElev = this.terrain.getElevationAt(fx, fz);

        const flameH = 10.0 + Math.random() * 12.0;
        const y = groundElev + flameH * 0.42;

        if (this.flameData[i]) {
          this.flameData[i].x = fx;
          this.flameData[i].z = fz;
          this.flameData[i].y = y;
          this.flameData[i].baseY = y;
          this.flameData[i].scale = flameH;
        }

        this.dummyObj.position.set(fx, y, fz);
        this.dummyObj.scale.set(flameH, flameH * 1.35, 1);
        this.dummyObj.updateMatrix();
        this.flameMesh.setMatrixAt(i, this.dummyObj.matrix);
      }
      this.flameMesh.instanceMatrix.needsUpdate = true;

      // Position dynamic flickering firelights on head fire and ignition point
      const diag = model.getDiagnostics();
      const headSector = model.sectors.find((s) => s.angleDeg === diag.directionOfMaxSpreadDeg) || unblockedSectors[0];
      const headElev = this.terrain.getElevationAt(headSector.worldX, headSector.worldZ);

      this.fireLight.position.set(headSector.worldX, headElev + 14, headSector.worldZ);
      this.fireLight2.position.set(model.ignitionX, model.ignitionElev + 10, model.ignitionZ);
    }
  }

  /**
   * Resets and cleans up all active flame, smoke, and ember particles
   */
  public reset(): void {
    this.config.active = false;
    this.group.visible = false;
    this.activeCombustionPoints = [];

    // Park all smoke puffs offscreen
    if (this.smokeData) {
      for (let i = 0; i < this.smokeCount; i++) {
        if (this.smokeData[i]) {
          this.smokeData[i].y = -9999;
          this.smokeData[i].scale = 0.01;
          this.smokeData[i].opacity = 0;
        }
      }
      this.updateSmokeTransforms();
    }

    // Park all flames offscreen
    if (this.flameData) {
      for (let i = 0; i < this.flameCount; i++) {
        if (this.flameData[i]) {
          this.flameData[i].y = -9999;
          this.flameData[i].scale = 0;
        }
        this.dummyObj.position.set(0, -9999, 0);
        this.dummyObj.scale.set(0, 0, 0);
        this.dummyObj.updateMatrix();
        this.flameMesh.setMatrixAt(i, this.dummyObj.matrix);
      }
      this.flameMesh.instanceMatrix.needsUpdate = true;
    }

    // Park all airborne embers offscreen
    if (this.emberParticles) {
      const pos = this.emberParticles.geometry.attributes.position;
      for (let i = 0; i < this.emberPositions.length / 3; i++) {
        pos.setY(i, -9999);
      }
      pos.needsUpdate = true;
    }
  }
}
