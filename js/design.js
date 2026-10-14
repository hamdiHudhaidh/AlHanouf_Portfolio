import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const PAPER = '#f4efe6';
const INK = '#1d1b19';
const CLAY = '#a8603f';
const MUTED = '#5b554d';

// One page fills most of a 1920×1080 view at DPR 2, so the type is drawn
// well above the on-screen size and filtered with anisotropy.
const PAGE_W = 2048;
const PAGE_H = 2732;

const PW = 1.78;
const PH = 2.36;
const TURN = 1.15;

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function wrap(g, text, x, y, maxW, lineH, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      y += lineH;
      lines++;
      line = words[i];
      if (lines >= maxLines - 1) {
        let rest = words.slice(i).join(' ');
        while (g.measureText(`${rest}…`).width > maxW && rest.length) rest = rest.slice(0, -1);
        g.fillText(rest.length < words.slice(i).join(' ').length ? `${rest}…` : rest, x, y);
        return y + lineH;
      }
    } else line = test;
  }
  if (line) g.fillText(line, x, y);
  return y + lineH;
}

function drawContain(g, img, x, y, w, h) {
  const ir = img.width / img.height;
  const r = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (ir > r) {
    dh = w / ir;
    dy = y + (h - dh) / 2;
  } else {
    dw = h * ir;
    dx = x + (w - dw) / 2;
  }
  g.drawImage(img, dx, dy, dw, dh);
}

function paperFill(g, c, seed) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, c.width, c.height);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 700; i++) {
    const v = 160 + rnd() * 50;
    g.fillStyle = `rgba(${v | 0},${(v - 8) | 0},${(v - 18) | 0},${0.03 + rnd() * 0.045})`;
    g.fillRect(rnd() * c.width, rnd() * c.height, 1.5, 1.5);
  }
}

function frame(g, c) {
  const S = c.width / 900;
  g.strokeStyle = 'rgba(29,27,25,.1)';
  g.lineWidth = Math.max(1, S);
  g.strokeRect(32 * S, 32 * S, c.width - 64 * S, c.height - 64 * S);
}

function gutterShade(g, c, side) {
  const S = c.width / 900;
  const depth = 110 * S;
  const x0 = side < 0 ? c.width - depth : 0;
  const x1 = side < 0 ? c.width : depth;
  const grd = g.createLinearGradient(x0, 0, x1, 0);
  const ink = 'rgba(42,38,34,.075)';
  if (side < 0) {
    grd.addColorStop(0, 'rgba(42,38,34,0)');
    grd.addColorStop(1, ink);
  } else {
    grd.addColorStop(0, ink);
    grd.addColorStop(1, 'rgba(42,38,34,0)');
  }
  g.fillStyle = grd;
  g.fillRect(Math.min(x0, x1), 0, depth, c.height);
}

function slots(n, region) {
  const { x, y, w, h } = region;
  const gap = Math.max(14, w * 0.02);
  if (n <= 1) return [{ x, y, w, h }];
  if (n === 2) {
    const hh = (h - gap) / 2;
    return [
      { x, y, w, h: hh },
      { x, y: y + hh + gap, w, h: hh },
    ];
  }
  if (n === 3) {
    const lw = (w - gap) * 0.58;
    const rw = w - gap - lw;
    const hh = (h - gap) / 2;
    return [
      { x, y, w: lw, h },
      { x: x + lw + gap, y, w: rw, h: hh },
      { x: x + lw + gap, y: y + hh + gap, w: rw, h: hh },
    ];
  }
  const rows = Math.ceil(n / 2);
  const cw = (w - gap) / 2;
  const rh = (h - gap * (rows - 1)) / rows;
  const out = [];
  for (let i = 0; i < n; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    out.push({ x: x + col * (cw + gap), y: y + row * (rh + gap), w: cw, h: rh });
  }
  return out;
}

function makePageCanvas(renderer) {
  const c = document.createElement('canvas');
  c.width = PAGE_W;
  c.height = PAGE_H;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return { c, tex, g };
}

function paintEssay(page, project) {
  const { c, g, tex } = page;
  const S = c.width / 900;
  paperFill(g, c, 5);
  frame(g, c);
  const left = 96 * S;
  const maxW = c.width - 200 * S;
  let y = 240 * S;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  if (project.year) {
    g.fillStyle = CLAY;
    g.font = `500 ${28 * S}px Inter, sans-serif`;
    g.fillText(String(project.year), left, y);
    y += 110 * S;
  }
  g.fillStyle = INK;
  g.font = `500 ${112 * S}px Cormorant, Georgia, serif`;
  y = wrap(g, project.title, left, y, maxW, 124 * S, 3) + 24 * S;
  g.strokeStyle = CLAY;
  g.lineWidth = 2.5 * S;
  g.beginPath();
  g.moveTo(left, y);
  g.lineTo(left + 78 * S, y);
  g.stroke();
  y += 52 * S;
  if (project.text) {
    g.fillStyle = MUTED;
    g.font = `400 ${34 * S}px Inter, sans-serif`;
    y = wrap(g, project.text, left, y, maxW, 52 * S, 8) + 36 * S;
  }
  if (project.links?.length) {
    g.fillStyle = INK;
    g.font = `500 ${26 * S}px Inter, sans-serif`;
    for (const link of project.links) {
      y = wrap(g, link.label, left, y, maxW, 40 * S, 4) + 16 * S;
    }
  }
  gutterShade(g, c, -1);
  g.fillStyle = '#e4d9cc';
  g.beginPath();
  g.moveTo(40 * S, c.height - 168 * S);
  g.lineTo(40 * S, c.height - 40 * S);
  g.lineTo(168 * S, c.height - 40 * S);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(29,27,25,.16)';
  g.lineWidth = S;
  g.stroke();
  tex.needsUpdate = true;
}

function paintCollage(page, project, images) {
  const { c, g, tex } = page;
  const S = c.width / 900;
  paperFill(g, c, 11);
  frame(g, c);
  const imgs = project.images.map((url) => images.get(url)).filter(Boolean).slice(0, 6);
  const margin = 70 * S;
  const top = 64 * S;
  const band = c.height * (imgs.length <= 1 ? 0.78 : 0.64);
  const region = { x: margin, y: top, w: c.width - margin * 2, h: Math.max(40, band - top) };
  const rects = slots(Math.max(imgs.length, 1), region);
  imgs.forEach((img, i) => {
    const r = rects[i];
    if (!r) return;
    g.save();
    roundRect(g, r.x, r.y, r.w, r.h, 10 * S);
    g.clip();
    g.fillStyle = '#e6dfd4';
    g.fillRect(r.x, r.y, r.w, r.h);
    drawContain(g, img, r.x, r.y, r.w, r.h);
    g.restore();
  });
  gutterShade(g, c, 1);
  tex.needsUpdate = true;
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function curlGeo(geo, amount) {
  const base = geo.userData.base;
  const pos = geo.attributes.position;
  const w = geo.parameters.width;
  for (let i = 0; i < pos.count; i++) {
    const x0 = base[i * 3];
    const y0 = base[i * 3 + 1];
    const z0 = base[i * 3 + 2];
    const u = x0 <= 0 ? 0 : Math.min(1, x0 / w);
    const a = amount * Math.PI * Math.pow(u, 0.58);
    const c = Math.cos(a);
    const s = Math.sin(a);
    pos.setXYZ(i, c * x0 - s * z0, y0, s * x0 + c * z0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function pageGeo(w, h, side) {
  const geo = new THREE.PlaneGeometry(w, h, 40, 8);
  geo.translate(side * w / 2, 0, 0);
  geo.userData.base = Float32Array.from(geo.attributes.position.array);
  return geo;
}

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function smoothstep(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export async function createDesign(renderer, { reduce, projects }) {
  const scene = new THREE.Scene();
  const BG = new THREE.Color('#e8e1d6');
  scene.background = BG;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.08, 40);
  const key = new THREE.DirectionalLight(0xfff4e6, 2.55);
  key.position.set(-3.2, 7.2, 4.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.025;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 22;
  key.shadow.camera.left = key.shadow.camera.bottom = -4.5;
  key.shadow.camera.right = key.shadow.camera.top = 4.5;
  key.target.position.set(0, 0.35, 0);
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xd7e0ea, 0.55);
  fill.position.set(4.2, 2.4, 3);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xb7ab9c, 0.72));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.ShadowMaterial({ opacity: 0.22 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const images = new Map();
  await Promise.all(projects.flatMap((p) => p.images.map(async (url) => {
    if (!images.has(url)) images.set(url, await loadImage(url));
  })));

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  function texOf(url) {
    const img = images.get(url);
    if (!img) return null;
    const t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }

  function paperMat(map) {
    return new THREE.MeshStandardMaterial({
      map: map || null,
      color: map ? 0xffffff : 0xe7e0d6,
      roughness: 0.62,
      metalness: 0,
    });
  }
  function darkMat() {
    return new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.42, metalness: 0.32 });
  }
  function tag(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => { m.userData.fade = true; });
    return mesh;
  }

  const leftPage = makePageCanvas(renderer);
  const rightPage = makePageCanvas(renderer);
  const backPage = makePageCanvas(renderer);
  const underPage = makePageCanvas(renderer);
  const pageMat = (tex, side) => new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.92,
    metalness: 0,
    side,
  });

  const book = new THREE.Group();
  scene.add(book);

  const paperStack = new THREE.MeshStandardMaterial({ color: 0xe7dfd4, roughness: 0.94 });
  const coverMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.58 });
  [-1, 1].forEach((sign) => {
    for (let i = 0; i < 4; i++) {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(PW - 0.02, PH - 0.02, 0.007), paperStack);
      sheet.position.set(sign * PW / 2, 0, -0.006 - i * 0.008);
      sheet.receiveShadow = true;
      book.add(sheet);
    }
    const cover = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.04, PH + 0.055, 0.024), coverMat);
    cover.position.set(sign * PW / 2, 0, -0.05);
    cover.castShadow = true;
    cover.receiveShadow = true;
    book.add(cover);
  });

  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.058, PH + 0.055, 0.078),
    new THREE.MeshStandardMaterial({ color: 0x8c4a2f, roughness: 0.48 }),
  );
  spine.position.set(0, 0, -0.02);
  spine.castShadow = true;
  book.add(spine);

  const leftGeo = pageGeo(PW, PH, -1);
  const rightGeo = pageGeo(PW, PH, 1);
  const underGeo = pageGeo(PW, PH, 1);
  const leftMesh = new THREE.Mesh(leftGeo, pageMat(leftPage.tex, THREE.FrontSide));
  const rightMesh = new THREE.Mesh(rightGeo, pageMat(rightPage.tex, THREE.FrontSide));
  const backMesh = new THREE.Mesh(rightGeo, pageMat(backPage.tex, THREE.BackSide));
  const underMesh = new THREE.Mesh(underGeo, pageMat(underPage.tex, THREE.FrontSide));
  leftMesh.position.z = 0.012;
  rightMesh.position.z = backMesh.position.z = 0.02;
  underMesh.position.z = 0.004;
  [leftMesh, rightMesh, backMesh, underMesh].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    book.add(m);
  });

  let index = 0;
  let curl = 0;
  let curled = -1;
  let flipping = 0;
  let turnFrom = 0;
  let reveal = 1;

  const show = (i) => projects[(i + projects.length) % projects.length];

  function paintSettled() {
    if (!projects.length) return;
    paintEssay(leftPage, show(index));
    paintCollage(rightPage, show(index), images);
    paintEssay(backPage, show(index + 1));
    paintCollage(underPage, show(index + 1), images);
  }

  function applyCurl(amount) {
    curl = amount;
    if (amount !== curled) {
      curlGeo(rightGeo, reduce ? 0 : amount);
      curled = amount;
    }
  }

  function commit(dir) {
    index = (index + dir + projects.length) % projects.length;
    const backward = dir < 0;
    flipping = 0;
    turnFrom = 0;
    reveal = backward ? 1 : 0;
    curled = -1;
    applyCurl(0);
    paintSettled();
  }

  function prepareBackward() {
    const dest = show(index - 1);
    const leaving = show(index);
    paintEssay(leftPage, dest);
    paintCollage(rightPage, dest, images);
    paintEssay(backPage, leaving);
    paintCollage(underPage, leaving, images);
    flipping = -1;
    turnFrom = performance.now();
    curled = -1;
    applyCurl(1);
  }

  function step(dir) {
    if (!projects.length || flipping) return false;
    if (reduce) {
      commit(dir);
      return true;
    }
    if (dir < 0) prepareBackward();
    else {
      if (curl > 0.001) {
        curled = -1;
        applyCurl(0);
      }
      flipping = 1;
      turnFrom = performance.now();
    }
    return true;
  }

  function poster(project, w, h, imgIndex, tilt) {
    const g = new THREE.Group();
    const board = tag(new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.02),
      paperMat(texOf(project.images[imgIndex] || project.images[0])),
    ));
    board.geometry.translate(0, h / 2, 0);
    g.add(board);
    g.rotation.x = tilt;
    g.position.set(PW * 0.5, -0.58, 0.03);
    return g;
  }

  function buildMock(project) {
    const hero = project.images[Math.min(1, project.images.length - 1)] || project.images[0];
    const last = project.images[project.images.length - 1];
    if (project.slug === 'peak-identity') return poster(project, 0.86, 1.12, 1, -0.34);
    if (project.slug === 'parkit-idintity') {
      const g = new THREE.Group();
      const sheet = tag(new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.74, 0.016), paperMat(texOf(last))));
      sheet.rotation.z = -0.05;
      g.add(sheet);
      g.position.set(PW * 0.5, -0.28, 0.04);
      return g;
    }
    if (project.slug === 'brand-idintity') return poster(project, 0.48, 1.35, 0, -0.26);
    if (project.slug === 'profile-design') {
      const g = new THREE.Group();
      const cover = tag(new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.1, 0.06), paperMat(texOf(project.images[0]))));
      const band = tag(new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 1.1, 0.064),
        new THREE.MeshStandardMaterial({ color: 0x8c4a2f, roughness: 0.45 }),
      ));
      band.position.x = -0.41;
      g.add(cover, band);
      g.rotation.z = -0.04;
      g.position.set(PW * 0.52, -0.15, 0.06);
      return g;
    }
    if (project.slug === 'video-editing') {
      const g = new THREE.Group();
      const bezel = tag(new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.7, 0.045), darkMat()));
      const screen = tag(new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.56), paperMat(texOf(project.images[0]))));
      screen.position.z = 0.026;
      bezel.geometry.translate(0, 0.35, 0);
      screen.geometry.translate(0, 0.35, 0);
      g.add(bezel, screen);
      g.rotation.x = -0.28;
      g.position.set(PW * 0.5, -0.5, 0.03);
      return g;
    }
    if (project.slug === 'cube-design') {
      const g = new THREE.Group();
      const mesh = tag(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), paperMat(texOf(hero))));
      mesh.rotation.order = 'YXZ';
      mesh.rotation.y = 0.68;
      mesh.rotation.x = -0.5;
      mesh.position.z = 0.4;
      g.add(mesh);
      g.position.set(PW * 0.52, -0.08, 0.02);
      return g;
    }
    if (project.slug === 'playing-card-design') {
      const g = new THREE.Group();
      project.images.slice(0, 3).forEach((url, i) => {
        const card = tag(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.74, 0.012), paperMat(texOf(url))));
        card.position.set((i - 1) * 0.18, -0.02 * i, 0.02 + i * 0.015);
        card.rotation.z = -0.32 + i * 0.28;
        g.add(card);
      });
      g.position.set(PW * 0.5, -0.2, 0.03);
      return g;
    }
    if (project.slug === 'social-media-posts') {
      const g = new THREE.Group();
      const body = tag(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.92, 0.04), darkMat()));
      const screen = tag(new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.76), paperMat(texOf(hero))));
      screen.position.z = 0.024;
      body.geometry.translate(0, 0.46, 0);
      screen.geometry.translate(0, 0.46, 0);
      g.add(body, screen);
      g.rotation.x = -0.28;
      g.rotation.z = -0.06;
      g.position.set(PW * 0.52, -0.55, 0.03);
      return g;
    }
    if (project.slug === 'website-design') {
      const g = new THREE.Group();
      const base = tag(new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.76, 0.03), darkMat()));
      const lid = tag(new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.64, 0.024), darkMat()));
      const screen = tag(new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.52), paperMat(texOf(project.images[0]))));
      lid.geometry.translate(0, 0.32, 0);
      screen.geometry.translate(0, 0.32, 0);
      base.position.set(0, -0.08, 0.02);
      lid.position.set(0, 0.3, 0.03);
      screen.position.set(0, 0.3, 0.046);
      lid.rotation.x = -1.12;
      screen.rotation.x = -1.12;
      g.add(base, lid, screen);
      g.position.set(PW * 0.5, -0.2, 0.03);
      return g;
    }
    if (project.slug === 'vest-design') {
      const g = new THREE.Group();
      project.images.slice(0, 2).forEach((url, i) => {
        const sheet = tag(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.98, 0.012), paperMat(texOf(url))));
        sheet.position.set((i - 0.5) * 0.22, i * 0.05, 0.016 + i * 0.014);
        sheet.rotation.z = -0.08 + i * 0.16;
        g.add(sheet);
      });
      g.position.set(PW * 0.5, -0.18, 0.03);
      return g;
    }
    const g = new THREE.Group();
    const sheet = tag(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.016), paperMat(texOf(project.images[0]))));
    g.add(sheet);
    g.position.set(PW * 0.5, -0.2, 0.04);
    return g;
  }

  const mockups = new Map();
  for (const project of projects) {
    const g = buildMock(project);
    book.add(g);
    mockups.set(project.slug, g);
  }

  function mockState() {
    if (!projects.length) return { slug: '', weight: 0 };
    if (flipping < 0) {
      if (curl > 0.42) {
        return { slug: show(index).slug, weight: smoothstep((curl - 0.42) / 0.58) };
      }
      return { slug: show(index - 1).slug, weight: smoothstep(1 - curl / 0.42) };
    }
    const settled = flipping > 0 ? 1 : reveal;
    return { slug: show(index).slug, weight: (1 - smoothstep(Math.min(1, curl / 0.72))) * settled };
  }

  function applyMocks() {
    const { slug, weight } = mockState();
    for (const [key, g] of mockups) {
      const w = key === slug ? weight : 0;
      g.visible = w > 0.03;
      g.scale.setScalar(g.visible ? 0.92 + 0.08 * w : 1);
      g.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m.userData.fade) continue;
          m.opacity = w;
          m.transparent = w < 0.98;
          m.depthWrite = w > 0.45;
        }
        o.castShadow = w > 0.65;
      });
    }
  }

  paintSettled();
  applyMocks();

  function resize(w, h) {
    const narrow = w / h < 0.9;
    camera.aspect = w / h;
    if (narrow) {
      camera.fov = 48;
      camera.position.set(0, 0.28, 8.5);
      book.rotation.set(-0.18, 0, 0);
      book.position.set(0, 0.12, 0);
      camera.lookAt(0, 0.08, 0);
    } else {
      camera.fov = 34;
      camera.position.set(0, 0.46, 4.55);
      book.rotation.set(-0.2, 0, 0);
      book.position.set(0, 0.08, 0);
      camera.lookAt(0, 0.04, 0);
    }
    camera.updateProjectionMatrix();
    const rx = Math.abs(book.rotation.x);
    ground.position.y = book.position.y - Math.cos(rx) * (PH / 2) - Math.sin(rx) * 0.08 - 0.03;
  }

  function update(dt, now) {
    if (flipping && !reduce) {
      const t = Math.min(1, ((now || performance.now()) - turnFrom) / (TURN * 1000));
      const e = ease(t);
      const amount = flipping > 0 ? e : 1 - e;
      curled = -1;
      applyCurl(amount);
      if (t >= 1) commit(flipping > 0 ? 1 : -1);
    }
    if (reveal < 1) reveal = Math.min(1, reveal + dt * 2.4);
    applyMocks();
  }

  return {
    scene,
    camera,
    resize,
    update,
    step,
    setCurl(v) {
      if (flipping) return;
      const t = Math.min(1, Math.max(0, Number(v) || 0));
      curled = -1;
      applyCurl(reduce ? 0 : t);
      applyMocks();
    },
    nav: () => ({
      index,
      total: projects.length,
      label: projects.length ? show(index).title : '',
    }),
  };
}
