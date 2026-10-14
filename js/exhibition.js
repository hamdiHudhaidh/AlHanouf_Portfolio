import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

// Abstract stacked form used when a sculpture has no photograph.
// It is a generated sample, not a record of anyone's work.
function sampleSculpture(x) {
  const pts = [];
  const n = 32;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = t * 0.78;
    let r = 0.07 + 0.05 * Math.sin(t * Math.PI);
    r += 0.16 * Math.exp(-((t - 0.28) ** 2) / 0.012);
    r += 0.1 * Math.exp(-((t - 0.62) ** 2) / 0.02);
    if (t > 0.86) r = 0.045 + (1 - t) * 0.55;
    pts.push(new THREE.Vector2(Math.max(0.03, r), y));
  }
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 40),
    new THREE.MeshStandardMaterial({ color: 0xa8603f, roughness: 0.42, metalness: 0.04 }),
  );
  mesh.position.set(x, 0.92, 1.15);
  mesh.scale.setScalar(1.2);
  mesh.castShadow = true;
  return mesh;
}

function loadTex(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const loader = new THREE.TextureLoader();
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      resolve(t);
    }, undefined, () => resolve(null));
  });
}

export async function createExhibition(renderer, { reduce, pieces }) {
  const scene = new THREE.Scene();
  const BG = new THREE.Color('#e6dfd4');
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 8, 22);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  scene.add(new THREE.AmbientLight(0xfff5ea, 0.35));
  scene.add(new THREE.HemisphereLight(0xfff8f0, 0xb7aa9a, 0.45));

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 8),
    new THREE.MeshStandardMaterial({ color: 0xe7e0d6, roughness: 0.94 }),
  );
  wall.position.y = 2.4;
  wall.receiveShadow = true;
  scene.add(wall);
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(28, 0.035, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xcfc6ba, roughness: 0.5, metalness: 0.15 }),
  );
  rail.position.set(0, 4.15, 0.02);
  scene.add(rail);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 16),
    new THREE.MeshStandardMaterial({ color: 0xcfc4b6, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 3.2;
  floor.receiveShadow = true;
  scene.add(floor);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(28, 0.16, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xb7aea2, roughness: 0.7 }),
  );
  base.position.set(0, 0.08, 0.04);
  scene.add(base);

  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.08, 0.46),
    new THREE.MeshStandardMaterial({ color: 0x3a342e, roughness: 0.55 }),
  );
  bench.position.set(0, 0.42, 2.35);
  const legMat = bench.material;
  for (const x of [-0.75, 0.75]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.36), legMat);
    leg.position.set(x, 0.21, 2.35);
    scene.add(leg);
  }
  scene.add(bench);

  const loaded = await Promise.all(pieces.map(async (p) => ({ ...p, tex: await loadTex(p.image) })));
  const gap = 3.1;
  const focus = [];

  loaded.forEach((p, i) => {
    const x = (i - (loaded.length - 1) / 2) * gap;
    const spot = new THREE.SpotLight(0xfff4e6, 8, 9, 0.45, 0.6, 1);
    spot.position.set(x, 4.3, 2.2);
    spot.target.position.set(x, 1.8, 0);
    scene.add(spot, spot.target);

    if (p.kind === 'sculpture') {
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.92, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xe8e1d6, roughness: 0.4 }),
      );
      plinth.position.set(x, 0.46, 1.15);
      plinth.castShadow = true;
      scene.add(plinth);
      if (p.tex) {
        const board = new THREE.Mesh(
          new THREE.PlaneGeometry(0.52, 0.68),
          new THREE.MeshStandardMaterial({ map: p.tex, roughness: 0.6 }),
        );
        board.position.set(x, 1.35, 1.16);
        scene.add(board);
      } else {
        scene.add(sampleSculpture(x));
      }
      focus.push(new THREE.Vector3(x, 1.15, 0.4));
    } else {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 1.9, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.5 }),
      );
      frame.position.set(x, 2.15, 0.04);
      scene.add(frame);
      if (p.tex) {
        const art = new THREE.Mesh(
          new THREE.PlaneGeometry(1.38, 1.72),
          new THREE.MeshStandardMaterial({ map: p.tex, roughness: 0.75 }),
        );
        art.position.set(x, 2.15, 0.08);
        scene.add(art);
      }
      focus.push(new THREE.Vector3(x, 1.85, 0));
    }
  });

  // Two pools of light so an empty room still reads as a gallery.
  if (!loaded.length) {
    for (const x of [-1.6, 1.6]) {
      const spot = new THREE.SpotLight(0xfff1e2, 6, 10, 0.5, 0.55, 1);
      spot.position.set(x, 4.4, 2.4);
      spot.target.position.set(x * 0.3, 2.1, 0);
      scene.add(spot, spot.target);
    }
    focus.push(new THREE.Vector3(0, 2.0, 0));
  }

  let index = 0;
  const camTarget = new THREE.Vector3();
  const look = new THREE.Vector3();
  function aim(i, snap) {
    const n = Math.max(0, Math.min(focus.length - 1, i));
    const f = focus[n] || new THREE.Vector3(0, 2, 0);
    const sculpt = loaded[n]?.kind === 'sculpture';
    const z = narrow ? (sculpt ? 2.35 : 3.15) : (sculpt ? 3.15 : 4.05);
    const y = narrow ? (sculpt ? 1.22 : 1.55) : (sculpt ? 1.32 : 1.62);
    camTarget.set(f.x, y, z);
    look.set(f.x, sculpt ? 1.2 : f.y, sculpt ? 0.9 : f.z);
    if (snap) {
      camera.position.copy(camTarget);
      camera.lookAt(look);
    }
  }

  let narrow = false;
  function resize(w, h) {
    narrow = w / h < 0.9;
    camera.aspect = w / h;
    camera.fov = narrow ? 38 : 32;
    camera.updateProjectionMatrix();
    aim(index, true);
  }

  function update(dt) {
    if (reduce) {
      camera.position.copy(camTarget);
    } else {
      camera.position.lerp(camTarget, Math.min(1, dt * 2.2));
    }
    camera.lookAt(look);
  }

  function step(dir) {
    if (loaded.length < 2) return false;
    index = (index + dir + loaded.length) % loaded.length;
    aim(index, reduce);
    return true;
  }

  aim(0, true);

  return {
    scene,
    camera,
    resize,
    update,
    step,
    nav: () => ({
      index,
      total: loaded.length,
      label: loaded[index]?.title || '',
      piece: loaded[index] || null,
    }),
  };
}
