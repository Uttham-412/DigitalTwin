/**
 * LAND8FIRE — 3D BOTANICAL AMAZON RAINFOREST VEGETATION ENGINE (V5 PHOTOREALISTIC)
 *
 * Implements a photorealistic, geographically grounded tropical rainforest ecosystem
 * directly mirroring the reference mockup (media_1791988319682.jpg):
 *
 * 1. Towering Emergent Giants (44m–56m): Bertholletia excelsa (Brazil Nut) & Ceiba pentandra (Kapok)
 *    - Prominent focal emergent hero tree positioned in midground center-left
 *    - Fluted buttress root base with radiating scaffold branch boughs
 *    - Distinct tiered horizontal umbrella foliage shelves/pads with organic leaf clusters
 *
 * 2. Continuous Upper Canopy ("Green Ocean", 22m–36m):
 *    - Unbroken, lush, multi-layered canopy blanket across all terra firme plateaus and rolling hills
 *    - Sculpted multi-lobed cauliflower dome geometry with smooth normals and no flat facets
 *    - Custom Fresnel rim lighting in shader: crowns glow with warm golden morning sunrise highlights
 *    - Curated botanical palette: sunlit golden green, emerald hardwood, and shaded crevices
 *
 * 3. Understory Amazon Palms (8m–22m): Mauritia flexuosa (Buriti) & Euterpe precatoria (Açaí)
 *    - 800+ palms cascading along riverbanks and canopy margins with arching pinnate fronds
 *
 * 4. Wildfire State Machine: HEALTHY -> HEAT_STRESSED -> BURNING -> SCORCHED
 */

import * as THREE from 'three';
import { AmazonTerrainEngine } from './AmazonTerrainMesh';
import { AmazonRothermelModel } from './AmazonRothermelModel';

export interface TreeRecord {
  id: number;
  x: number;
  z: number;
  elevation: number;
  height: number;
  crownRadius: number;
  tier: 'EMERGENT' | 'CANOPY' | 'UNDERSTORY_PALM' | 'SHRUB';
  state: 'HEALTHY' | 'HEAT_STRESSED' | 'BURNING' | 'SCORCHED';
  baseColor: THREE.Color;
  instancedIndex: number;
}

export class AmazonVegetationEngine {
  public group: THREE.Group;
  private terrain: AmazonTerrainEngine;

  // Instanced Meshes for high-performance GPU batching
  public emergentTrunks!: THREE.InstancedMesh;
  public emergentBoughs!: THREE.InstancedMesh;
  public emergentCrowns!: THREE.InstancedMesh;

  public canopyTrunks!: THREE.InstancedMesh;
  public canopyCrowns!: THREE.InstancedMesh;

  public palmTrunks!: THREE.InstancedMesh;
  public palmCrowns!: THREE.InstancedMesh;

  // Textures
  private leafTexture!: THREE.CanvasTexture;
  private palmFrondTexture!: THREE.CanvasTexture;
  private barkTexture!: THREE.CanvasTexture;

  public trees: TreeRecord[] = [];
  public stats = {
    totalTrees: 0,
    emergentCount: 0,
    canopyCount: 0,
    palmCount: 0,
    healthyCount: 0,
    heatStressedCount: 0,
    burningCount: 0,
    scorchedCount: 0,
  };

  constructor(terrain: AmazonTerrainEngine, densityTarget: number = 19500) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.group.name = 'AmazonVegetationSystem';

    this.createTextures();
    this.generateVegetation(densityTarget);
  }

  /**
   * Generates organic procedural PBR textures for foliage, palm fronds, and bark
   */
  private createTextures(): void {
    // 1. Broadleaf Rainforest Foliage Micro-Texture
    const leafCanvas = document.createElement('canvas');
    leafCanvas.width = 256;
    leafCanvas.height = 256;
    const lCtx = leafCanvas.getContext('2d')!;

    // Rich organic chlorophyll base (bright, vibrant, and natural under daylight)
    lCtx.fillStyle = '#3E6135';
    lCtx.fillRect(0, 0, 256, 256);

    // Stippled leaf clusters and cellular chlorophyll variation
    for (let i = 0; i < 900; i++) {
      const cx = Math.random() * 256;
      const cy = Math.random() * 256;
      const r = 2.0 + Math.random() * 5.0;
      const roll = Math.random();
      if (roll < 0.35) {
        lCtx.fillStyle = '#5B8A4C'; // Sunlit leaf tip
      } else if (roll < 0.70) {
        lCtx.fillStyle = '#49753A'; // Mid-canopy green
      } else {
        lCtx.fillStyle = '#325726'; // Shaded depth
      }
      lCtx.beginPath();
      lCtx.arc(cx, cy, r, 0, Math.PI * 2);
      lCtx.fill();
    }

    this.leafTexture = new THREE.CanvasTexture(leafCanvas);
    this.leafTexture.wrapS = THREE.RepeatWrapping;
    this.leafTexture.wrapT = THREE.RepeatWrapping;
    this.leafTexture.repeat.set(3, 3);

    // 2. Arching Pinnate Palm Frond Texture
    const palmCanvas = document.createElement('canvas');
    palmCanvas.width = 256;
    palmCanvas.height = 256;
    const pCtx = palmCanvas.getContext('2d')!;
    pCtx.clearRect(0, 0, 256, 256);

    // Central rachis stem
    pCtx.strokeStyle = '#6E9E47';
    pCtx.lineWidth = 4.0;
    pCtx.beginPath();
    pCtx.moveTo(25, 235);
    pCtx.quadraticCurveTo(110, 130, 230, 25);
    pCtx.stroke();

    // Cascading leaflets
    pCtx.lineWidth = 2.5;
    for (let t = 0.08; t <= 0.96; t += 0.03) {
      const stemX = 25 * (1 - t) * (1 - t) + 110 * 2 * (1 - t) * t + 230 * t * t;
      const stemY = 235 * (1 - t) * (1 - t) + 130 * 2 * (1 - t) * t + 25 * t * t;

      pCtx.strokeStyle = Math.random() > 0.4 ? '#68C474' : '#4DB05B';
      pCtx.beginPath();
      pCtx.moveTo(stemX, stemY);
      pCtx.lineTo(stemX - 42 - Math.random() * 20, stemY + 24 + Math.random() * 12);
      pCtx.stroke();

      pCtx.strokeStyle = Math.random() > 0.4 ? '#84D88E' : '#5EBE6C';
      pCtx.beginPath();
      pCtx.moveTo(stemX, stemY);
      pCtx.lineTo(stemX + 34 + Math.random() * 18, stemY - 24 - Math.random() * 12);
      pCtx.stroke();
    }

    this.palmFrondTexture = new THREE.CanvasTexture(palmCanvas);

    // 3. Fluted Rainforest Bark Texture
    const barkCanvas = document.createElement('canvas');
    barkCanvas.width = 128;
    barkCanvas.height = 256;
    const bCtx = barkCanvas.getContext('2d')!;

    bCtx.fillStyle = '#423122';
    bCtx.fillRect(0, 0, 128, 256);

    for (let x = 0; x < 128; x += 3) {
      bCtx.strokeStyle = (x % 6 === 0) ? '#2B1E14' : '#574230';
      bCtx.lineWidth = 1.8;
      bCtx.beginPath();
      bCtx.moveTo(x + (Math.random() - 0.5) * 2, 0);
      bCtx.lineTo(x + (Math.random() - 0.5) * 2, 256);
      bCtx.stroke();
    }

    this.barkTexture = new THREE.CanvasTexture(barkCanvas);
    this.barkTexture.wrapS = THREE.RepeatWrapping;
    this.barkTexture.wrapT = THREE.RepeatWrapping;
    this.barkTexture.repeat.set(1, 4);
  }

  /**
   * Builds an organic, sculpted multi-lobed cauliflower dome geometry
   * Perturbs vertices outward along organic spherical harmonics with smooth normals
   */
  private createOrganicCanopyGeometry(): THREE.BufferGeometry {
    // High-subdivision base (Sphere 16x12) gives smooth organic curves without flat facets
    const geom = new THREE.SphereGeometry(1.0, 16, 12);
    const pos = geom.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const r = Math.hypot(x, y, z);
      const theta = Math.atan2(z, x);
      const phi = Math.acos(y / (r || 1));

      // Multi-frequency spherical harmonics: creates 6-8 rounded billowing lobes
      const lobe1 = Math.sin(theta * 3.0 + 0.4) * Math.sin(phi * 3.0) * 0.16;
      const lobe2 = Math.cos(theta * 5.0 - 0.6) * Math.sin(phi * 4.5) * 0.10;
      const topFlatten = (y > 0) ? -y * 0.12 : 0; // Natural umbrella compression on top
      const bottomTaper = (y < 0) ? y * 0.22 : 0; // Inward taper at base

      const newR = 1.0 + lobe1 + lobe2 + topFlatten + bottomTaper;

      pos.setXYZ(i, (x / r) * newR, (y / r) * newR * 0.76, (z / r) * newR);
    }

    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Builds the horizontal layered umbrella shelf for Emergent Giants (*Bertholletia excelsa*)
   */
  private createEmergentUmbrellaGeometry(): THREE.BufferGeometry {
    const geom = new THREE.SphereGeometry(1.0, 14, 10);
    const pos = geom.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const r = Math.hypot(x, y, z);
      const theta = Math.atan2(z, x);
      const phi = Math.acos(y / (r || 1));

      // Wide horizontal spreading lobes
      const lobe = Math.sin(theta * 4.0 + 0.2) * Math.sin(phi * 2.8) * 0.20;
      const flattenedY = y * 0.32; // Wide flattened umbrella silhouette
      const newR = 1.0 + lobe;

      pos.setXYZ(i, (x / r) * newR, flattenedY + lobe * 0.08, (z / r) * newR);
    }

    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Fluted buttress base trunk geometry for Emergent Giants
   */
  private createButtressedTrunkGeometry(): THREE.BufferGeometry {
    const geom = new THREE.CylinderGeometry(0.38, 0.95, 1.0, 10, 4);
    const pos = geom.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Flared buttress root fins at the base (y < -0.2)
      if (y < 0.0) {
        const bottomFactor = Math.abs(y);
        const angle = Math.atan2(z, x);
        const fin = Math.pow(Math.cos(angle * 3.0), 4.0) * bottomFactor * 1.6;
        pos.setX(i, x * (1.0 + fin));
        pos.setZ(i, z * (1.0 + fin));
      }
    }

    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Arching palm frond rosette geometry
   */
  private createPalmRosetteGeometry(): THREE.BufferGeometry {
    const geom = new THREE.ConeGeometry(1.0, 0.8, 12, 3, true);
    geom.rotateX(Math.PI); // Invert so fronds arch downwards
    const pos = geom.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const dist = Math.hypot(x, z);
      if (y < 0) {
        const flare = Math.pow(dist, 1.3) * 0.42;
        pos.setX(i, x * (1 + flare));
        pos.setZ(i, z * (1 + flare));
        pos.setY(i, y - flare * 0.35);
      }
    }

    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Enhances foliage material with custom Fresnel rim lighting
   * Causes tree crowns to catch the warm morning golden sunrise along their silhouettes
   */
  private applyGoldenRimLighting(mat: THREE.MeshStandardMaterial): void {
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        // LAND8FIRE: Warm golden morning sunrise rim lighting
        vec3 viewD = normalize(vViewPosition);
        vec3 worldN = normalize(vNormal);
        float rim = pow(1.0 - max(0.0, dot(viewD, worldN)), 2.8);
        gl_FragColor.rgb += vec3(0.38, 0.30, 0.14) * rim * 0.75;
        `
      );
    };
  }

  /**
   * Generates multi-tier forest instances grounded in Copernicus DEM elevation
   */
  private generateVegetation(targetCount: number): void {
    let seed = 51927;
    const prng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const tempEmergents: Array<{
      x: number;
      z: number;
      elev: number;
      h: number;
      r: number;
      c: THREE.Color;
      boughs: Array<{ bx: number; by: number; bz: number; bScale: number }>;
    }> = [];

    const tempCanopy: Array<{ x: number; z: number; elev: number; h: number; r: number; c: THREE.Color }> = [];
    const tempPalms: Array<{ x: number; z: number; elev: number; h: number; r: number; c: THREE.Color }> = [];

    // Curated authentic Amazonian botanical color palette (bright, natural, sunlit tones)
    const cEmergent = [
      new THREE.Color('#4D853A'), // Brazil nut mature crown
      new THREE.Color('#5E9946'), // Emergent golden dawn crest
      new THREE.Color('#427732'), // Deep tropical hardwood
      new THREE.Color('#6BA54E'), // Sunlit crown rim
    ];

    const cCanopy = [
      new THREE.Color('#468034'), // Continuous upper canopy
      new THREE.Color('#528E3E'), // Tropical hardwood green
      new THREE.Color('#5E9C46'), // Sun-drenched canopy crest
      new THREE.Color('#3E742D'), // Rich chlorophyll green
      new THREE.Color('#69A84E'), // Golden-olive crown tip
      new THREE.Color('#356526'), // Canopy depth
    ];

    const cPalm = [
      new THREE.Color('#4EA136'), // Arching Buriti palm fronds
      new THREE.Color('#43932D'), // Riverside palm green
      new THREE.Color('#5BB23E'), // Sunlit young fronds
      new THREE.Color('#398026'), // Mature palm frond
    ];

    // 1. PLACE PROMINENT FOCAL EMERGENT TREE IN MIDGROUND CENTER-LEFT
    // Directly matching the iconic hero tree in the reference photo
    const focalX = -70;
    const focalZ = 80;
    const focalElev = this.terrain.getElevationAt(focalX, focalZ);
    tempEmergents.push({
      x: focalX,
      z: focalZ,
      elev: focalElev,
      h: 54.0,
      r: 32.0,
      c: new THREE.Color('#569240'),
      boughs: [
        { bx: -8, by: 46, bz: -6, bScale: 14 },
        { bx: 9, by: 48, bz: -4, bScale: 15 },
        { bx: -5, by: 50, bz: 8, bScale: 16 },
        { bx: 8, by: 52, bz: 7, bScale: 15 },
        { bx: 0, by: 54, bz: 0, bScale: 18 }, // Central apex umbrella
      ],
    });

    // Secondary emergents positioned across the landscape
    const extraEmergents = [
      { x: -240, z: 260, h: 46, r: 24 }, // Along river valley
      { x: 160, z: -120, h: 48, r: 26 }, // Center-right ridge
      { x: 340, z: -220, h: 45, r: 23 }, // Near fire front
      { x: -420, z: -360, h: 50, r: 27 }, // Distant hills
      { x: -160, z: -210, h: 47, r: 25 },
      { x: 80, z: 320, h: 49, r: 26 },
    ];

    for (const em of extraEmergents) {
      const elev = this.terrain.getElevationAt(em.x, em.z);
      tempEmergents.push({
        x: em.x,
        z: em.z,
        elev,
        h: em.h,
        r: em.r,
        c: cEmergent[Math.floor(prng() * cEmergent.length)].clone(),
        boughs: [
          { bx: -5, by: em.h * 0.84, bz: -4, bScale: em.r * 0.55 },
          { bx: 6, by: em.h * 0.88, bz: 3, bScale: em.r * 0.60 },
          { bx: 0, by: em.h * 0.94, bz: 0, bScale: em.r * 0.75 },
        ],
      });
    }

    // 2. GENERATE CONTINUOUS UPPER CANOPY & PALMS
    let attempts = 0;
    const maxAttempts = targetCount * 3;

    while (
      (tempCanopy.length + tempPalms.length) < targetCount &&
      attempts < maxAttempts
    ) {
      attempts++;

      const x = (prng() - 0.5) * (this.terrain.width - 80);
      const z = (prng() - 0.5) * (this.terrain.depth - 80);
      const elev = this.terrain.getElevationAt(x, z);

      // Strictly prevent tree crowns from blocking or overlapping the river water surface
      if (elev <= 19.5 || this.terrain.isWaterAt(x, z, 26.0)) continue;

      // Keep settlement terrace, bridge crossing, and lookout tower completely clear
      const distToSettlement = Math.hypot(x - 35, z - 10);
      if (distToSettlement < 95) continue;
      const distToBridge = Math.hypot(x - (-235), z - 30);
      if (distToBridge < 32) continue;
      const distToTower = Math.hypot(x - 90, z - (-100));
      if (distToTower < 30) continue;

      const isRiverBank = elev > 19.5 && elev < 26.5;

      if (isRiverBank && prng() < 0.65) {
        // Amazon Palms along river margins
        tempPalms.push({
          x,
          z,
          elev,
          h: 12.0 + prng() * 11.0,
          r: 5.5 + prng() * 4.0,
          c: cPalm[Math.floor(prng() * cPalm.length)].clone(),
        });
      } else {
        // Continuous Upper Canopy Tree
        const height = 23.0 + prng() * 12.0;
        const radius = 10.0 + prng() * 8.5; // Large overlapping crowns
        tempCanopy.push({
          x,
          z,
          elev,
          h: height,
          r: radius,
          c: cCanopy[Math.floor(prng() * cCanopy.length)].clone(),
        });
      }
    }

    // Build the GPU Instanced Meshes
    this.buildEmergents(tempEmergents);
    this.buildCanopy(tempCanopy);
    this.buildPalms(tempPalms);

    this.stats.totalTrees = this.trees.length;
    this.stats.healthyCount = this.trees.length;
  }

  /**
   * 1. Emergent Giants (*Bertholletia excelsa*)
   */
  private buildEmergents(
    data: Array<{
      x: number;
      z: number;
      elev: number;
      h: number;
      r: number;
      c: THREE.Color;
      boughs: Array<{ bx: number; by: number; bz: number; bScale: number }>;
    }>
  ): void {
    if (data.length === 0) return;

    // A. Buttressed Columnar Trunks
    const trunkGeom = this.createButtressedTrunkGeometry();
    const trunkMat = new THREE.MeshStandardMaterial({
      map: this.barkTexture,
      roughness: 0.90,
      metalness: 0.05,
    });
    this.emergentTrunks = new THREE.InstancedMesh(trunkGeom, trunkMat, data.length);
    this.emergentTrunks.castShadow = true;
    this.emergentTrunks.receiveShadow = true;

    // Count total umbrella bough pads
    let totalPads = 0;
    data.forEach((d) => (totalPads += d.boughs.length));

    // B. Tiered Horizontal Umbrella Foliage Shelves
    const padGeom = this.createEmergentUmbrellaGeometry();
    const padMat = new THREE.MeshStandardMaterial({
      map: this.leafTexture,
      roughness: 0.78,
      metalness: 0.04,
    });
    this.applyGoldenRimLighting(padMat);

    this.emergentCrowns = new THREE.InstancedMesh(padGeom, padMat, totalPads);
    this.emergentCrowns.castShadow = true;
    this.emergentCrowns.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let padIndex = 0;

    data.forEach((d, i) => {
      // Trunk instance
      const trunkH = d.h * 0.88;
      dummy.position.set(d.x, d.elev + trunkH / 2, d.z);
      dummy.scale.set(d.r * 0.16, trunkH, d.r * 0.16);
      dummy.rotation.set(0, (d.x * 0.1) % Math.PI, 0);
      dummy.updateMatrix();
      this.emergentTrunks.setMatrixAt(i, dummy.matrix);

      // Umbrella bough foliage pads
      for (const b of d.boughs) {
        dummy.position.set(d.x + b.bx, d.elev + b.by, d.z + b.bz);
        dummy.scale.set(b.bScale, b.bScale * 0.35, b.bScale);
        dummy.rotation.set(0, (b.bx * 0.4 + b.bz * 0.3) % Math.PI, 0);
        dummy.updateMatrix();
        this.emergentCrowns.setMatrixAt(padIndex, dummy.matrix);
        this.emergentCrowns.setColorAt(padIndex, d.c);
        padIndex++;
      }

      this.trees.push({
        id: this.trees.length,
        x: d.x,
        z: d.z,
        elevation: d.elev,
        height: d.h,
        crownRadius: d.r,
        tier: 'EMERGENT',
        state: 'HEALTHY',
        baseColor: d.c.clone(),
        instancedIndex: i,
      });
    });

    this.emergentTrunks.instanceMatrix.needsUpdate = true;
    this.emergentCrowns.instanceMatrix.needsUpdate = true;
    if (this.emergentCrowns.instanceColor) this.emergentCrowns.instanceColor.needsUpdate = true;

    this.group.add(this.emergentTrunks);
    this.group.add(this.emergentCrowns);
    this.stats.emergentCount = data.length;
  }

  /**
   * 2. Continuous Upper Canopy ("Green Ocean")
   */
  private buildCanopy(
    data: Array<{ x: number; z: number; elev: number; h: number; r: number; c: THREE.Color }>
  ): void {
    if (data.length === 0) return;

    // Trunks
    const trunkGeom = new THREE.CylinderGeometry(0.5, 0.9, 1, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      map: this.barkTexture,
      roughness: 0.92,
    });
    this.canopyTrunks = new THREE.InstancedMesh(trunkGeom, trunkMat, data.length);

    // Sculpted organic multi-lobed cauliflower dome geometry
    const crownGeom = this.createOrganicCanopyGeometry();
    const crownMat = new THREE.MeshStandardMaterial({
      map: this.leafTexture,
      roughness: 0.80,
      metalness: 0.04,
    });
    this.applyGoldenRimLighting(crownMat);

    this.canopyCrowns = new THREE.InstancedMesh(crownGeom, crownMat, data.length);
    this.canopyCrowns.castShadow = true;
    this.canopyCrowns.receiveShadow = true;

    const dummy = new THREE.Object3D();

    data.forEach((d, i) => {
      // Trunk
      const trunkH = d.h * 0.72;
      dummy.position.set(d.x, d.elev + trunkH / 2, d.z);
      dummy.scale.set(1, trunkH, 1);
      dummy.rotation.set(0, (d.z * 0.05) % Math.PI, 0);
      dummy.updateMatrix();
      this.canopyTrunks.setMatrixAt(i, dummy.matrix);

      // Sculpted Canopy Dome
      const crownY = d.elev + d.h * 0.75;
      dummy.position.set(d.x, crownY, d.z);
      dummy.scale.set(d.r, d.h * 0.46, d.r);
      dummy.rotation.set(0, (d.x * 0.25 + d.z * 0.15) % Math.PI, 0);
      dummy.updateMatrix();
      this.canopyCrowns.setMatrixAt(i, dummy.matrix);
      this.canopyCrowns.setColorAt(i, d.c);

      this.trees.push({
        id: this.trees.length,
        x: d.x,
        z: d.z,
        elevation: d.elev,
        height: d.h,
        crownRadius: d.r,
        tier: 'CANOPY',
        state: 'HEALTHY',
        baseColor: d.c.clone(),
        instancedIndex: i,
      });
    });

    this.canopyTrunks.instanceMatrix.needsUpdate = true;
    this.canopyCrowns.instanceMatrix.needsUpdate = true;
    if (this.canopyCrowns.instanceColor) this.canopyCrowns.instanceColor.needsUpdate = true;

    this.group.add(this.canopyTrunks);
    this.group.add(this.canopyCrowns);
    this.stats.canopyCount = data.length;
  }

  /**
   * 3. Understory Amazon Palms (Mauritia flexuosa / Buriti)
   */
  private buildPalms(
    data: Array<{ x: number; z: number; elev: number; h: number; r: number; c: THREE.Color }>
  ): void {
    if (data.length === 0) return;

    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 1, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      map: this.barkTexture,
      roughness: 0.90,
      color: '#46382A',
    });
    this.palmTrunks = new THREE.InstancedMesh(trunkGeom, trunkMat, data.length);

    // Arching palm rosette with curving fronds
    const frondGeom = this.createPalmRosetteGeometry();
    const frondMat = new THREE.MeshStandardMaterial({
      map: this.palmFrondTexture,
      roughness: 0.72,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    this.applyGoldenRimLighting(frondMat);

    this.palmCrowns = new THREE.InstancedMesh(frondGeom, frondMat, data.length);
    this.palmCrowns.castShadow = true;
    this.palmCrowns.receiveShadow = true;

    const dummy = new THREE.Object3D();

    data.forEach((d, i) => {
      // Slender Trunk
      dummy.position.set(d.x, d.elev + d.h / 2, d.z);
      dummy.scale.set(1, d.h, 1);
      dummy.rotation.set(0.04 * Math.sin(d.x), (d.x * 0.1) % Math.PI, 0.04 * Math.cos(d.z));
      dummy.updateMatrix();
      this.palmTrunks.setMatrixAt(i, dummy.matrix);

      // Arching Frond Rosette
      dummy.position.set(d.x, d.elev + d.h, d.z);
      dummy.scale.set(d.r, d.r * 0.7, d.r);
      dummy.rotation.set(0, (d.z * 0.2) % Math.PI, 0);
      dummy.updateMatrix();
      this.palmCrowns.setMatrixAt(i, dummy.matrix);
      this.palmCrowns.setColorAt(i, d.c);

      this.trees.push({
        id: this.trees.length,
        x: d.x,
        z: d.z,
        elevation: d.elev,
        height: d.h,
        crownRadius: d.r,
        tier: 'UNDERSTORY_PALM',
        state: 'HEALTHY',
        baseColor: d.c.clone(),
        instancedIndex: i,
      });
    });

    this.palmTrunks.instanceMatrix.needsUpdate = true;
    this.palmCrowns.instanceMatrix.needsUpdate = true;
    if (this.palmCrowns.instanceColor) this.palmCrowns.instanceColor.needsUpdate = true;

    this.group.add(this.palmTrunks);
    this.group.add(this.palmCrowns);
    this.stats.palmCount = data.length;
  }

  /**
   * Wildfire Tree Damage State Machine
   * Dynamically shifts tree colors along the advancing fire front:
   * HEALTHY -> HEAT_STRESSED -> BURNING -> SCORCHED
   */
  public updateWildfireState(
    fireCenterX: number,
    fireCenterZ: number,
    frontRadius: number,
    burnedRadius: number
  ): void {
    const cScorched = new THREE.Color('#161413');    // Charcoal black
    const cBurning = new THREE.Color('#FF4500');     // Roaring combustion orange
    const cHeatStressed = new THREE.Color('#A87828'); // Desiccated yellow-brown

    let healthy = 0;
    let stressed = 0;
    let burning = 0;
    let scorched = 0;

    for (const tree of this.trees) {
      const dist = Math.hypot(tree.x - fireCenterX, tree.z - fireCenterZ);
      let targetColor: THREE.Color;

      if (dist < burnedRadius) {
        tree.state = 'SCORCHED';
        targetColor = cScorched;
        scorched++;
      } else if (dist < frontRadius) {
        const factor = (dist - burnedRadius) / (frontRadius - burnedRadius || 1);
        if (factor < 0.45) {
          tree.state = 'BURNING';
          targetColor = cBurning;
          burning++;
        } else {
          tree.state = 'HEAT_STRESSED';
          targetColor = cHeatStressed;
          stressed++;
        }
      } else if (dist < frontRadius + 75) {
        tree.state = 'HEAT_STRESSED';
        targetColor = cHeatStressed;
        stressed++;
      } else {
        tree.state = 'HEALTHY';
        targetColor = tree.baseColor;
        healthy++;
      }

      // Update instanced GPU color buffer
      if (tree.tier === 'CANOPY' && this.canopyCrowns) {
        this.canopyCrowns.setColorAt(tree.instancedIndex, targetColor);
      } else if (tree.tier === 'UNDERSTORY_PALM' && this.palmCrowns) {
        this.palmCrowns.setColorAt(tree.instancedIndex, targetColor);
      }
    }

    if (this.canopyCrowns && this.canopyCrowns.instanceColor) {
      this.canopyCrowns.instanceColor.needsUpdate = true;
    }
    if (this.palmCrowns && this.palmCrowns.instanceColor) {
      this.palmCrowns.instanceColor.needsUpdate = true;
    }

    this.stats.healthyCount = healthy;
    this.stats.heatStressedCount = stressed;
    this.stats.burningCount = burning;
    this.stats.scorchedCount = scorched;
  }

  /**
   * Physically couples tree scorch and combustion directly with the Rothermel 36-sector front
   */
  public updateWildfireFromRothermel(model: AmazonRothermelModel): void {
    if (!model.isIgnited) {
      this.resetWildfire();
      return;
    }

    const cScorched = new THREE.Color('#151413');    // Charcoal black
    const cBurning = new THREE.Color('#E65100');     // Incandescent active combustion
    const cHeatStressed = new THREE.Color('#8D6E18'); // Desiccated amber foliage

    let healthy = 0;
    let stressed = 0;
    let burning = 0;
    let scorched = 0;

    const ignX = model.ignitionX;
    const ignZ = model.ignitionZ;

    for (const tree of this.trees) {
      const dx = tree.x - ignX;
      const dz = tree.z - ignZ;
      const dist = Math.hypot(dx, dz);
      let targetColor: THREE.Color = tree.baseColor;

      // Find sector matching tree azimuth
      let treeAngleDeg = (Math.atan2(dx, dz) * 180) / Math.PI;
      if (treeAngleDeg < 0) treeAngleDeg += 360;

      const sectorIdx = Math.floor(treeAngleDeg / 10) % 36;
      const sector = model.sectors[sectorIdx];
      const maxDist = sector ? sector.radiusMeters : 0;

      if (dist < maxDist * 0.65) {
        // Deep interior core = scorched black
        tree.state = 'SCORCHED';
        targetColor = cScorched;
        scorched++;
      } else if (dist <= maxDist + 4.0) {
        // Active advancing perimeter = burning
        tree.state = 'BURNING';
        targetColor = cBurning;
        burning++;
      } else if (dist <= maxDist + 35.0) {
        // Immediate thermal radiative halo = heat-stressed
        tree.state = 'HEAT_STRESSED';
        targetColor = cHeatStressed;
        stressed++;
      } else {
        // Beyond fire front = healthy pristine
        tree.state = 'HEALTHY';
        targetColor = tree.baseColor;
        healthy++;
      }

      // Update instanced GPU color buffer
      if (tree.tier === 'CANOPY' && this.canopyCrowns) {
        this.canopyCrowns.setColorAt(tree.instancedIndex, targetColor);
      } else if (tree.tier === 'UNDERSTORY_PALM' && this.palmCrowns) {
        this.palmCrowns.setColorAt(tree.instancedIndex, targetColor);
      }
    }

    if (this.canopyCrowns && this.canopyCrowns.instanceColor) {
      this.canopyCrowns.instanceColor.needsUpdate = true;
    }
    if (this.palmCrowns && this.palmCrowns.instanceColor) {
      this.palmCrowns.instanceColor.needsUpdate = true;
    }

    this.stats.healthyCount = healthy;
    this.stats.heatStressedCount = stressed;
    this.stats.burningCount = burning;
    this.stats.scorchedCount = scorched;
  }

  /**
   * Resets all tree states back to 100% healthy unburned pristine forest
   */
  public resetWildfire(): void {
    for (const tree of this.trees) {
      tree.state = 'HEALTHY';
      if (tree.tier === 'CANOPY' && this.canopyCrowns) {
        this.canopyCrowns.setColorAt(tree.instancedIndex, tree.baseColor);
      } else if (tree.tier === 'UNDERSTORY_PALM' && this.palmCrowns) {
        this.palmCrowns.setColorAt(tree.instancedIndex, tree.baseColor);
      }
    }

    if (this.canopyCrowns && this.canopyCrowns.instanceColor) {
      this.canopyCrowns.instanceColor.needsUpdate = true;
    }
    if (this.palmCrowns && this.palmCrowns.instanceColor) {
      this.palmCrowns.instanceColor.needsUpdate = true;
    }

    this.stats.healthyCount = this.trees.length;
    this.stats.heatStressedCount = 0;
    this.stats.burningCount = 0;
    this.stats.scorchedCount = 0;
  }

  public setCanopyVisible(val: boolean): void {
    if (this.canopyCrowns) this.canopyCrowns.visible = val;
    if (this.canopyTrunks) this.canopyTrunks.visible = val;
    if (this.emergentCrowns) this.emergentCrowns.visible = val;
    if (this.emergentTrunks) this.emergentTrunks.visible = val;
  }

  public setUnderstoryVisible(val: boolean): void {
    if (this.palmCrowns) this.palmCrowns.visible = val;
    if (this.palmTrunks) this.palmTrunks.visible = val;
  }

  public setForestFloorVisible(_val: boolean): void {
    void _val;
  }
}
