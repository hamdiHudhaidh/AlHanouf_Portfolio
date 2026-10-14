import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

function wrap(g, text, x, y, maxW, lineH, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return y;
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      line = words[i];
      y += lineH;
      lines++;
      if (lines >= maxLines) return y;
    } else line = test;
  }
  if (line && lines < maxLines) g.fillText(line, x, y);
  return y + lineH;
}

function labelTexture(piece) {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 520;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = '#f7f1e8';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(29,27,25,.2)';
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.textAlign = 'left';
  let y = 64;
  const artist = piece.artist || '';
  if (artist) {
    g.fillStyle = '#5b554d';
    g.font = '500 28px Inter, sans-serif';
    g.fillText(artist, 48, y);
    y += 54;
  }
  g.fillStyle = '#1d1b19';
  g.font = '500 54px Cormorant, Georgia, serif';
  const title = [piece.title, piece.year].filter(Boolean).join(', ');
  y = wrap(g, title, 48, y, 800, 58, 2);
  y += 8;
  const facts = [piece.medium, piece.dimensions].filter(Boolean).join('  ·  ');
  if (facts) {
    g.fillStyle = '#5b554d';
    g.font = '400 26px Inter, sans-serif';
    y = wrap(g, facts, 48, y, 800, 34, 2);
    y += 10;
  }
  if (piece.description) {
    g.fillStyle = '#1d1b19';
    g.font = '400 28px Inter, sans-serif';
    wrap(g, piece.description, 48, y, 800, 38, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
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
      }
      const lab = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.36),
        new THREE.MeshStandardMaterial({ map: labelTexture(p), roughness: 0.85 }),
      );
      lab.position.set(x, 0.28, 1.52);
      lab.rotation.x = -0.4;
      scene.add(lab);
      focus.push(new THREE.Vector3(x, 1.2, 0));
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
      const lab = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 0.66),
        new THREE.MeshStandardMaterial({ map: labelTexture(p), roughness: 0.9 }),
      );
      lab.position.set(x, 0.78, 0.05);
      scene.add(lab);
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
    const f = focus[Math.max(0, Math.min(focus.length - 1, i))] || new THREE.Vector3(0, 2, 0);
    camTarget.set(f.x, narrow ? 1.55 : 1.62, narrow ? 3.15 : 4.05);
    look.copy(f);
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
    }),
  };
}
