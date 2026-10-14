/**
 * LAND8FIRE — 3D LANDSCAPE & BOTANICAL ECOSYSTEM MANAGER
 *
 * Implements a varied, realistic 3D virtual ecosystem:
 * 1. glTF/GLB Asset Pipeline (Loads hardwood trees, conifers, shrubs, boulders, cabins, watchtowers)
 * 2. GPU Instanced Rendering for high-performance dense vegetation
 * 3. Distinct ecological zones:
 *    - Dense Hardwood Forest (Fuel Model 10: high fuel load, moderate spread)
 *    - Conifer Hills (Fuel Model 8/9: needle litter)
 *    - Open Dry Grassland & Clearings (Fuel Model 4: fast spread)
 *    - Water Corridor (Rio Negro river & stream: 100% firebreak)
 *    - Developed Outpost & Dirt Road (Cabin, watchtower, road: non-combustible barrier)
 *    - Rocky Escarpments (Granite boulders & shallow soil)
 * 4. Multi-fuel classification query: getFuelTypeAt(x, z)
 * 5. Dynamic tree damage state machine driven by Rothermel model
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AmazonTerrainEngine } from './AmazonTerrainMesh';
import { AmazonRothermelModel } from './AmazonRothermelModel';

export type FuelClassType =
  | 'DENSE_HARDWOOD'
  | 'CONIFER_FOREST'
  | 'DRY_GRASSLAND'
  | 'SHRUB_UNDERSTORY'
  | 'DIRT_ROAD'
  | 'BUILDING_DEVELOPED'
  | 'ROCK_OUTCROP'
  | 'WATER_RIVER';

export interface FuelProperties {
  type: FuelClassType;
  name: string;
  isBurnable: boolean;
  fuelLoadKgM2: number;
  moistureOfExtinction: number;
  baseSpreadMultiplier: number;
  description: string;
}

export interface LandscapeTreeInstance {
  id: number;
  x: number;
  z: number;
  elevation: number;
  scale: number;
  type: 'HARDWOOD' | 'CONIFER' | 'SHRUB' | 'PALM';
  meshTypeIndex: number;
  instancedIndex: number;
  baseColor: THREE.Color;
  currentState: 'HEALTHY' | 'HEAT_STRESSED' | 'BURNING' | 'SCORCHED';
}

export class LandscapeEcosystemManager {
  public group: THREE.Group;
  private terrain: AmazonTerrainEngine;

  // Instanced Meshes for vegetation & rocks
  private hardwoodTrunks!: THREE.InstancedMesh;
  private hardwoodCanopies!: THREE.InstancedMesh;
  private coniferTrunks!: THREE.InstancedMesh;
  private coniferCanopies!: THREE.InstancedMesh;
  private palmTrunks!: THREE.InstancedMesh;
  private palmFronds!: THREE.InstancedMesh;
  private shrubInstances!: THREE.InstancedMesh;
  private boulderInstances!: THREE.InstancedMesh;

  // Developed Structures & Road
  public cabinMesh?: THREE.Group;
  public watchtowerMesh?: THREE.Group;
  public bridgeMesh?: THREE.Group;
  public ruralHouseMeshes: THREE.Group[] = [];
  public roadMesh?: THREE.Mesh;

  // Tree instance tracker
  public instances: LandscapeTreeInstance[] = [];

  // Road Curve Definition (Winding from valley entry across clearing to watchtower)
  public roadPoints: THREE.Vector3[] = [];

  public isAssetsLoaded: boolean = false;

  constructor(terrain: AmazonTerrainEngine) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.group.name = 'LandscapeEcosystem';

    this.initRoadPath();
    this.buildRoadMesh();
    this.load3DAssets();
  }

  /**
   * Initializes winding dirt access road coordinates across the clearing
   */
  private initRoadPath(): void {
    const pts = [
      new THREE.Vector3(-450, 0, 180),
      new THREE.Vector3(-320, 0, 140),
      new THREE.Vector3(-180, 0, 80),
      new THREE.Vector3(-60, 0, 20),
      new THREE.Vector3(20, 0, -20),
      new THREE.Vector3(70, 0, -80),
      new THREE.Vector3(120, 0, -140),
    ];

    for (const p of pts) {
      p.y = this.terrain.getElevationAt(p.x, p.z) + 0.35;
      this.roadPoints.push(p);
    }
  }

  /**
   * Builds the 3D dirt road ribbon following the terrain
   */
  private buildRoadMesh(): void {
    if (this.roadPoints.length < 2) return;

    const curve = new THREE.CatmullRomCurve3(this.roadPoints);
    const numPoints = 80;
    const curvePoints = curve.getPoints(numPoints);
    const roadWidth = 9.0;

    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const pt = curvePoints[i];
      const tangent = curve.getTangent(i / numPoints);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const leftPt = pt.clone().addScaledVector(normal, roadWidth / 2);
      const rightPt = pt.clone().addScaledVector(normal, -roadWidth / 2);

      leftPt.y = this.terrain.getElevationAt(leftPt.x, leftPt.z) + 0.35;
      rightPt.y = this.terrain.getElevationAt(rightPt.x, rightPt.z) + 0.35;

      positions.push(leftPt.x, leftPt.y, leftPt.z);
      positions.push(rightPt.x, rightPt.y, rightPt.z);

      normals.push(0, 1, 0, 0, 1, 0);
      uvs.push(0, i / 4.0, 1, i / 4.0);

      if (i < numPoints) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);

    // Weathered packed dirt road material
    const roadMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6E5D46'),
      roughness: 0.94,
      metalness: 0.02,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    this.roadMesh = new THREE.Mesh(geom, roadMat);
    this.roadMesh.receiveShadow = true;
    this.roadMesh.name = 'DirtRoadFirebreak';
    this.group.add(this.roadMesh);
  }

  /**
   * Distance from coordinate (x, z) to dirt road centerline
   */
  public getDistanceToRoad(x: number, z: number): number {
    let minDist = Infinity;
    for (let i = 0; i < this.roadPoints.length - 1; i++) {
      const p1 = this.roadPoints[i];
      const p2 = this.roadPoints[i + 1];

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const lenSq = dx * dx + dz * dz;

      let t = lenSq > 0 ? ((x - p1.x) * dx + (z - p1.z) * dz) / lenSq : 0;
      t = Math.max(0, Math.min(1, t));

      const projX = p1.x + t * dx;
      const projZ = p1.z + t * dz;
      const d = Math.hypot(x - projX, z - projZ);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  /**
   * Multi-fuel classification query evaluating exact ecological properties at (x, z)
   */
  public getFuelTypeAt(x: number, z: number): FuelProperties {
    const elev = this.terrain.getElevationAt(x, z);

    // 1. Water River / Stream Barrier
    if (elev <= 19.5 || this.terrain.isWaterAt(x, z, 3.0)) {
      return {
        type: 'WATER_RIVER',
        name: 'Rio Negro River Corridor',
        isBurnable: false,
        fuelLoadKgM2: 0.0,
        moistureOfExtinction: 100.0,
        baseSpreadMultiplier: 0.0,
        description: 'Open water surface; non-combustible permanent firebreak.',
      };
    }

    // 2. Dirt Road & Timber River Footbridge Firebreak
    const distToBridge = Math.hypot(x - (-235), z - 30);
    if (this.getDistanceToRoad(x, z) <= 6.0 || distToBridge < 14.0) {
      return {
        type: 'DIRT_ROAD',
        name: 'Dirt Access Road & River Bridge',
        isBurnable: false,
        fuelLoadKgM2: 0.0,
        moistureOfExtinction: 0.0,
        baseSpreadMultiplier: 0.0,
        description: 'Compacted mineral soil and wooden timber bridge; non-burnable defensible firebreak.',
      };
    }

    // 3. Developed Rural Settlement Outpost, Cabins & Watchtower Yard
    const distToSettlement = Math.hypot(x - 30, z - 15);
    const distToTower = Math.hypot(x - 90, z - (-100));
    if (distToSettlement < 38.0 || distToTower < 18.0) {
      return {
        type: 'BUILDING_DEVELOPED',
        name: 'Rural Settlement Clearings & Cabins',
        isBurnable: false,
        fuelLoadKgM2: 0.1,
        moistureOfExtinction: 12.0,
        baseSpreadMultiplier: 0.0,
        description: 'Defensible cleared terrace around timber cabins, dwellings, and lookout tower.',
      };
    }

    // 4. Rocky Escarpment & High Ridges
    if (elev > 68.0) {
      return {
        type: 'ROCK_OUTCROP',
        name: 'Granite Ridge & Scree Outcrop',
        isBurnable: true,
        fuelLoadKgM2: 0.45,
        moistureOfExtinction: 15.0,
        baseSpreadMultiplier: 0.40,
        description: 'Exposed granite rock with sparse lichens and stunted shrubs.',
      };
    }

    // 5. Open Grassland & Savanna Clearings (Central Valley)
    const distToClearingCenter = Math.hypot(x - 40, z - 60);
    if (distToClearingCenter < 140.0) {
      return {
        type: 'DRY_GRASSLAND',
        name: 'Open Cured Grassland Clearing',
        isBurnable: true,
        fuelLoadKgM2: 0.75,
        moistureOfExtinction: 18.0,
        baseSpreadMultiplier: 1.85, // Fast-spreading fine fuel!
        description: 'Cured dry grass and light shrubs; highly flammable and sensitive to wind gusts.',
      };
    }

    // 6. Conifer / Mixed Forest (South and Hills)
    if (z > 160) {
      return {
        type: 'CONIFER_FOREST',
        name: 'Mixed Pine & Conifer Forest',
        isBurnable: true,
        fuelLoadKgM2: 1.45,
        moistureOfExtinction: 25.0,
        baseSpreadMultiplier: 1.15,
        description: 'Resinous pine needle litter; moderate to high flame intensity.',
      };
    }

    // 7. Dense Hardwood Forest (East Plateaus)
    return {
      type: 'DENSE_HARDWOOD',
      name: 'Dense Hardwood Rainforest Canopy',
      isBurnable: true,
      fuelLoadKgM2: 1.85,
      moistureOfExtinction: 30.0,
      baseSpreadMultiplier: 0.90,
      description: 'Continuous tropical hardwood canopy with thick moist humus floor.',
    };
  }

  /**
   * Asynchronously loads all 9 binary GLTF models and populates the 3D scene
   */
  private async load3DAssets(): Promise<void> {
    const loader = new GLTFLoader();

    try {
      const [
        hardwoodGltf,
        coniferGltf,
        palmGltf,
        shrubGltf,
        boulderGltf,
        cabinGltf,
        houseGltf,
        towerGltf,
        bridgeGltf,
      ] = await Promise.all([
        loader.loadAsync('/models/tree_hardwood.glb'),
        loader.loadAsync('/models/tree_conifer.glb'),
        loader.loadAsync('/models/tree_palm.glb'),
        loader.loadAsync('/models/shrub_bush.glb'),
        loader.loadAsync('/models/rock_boulder.glb'),
        loader.loadAsync('/models/cabin_station.glb'),
        loader.loadAsync('/models/house_rural.glb'),
        loader.loadAsync('/models/fire_tower.glb'),
        loader.loadAsync('/models/bridge_timber.glb'),
      ]);

      // 1. Place Ranger Station Cabin in the central clearing terrace
      const cabin = cabinGltf.scene;
      cabin.position.set(25, 26.5, -10);
      cabin.scale.set(1.15, 1.15, 1.15);
      cabin.rotation.y = 0.35;
      cabin.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      this.cabinMesh = cabin;
      this.group.add(cabin);

      // 2. Place Rural Settlement Houses in the clearing terrace
      const house1 = houseGltf.scene;
      house1.position.set(45, 26.5, 15);
      house1.scale.set(1.1, 1.1, 1.1);
      house1.rotation.y = -0.25;
      house1.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      this.ruralHouseMeshes.push(house1);
      this.group.add(house1);

      const house2 = houseGltf.scene.clone();
      house2.position.set(15, 26.5, 35);
      house2.scale.set(1.05, 1.05, 1.05);
      house2.rotation.y = 0.45;
      house2.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      this.ruralHouseMeshes.push(house2);
      this.group.add(house2);

      // 3. Place Fire Lookout Tower on the elevated ridge overlooking the settlement
      const tower = towerGltf.scene;
      tower.position.set(90, this.terrain.getElevationAt(90, -100), -100);
      tower.scale.set(1.2, 1.2, 1.2);
      tower.rotation.y = -0.45;
      tower.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      this.watchtowerMesh = tower;
      this.group.add(tower);

      // 4. Place Timber River Footbridge across the river channel
      const bridge = bridgeGltf.scene;
      bridge.position.set(-235, 18.2, 30);
      bridge.scale.set(1.4, 1.2, 1.4);
      bridge.rotation.y = 1.15;
      bridge.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      this.bridgeMesh = bridge;
      this.group.add(bridge);

      // 5. Build Instanced Meshes from parsed GLTF primitives
      this.setupInstancedVegetation(hardwoodGltf, coniferGltf, palmGltf, shrubGltf, boulderGltf);
      this.isAssetsLoaded = true;
    } catch (err) {
      console.warn('[LandscapeEcosystemManager] Asset loading error:', err);
    }
  }

  /**
   * Distributes realistic vegetation instances according to ecological zones
   */
  private setupInstancedVegetation(
    hardwood: any,
    conifer: any,
    palm: any,
    shrub: any,
    boulder: any
  ): void {
    const dummy = new THREE.Object3D();

    // Extract geometries and materials
    const hTrunkMesh = hardwood.scene.children[0] as THREE.Mesh;
    const hCanopyMesh = hardwood.scene.children[1] as THREE.Mesh;
    const cTrunkMesh = conifer.scene.children[0] as THREE.Mesh;
    const cCanopyMesh = conifer.scene.children[1] as THREE.Mesh;
    const pTrunkMesh = palm.scene.children[0] as THREE.Mesh;
    const pFrondMesh = palm.scene.children[1] as THREE.Mesh;
    const sMesh = shrub.scene.children[1] as THREE.Mesh;
    const bMesh = boulder.scene.children[0] as THREE.Mesh;

    const maxHardwood = 340;
    const maxConifer = 250;
    const maxPalms = 180;
    const maxShrubs = 500;
    const maxBoulders = 85;

    this.hardwoodTrunks = new THREE.InstancedMesh(hTrunkMesh.geometry, hTrunkMesh.material, maxHardwood);
    this.hardwoodCanopies = new THREE.InstancedMesh(hCanopyMesh.geometry, hCanopyMesh.material, maxHardwood);
    this.coniferTrunks = new THREE.InstancedMesh(cTrunkMesh.geometry, cTrunkMesh.material, maxConifer);
    this.coniferCanopies = new THREE.InstancedMesh(cCanopyMesh.geometry, cCanopyMesh.material, maxConifer);
    this.palmTrunks = new THREE.InstancedMesh(pTrunkMesh.geometry, pTrunkMesh.material, maxPalms);
    this.palmFronds = new THREE.InstancedMesh(pFrondMesh.geometry, pFrondMesh.material, maxPalms);
    this.shrubInstances = new THREE.InstancedMesh(sMesh.geometry, sMesh.material, maxShrubs);
    this.boulderInstances = new THREE.InstancedMesh(bMesh.geometry, bMesh.material, maxBoulders);

    [
      this.hardwoodTrunks,
      this.hardwoodCanopies,
      this.coniferTrunks,
      this.coniferCanopies,
      this.palmTrunks,
      this.palmFronds,
      this.shrubInstances,
      this.boulderInstances,
    ].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
    });

    let hIdx = 0;
    let cIdx = 0;
    let pIdx = 0;
    let sIdx = 0;
    let bIdx = 0;

    // PRNG for deterministic, natural spacing
    let seed = 4127;
    const prng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const halfW = 600;
    const halfD = 600;

    for (let i = 0; i < 2600; i++) {
      const x = (prng() - 0.5) * halfW * 2;
      const z = (prng() - 0.5) * halfD * 2;
      const elev = this.terrain.getElevationAt(x, z);
      const fuel = this.getFuelTypeAt(x, z);

      if (!fuel.isBurnable && fuel.type === 'WATER_RIVER') continue;
      if (!fuel.isBurnable && fuel.type === 'DIRT_ROAD') continue;
      if (!fuel.isBurnable && fuel.type === 'BUILDING_DEVELOPED' && prng() > 0.12) continue;

      // 1. Granite Boulders along riverbanks and high rocky ridges
      if ((elev < 24.0 || elev > 65.0) && bIdx < maxBoulders && prng() < 0.25) {
        dummy.position.set(x, elev + 0.4, z);
        const s = 0.8 + prng() * 1.4;
        dummy.scale.set(s, s * 0.85, s);
        dummy.rotation.set(prng() * 0.2, prng() * Math.PI * 2, prng() * 0.2);
        dummy.updateMatrix();
        this.boulderInstances.setMatrixAt(bIdx++, dummy.matrix);
        continue;
      }

      // 2. Palms along riverbanks & shallow riparian corridors
      if (elev >= 18.2 && elev <= 25.5 && x > -340 && x < -160 && pIdx < maxPalms && prng() < 0.42) {
        dummy.position.set(x, elev, z);
        const s = 0.85 + prng() * 0.45;
        dummy.scale.set(s, s, s);
        dummy.rotation.set(0, prng() * Math.PI * 2, 0);
        dummy.updateMatrix();
        this.palmTrunks.setMatrixAt(pIdx, dummy.matrix);
        this.palmFronds.setMatrixAt(pIdx, dummy.matrix);
        const pCol = new THREE.Color('#4DA332'); // Bright vibrant palm frond green
        this.palmFronds.setColorAt(pIdx, pCol);

        this.instances.push({
          id: this.instances.length,
          x,
          z,
          elevation: elev,
          scale: s,
          type: 'PALM',
          meshTypeIndex: pIdx,
          instancedIndex: pIdx,
          baseColor: pCol,
          currentState: 'HEALTHY',
        });
        pIdx++;
        continue;
      }

      // 3. Shrubs in clearings, forest margins, and open grassland
      if ((fuel.type === 'DRY_GRASSLAND' || prng() < 0.32) && sIdx < maxShrubs) {
        dummy.position.set(x, elev, z);
        const s = 0.8 + prng() * 0.9;
        dummy.scale.set(s, s, s);
        dummy.rotation.set(0, prng() * Math.PI * 2, 0);
        dummy.updateMatrix();
        this.shrubInstances.setMatrixAt(sIdx, dummy.matrix);
        const sCol = new THREE.Color('#589E3A'); // Bright understory shrub green
        this.shrubInstances.setColorAt(sIdx, sCol);

        this.instances.push({
          id: this.instances.length,
          x,
          z,
          elevation: elev,
          scale: s,
          type: 'SHRUB',
          meshTypeIndex: sIdx,
          instancedIndex: sIdx,
          baseColor: sCol,
          currentState: 'HEALTHY',
        });
        sIdx++;
        continue;
      }

      // 4. Conifers in southern hills
      if (fuel.type === 'CONIFER_FOREST' && cIdx < maxConifer) {
        dummy.position.set(x, elev, z);
        const s = 0.85 + prng() * 0.5;
        dummy.scale.set(s, s, s);
        dummy.rotation.set(0, prng() * Math.PI * 2, 0);
        dummy.updateMatrix();
        this.coniferTrunks.setMatrixAt(cIdx, dummy.matrix);
        this.coniferCanopies.setMatrixAt(cIdx, dummy.matrix);
        const cCol = new THREE.Color('#386C38'); // Fresh pine needle green
        this.coniferCanopies.setColorAt(cIdx, cCol);

        this.instances.push({
          id: this.instances.length,
          x,
          z,
          elevation: elev,
          scale: s,
          type: 'CONIFER',
          meshTypeIndex: cIdx,
          instancedIndex: cIdx,
          baseColor: cCol,
          currentState: 'HEALTHY',
        });
        cIdx++;
        continue;
      }

      // 5. Hardwood Trees in Dense Forest
      if (fuel.type === 'DENSE_HARDWOOD' && hIdx < maxHardwood) {
        dummy.position.set(x, elev, z);
        const s = 0.85 + prng() * 0.65;
        dummy.scale.set(s, s, s);
        dummy.rotation.set(0, prng() * Math.PI * 2, 0);
        dummy.updateMatrix();
        this.hardwoodTrunks.setMatrixAt(hIdx, dummy.matrix);
        this.hardwoodCanopies.setMatrixAt(hIdx, dummy.matrix);
        const hCol = new THREE.Color('#4E8C34'); // Bright sunlit tropical canopy green
        this.hardwoodCanopies.setColorAt(hIdx, hCol);

        this.instances.push({
          id: this.instances.length,
          x,
          z,
          elevation: elev,
          scale: s,
          type: 'HARDWOOD',
          meshTypeIndex: hIdx,
          instancedIndex: hIdx,
          baseColor: hCol,
          currentState: 'HEALTHY',
        });
        hIdx++;
      }
    }

    // Commit matrices and colors
    [
      this.hardwoodTrunks,
      this.hardwoodCanopies,
      this.coniferTrunks,
      this.coniferCanopies,
      this.palmTrunks,
      this.palmFronds,
      this.shrubInstances,
      this.boulderInstances,
    ].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }

  /**
   * Dynamically shifts tree and shrub foliage colors based on Rothermel fire propagation
   */
  public updateWildfireDamage(model: AmazonRothermelModel): void {
    if (!model.isIgnited) {
      this.reset();
      return;
    }

    const cScorched = new THREE.Color('#151413');    // Charcoal black
    const cBurning = new THREE.Color('#E65100');     // Roaring combustion orange
    const cHeatStressed = new THREE.Color('#8D6E18'); // Desiccated foliage

    const ignX = model.ignitionX;
    const ignZ = model.ignitionZ;

    for (const inst of this.instances) {
      const dx = inst.x - ignX;
      const dz = inst.z - ignZ;
      const dist = Math.hypot(dx, dz);

      let treeAngleDeg = (Math.atan2(dx, dz) * 180) / Math.PI;
      if (treeAngleDeg < 0) treeAngleDeg += 360;

      const sectorIdx = Math.floor(treeAngleDeg / 10) % 36;
      const sector = model.sectors[sectorIdx];
      const maxDist = sector ? sector.radiusMeters : 0;

      let targetColor = inst.baseColor;

      if (dist < maxDist * 0.65) {
        inst.currentState = 'SCORCHED';
        targetColor = cScorched;
      } else if (dist <= maxDist + 4.0) {
        inst.currentState = 'BURNING';
        targetColor = cBurning;
      } else if (dist <= maxDist + 30.0) {
        inst.currentState = 'HEAT_STRESSED';
        targetColor = cHeatStressed;
      } else {
        inst.currentState = 'HEALTHY';
        targetColor = inst.baseColor;
      }

      if (inst.type === 'HARDWOOD' && this.hardwoodCanopies) {
        this.hardwoodCanopies.setColorAt(inst.instancedIndex, targetColor);
      } else if (inst.type === 'CONIFER' && this.coniferCanopies) {
        this.coniferCanopies.setColorAt(inst.instancedIndex, targetColor);
      } else if (inst.type === 'PALM' && this.palmFronds) {
        this.palmFronds.setColorAt(inst.instancedIndex, targetColor);
      } else if (inst.type === 'SHRUB' && this.shrubInstances) {
        this.shrubInstances.setColorAt(inst.instancedIndex, targetColor);
      }
    }

    if (this.hardwoodCanopies?.instanceColor) this.hardwoodCanopies.instanceColor.needsUpdate = true;
    if (this.coniferCanopies?.instanceColor) this.coniferCanopies.instanceColor.needsUpdate = true;
    if (this.palmFronds?.instanceColor) this.palmFronds.instanceColor.needsUpdate = true;
    if (this.shrubInstances?.instanceColor) this.shrubInstances.instanceColor.needsUpdate = true;
  }

  /**
   * Resets all vegetation back to 100% pristine healthy unburned state
   */
  public reset(): void {
    for (const inst of this.instances) {
      inst.currentState = 'HEALTHY';
      if (inst.type === 'HARDWOOD' && this.hardwoodCanopies) {
        this.hardwoodCanopies.setColorAt(inst.instancedIndex, inst.baseColor);
      } else if (inst.type === 'CONIFER' && this.coniferCanopies) {
        this.coniferCanopies.setColorAt(inst.instancedIndex, inst.baseColor);
      } else if (inst.type === 'PALM' && this.palmFronds) {
        this.palmFronds.setColorAt(inst.instancedIndex, inst.baseColor);
      } else if (inst.type === 'SHRUB' && this.shrubInstances) {
        this.shrubInstances.setColorAt(inst.instancedIndex, inst.baseColor);
      }
    }

    if (this.hardwoodCanopies?.instanceColor) this.hardwoodCanopies.instanceColor.needsUpdate = true;
    if (this.coniferCanopies?.instanceColor) this.coniferCanopies.instanceColor.needsUpdate = true;
    if (this.palmFronds?.instanceColor) this.palmFronds.instanceColor.needsUpdate = true;
    if (this.shrubInstances?.instanceColor) this.shrubInstances.instanceColor.needsUpdate = true;
  }
}
