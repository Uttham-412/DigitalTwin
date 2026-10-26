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
  // Developed Structures & Road
  public cabinMesh?: THREE.Group;
  public watchtowerMesh?: THREE.Group;
  public bridgeMesh?: THREE.Group;
  public urbanGroup?: THREE.Group;
  public ruralHouseMeshes: THREE.Group[] = [];
  public roadMesh?: THREE.Mesh;

  // Tree instance tracker
  public instances: LandscapeTreeInstance[] = [];

  // Road Curve Definition (Winding from valley entry across bridge to urban center and watchtower)
  public roadPoints: THREE.Vector3[] = [];

  public isAssetsLoaded: boolean = false;

  constructor(terrain: AmazonTerrainEngine) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.group.name = 'LandscapeEcosystem';

    this.initRoadPath();
    this.buildRoadMesh();
    this.buildBridgeMesh();
    this.buildUrbanRegion();
    this.load3DAssets();
  }

  /**
   * Initializes highway and access road coordinates running from the west,
   * crossing the full-span bridge, and serving the urban settlement district.
   */
  private initRoadPath(): void {
    const pts = [
      new THREE.Vector3(-460, 0, 50),
      new THREE.Vector3(-350, 0, 42),
      new THREE.Vector3(-275, 0, 30),   // Western bridge abutment
      new THREE.Vector3(-197.5, 0, 30), // Mid-span above river channel
      new THREE.Vector3(-120, 0, 30),   // Eastern bridge abutment
      new THREE.Vector3(-50, 0, 24),    // Urban approach ramp
      new THREE.Vector3(20, 0, 10),     // Town square entrance
      new THREE.Vector3(65, 0, -10),    // Central avenue
      new THREE.Vector3(95, 0, -95),    // Access track ascending to lookout tower
    ];

    for (const p of pts) {
      if (p.x >= -275 && p.x <= -120) {
        // Continuous level deck across the river
        p.y = 20.85;
      } else {
        p.y = this.terrain.getElevationAt(p.x, p.z) + 0.35;
      }
      this.roadPoints.push(p);
    }
  }

  /**
   * Builds the 3D road ribbon following the terrain and bridge deck
   */
  private buildRoadMesh(): void {
    if (this.roadPoints.length < 2) return;

    const curve = new THREE.CatmullRomCurve3(this.roadPoints);
    const numPoints = 120;
    const curvePoints = curve.getPoints(numPoints);
    const roadWidth = 9.5;

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

      if (pt.x >= -275 && pt.x <= -120) {
        leftPt.y = 20.88;
        rightPt.y = 20.88;
      } else {
        leftPt.y = this.terrain.getElevationAt(leftPt.x, leftPt.z) + 0.35;
        rightPt.y = this.terrain.getElevationAt(rightPt.x, rightPt.z) + 0.35;
      }

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

    // Weathered asphalt/packed gravel road material
    const roadMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#524941'),
      roughness: 0.92,
      metalness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    this.roadMesh = new THREE.Mesh(geom, roadMat);
    this.roadMesh.receiveShadow = true;
    this.roadMesh.name = 'AccessRoadFirebreak';
    this.group.add(this.roadMesh);
  }

  /**
   * Constructs a realistic full-span river bridge spanning from the west bank (-275m)
   * to the east bank (-120m) across the entire 130m wide river channel.
   */
  private buildBridgeMesh(): void {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.name = 'FullSpanRiverBridge';

    const spanLength = 155.0; // Spans from X: -275 to -120
    const bridgeWidth = 10.5;  // Z: 24.75 to 35.25
    const deckY = 20.8;
    const centerX = -197.5;
    const centerZ = 30.0;

    // Materials
    const asphaltMat = new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.85, metalness: 0.08 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: '#9CA3AF', roughness: 0.88, metalness: 0.05 });
    const steelMat = new THREE.MeshStandardMaterial({ color: '#4B5563', roughness: 0.65, metalness: 0.35 });
    const yellowStripeMat = new THREE.MeshBasicMaterial({ color: '#FACC15' });
    const lampMat = new THREE.MeshBasicMaterial({ color: '#FEF08A' });

    // 1. Solid Bridge Road Deck
    const deckGeom = new THREE.BoxGeometry(spanLength, 0.55, bridgeWidth);
    const deck = new THREE.Mesh(deckGeom, asphaltMat);
    deck.position.set(centerX, deckY, centerZ);
    deck.receiveShadow = true;
    deck.castShadow = true;
    bridgeGroup.add(deck);

    // Yellow Center Divider Line
    const stripeGeom = new THREE.PlaneGeometry(spanLength - 4.0, 0.28);
    stripeGeom.rotateX(-Math.PI / 2);
    const stripe = new THREE.Mesh(stripeGeom, yellowStripeMat);
    stripe.position.set(centerX, deckY + 0.29, centerZ);
    bridgeGroup.add(stripe);

    // Sidewalk Curbs (Left & Right)
    const curbGeom = new THREE.BoxGeometry(spanLength, 0.35, 0.8);
    const leftCurb = new THREE.Mesh(curbGeom, concreteMat);
    leftCurb.position.set(centerX, deckY + 0.3, centerZ - bridgeWidth / 2 + 0.4);
    bridgeGroup.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeom, concreteMat);
    rightCurb.position.set(centerX, deckY + 0.3, centerZ + bridgeWidth / 2 - 0.4);
    bridgeGroup.add(rightCurb);

    // 2. Concrete Abutments on Both Riverbanks
    const abutmentGeom = new THREE.BoxGeometry(14.0, 6.5, bridgeWidth + 2.0);
    const westAbutment = new THREE.Mesh(abutmentGeom, concreteMat);
    westAbutment.position.set(-275, deckY - 2.8, centerZ);
    westAbutment.castShadow = true;
    westAbutment.receiveShadow = true;
    bridgeGroup.add(westAbutment);

    const eastAbutment = new THREE.Mesh(abutmentGeom, concreteMat);
    eastAbutment.position.set(-120, deckY - 2.8, centerZ);
    eastAbutment.castShadow = true;
    eastAbutment.receiveShadow = true;
    bridgeGroup.add(eastAbutment);

    // 3. Four Heavy Reinforced Concrete Support Piers Standing in Riverbed
    const pierXCoords = [-240, -200, -165, -135];
    const pierGeom = new THREE.BoxGeometry(4.8, 7.8, bridgeWidth - 0.5);
    for (const px of pierXCoords) {
      const pier = new THREE.Mesh(pierGeom, concreteMat);
      pier.position.set(px, deckY - 3.8, centerZ);
      pier.castShadow = true;
      pier.receiveShadow = true;
      bridgeGroup.add(pier);

      // Hydrodynamic Cutwater Nose (upstream/downstream triangular wedge)
      const noseGeom = new THREE.CylinderGeometry(0.1, 2.4, 7.8, 3);
      const nose = new THREE.Mesh(noseGeom, concreteMat);
      nose.position.set(px, deckY - 3.8, centerZ - bridgeWidth / 2);
      nose.rotation.y = Math.PI;
      bridgeGroup.add(nose);
    }

    // 4. Steel Safety Guardrails with Horizontal Rails & Vertical Pickets
    for (const sideZ of [centerZ - bridgeWidth / 2 + 0.1, centerZ + bridgeWidth / 2 - 0.1]) {
      // Top Handrail
      const railGeom = new THREE.BoxGeometry(spanLength, 0.15, 0.15);
      const topRail = new THREE.Mesh(railGeom, steelMat);
      topRail.position.set(centerX, deckY + 1.25, sideZ);
      bridgeGroup.add(topRail);

      // Mid Rail
      const midRail = new THREE.Mesh(railGeom, steelMat);
      midRail.position.set(centerX, deckY + 0.75, sideZ);
      bridgeGroup.add(midRail);

      // Vertical Posts Spaced Every 7.5m
      const postGeom = new THREE.BoxGeometry(0.2, 1.25, 0.2);
      for (let x = -272; x <= -122; x += 7.5) {
        const post = new THREE.Mesh(postGeom, steelMat);
        post.position.set(x, deckY + 0.65, sideZ);
        bridgeGroup.add(post);
      }
    }

    // 5. Eight Bridge Lampposts Spaced Along Span
    for (let x = -260; x <= -130; x += 38) {
      for (const lz of [centerZ - bridgeWidth / 2 + 0.35, centerZ + bridgeWidth / 2 - 0.35]) {
        const poleGeom = new THREE.CylinderGeometry(0.08, 0.12, 3.4, 6);
        const pole = new THREE.Mesh(poleGeom, steelMat);
        pole.position.set(x, deckY + 1.7, lz);
        bridgeGroup.add(pole);

        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), lampMat);
        lantern.position.set(x, deckY + 3.4, lz);
        bridgeGroup.add(lantern);
      }
    }

    this.bridgeMesh = bridgeGroup;
    this.group.add(bridgeGroup);
  }

  /**
   * Constructs an attractive, cohesive urban settlement district on the east terrace:
   * 1. Administrative Town Hall & Civic Headquarters with columned portico, clock tower, and terracotta roof.
   * 2. Paved central town square plaza with stone fountain and perimeter benches.
   * 3. 8 distinct residential houses with foundations, verandas, gabled roofs, and stone chimneys.
   * 4. Logistics warehouse and technical maintenance depot.
   * 5. Elevated 4-legged fire observation watchtower on the ridge.
   * 6. Paved avenue grid and warm streetlights.
   */
  private buildUrbanRegion(): void {
    const urbanGroup = new THREE.Group();
    urbanGroup.name = 'UrbanSettlementDistrict';

    const terraceElev = 26.5;

    // Materials
    const plazaMat = new THREE.MeshStandardMaterial({ color: '#9CA3AF', roughness: 0.88, metalness: 0.05 });
    const stoneWallMat = new THREE.MeshStandardMaterial({ color: '#57534E', roughness: 0.90 });
    const asphaltMat = new THREE.MeshStandardMaterial({ color: '#4B5563', roughness: 0.85 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: '#FEF08A' });
    const waterBasinMat = new THREE.MeshStandardMaterial({ color: '#0E7490', roughness: 0.1, metalness: 0.2 });

    // Paved settlement roads connecting bridge approach to town center and neighborhoods
    const townAvenue = new THREE.Mesh(new THREE.PlaneGeometry(160, 9.5), asphaltMat);
    townAvenue.rotateX(-Math.PI / 2);
    townAvenue.position.set(20, terraceElev + 0.05, 8);
    townAvenue.receiveShadow = true;
    urbanGroup.add(townAvenue);

    const crossStreet = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 95), asphaltMat);
    crossStreet.rotateX(-Math.PI / 2);
    crossStreet.position.set(35, terraceElev + 0.055, 0);
    crossStreet.receiveShadow = true;
    urbanGroup.add(crossStreet);

    // 1. Central Town Square Plaza
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(38, 28), plazaMat);
    plaza.rotateX(-Math.PI / 2);
    plaza.position.set(35, terraceElev + 0.06, 8);
    plaza.receiveShadow = true;
    urbanGroup.add(plaza);

    // Civic Fountain Basin in Town Square Center
    const fountainBasin = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.0, 0.9, 12), stoneWallMat);
    fountainBasin.position.set(35, terraceElev + 0.45, 8);
    urbanGroup.add(fountainBasin);

    const fountainWater = new THREE.Mesh(new THREE.CircleGeometry(3.2, 12), waterBasinMat);
    fountainWater.rotateX(-Math.PI / 2);
    fountainWater.position.set(35, terraceElev + 0.85, 8);
    urbanGroup.add(fountainWater);

    const fountainSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 2.4, 8), stoneWallMat);
    fountainSpire.position.set(35, terraceElev + 1.8, 8);
    urbanGroup.add(fountainSpire);

    // 2. Municipal Town Hall / Administrative Headquarters (Centerpiece)
    const townHall = new THREE.Group();
    townHall.position.set(35, terraceElev, -10);

    // Stone Plinth Foundation
    const thPlinth = new THREE.Mesh(new THREE.BoxGeometry(24, 0.9, 16), stoneWallMat);
    thPlinth.position.y = 0.45;
    thPlinth.castShadow = true;
    thPlinth.receiveShadow = true;
    townHall.add(thPlinth);

    // Main 2-Story Building Body (Warm Stucco)
    const thBody = new THREE.Mesh(
      new THREE.BoxGeometry(22, 7.8, 14.5),
      new THREE.MeshStandardMaterial({ color: '#EDE8DE', roughness: 0.82 })
    );
    thBody.position.y = 0.9 + 3.9;
    thBody.castShadow = true;
    thBody.receiveShadow = true;
    townHall.add(thBody);

    // Classical Entrance Portico (4 Square Columns)
    const colMat = new THREE.MeshStandardMaterial({ color: '#F5F5F4', roughness: 0.75 });
    for (const cx of [-4.5, -1.5, 1.5, 4.5]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.2, 0.8), colMat);
      col.position.set(cx, 0.9 + 2.6, 7.8);
      col.castShadow = true;
      townHall.add(col);
    }
    const pediment = new THREE.Mesh(new THREE.BoxGeometry(11.5, 1.2, 2.6), colMat);
    pediment.position.set(0, 0.9 + 5.6, 7.8);
    townHall.add(pediment);

    // Double Grand Entrance Doors
    const thDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 3.4, 0.25),
      new THREE.MeshStandardMaterial({ color: '#27170E', roughness: 0.65 })
    );
    thDoor.position.set(0, 0.9 + 1.7, 7.3);
    townHall.add(thDoor);

    // Framed Windows (Row 1 & Row 2)
    const glassMat = new THREE.MeshStandardMaterial({ color: '#93C5FD', roughness: 0.2, metalness: 0.85 });
    for (const wy of [2.8, 6.2]) {
      for (const wx of [-8.0, -4.5, 4.5, 8.0]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.2), glassMat);
        win.position.set(wx, 0.9 + wy, 7.35);
        townHall.add(win);
      }
    }

    // Terracotta Hipped Roof with Overhangs
    const thRoof = new THREE.Mesh(
      new THREE.ConeGeometry(17.5, 4.2, 4),
      new THREE.MeshStandardMaterial({ color: '#C2410C', roughness: 0.72 })
    );
    thRoof.rotateY(Math.PI / 4);
    thRoof.scale.set(1.0, 1.0, 14.5 / 22.0);
    thRoof.position.y = 0.9 + 7.8 + 2.1;
    thRoof.castShadow = true;
    townHall.add(thRoof);

    // Rooftop Clock Tower & Spire
    const clockTower = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.5, 3.6), colMat);
    clockTower.position.set(0, 0.9 + 7.8 + 4.2 + 2.25, 0);
    townHall.add(clockTower);

    const clockFace = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }));
    clockFace.position.set(0, 0.9 + 7.8 + 4.2 + 2.25, 1.85);
    townHall.add(clockFace);

    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 3.2, 4),
      new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.6 })
    );
    spire.rotateY(Math.PI / 4);
    spire.position.set(0, 0.9 + 7.8 + 4.2 + 4.5 + 1.6, 0);
    townHall.add(spire);

    urbanGroup.add(townHall);

    // 3. Eight Modular Residential Houses
    const houseConfigs = [
      { x: 10, z: -38, w: 9.5, d: 8.0, h: 5.5, wall: '#E2E8F0', roof: '#B45309', rot: 0.12 },
      { x: 42, z: -44, w: 10.5, d: 8.5, h: 6.0, wall: '#FEF3C7', roof: '#334155', rot: -0.08 },
      { x: 74, z: -40, w: 9.0, d: 7.5, h: 5.2, wall: '#F1F5F9', roof: '#78350F', rot: 0.20 },
      { x: 108, z: -34, w: 10.0, d: 8.0, h: 5.8, wall: '#EDE9FE', roof: '#1E3A2F', rot: -0.15 },
      { x: 10, z: 42, w: 10.0, d: 8.2, h: 5.6, wall: '#FEE2E2', roof: '#C2410C', rot: -0.10 },
      { x: 42, z: 48, w: 9.2, d: 8.5, h: 5.4, wall: '#E0F2FE', roof: '#1F2937', rot: 0.05 },
      { x: 74, z: 44, w: 9.0, d: 8.0, h: 5.5, wall: '#ECFDF5', roof: '#B45309', rot: -0.12 },
      { x: 108, z: 40, w: 11.5, d: 9.0, h: 6.8, wall: '#FFFBEB', roof: '#EA580C', rot: 0.18 },
    ];

    houseConfigs.forEach((hc) => {
      const house = this.createBuilding(
        hc.x,
        hc.z,
        terraceElev,
        hc.w,
        hc.d,
        hc.h,
        hc.wall,
        hc.roof,
        hc.rot,
        true,
        hc.z > 0 ? 'NORTH' : 'SOUTH'
      );
      this.ruralHouseMeshes.push(house);
      urbanGroup.add(house);
    });

    // 4. Logistics Warehouse & Supply Depot
    const warehouse = new THREE.Group();
    warehouse.position.set(78, terraceElev, 14);

    const whPlinth = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, 15), stoneWallMat);
    whPlinth.position.y = 0.3;
    warehouse.add(whPlinth);

    const whBody = new THREE.Mesh(
      new THREE.BoxGeometry(24, 6.8, 14),
      new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.88 })
    );
    whBody.position.y = 0.6 + 3.4;
    whBody.castShadow = true;
    warehouse.add(whBody);

    // Pitched Corrugated Metal Roof
    const whRoof = new THREE.Mesh(
      new THREE.ConeGeometry(17.5, 3.2, 4),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.65, metalness: 0.4 })
    );
    whRoof.rotateY(Math.PI / 4);
    whRoof.scale.set(1.0, 1.0, 14.0 / 24.0);
    whRoof.position.y = 0.6 + 6.8 + 1.6;
    warehouse.add(whRoof);

    // Roll-up Shutter Loading Door
    const shutter = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 4.2, 0.2),
      new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.5, metalness: 0.5 })
    );
    shutter.position.set(-6.0, 0.6 + 2.1, 7.1);
    warehouse.add(shutter);

    // Wooden Cargo Pallets Outside Warehouse
    for (let i = 0; i < 4; i++) {
      const pallet = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.4, 2.4),
        new THREE.MeshStandardMaterial({ color: '#854D0E', roughness: 0.85 })
      );
      pallet.position.set(3.0 + i * 2.8, 0.6 + 0.7, 8.8);
      warehouse.add(pallet);
    }

    urbanGroup.add(warehouse);

    // 5. Technical Service Workshop
    const workshop = this.createBuilding(10, 14, terraceElev, 13.5, 9.0, 5.0, '#CBD5E1', '#475569', 0, false);
    urbanGroup.add(workshop);

    // 6. Observation Lookout Watchtower on Elevated Ridge
    const towerElev = this.terrain.getElevationAt(95, -95);
    const towerGroup = new THREE.Group();
    towerGroup.position.set(95, towerElev, -95);

    const legMat = new THREE.MeshStandardMaterial({ color: '#4B5563', roughness: 0.7, metalness: 0.4 });
    const cabMat = new THREE.MeshStandardMaterial({ color: '#FEF3C7', roughness: 0.8 });

    // 4 Structural Columns
    for (const lx of [-2.4, 2.4]) {
      for (const lz of [-2.4, 2.4]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 20.0, 6), legMat);
        leg.position.set(lx, 10.0, lz);
        leg.castShadow = true;
        towerGroup.add(leg);
      }
    }

    // Cross-Girders (3 levels)
    for (const gy of [5.0, 10.0, 15.0]) {
      const ring = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.25, 5.0), legMat);
      ring.position.y = gy;
      towerGroup.add(ring);
    }

    // Top Observation Platform & Enclosed Cabin
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.4, 6.2), legMat);
    platform.position.y = 20.2;
    towerGroup.add(platform);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 4.8), cabMat);
    cab.position.y = 20.4 + 1.6;
    cab.castShadow = true;
    towerGroup.add(cab);

    // Panoramic Catwalk Glass Windows
    const towerGlass = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.4, 5.0), glassMat);
    towerGlass.position.y = 20.4 + 1.8;
    towerGroup.add(towerGlass);

    // Pyramid Cabin Roof & Mast
    const towerRoof = new THREE.Mesh(
      new THREE.ConeGeometry(4.4, 2.2, 4),
      new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.65 })
    );
    towerRoof.rotateY(Math.PI / 4);
    towerRoof.position.y = 20.4 + 3.2 + 1.1;
    towerGroup.add(towerRoof);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.5, 6), legMat);
    mast.position.y = 20.4 + 3.2 + 2.2 + 2.25;
    towerGroup.add(mast);

    this.watchtowerMesh = towerGroup;
    urbanGroup.add(towerGroup);

    // 7. Urban Streetlamps
    const lampCoords = [
      { x: 18, z: 8 }, { x: 52, z: 8 }, { x: 18, z: -20 }, { x: 52, z: -20 },
      { x: 88, z: -18 }, { x: 88, z: 12 }, { x: -10, z: 20 }, { x: -35, z: 24 }
    ];
    lampCoords.forEach((lp) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 4.2, 6), legMat);
      post.position.set(lp.x, terraceElev + 2.1, lp.z);
      urbanGroup.add(post);

      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), lampGlowMat);
      globe.position.set(lp.x, terraceElev + 4.3, lp.z);
      urbanGroup.add(globe);
    });

    this.urbanGroup = urbanGroup;
    this.group.add(urbanGroup);
  }

  /**
   * Helper: Generates a modular residential house with stone foundation,
   * gabled roof, door, reflective windows, chimney, and covered porch.
   */
  private createBuilding(
    x: number,
    z: number,
    baseElev: number,
    w: number,
    d: number,
    h: number,
    wallColor: string,
    roofColor: string,
    rotY: number = 0,
    hasPorch: boolean = true,
    porchSide: 'NORTH' | 'SOUTH' = 'SOUTH'
  ): THREE.Group {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, baseElev, z);
    bGroup.rotation.y = rotY;

    // Plinth Foundation
    const plinthMat = new THREE.MeshStandardMaterial({ color: '#57534E', roughness: 0.90 });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), plinthMat);
    plinth.position.y = 0.3;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    bGroup.add(plinth);

    // Main House Body
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.82 });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    walls.position.y = 0.6 + h / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    bGroup.add(walls);

    // Gabled Roof
    const roofH = h * 0.48;
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.72 });
    const roofGeom = new THREE.ConeGeometry((w + 1.4) * 0.72, roofH, 4);
    roofGeom.rotateY(Math.PI / 4);
    roofGeom.scale(1.0, 1.0, (d + 1.4) / (w + 1.4));
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = 0.6 + h + roofH / 2;
    roof.castShadow = true;
    roof.receiveShadow = true;
    bGroup.add(roof);

    // Door
    const doorMat = new THREE.MeshStandardMaterial({ color: '#3E2723', roughness: 0.68 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.5, 0.2), doorMat);
    const doorZ = porchSide === 'SOUTH' ? d / 2 + 0.05 : -d / 2 - 0.05;
    door.position.set(0, 0.6 + 1.25, doorZ);
    bGroup.add(door);

    // Windows
    const winMat = new THREE.MeshStandardMaterial({ color: '#93C5FD', roughness: 0.2, metalness: 0.82 });
    const winL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.15), winMat);
    winL.position.set(-w / 3.2, 0.6 + h * 0.55, doorZ);
    bGroup.add(winL);

    const winR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.15), winMat);
    winR.position.set(w / 3.2, 0.6 + h * 0.55, doorZ);
    bGroup.add(winR);

    // Stone Chimney
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, roofH + 1.6, 1.2),
      new THREE.MeshStandardMaterial({ color: '#57534E', roughness: 0.92 })
    );
    chimney.position.set(w * 0.28, 0.6 + h + roofH * 0.6, 0);
    chimney.castShadow = true;
    bGroup.add(chimney);

    // Covered Porch
    if (hasPorch) {
      const pDepth = 2.4;
      const pZ = porchSide === 'SOUTH' ? d / 2 + pDepth / 2 : -d / 2 - pDepth / 2;
      const pFloor = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.25, pDepth), plinthMat);
      pFloor.position.set(0, 0.125, pZ);
      bGroup.add(pFloor);

      const postMat = new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.8 });
      const pPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 0.2), postMat);
      pPost1.position.set(-w * 0.38, 1.25, porchSide === 'SOUTH' ? d / 2 + pDepth - 0.2 : -d / 2 - pDepth + 0.2);
      bGroup.add(pPost1);

      const pPost2 = pPost1.clone();
      pPost2.position.x = w * 0.38;
      bGroup.add(pPost2);

      const pRoof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.22, pDepth + 0.4), roofMat);
      pRoof.position.set(0, 2.6, pZ);
      pRoof.castShadow = true;
      bGroup.add(pRoof);
    }

    return bGroup;
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

    // 2. Full-Span River Bridge & Road Network Firebreak
    const isBridgeSpan = x >= -285 && x <= -110 && Math.abs(z - 30) <= 8.0;
    if (this.getDistanceToRoad(x, z) <= 6.5 || isBridgeSpan) {
      return {
        type: 'DIRT_ROAD',
        name: 'Highway Road & Full-Span River Bridge',
        isBurnable: false,
        fuelLoadKgM2: 0.0,
        moistureOfExtinction: 0.0,
        baseSpreadMultiplier: 0.0,
        description: 'Compacted road network and reinforced concrete/timber bridge; permanent firebreak.',
      };
    }

    // 3. Urban Settlement & Infrastructure District
    const isUrbanDistrict = x >= -20 && x <= 155 && z >= -115 && z <= 90;
    if (isUrbanDistrict) {
      return {
        type: 'BUILDING_DEVELOPED',
        name: 'Urban Settlement & Infrastructure District',
        isBurnable: false,
        fuelLoadKgM2: 0.0,
        moistureOfExtinction: 10.0,
        baseSpreadMultiplier: 0.0,
        description: 'Civic town hall, residential dwellings, paved plaza, depot, and defensible urban buffers.',
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

    // 5. Open Grassland & Savanna Clearings
    const distToClearingCenter = Math.hypot(x - 40, z - 130);
    if (distToClearingCenter < 120.0) {
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
   * Asynchronously loads vegetation models (hardwood, conifer, palm, shrub, boulder)
   * and populates natural ecological forest zones.
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
      ] = await Promise.all([
        loader.loadAsync('/models/tree_hardwood.glb'),
        loader.loadAsync('/models/tree_conifer.glb'),
        loader.loadAsync('/models/tree_palm.glb'),
        loader.loadAsync('/models/shrub_bush.glb'),
        loader.loadAsync('/models/rock_boulder.glb'),
      ]);

      // Build Instanced Meshes from parsed GLTF primitives
      this.setupInstancedVegetation(hardwoodGltf, coniferGltf, palmGltf, shrubGltf, boulderGltf);
      this.isAssetsLoaded = true;
    } catch (err) {
      console.warn('[LandscapeEcosystemManager] Vegetation asset loading:', err);
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
