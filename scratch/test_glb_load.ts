import * as fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

async function testLoad() {
  const loader = new GLTFLoader();
  const models = ['cabin_station.glb', 'house_rural.glb', 'fire_tower.glb', 'bridge_timber.glb', 'tree_hardwood.glb'];

  for (const model of models) {
    try {
      const buf = fs.readFileSync(`public/models/${model}`);
      const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      await new Promise((resolve, reject) => {
        loader.parse(
          arrayBuf,
          '',
          (gltf) => {
            console.log(`[SUCCESS] ${model}: children = ${gltf.scene.children.length}`);
            gltf.scene.traverse((c) => {
              if ((c as THREE.Mesh).isMesh) {
                const mesh = c as THREE.Mesh;
                console.log(`   - Mesh: ${mesh.name}, geom vertices: ${mesh.geometry.attributes.position?.count}`);
              }
            });
            resolve(gltf);
          },
          (err) => {
            console.error(`[PARSE ERROR] ${model}:`, err);
            reject(err);
          }
        );
      });
    } catch (e) {
      console.error(`[EXCEPTION] ${model}:`, e);
    }
  }
}

testLoad();
