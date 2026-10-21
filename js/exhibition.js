import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

// Art is a gallery wall. 00 is the whole room, pulled back far enough that
// the tops of the pieces stay in frame. Each later number glides to one work.
// The label is printed on the wall itself. A line is omitted when the piece
// has no data for it.

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

function loadTex(url, renderer) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const loader = new THREE.TextureLoader();
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      resolve(t);
    }, undefined, () => resolve(null));
  });
}

function wrapLines(g, text, x, y, maxW, lineH, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  let line = '';
  let used = 0;
  words.forEach((word) => {
    if (used >= maxLines) return;
    const test = line ? `${line} ${word}` : word;
    if (line && g.measureText(test).width > maxW) {
      g.fillText(line, x, y + used * lineH);
      used += 1;
      line = word;
    } else {
      line = test;
    }
  });
  if (line && used < maxLines) g.fillText(line, x, y + used * lineH);
}

function labelTexture(piece, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 640;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = 'rgba(255, 250, 244, 0.96)';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  let y = 6;
  const left = 4;
  if (piece.artist) {
    g.font = '800 76px Inter, sans-serif';
    g.fillText(piece.artist, left, y);
    y += 88;
  }
  const life = [piece.place, piece.life].filter(Boolean).join('  ');
  if (life) {
    g.font = '400 34px Inter, sans-serif';
    g.fillText(life, left, y);
    y += 48;
  }
  if (piece.title || piece.year) {
    const title = piece.title || '';
    g.font = 'italic 500 68px Cormorant, serif';
    if (title) g.fillText(title, left, y);
    if (piece.year) {
      const tw = title ? g.measureText(title).width + 18 : 0;
      g.font = '400 36px Inter, sans-serif';
      g.fillText(String(piece.year), left + tw, y + 22);
    }
    y += 82;
  }
  const facts = [piece.medium, piece.dimensions].filter(Boolean).join(', ');
  if (facts) {
    g.font = '400 32px Inter, sans-serif';
    g.fillText(facts, left, y);
    y += 44;
  }
  if (piece.description) {
    g.font = '400 28px Inter, sans-serif';
    wrapLines(g, piece.description, left, y, 880, 36, 3);
    const lines = Math.min(3, Math.ceil(g.measureText(piece.description).width / 880) || 1);
    y += lines * 36 + 8;
  }
  const used = Math.max(48, Math.min(canvas.height, Math.ceil(y + 8)));
  const tight = document.createElement('canvas');
  tight.width = canvas.width;
  tight.height = used;
  tight.getContext('2d').drawImage(canvas, 0, 0, canvas.width, used, 0, 0, canvas.width, used);
  const tex = new THREE.CanvasTexture(tight);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return { tex, aspect: tight.width / tight.height };
}

function wallTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#3a3834';
  g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n * 0.94));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n * 0.82));
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 18; i += 1) {
    g.lineWidth = 8 + Math.random() * 20;
    g.beginPath();
    const y = Math.random() * 512;
    g.moveTo(0, y);
    g.bezierCurveTo(160, y + 12, 340, y - 10, 512, y + 4);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 2.4);
  return tex;
}

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#7a4e30';
  g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 90; i += 1) {
    const y = Math.random() * 512;
    g.strokeStyle = `rgba(${70 + Math.random() * 50},${32 + Math.random() * 24},${12},${0.18 + Math.random() * 0.4})`;
    g.lineWidth = 1 + Math.random() * 3.2;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(80, y + Math.random() * 14 - 7, 170, y + Math.random() * 14 - 7, 256, y + Math.random() * 6 - 3);
    g.stroke();
  }
  for (let i = 0; i < 16; i += 1) {
    g.fillStyle = `rgba(40, 18, 8, ${0.08 + Math.random() * 0.12})`;
    g.fillRect(Math.random() * 256, Math.random() * 512, 8 + Math.random() * 30, 2 + Math.random() * 5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.2, 2);
  return tex;
}

function poolTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 200, 10, 256, 230, 255);
  gr.addColorStop(0, 'rgba(255, 214, 160, 0.72)');
  gr.addColorStop(0.42, 'rgba(255, 186, 110, 0.28)');
  gr.addColorStop(1, 'rgba(255, 170, 90, 0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addWoodFrame(scene, x, y, w, h, mat) {
  const group = new THREE.Group();
  const depth = 0.1;
  const mould = 0.11;
  const bars = [
    [0, h / 2 - mould / 2, w, mould],
    [0, -h / 2 + mould / 2, w, mould],
    [-w / 2 + mould / 2, 0, mould, h - mould * 2],
    [w / 2 - mould / 2, 0, mould, h - mould * 2],
  ];
  bars.forEach(([bx, by, bw, bh]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth), mat);
    mesh.position.set(bx, by, 0);
    mesh.castShadow = true;
    group.add(mesh);
  });
  const beadMat = mat.clone();
  beadMat.color = new THREE.Color('#c4a27a');
  const bead = 0.03;
  const innerW = w - mould * 2;
  const innerH = h - mould * 2;
  const beads = [
    [0, innerH / 2 - bead / 2, innerW, bead],
    [0, -innerH / 2 + bead / 2, innerW, bead],
    [-innerW / 2 + bead / 2, 0, bead, innerH - bead * 2],
    [innerW / 2 - bead / 2, 0, bead, innerH - bead * 2],
  ];
  beads.forEach(([bx, by, bw, bh]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth * 0.45), beadMat);
    mesh.position.set(bx, by, depth * 0.28);
    group.add(mesh);
  });
  const lipMat = mat.clone();
  lipMat.color = new THREE.Color('#4e301c');
  const lip = 0.028;
  const lips = [
    [0, h / 2 + lip / 2, w + lip * 2, lip],
    [0, -h / 2 - lip / 2, w + lip * 2, lip],
    [-w / 2 - lip / 2, 0, lip, h],
    [w / 2 + lip / 2, 0, lip, h],
  ];
  lips.forEach(([bx, by, bw, bh]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth * 0.55), lipMat);
    mesh.position.set(bx, by, -0.01);
    group.add(mesh);
  });
  group.position.set(x, y, 0.045);
  scene.add(group);
}

export async function createExhibition(renderer, { reduce, pieces }) {
  const scene = new THREE.Scene();
  const BG = new THREE.Color('#2a2826');
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 24, 48);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  scene.add(new THREE.AmbientLight(0xfff5ea, 0.16));
  scene.add(new THREE.HemisphereLight(0x6e6862, 0x2c2824, 0.38));

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 10),
    new THREE.MeshStandardMaterial({ map: wallTexture(), color: 0x3a3834, roughness: 0.94 }),
  );
  wall.position.y = 2.6;
  wall.receiveShadow = true;
  scene.add(wall);
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.035, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.45, metalness: 0.35 }),
  );
  rail.position.set(0, 4.15, 0.02);
  scene.add(rail);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 24),
    new THREE.MeshStandardMaterial({ color: 0x4a433c, roughness: 0.92 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 4;
  floor.receiveShadow = true;
  scene.add(floor);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.16, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x3a342e, roughness: 0.7 }),
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

  const loaded = await Promise.all(pieces.map(async (p) => ({ ...p, tex: await loadTex(p.image, renderer) })));
  const gap = 3.1;
  const works = loaded.map((p, i) => ({
    ...p,
    x: (i - (loaded.length - 1) / 2) * gap,
  }));

  const labels = [];
  const wood = new THREE.MeshStandardMaterial({
    map: woodTexture(),
    color: 0xd2b48c,
    roughness: 0.58,
    metalness: 0.04,
  });
  const poolMap = poolTexture();
  works.forEach((p) => {
    const x = p.x;
    const spot = new THREE.SpotLight(0xffe0b0, 46, 8.5, 0.42, 0.42, 1.15);
    spot.position.set(x, 4.7, 2.5);
    spot.target.position.set(x, 2.15, 0.08);
    scene.add(spot, spot.target);
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 3.6),
      new THREE.MeshBasicMaterial({
        map: poolMap,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    pool.position.set(x, 2.35, 0.012);
    scene.add(pool);

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
    } else {
      addWoodFrame(scene, x, 2.15, 1.82, 2.18, wood);
      if (p.tex) {
        const art = new THREE.Mesh(
          new THREE.PlaneGeometry(1.38, 1.72),
          new THREE.MeshStandardMaterial({ map: p.tex, roughness: 0.75 }),
        );
        art.position.set(x, 2.15, 0.04);
        scene.add(art);
      }
    }

    const made = labelTexture(p, renderer);
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: made.tex,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    plaque.renderOrder = 2;
    scene.add(plaque);
    labels.push({ work: p, mesh: plaque, aspect: made.aspect });
  });

  if (!works.length) {
    for (const x of [-1.6, 1.6]) {
      const spot = new THREE.SpotLight(0xfff1e2, 6, 10, 0.5, 0.55, 1);
      spot.position.set(x, 4.4, 2.4);
      spot.target.position.set(x * 0.3, 2.1, 0);
      scene.add(spot, spot.target);
    }
  }

  let slot = 0;
  let narrow = false;
  const camTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const posFrom = new THREE.Vector3();
  const posTo = new THREE.Vector3();
  const lookFrom = new THREE.Vector3();
  const lookTo = new THREE.Vector3();
  const lookNow = new THREE.Vector3();
  let glideStart = 0;
  let glideMs = 1;
  let gliding = false;
  let glideEaseIn = true;

  function easeGlide(t, easeIn) {
    if (!easeIn) return 1 - (1 - t) * (1 - t);
    return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
  }

  function pieceBox(work) {
    if (work.kind === 'sculpture') {
      return { minX: work.x - 0.5, maxX: work.x + 0.5, minY: 0.02, maxY: 2.08, z: 1.05 };
    }
    return { minX: work.x - 0.98, maxX: work.x + 0.98, minY: 0.98, maxY: 3.32, z: 0 };
  }

  function labelBox(label) {
    const work = label.work;
    const aspect = label.aspect || 2.4;
    const b = pieceBox(work);
    if (work.kind === 'sculpture') {
      const w = narrow ? 0.92 : 0.7;
      const h = w / aspect;
      return { x: work.x + 0.62, y: 1.22, w, h, z: 0.04 };
    }
    if (narrow) {
      const w = 1.2;
      const h = w / aspect;
      return { x: work.x, y: b.minY - 0.08 - h / 2, w, h, z: 0.04 };
    }
    const w = 0.7;
    const h = w / aspect;
    return { x: b.maxX + 0.1 + w / 2, y: b.minY + 0.04 + h / 2, w, h, z: 0.04 };
  }

  function layoutLabels() {
    labels.forEach((label) => {
      const box = labelBox(label);
      label.mesh.position.set(box.x, box.y, box.z);
      label.mesh.scale.set(box.w, box.h, 1);
    });
  }

  function fitPose(minX, maxX, minY, maxY, lookZ, fill = 0.9, zoom = 1.08) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const spanX = Math.max(0.5, maxX - minX);
    const spanY = Math.max(0.5, maxY - minY);
    const tanV = Math.tan((camera.fov * Math.PI) / 360);
    const aspect = Math.max(0.35, camera.aspect);
    const dist = Math.max(
      spanY / (2 * tanV * fill),
      spanX / (2 * tanV * aspect * fill),
    ) * zoom;
    camTarget.set(cx, cy, lookZ + dist);
    lookTarget.set(cx, cy, lookZ);
  }

  // The gallery is clear at whatever distance the shot needs. A fixed fog
  // distance erased the whole wall once the tall overview stepped back.
  function updateFog() {
    const reach = Math.max(6, camera.position.length());
    scene.fog.near = reach + 6;
    scene.fog.far = reach + 28;
  }

  function overviewPose() {
    if (!works.length) {
      fitPose(-2.2, 2.2, 0.2, 3.5, 0);
      return;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    works.forEach((work) => {
      const b = pieceBox(work);
      const l = labelBox(labels.find((label) => label.work === work) || { work, aspect: 2.4 });
      minX = Math.min(minX, b.minX, l.x - l.w / 2);
      maxX = Math.max(maxX, b.maxX, l.x + l.w / 2);
      minY = Math.min(minY, b.minY, l.y - l.h / 2, 0);
      maxY = Math.max(maxY, b.maxY + 0.36, l.y + l.h / 2);
    });
    if (narrow) {
      // Portrait screens are short on width. Fit the row across that width
      // with only a slim margin, so the works stay large enough to read.
      fitPose(minX - 0.22, maxX + 0.22, Math.min(minY, 0.05) - 0.12, maxY + 0.12, 0, 0.96, 1);
      return;
    }
    fitPose(minX - 0.45, maxX + 0.45, minY - 0.25, maxY, 0);
  }

  function poseFor(work) {
    const b = pieceBox(work);
    const l = labelBox(labels.find((label) => label.work === work) || { work, aspect: 2.4 });
    const minX = Math.min(b.minX, l.x - l.w / 2) - 0.2;
    const maxX = Math.max(b.maxX, l.x + l.w / 2) + 0.22;
    const minY = Math.min(b.minY, l.y - l.h / 2) - 0.16;
    const maxY = Math.max(b.maxY, l.y + l.h / 2) + 0.38;
    fitPose(minX, maxX, minY, maxY, b.z);
  }

  function aim(next, snap) {
    const count = works.length + 1;
    slot = ((next % count) + count) % count;
    if (slot === 0) overviewPose();
    else poseFor(works[slot - 1]);
    posTo.copy(camTarget);
    lookTo.copy(lookTarget);
    if (snap || reduce) {
      gliding = false;
      camera.position.copy(posTo);
      lookNow.copy(lookTo);
      camera.lookAt(lookNow);
      updateFog();
      return;
    }
    posFrom.copy(camera.position);
    lookFrom.copy(lookNow);
    const distM = Math.max(posFrom.distanceTo(posTo), lookFrom.distanceTo(lookTo));
    glideMs = Math.min(1700, Math.max(980, 720 + distM * 180));
    glideEaseIn = !gliding;
    glideStart = performance.now();
    gliding = distM > 0.015;
    if (!gliding) {
      camera.position.copy(posTo);
      lookNow.copy(lookTo);
      camera.lookAt(lookNow);
    }
    updateFog();
  }

  function resize(w, h) {
    narrow = w / h < 0.9;
    camera.aspect = w / Math.max(1, h);
    camera.fov = narrow ? 38 : 32;
    camera.updateProjectionMatrix();
    layoutLabels();
    aim(slot, true);
  }

  function update(dt, now) {
    if (gliding && !reduce) {
      const t = Math.min(1, ((now || performance.now()) - glideStart) / glideMs);
      const e = easeGlide(t, glideEaseIn);
      camera.position.lerpVectors(posFrom, posTo, e);
      lookNow.lerpVectors(lookFrom, lookTo, e);
      if (t >= 1) gliding = false;
    }
    camera.lookAt(lookNow);
    updateFog();
  }

  function step(dir) {
    if (works.length < 1) return false;
    aim(slot + dir, reduce);
    return true;
  }

  layoutLabels();
  aim(0, true);

  return {
    scene,
    camera,
    resize,
    update,
    step,
    nav: () => ({
      index: slot - 1,
      total: works.length,
      label: slot > 0 ? (works[slot - 1]?.title || '') : '',
      piece: slot > 0 ? works[slot - 1] : null,
    }),
  };
}
