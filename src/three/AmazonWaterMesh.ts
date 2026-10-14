/**
 * LAND8FIRE — 3D AMAZON RIVER & HYDROGRAPHY WATER MESH (V5 PHOTOREALISTIC)
 *
 * Implements the dark humic waters of the Amazon River / Rio Negro tributary
 * matching the composition of the reference image (media_1791988319682.jpg):
 *
 * 1. Geographic Alignment:
 *    - Winds naturally on the left side of the valley (X ~ -380 to -180) from Z: -1280 to +1280
 *    - Water elevation anchored at 18.8m a.s.l. within the Copernicus DEM river incision
 *
 * 2. Specular Sky Reflections & Flow Ripples:
 *    - Deep translucent humic tea-green color (#163A2E)
 *    - High specular response catching the morning sunrise glow
 *    - Animated flow currents and normal perturbations
 *
 * 3. Granite Riverbed Boulders & Whitewater Foam Rapids:
 *    - Clustered river rocks breaking through the water surface
 *    - Foaming white riffles with pulsating whitewater foam where water crashes past boulders
 */

import * as THREE from 'three';
import { AmazonTerrainEngine } from './AmazonTerrainMesh';

export class AmazonWaterEngine {
  public waterGroup: THREE.Group;
  public waterMaterial: THREE.MeshStandardMaterial;
  private rockInstancedMesh: THREE.InstancedMesh;
  private rapidsMesh: THREE.InstancedMesh;
  private timeUniform: number = 0;
  private waterNormalTex!: THREE.CanvasTexture;
  private foamTex!: THREE.CanvasTexture;

  constructor(terrain: AmazonTerrainEngine) {
    this.waterGroup = new THREE.Group();
    this.waterGroup.name = 'AmazonRiverSystem';

    this.createTextures();

    // 1. River surface ribbon aligned with DEM riverbed on the left
    const { waterMesh, material } = this.buildRiverSurface(terrain);
    this.waterMaterial = material;
    this.waterGroup.add(waterMesh);

    // 2. Whitewater foam rapids patches around rocks
    this.rapidsMesh = this.buildRapids(terrain);
    this.waterGroup.add(this.rapidsMesh);

    // 3. Granite riverbed boulders
    this.rockInstancedMesh = this.buildRiverRocks(terrain);
    this.waterGroup.add(this.rockInstancedMesh);
  }

  private createTextures(): void {
    // Normal map for river flow ripples
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#8080FF';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 12 + Math.random() * 30;
      const nx = Math.floor(128 + (Math.random() - 0.5) * 65);
      const ny = Math.floor(128 + (Math.random() - 0.5) * 65);
      ctx.fillStyle = `rgb(${nx}, ${ny}, 255)`;
      ctx.beginPath();
      ctx.ellipse(x, y, len, 3.2, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    this.waterNormalTex = new THREE.CanvasTexture(canvas);
    this.waterNormalTex.wrapS = THREE.RepeatWrapping;
    this.waterNormalTex.wrapT = THREE.RepeatWrapping;
    this.waterNormalTex.repeat.set(4, 18);

    // Whitewater foam texture with organic bubbly noise
    const fCanvas = document.createElement('canvas');
    fCanvas.width = 128;
    fCanvas.height = 128;
    const fCtx = fCanvas.getContext('2d')!;
    fCtx.clearRect(0, 0, 128, 128);

    // Multi-blob turbulent foam cluster
    for (let i = 0; i < 40; i++) {
      const bx = 64 + (Math.random() - 0.5) * 60;
      const by = 64 + (Math.random() - 0.5) * 60;
      const br = 6 + Math.random() * 18;
      const grad = fCtx.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.92)');
      grad.addColorStop(0.4, 'rgba(240, 250, 245, 0.65)');
      grad.addColorStop(0.8, 'rgba(210, 235, 225, 0.20)');
      grad.addColorStop(1.0, 'rgba(200, 230, 220, 0.0)');
      fCtx.fillStyle = grad;
      fCtx.beginPath();
      fCtx.arc(bx, by, br, 0, Math.PI * 2);
      fCtx.fill();
    }

    this.foamTex = new THREE.CanvasTexture(fCanvas);
  }

  /**
   * Evaluates the river centerline X coordinate as a function of world Z
   * Keeps the river smoothly winding on the LEFT side of the valley
   */
  public static getRiverCenterX(z: number, terrainWidth: number): number {
    const halfD = 1280;
    const nz = z / halfD; // -1 to +1
    // Curves from -380 in distance to -220 in midground to -280 in foreground
    const normalizedX = -0.22 + Math.sin(nz * 2.4 + 0.4) * 0.11 + Math.cos(nz * 4.8) * 0.04;
    return normalizedX * (terrainWidth / 2);
  }

  private buildRiverSurface(terrain: AmazonTerrainEngine): {
    waterMesh: THREE.Mesh;
    material: THREE.MeshStandardMaterial;
  } {
    const segments = 128;
    const halfDepth = terrain.depth / 2;
    const waterElevation = 18.2; // Sits comfortably above the 14.2m-16.8m carved riverbed

    const curvePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const z = -halfDepth + t * terrain.depth;
      const x = AmazonWaterEngine.getRiverCenterX(z, terrain.width);
      curvePoints.push(new THREE.Vector3(x, waterElevation, z));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const riverGeometry = new THREE.PlaneGeometry(160, terrain.depth, 24, 128);
    riverGeometry.rotateX(-Math.PI / 2);

    const pos = riverGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const rawZ = pos.getZ(i);
      const t = (rawZ + halfDepth) / terrain.depth;
      const pt = curve.getPoint(Math.max(0, Math.min(1, t)));
      const rawX = pos.getX(i);
      pos.setX(i, pt.x + rawX * 0.95);
      pos.setY(i, waterElevation + Math.sin(rawZ * 0.08) * 0.06);
    }
    riverGeometry.computeVertexNormals();

    // Vibrant tropical blue-green turquoise river shader with sky reflections & specular glint
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#148F9B'),      // Vibrant tropical blue-green turquoise
      roughness: 0.08,
      metalness: 0.12,                        // Enhanced specular reflection of daylight and sky
      normalMap: this.waterNormalTex,
      normalScale: new THREE.Vector2(0.40, 0.40),
      transparent: true,
      opacity: 0.92,
      depthWrite: true,
      side: THREE.DoubleSide,
    });

    // Custom shader hook: inject vibrant sunlight specular glint and turquoise water depth
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        // LAND8FIRE: Tropical sunlight specular reflection and water highlights
        vec3 vD = normalize(vViewPosition);
        vec3 wN = normalize(vNormal);
        float spec = pow(max(0.0, dot(reflect(-vec3(-0.6, 0.7, -0.4), wN), vD)), 24.0);
        gl_FragColor.rgb += vec3(0.35, 0.55, 0.58) * spec * 0.90;
        `
      );
    };

    const waterMesh = new THREE.Mesh(riverGeometry, material);
    waterMesh.receiveShadow = true;
    waterMesh.renderOrder = 1;
    return { waterMesh, material };
  }

  /**
   * Whitewater foam rapids patches around riverbed rocks matching reference
   */
  private buildRapids(terrain: AmazonTerrainEngine): THREE.InstancedMesh {
    const rapidsCount = 55;
    const foamGeom = new THREE.PlaneGeometry(24, 18);
    foamGeom.rotateX(-Math.PI / 2);

    const foamMat = new THREE.MeshBasicMaterial({
      map: this.foamTex,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    const instMesh = new THREE.InstancedMesh(foamGeom, foamMat, rapidsCount);
    const dummy = new THREE.Object3D();
    const halfDepth = terrain.depth / 2;

    let seed = 7412;
    const prng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < rapidsCount; i++) {
      const z = -halfDepth * 0.65 + prng() * terrain.depth * 0.85;
      const riverCenterX = AmazonWaterEngine.getRiverCenterX(z, terrain.width);
      const x = riverCenterX + (prng() - 0.5) * 45;

      dummy.position.set(x, 18.35, z);
      const s = 0.9 + prng() * 1.5;
      dummy.scale.set(s, 1, s * 1.4);
      dummy.rotation.set(0, (prng() - 0.5) * 0.5, 0);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }

    instMesh.instanceMatrix.needsUpdate = true;
    return instMesh;
  }

  /**
   * Granite riverbed boulders clustered along the river corridor
   */
  private buildRiverRocks(terrain: AmazonTerrainEngine): THREE.InstancedMesh {
    const rockCount = 95;
    const rockGeom = new THREE.DodecahedronGeometry(1.0, 1);
    rockGeom.scale(1.4, 0.85, 1.2);
    rockGeom.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      color: '#4A4642', // Wet riverbed granite
      roughness: 0.75,
      metalness: 0.15,
      flatShading: false,
    });

    const instMesh = new THREE.InstancedMesh(rockGeom, rockMat, rockCount);
    instMesh.castShadow = true;
    instMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const halfDepth = terrain.depth / 2;

    let seed = 9183;
    const prng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < rockCount; i++) {
      const z = -halfDepth * 0.65 + prng() * terrain.depth * 0.85;
      const riverCenterX = AmazonWaterEngine.getRiverCenterX(z, terrain.width);
      const x = riverCenterX + (prng() - 0.5) * 55;

      const scale = 3.5 + prng() * 6.5;
      dummy.position.set(x, 18.2 + (prng() * 2.2), z);
      dummy.scale.set(scale, scale * 0.7, scale * 1.1);
      dummy.rotation.set(prng() * 0.3, prng() * Math.PI, prng() * 0.2);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }

    instMesh.instanceMatrix.needsUpdate = true;
    return instMesh;
  }

  /**
   * Animates river ripple flow coordinates and pulsating rapids foam
   */
  public update(deltaSeconds: number): void {
    this.timeUniform += deltaSeconds;

    // Flow water normal texture along channel
    if (this.waterNormalTex) {
      this.waterNormalTex.offset.y = (this.timeUniform * 0.08) % 1.0;
      this.waterNormalTex.offset.x = (Math.sin(this.timeUniform * 0.2) * 0.02) % 1.0;
    }
  }
}
