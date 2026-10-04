// Punto unico da cui il gioco ottiene i modelli 3D.
// Se per una chiave esiste un .glb nel manifest viene usato quello,
// altrimenti si costruisce il modello procedurale.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GLB_MANIFEST } from './manifest';
import { PROCEDURAL } from './procedural';

const templates = new Map<string, THREE.Object3D>();

/** Carica i .glb elencati nel manifest. Gli errori non bloccano il gioco. */
export async function preloadModels(onProgress?: (done: number, total: number) => void): Promise<void> {
  const entries = Object.entries(GLB_MANIFEST);
  if (!entries.length) return;
  const loader = new GLTFLoader();
  let done = 0;
  await Promise.all(
    entries.map(async ([key, url]) => {
      try {
        const gltf = await loader.loadAsync(url);
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        gltf.scene.userData.fromGLB = true;
        templates.set(key, gltf.scene);
      } catch (err) {
        console.warn(`[modelli] impossibile caricare ${url}, uso il procedurale`, err);
      } finally {
        onProgress?.(++done, entries.length);
      }
    }),
  );
}

/** Crea una nuova istanza del modello. `seed` dà varianti ai procedurali. */
export function createModel(key: string, seed = 1): THREE.Object3D {
  const tpl = templates.get(key);
  if (tpl) return skeletonClone(tpl);
  const factory = PROCEDURAL[key];
  if (!factory) {
    console.warn(`[modelli] chiave sconosciuta: ${key}`);
    return new THREE.Group();
  }
  const obj = factory(seed);
  obj.userData.modelKey = key;
  return obj;
}
