import * as THREE from 'three';
import { loadImage, roomTexture, textureFromImage } from './media.js';

// Art is a gallery wall. 00 is the whole room, pulled back far enough that
// the tops of the pieces stay in frame. Each later number glides to one work.
// The label is printed in the room. A line is omitted when the piece has no
// data for it. A piece with a photograph hangs in the same wood frame as the
// prints. makeTower and makePendant stay available for a later scan.

function towerGrain() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f3e6d2';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i += 1) {
    const y = Math.random() * 256;
    g.strokeStyle = `rgba(${90 + Math.random() * 40},${60 + Math.random() * 30},${30},${0.08 + Math.random() * 0.16})`;
    g.lineWidth = 1 + Math.random() * 2.4;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(80, y + Math.random() * 10 - 5, 170, y + Math.random() * 10 - 5, 256, y + Math.random() * 6 - 3);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function woodBlock(hex, map) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    map,
    roughness: 0.58,
    metalness: 0.02,
  });
}

function makeTower(x) {
  const group = new THREE.Group();
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.36, 0.66),
    new THREE.MeshStandardMaterial({ color: 0xe4ddd2, roughness: 0.42 }),
  );
  plinth.position.set(0, 0.18, 0);
  plinth.castShadow = true;
  group.add(plinth);
  const grain = towerGrain();
  // Widths, rotations and offsets follow the three studio photos:
  // pale pine offcuts, wider and flatter toward the base, several turned
  // near 45 degrees, a few cantilevered, tapering to a small cap.
  const specs = [
    [0.52, 0.034, 0.3, 0.18, 0.02, 0.0, '#f0dcc2'],
    [0.34, 0.03, 0.2, -1.02, 0.1, 0.04, '#d4b48c'],
    [0.46, 0.028, 0.16, 0.62, -0.08, -0.02, '#e8d2b0'],
    [0.2, 0.036, 0.18, 0.08, 0.12, 0.05, '#c9a67c'],
    [0.48, 0.026, 0.14, -0.42, -0.07, 0.01, '#f3e4cc'],
    [0.16, 0.038, 0.16, 1.12, 0.09, -0.04, '#dcc6a6'],
    [0.4, 0.028, 0.22, -0.78, -0.1, 0.03, '#e2c9a4'],
    [0.24, 0.032, 0.12, 0.48, 0.06, 0.0, '#cbb48c'],
    [0.14, 0.04, 0.15, -0.95, -0.05, 0.04, '#f6e8d0'],
    [0.44, 0.026, 0.14, 0.28, 0.04, -0.03, '#e7d0ae'],
    [0.18, 0.034, 0.2, 0.9, -0.08, 0.02, '#c8aa80'],
    [0.36, 0.028, 0.11, -0.55, 0.07, 0.02, '#ead6b6'],
    [0.15, 0.036, 0.13, 0.22, -0.03, 0.0, '#d8c0a0'],
    [0.3, 0.026, 0.16, -0.84, 0.05, -0.02, '#e6d0ae'],
    [0.12, 0.032, 0.1, 0.7, -0.02, 0.02, '#f4e6cc'],
    [0.2, 0.028, 0.08, -0.3, 0.03, 0.0, '#efe0c4'],
    [0.1, 0.026, 0.08, 0.15, 0.01, 0.0, '#f7ecda'],
  ];
  let y = 0.36;
  specs.forEach(([w, h, d, rot, ox, oz, color]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodBlock(color, grain));
    y += h / 2;
    mesh.position.set(ox, y, oz);
    mesh.rotation.y = rot;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    y += h / 2;
  });
  group.position.set(x, 0, 1.15);
  return group;
}

function ribbedPendantGeometry() {
  const ySeg = 96;
  const xSeg = 64;
  const positions = [];
  const indices = [];
  const stride = xSeg + 1;
  function addRow(y, zSign) {
    const t = y / ySeg;
    const belly = Math.sin(Math.pow(t, 0.9) * Math.PI);
    const tip = t < 0.05 ? t / 0.05 : 1;
    const crown = t > 0.86 ? 1 - ((t - 0.86) / 0.14) * 0.28 : 1;
    const half = (0.02 + 0.145 * belly * tip * crown) * (1 + 0.07 * Math.sin(t * 6.2 + 0.4));
    const spacing = 13 + 2.4 * Math.sin(t * 5.5);
    const phase = t * Math.PI * spacing + 0.55 * Math.sin(t * 17);
    const ridge = Math.pow(Math.max(0, Math.sin(phase)), 0.85);
    const irregular = 0.75 + 0.35 * Math.abs(Math.sin(t * 23.0)) + 0.15 * Math.sin(t * 9.0);
    for (let x = 0; x <= xSeg; x += 1) {
      const u = x / xSeg;
      const side = (u - 0.5) * 2;
      const xx = side * half * (1 + side * 0.18 + 0.05 * Math.sin(t * 11.0));
      const edge = Math.pow(Math.max(0, 1 - side * side), 0.65);
      const yy = (t - 0.5) * 0.3 + 0.008 * Math.sin(t * 16.0 + side);
      const band = 0.25 + 0.95 * Math.abs(Math.sin(t * 8.5 + 1.4));
      const depth = zSign * (0.003 + ridge * 0.012 * irregular * band) * (0.35 + 0.65 * edge);
      positions.push(xx, yy, depth);
    }
  }
  for (let y = 0; y <= ySeg; y += 1) addRow(y, 1);
  const back = (ySeg + 1) * stride;
  for (let y = 0; y <= ySeg; y += 1) addRow(y, -1);
  function stitch(base, flip) {
    for (let y = 0; y < ySeg; y += 1) {
      for (let x = 0; x < xSeg; x += 1) {
        const a = base + y * stride + x;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        if (!flip) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
  }
  stitch(0, false);
  stitch(back, true);
  for (let y = 0; y < ySeg; y += 1) {
    const a = y * stride;
    const b = a + stride;
    const c = back + a;
    const d = c + stride;
    indices.push(a, b, c, c, b, d);
    const e = a + xSeg;
    const f = e + stride;
    const g = back + e;
    const h = g + stride;
    indices.push(e, g, f, f, g, h);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makePendant(x) {
  const group = new THREE.Group();
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.42, 0.38),
    new THREE.MeshStandardMaterial({ color: 0xe7e1d6, roughness: 0.42 }),
  );
  plinth.position.set(0, 0.21, 0);
  plinth.castShadow = true;
  group.add(plinth);
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0xc5ccd4,
    metalness: 1,
    roughness: 0.42,
    envMapIntensity: 1.15,
    clearcoat: 0.04,
    clearcoatRoughness: 0.6,
  });
  const pendant = new THREE.Mesh(ribbedPendantGeometry(), metal);
  pendant.position.set(0, 0.58, 0.02);
  pendant.castShadow = true;
  group.add(pendant);
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0026, 10, 20), metal);
  bail.rotation.x = Math.PI / 2;
  bail.position.set(0, 0.735, 0.02);
  bail.castShadow = true;
  group.add(bail);
  group.position.set(x, 0, 1.15);
  return group;
}

export const sculptureBuilders = { tower: makeTower, pendant: makePendant };

async function loadTex(url, renderer) {
  const img = await loadImage(url);
  if (!img) return null;
  const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height || 1);
  return {
    tex: textureFromImage(img, renderer, { colorSpace: THREE.SRGBColorSpace }),
    aspect,
  };
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
  if (line && used < maxLines) {
    g.fillText(line, x, y + used * lineH);
    used += 1;
  }
  return used;
}

function labelTexture(piece, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1100;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#1d1b19';
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
    g.font = 'italic 500 68px Cormorant, "Noto Naskh Arabic", serif';
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
    const lines = wrapLines(g, piece.description, left, y, 880, 36, 8);
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
  gr.addColorStop(0, 'rgba(255, 214, 160, 0.45)');
  gr.addColorStop(0.42, 'rgba(255, 186, 110, 0.16)');
  gr.addColorStop(1, 'rgba(255, 170, 90, 0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const frameBoxes = new Map();
function frameBox(w, h, d) {
  const key = `${w}|${h}|${d}`;
  let geo = frameBoxes.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    frameBoxes.set(key, geo);
  }
  return geo;
}

function addWoodFrame(scene, x, y, w, h, mat, beadMat, lipMat) {
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
    const mesh = new THREE.Mesh(frameBox(bw, bh, depth), mat);
    mesh.position.set(bx, by, 0);
    mesh.castShadow = true;
    group.add(mesh);
  });
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
    const mesh = new THREE.Mesh(frameBox(bw, bh, depth * 0.45), beadMat);
    mesh.position.set(bx, by, depth * 0.28);
    group.add(mesh);
  });
  const lip = 0.028;
  const lips = [
    [0, h / 2 + lip / 2, w + lip * 2, lip],
    [0, -h / 2 - lip / 2, w + lip * 2, lip],
    [-w / 2 - lip / 2, 0, lip, h],
    [w / 2 + lip / 2, 0, lip, h],
  ];
  lips.forEach(([bx, by, bw, bh]) => {
    const mesh = new THREE.Mesh(frameBox(bw, bh, depth * 0.55), lipMat);
    mesh.position.set(bx, by, -0.01);
    group.add(mesh);
  });
  group.position.set(x, y, 0.045);
  scene.add(group);
}

const PRINT_W = 1.82;
const PRINT_H = 2.18;
const MOULD = 0.11;

function frameSize(aspect) {
  if (Math.abs(aspect - 0.75) < 0.02) return { w: PRINT_W, h: PRINT_H };
  const planeH = PRINT_H - MOULD * 2 + 0.05;
  const planeW = planeH * aspect;
  return { w: planeW + MOULD * 2 - 0.05, h: PRINT_H };
}

export async function createExhibition(renderer, { reduce, pieces }) {
  if (document.fonts?.load) {
    try {
      await document.fonts.load('italic 500 68px Cormorant');
      await document.fonts.load('400 68px "Noto Naskh Arabic"');
    } catch (err) { /* the label falls back to the next face */ }
  }
  const scene = new THREE.Scene();
  const BG = new THREE.Color('#e6dfd4');
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 24, 48);
  scene.environment = roomTexture(renderer, 0.05);
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  scene.add(new THREE.AmbientLight(0xfff5ea, 0.35));
  scene.add(new THREE.HemisphereLight(0xfff8f0, 0xb7aa9a, 0.45));

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 10),
    new THREE.MeshStandardMaterial({ color: 0xe7e0d6, roughness: 0.94 }),
  );
  wall.position.y = 2.6;
  wall.receiveShadow = true;
  scene.add(wall);
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.035, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xcfc6ba, roughness: 0.5, metalness: 0.15 }),
  );
  rail.position.set(0, 4.15, 0.02);
  scene.add(rail);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 24),
    new THREE.MeshStandardMaterial({ color: 0xcfc4b6, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 4;
  floor.receiveShadow = true;
  scene.add(floor);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.16, 0.12),
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

  const loaded = await Promise.all(pieces.map(async (p) => {
    const shot = await loadTex(p.image, renderer);
    return { ...p, tex: shot ? shot.tex : null, aspect: shot ? shot.aspect : 0 };
  }));
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
  const poolGeo = new THREE.PlaneGeometry(3.1, 3.6);
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolMap,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const beadMat = wood.clone();
  beadMat.color = new THREE.Color('#c4a27a');
  const lipMat = wood.clone();
  lipMat.color = new THREE.Color('#4e301c');
  works.forEach((p) => {
    const x = p.x;
    const spot = new THREE.SpotLight(0xffe0b0, 14, 9, 0.42, 0.45, 1);
    spot.position.set(x, 4.7, 2.5);
    const framed = !!p.tex;
    const focusY = framed ? 2.15 : p.model === 'pendant' ? 0.62 : p.model === 'tower' ? 0.85 : 2.15;
    spot.target.position.set(x, focusY, framed || p.kind !== 'sculpture' ? 0.08 : 1.15);
    scene.add(spot, spot.target);
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(x, 2.35, 0.012);
    scene.add(pool);

    if (framed) {
      const frame = frameSize(p.aspect || 0.75);
      p.frame = frame;
      addWoodFrame(scene, x, 2.15, frame.w, frame.h, wood, beadMat, lipMat);
      const opening = new THREE.PlaneGeometry(frame.w - MOULD * 2 + 0.05, frame.h - MOULD * 2 + 0.05);
      if (p.cutout) {
        const paper = new THREE.Mesh(
          opening,
          new THREE.MeshStandardMaterial({ color: 0xf4efe8, roughness: 0.92 }),
        );
        paper.position.set(x, 2.15, 0.012);
        scene.add(paper);
      }
      const artMat = new THREE.MeshStandardMaterial({ map: p.tex, roughness: 0.75 });
      if (p.cutout) artMat.alphaTest = 0.15;
      const art = new THREE.Mesh(opening, artMat);
      art.position.set(x, 2.15, 0.018);
      scene.add(art);
    } else if (p.kind === 'sculpture') {
      const build = sculptureBuilders[p.model] || makeTower;
      scene.add(build(x));
    }

    const made = labelTexture(p, renderer);
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: made.tex,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        fog: false,
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
    if (work.frame) {
      const halfW = work.frame.w / 2 + 0.07;
      const halfH = work.frame.h / 2 + 0.08;
      return { minX: work.x - halfW, maxX: work.x + halfW, minY: 2.15 - halfH, maxY: 2.15 + halfH, z: 0 };
    }
    if (work.model === 'pendant') {
      return { minX: work.x - 0.36, maxX: work.x + 0.36, minY: 0.02, maxY: 0.92, z: 1.05 };
    }
    if (work.kind === 'sculpture') {
      return { minX: work.x - 0.62, maxX: work.x + 0.62, minY: 0.02, maxY: 1.2, z: 1.05 };
    }
    return { minX: work.x - 0.98, maxX: work.x + 0.98, minY: 0.98, maxY: 3.32, z: 0 };
  }

  function labelBox(label) {
    const work = label.work;
    const aspect = label.aspect || 2.4;
    const b = pieceBox(work);
    if (!work.frame && work.kind === 'sculpture') {
      const w = narrow ? 0.95 : 0.82;
      const h = w / aspect;
      const edge = work.model === 'pendant' ? 0.24 : 0.42;
      return { x: work.x + edge + 0.08 + w / 2, y: 0.58, w, h, z: 1.55 };
    }
    if (narrow) {
      const w = 1.45;
      const h = w / aspect;
      return { x: work.x, y: b.minY - 0.06 - h / 2, w, h, z: 0.08 };
    }
    const w = 1.02;
    const h = w / aspect;
    return { x: b.maxX + 0.05 + w / 2, y: b.minY + 0.08 + h / 2, w, h, z: 0.08 };
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
    let minY = Math.min(b.minY, l.y - l.h / 2) - 0.16;
    const maxY = Math.max(b.maxY, l.y + l.h / 2) + 0.38;
    if (narrow) minY -= (maxY - minY) * 0.42;
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
