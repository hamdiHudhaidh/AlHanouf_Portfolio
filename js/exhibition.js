import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

// Art is a gallery wall. 00 is the whole room, pulled back far enough that
// the tops of the pieces stay in frame. Each later number glides to one work.
// The museum label is a plane in the room: beside the piece on a wide screen,
// below it on a tall one.

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
  canvas.width = 1280;
  canvas.height = 800;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f7f1e8';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = 'rgba(29,27,25,0.45)';
  g.lineWidth = 8;
  g.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  let y = 118;
  g.textBaseline = 'alphabetic';
  if (piece.artist) {
    g.fillStyle = '#5b554d';
    g.font = '500 52px Inter, sans-serif';
    g.fillText(piece.artist, 72, y);
    y += 36;
    g.strokeStyle = 'rgba(29,27,25,0.22)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(72, y);
    g.lineTo(520, y);
    g.stroke();
    y += 130;
  } else {
    y += 70;
  }

  const title = [piece.title, piece.year].filter(Boolean).join(', ');
  if (title) {
    g.fillStyle = '#1d1b19';
    g.font = '500 148px Cormorant, serif';
    wrapLines(g, title, 72, y, 1120, 156, 2);
    y += title.length > 22 ? 320 : 170;
  }

  const facts = [piece.medium, piece.dimensions].filter(Boolean).join(' · ');
  if (facts) {
    g.fillStyle = '#5b554d';
    g.font = '400 44px Inter, sans-serif';
    g.fillText(facts, 72, y);
    y += 70;
  }
  if (piece.description) {
    g.fillStyle = '#1d1b19';
    g.font = '400 58px Inter, sans-serif';
    wrapLines(g, piece.description, 72, y, 1120, 74, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

export async function createExhibition(renderer, { reduce, pieces }) {
  const scene = new THREE.Scene();
  const BG = new THREE.Color('#e6dfd4');
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 24, 48);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
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

  const loaded = await Promise.all(pieces.map(async (p) => ({ ...p, tex: await loadTex(p.image, renderer) })));
  const gap = 3.1;
  const works = loaded.map((p, i) => ({
    ...p,
    x: (i - (loaded.length - 1) / 2) * gap,
  }));

  const labels = [];
  works.forEach((p) => {
    const x = p.x;
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
    }

    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: labelTexture(p, renderer),
        toneMapped: false,
        fog: false,
      }),
    );
    plaque.renderOrder = 2;
    scene.add(plaque);
    labels.push({ work: p, mesh: plaque });
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
    return { minX: work.x - 0.84, maxX: work.x + 0.84, minY: 1.12, maxY: 3.18, z: 0 };
  }

  function labelBox(work) {
    const b = pieceBox(work);
    if (narrow) {
      const lw = work.kind === 'sculpture' ? 1.5 : 1.7;
      const lh = 1.02;
      const top = work.kind === 'sculpture' ? 0.92 : b.minY - 0.08;
      const y = Math.max(lh / 2 + 0.08, top - lh / 2);
      const z = work.kind === 'sculpture' ? 1.62 : 0.14;
      return { x: work.x, y, w: lw, h: lh, z };
    }
    const lw = 1.08;
    const lh = 0.96;
    return {
      x: b.maxX + 0.22 + lw / 2,
      y: work.kind === 'sculpture' ? 1.12 : 1.7,
      w: lw,
      h: lh,
      z: work.kind === 'sculpture' ? 1.28 : 0.14,
    };
  }

  function layoutLabels() {
    labels.forEach((label) => {
      const box = labelBox(label.work);
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
      const l = labelBox(work);
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
    const l = labelBox(work);
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
