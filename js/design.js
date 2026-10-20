import * as THREE from 'three';

// Design is one off-white wall with two layers of twine.
// The front lines hold one cover per project. Shorter strings behind each
// cover, closer to the wall, hold the rest of that project. Both layers
// hang all the time. 00 is a straight, distant view, so each cover hides
// its own content. An arrow orbits closer and to the side; the depth between
// the layers lets that content show beside the cover.

const WALL_HALF = 5.2;
const SAG = 0.22;
const ROW_PITCH = 2.55;
const TOP_Y = 6.85;
const MAX_W = 4.25;
const COL_MAX = 1.18;
const FRONT_Z = 2.05;
const DEPTH = 1.72;
const ORBIT = 3.35;
const FOCUS_DIST = 3.15;

function hash(n) {
  let s = Math.imul(n + 1, 9973) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sagAt(worldX) {
  const u = worldX / WALL_HALF;
  return -SAG * (1 - u * u);
}

function easeGlide(t, easeIn) {
  if (!easeIn) return 1 - (1 - t) * (1 - t);
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function sourceSize(src) {
  return {
    w: src.naturalWidth || src.width || 1,
    h: src.naturalHeight || src.height || 1,
  };
}

function fitImage(img, maxEdge) {
  const { w, h } = sourceSize(img);
  if (w <= maxEdge && h <= maxEdge) return img;
  const s = maxEdge / Math.max(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * s));
  canvas.height = Math.max(1, Math.round(h * s));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function makeTexture(source, renderer, { mipmap = true } = {}) {
  const tex = new THREE.Texture(source);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = mipmap ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  tex.generateMipmaps = mipmap;
  tex.needsUpdate = true;
  return tex;
}

function breakLines(g, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  const take = (chunk) => {
    if (!chunk) return;
    if (g.measureText(chunk).width <= maxW) {
      const test = line ? `${line} ${chunk}` : chunk;
      if (line && g.measureText(test).width > maxW) {
        lines.push(line);
        line = chunk;
      } else line = test;
      return;
    }
    if (line) {
      lines.push(line);
      line = '';
    }
    let rest = chunk;
    while (rest) {
      let n = rest.length;
      while (n > 1 && g.measureText(rest.slice(0, n)).width > maxW) n -= 1;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
  };
  words.forEach(take);
  if (line) lines.push(line);
  return lines;
}

function tagTexture(project, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1400;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f4efe4';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = 'rgba(90,70,48,0.08)';
  g.lineWidth = 2;
  for (let y = 40; y < canvas.height; y += 28) {
    g.beginPath();
    g.moveTo(36, y);
    g.lineTo(canvas.width - 36, y + 4);
    g.stroke();
  }
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.arc(canvas.width / 2, 86, 26, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#6f6a64';
  g.lineWidth = 7;
  g.beginPath();
  g.arc(canvas.width / 2, 86, 26, 0, Math.PI * 2);
  g.stroke();

  let y = 210;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  if (project.year) {
    g.fillStyle = '#a8603f';
    g.font = '500 52px Inter, sans-serif';
    g.fillText(String(project.year), 78, y);
    y += 86;
  }
  if (project.title) {
    g.fillStyle = '#1d1b19';
    g.font = '500 88px Cormorant, serif';
    breakLines(g, project.title, 740).slice(0, 3).forEach((row) => {
      g.fillText(row, 78, y);
      y += 96;
    });
    y += 16;
  }
  if (project.text) {
    g.fillStyle = '#1d1b19';
    g.font = '400 46px Inter, sans-serif';
    breakLines(g, project.text, 740).slice(0, 6).forEach((row) => {
      g.fillText(row, 78, y);
      y += 62;
    });
    y += 18;
  }
  const href = project.links?.[0]?.href;
  if (href) {
    g.fillStyle = '#5b554d';
    g.font = '400 34px Inter, sans-serif';
    breakLines(g, href, 740).slice(0, 3).forEach((row) => {
      g.fillText(row, 78, y);
      y += 46;
    });
  }
  return makeTexture(canvas, renderer);
}

function visitTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 280;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f7f1e8';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = 'rgba(29,27,25,0.45)';
  g.lineWidth = 8;
  g.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  g.fillStyle = '#1d1b19';
  g.font = '500 92px Inter, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Visit site', canvas.width / 2, canvas.height / 2 + 4);
  g.strokeStyle = '#a8603f';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(250, 196);
  g.lineTo(650, 196);
  g.stroke();
  return makeTexture(canvas, renderer);
}

function sprocketTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 160;
  const g = canvas.getContext('2d');
  g.fillStyle = '#1d1b19';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#f3eee6';
  for (let i = 0; i < 4; i++) {
    const y = 14 + i * 38;
    g.fillRect(16, y, 32, 18);
  }
  const tex = makeTexture(canvas, renderer, { mipmap: false });
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function itemsOf(project) {
  if (project.items?.length) return project.items;
  return (project.images || []).map((src) => ({ kind: 'image', src }));
}

function unitSize(style, item) {
  const aspect = Math.max(0.45, Math.min(item?.aspect || 1, 1.7));
  if (style === 'collage') return { w: 0.82, h: 0.6 };
  if (style === 'folder') return { w: 0.5, h: 0.4 };
  if (style === 'cyan') return { w: 0.3, h: 0.36 };
  if (style === 'burnt') {
    const h = 0.34;
    return { w: h * Math.min(aspect, 1.15), h };
  }
  if (style === 'curl') return { w: 0.4, h: 0.52 };
  if (style === 'film') return { w: 0.32, h: 0.56 };
  if (style === 'page') return { w: 0.48, h: 0.9 };
  const photoH = 0.4;
  const photoW = photoH * aspect;
  return { w: photoW + 0.06, h: photoH + 0.08, photoW, photoH };
}

function layoutPieces(items, seed, note, limits = {}) {
  const maxW = limits.maxW ?? MAX_W;
  const colMax = limits.colMax ?? COL_MAX;
  const withTag = limits.tag !== false;
  const rnd = hash(seed);
  const images = items.filter((it) => it.kind !== 'video' && it.kind !== 'website');
  const videos = items.filter((it) => it.kind === 'video');
  const pages = items.filter((it) => it.kind === 'website');
  const pool = images.slice();
  const units = [];
  const push = (style, group) => {
    const item = group[0];
    const size = unitSize(style, item);
    const jitter = style === 'page' ? 1 : 0.88 + rnd() * 0.24;
    units.push({
      style,
      items: group,
      image: item?.image || null,
      poster: item?.poster || null,
      src: item?.src,
      kind: item?.kind || 'image',
      aspect: item?.aspect,
      shotAspect: item?.shotAspect,
      w: size.w * jitter,
      h: size.h * jitter,
      photoW: (size.photoW || size.w * 0.82) * jitter,
      photoH: (size.photoH || size.h * 0.78) * jitter,
      note: style === 'collage' ? (note || '') : '',
    });
  };
  if (images.length === 1 && !videos.length && !pages.length) {
    push(['print', 'curl', 'burnt', 'cyan'][Math.floor(rnd() * 4)], pool.splice(0, 1));
  } else if (pool.length >= 4) {
    push('collage', pool.splice(0, 3));
  }
  ['burnt', 'cyan', 'curl', 'folder'].forEach((style) => {
    if (pool.length) push(style, pool.splice(0, 1));
  });
  while (pool.length) push('print', pool.splice(0, 1));
  videos.forEach((clip) => push('film', [clip]));
  pages.forEach((page) => push('page', [page]));

  const columns = [];
  for (let i = 0; i < units.length; i += 1) {
    const parent = units[i];
    const next = units[i + 1];
    const chain = Boolean(next)
      && parent.style !== 'page'
      && next.style !== 'page'
      && next.style !== 'collage'
      && (next.style === 'film' || next.style === 'cyan' || next.style === 'burnt' || (next.h < parent.h * 0.95 && rnd() < 0.65));
    columns.push({
      parent,
      child: chain ? next : null,
      drop: 0.05 + rnd() * (chain ? 0.14 : 0.24),
      childDrop: chain ? 0.05 + rnd() * 0.08 : 0,
      tilt: (rnd() - 0.5) * 0.08,
      gap: 0.07 + rnd() * 0.1,
      sway: (rnd() - 0.5) * 0.028,
    });
    if (chain) i += 1;
  }

  const tagW0 = withTag ? 0.44 : 0;
  const tagH0 = withTag ? 0.76 : 0;
  const tagGap0 = withTag ? 0.09 : 0;
  let row = tagGap0 + tagW0;
  let tallest = withTag ? tagH0 + 0.2 : 0.16;
  columns.forEach((col, i) => {
    col.w = Math.max(col.parent.w, col.child ? col.child.w : 0);
    const h = col.drop + 0.06 + col.parent.h + (col.child ? col.childDrop + 0.05 + col.child.h : 0);
    row += col.w + (i ? col.gap : 0);
    tallest = Math.max(tallest, h);
  });
  const fit = Math.min(1, maxW / Math.max(row, 0.01), colMax / Math.max(tallest, 0.01));
  const scalePiece = (piece) => {
    if (!piece) return;
    piece.w *= fit;
    piece.h *= fit;
    piece.photoW *= fit;
    piece.photoH *= fit;
  };
  columns.forEach((col) => {
    col.w *= fit;
    col.drop *= fit;
    col.childDrop *= fit;
    col.gap *= fit;
    scalePiece(col.parent);
    scalePiece(col.child);
  });
  row *= fit;
  let x = -row / 2;
  columns.forEach((col, i) => {
    if (i) x += col.gap;
    col.x = x + col.w / 2;
    x += col.w;
  });
  const tagW = tagW0 * fit;
  const tagH = tagH0 * fit;
  const tagDrop = (0.08 + rnd() * 0.18) * fit;
  const tagTilt = (rnd() - 0.5) * 0.05;
  let tagX = x + tagGap0 * fit + tagW / 2;
  let left = -row / 2;
  let right = row / 2;
  if (withTag && !columns.length) {
    tagX = 0;
    left = -tagW / 2;
    right = tagW / 2;
  }
  return {
    columns,
    row: right - left,
    left,
    right,
    tagX,
    tagW,
    tagH,
    tagDrop,
    tagTilt,
    hang: tallest * fit,
  };
}

function containDraw(g, image, x, y, w, h) {
  const sw = image.width || image.naturalWidth || 1;
  const sh = image.height || image.naturalHeight || 1;
  const s = Math.min(w / sw, h / sh);
  const dw = sw * s;
  const dh = sh * s;
  g.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function photoCard(image, style) {
  const canvas = document.createElement('canvas');
  const portrait = style === 'cyan';
  canvas.width = portrait ? 720 : 860;
  canvas.height = portrait ? 900 : 780;
  const g = canvas.getContext('2d');
  g.fillStyle = style === 'cyan' ? '#d7e2e6' : '#f3eadc';
  g.fillRect(0, 0, canvas.width, canvas.height);
  const m = 42;
  if (image) containDraw(g, image, m, m, canvas.width - m * 2, canvas.height - m * 2);
  if (style === 'cyan') {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(32, 70, 88, 0.78)';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(236, 242, 240, 0.85)';
    g.lineWidth = 16;
    g.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  } else {
    g.globalCompositeOperation = 'multiply';
    const edge = g.createRadialGradient(
      canvas.width * 0.46, canvas.height * 0.42, canvas.width * 0.12,
      canvas.width * 0.55, canvas.height * 0.55, canvas.width * 0.72,
    );
    edge.addColorStop(0.55, 'rgba(255,255,255,0)');
    edge.addColorStop(0.82, 'rgba(120,72,40,0.15)');
    edge.addColorStop(1, 'rgba(48,24,12,0.92)');
    g.fillStyle = edge;
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = 'rgba(36,18,10,0.9)';
    g.beginPath();
    g.moveTo(canvas.width * 0.72, canvas.height);
    g.quadraticCurveTo(canvas.width * 0.84, canvas.height * 0.78, canvas.width, canvas.height * 0.58);
    g.lineTo(canvas.width, canvas.height);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  return canvas;
}

function collageSheet(images, note) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 880;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f3eee6';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = 'rgba(90,70,48,0.16)';
  g.lineWidth = 4;
  g.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
  const slots = [[56, 64, 460, 320], [560, 48, 520, 360], [70, 430, 520, 300]];
  images.slice(0, 3).forEach((image, i) => {
    if (!image) return;
    const [x, y, w, h] = slots[i];
    g.fillStyle = '#fffdf9';
    g.fillRect(x - 14, y - 14, w + 28, h + 28);
    containDraw(g, image, x, y, w, h);
  });
  ['#a8603f', '#2c2825', '#e4d3bc', '#c4a574'].forEach((color, i) => {
    g.fillStyle = color;
    g.fillRect(860, 500 + i * 78, 220, 58);
  });
  if (note) {
    g.save();
    g.translate(620, 760);
    g.rotate(-0.05);
    g.fillStyle = '#3a342c';
    g.font = 'italic 500 46px Cormorant, serif';
    breakLines(g, note, 460).slice(0, 2).forEach((line, i) => g.fillText(line, 0, i * 52));
    g.restore();
  }
  return canvas;
}

function windowLightTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = 'rgba(62, 48, 36, 0.55)';
  g.lineWidth = 26;
  g.shadowColor = 'rgba(62, 48, 36, 0.4)';
  g.shadowBlur = 22;
  for (let x = 80; x < 1024; x += 236) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 1024);
    g.stroke();
  }
  for (let y = 70; y < 1024; y += 210) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(1024, y);
    g.stroke();
  }
  return canvas;
}

export async function createDesign(renderer, { reduce, projects }) {
  const maxTex = Math.min(8192, renderer.capabilities.maxTextureSize || 4096);
  const prepared = [];
  for (const project of projects) {
    const ready = [];
    for (const item of itemsOf(project)) {
      if (item.kind === 'video') {
        const poster = await loadImage(item.poster);
        const size = poster ? sourceSize(poster) : { w: 16, h: 9 };
        ready.push({ ...item, poster, aspect: size.w / size.h });
      } else {
        const img = await loadImage(item.src);
        const fitted = img ? fitImage(img, maxTex) : null;
        const size = fitted ? sourceSize(fitted) : { w: 1, h: 1 };
        ready.push({
          ...item,
          image: fitted,
          aspect: item.kind === 'website' ? 0.58 : size.w / size.h,
          shotAspect: size.w / size.h,
        });
      }
    }
    const coverSrc = project.images?.[0];
    let cover = null;
    if (coverSrc) {
      const img = await loadImage(coverSrc);
      const fitted = img ? fitImage(img, maxTex) : null;
      if (fitted) {
        const size = sourceSize(fitted);
        cover = { kind: 'image', src: coverSrc, image: fitted, aspect: size.w / size.h };
      }
    }
    let skipped = false;
    const content = [];
    ready.forEach((item) => {
      if (!skipped && cover && item.kind === 'image' && item.src === cover.src) {
        skipped = true;
        return;
      }
      content.push(item);
    });
    if (!cover) {
      const still = ready.find((item) => item.poster || (item.image && item.kind !== 'website'));
      const image = still?.poster || still?.image;
      if (image) {
        const size = sourceSize(image);
        cover = { kind: 'image', image, aspect: size.w / size.h };
      }
    }
    prepared.push({ project, cover, content });
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6f1e8);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.08, 80);
  const camTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const camFrom = new THREE.Vector3();
  const camTo = new THREE.Vector3();
  const lookFrom = new THREE.Vector3();
  const lookTo = new THREE.Vector3();
  const lookNow = new THREE.Vector3(1.2, 2.8, 8);

  scene.add(new THREE.HemisphereLight(0xfff8f1, 0xe7dccb, 0.42));
  scene.add(new THREE.AmbientLight(0xfff4ea, 0.22));
  const sun = new THREE.DirectionalLight(0xfff1e0, 2.4);
  sun.position.set(-16, 4.8, 2.6);
  sun.target.position.set(0.6, 2.9, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.004;
  sun.shadow.radius = 3.2;
  scene.add(sun, sun.target);

  const flat = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });
  const wallMat = flat(0xf6f1e8);
  const metalMat = flat(0x6f6a64);
  const twineMat = flat(0xc49a62);
  const kraftMat = flat(0xc4a574);
  const kraftDark = flat(0xa8885c);
  const paperMat = flat(0xfffdf9, { shadowSide: THREE.DoubleSide });
  const holes = sprocketTexture(renderer);
  const visitMap = visitTexture(renderer);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(46, 28), wallMat);
  wall.position.set(0, 3.1, 0);
  scene.add(wall);
  const catcher = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 28),
    new THREE.ShadowMaterial({ color: 0x3a332b, opacity: 0.5, transparent: true, depthWrite: false, toneMapped: false }),
  );
  catcher.position.set(0, 3.1, 0.02);
  catcher.receiveShadow = true;
  catcher.renderOrder = 1;
  scene.add(catcher);

  const panes = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 20),
    new THREE.MeshBasicMaterial({
      map: makeTexture(windowLightTexture(), renderer),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      opacity: 0.3,
    }),
  );
  panes.position.set(0.4, 3.05, 0.032);
  panes.rotation.z = -0.22;
  panes.renderOrder = 2;
  scene.add(panes);

  const hookShape = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.034, 0),
    new THREE.Vector3(0.02, 0.024, 0),
    new THREE.Vector3(0.02, 0.006, 0),
    new THREE.Vector3(0, -0.004, 0),
    new THREE.Vector3(-0.016, -0.016, 0),
    new THREE.Vector3(-0.012, -0.03, 0),
    new THREE.Vector3(0.004, -0.04, 0),
  ]);
  const hookGeo = new THREE.TubeGeometry(hookShape, 16, 0.0055, 5, false);

  function addSHook(parent, y) {
    const hook = new THREE.Mesh(hookGeo, metalMat);
    hook.position.y = y;
    hook.castShadow = true;
    parent.add(hook);
  }

  function addDrop(parent, y0, length, sway) {
    const pts = [];
    const steps = 5;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      pts.push(new THREE.Vector3(Math.sin(t * Math.PI) * sway, y0 - t * length, 0.004));
    }
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.0036, 4, false),
      twineMat,
    );
    mesh.castShadow = true;
    parent.add(mesh);
  }

  function addString(rowY) {
    const pts = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const x = -WALL_HALF + (i / steps) * WALL_HALF * 2;
      pts.push(new THREE.Vector3(x, sagAt(x), 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const twine = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.02, 6, false), twineMat);
    twine.castShadow = true;
    twine.position.set(0, rowY, FRONT_Z);
    scene.add(twine);
    [-WALL_HALF, WALL_HALF].forEach((x) => {
      const hook = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 8, 20), metalMat);
      ring.rotation.y = Math.PI / 2;
      ring.castShadow = true;
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.045, 6), metalMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.z = -0.02;
      screw.castShadow = true;
      hook.add(ring, screw);
      hook.position.set(x, rowY + sagAt(x), FRONT_Z);
      scene.add(hook);
    });
  }

  const rowCount = Math.max(1, Math.ceil(prepared.length / 2));
  for (let row = 0; row < rowCount; row++) addString(TOP_Y - row * ROW_PITCH);

  const lines = [];
  const visits = [];
  const videos = [];

  function addShortString(parent, y, half) {
    const pts = [];
    const steps = 18;
    for (let i = 0; i <= steps; i += 1) {
      const x = -half + (i / steps) * half * 2;
      const sag = -0.055 * (1 - (x / half) * (x / half));
      pts.push(new THREE.Vector3(x, y + sag, 0));
    }
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.011, 5, false),
      twineMat,
    );
    mesh.castShadow = true;
    parent.add(mesh);
    [-half, half].forEach((x) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.007, 6, 14), metalMat);
      ring.rotation.y = Math.PI / 2;
      ring.castShadow = true;
      ring.position.set(x, y, 0.004);
      parent.add(ring);
    });
  }

  function shortSag(x, half) {
    const u = x / Math.max(half, 0.01);
    return -0.055 * (1 - u * u);
  }

  prepared.forEach((entry, index) => {
    const place = hash(index + 11);
    const row = Math.floor(index / 2);
    const col = index % 2;
    const cols = Math.min(2, prepared.length - row * 2);
    const jitter = (place() - 0.5) * 0.55;
    let side = jitter;
    if (cols > 1) {
      const stagger = row % 2 === 0;
      if (col === 0) side = (stagger ? -3.55 : -1.05) + jitter;
      else side = (stagger ? 1.05 : 3.55) + jitter;
    }
    const home = new THREE.Vector3(side, TOP_Y - row * ROW_PITCH, FRONT_Z);
    const lineGroup = new THREE.Group();
    const cluster = lineGroup;

    const pivots = [];
    const lineVideos = [];
    let bottom = -0.15;

    function plane(w, h, material) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
      mesh.castShadow = true;
      return mesh;
    }

    function buildPiece(piece, sheet) {
      if (piece.style === 'film') {
        const bar = Math.min(0.045, piece.w * 0.16);
        const pictureW = Math.max(0.08, piece.w - bar * 2);
        const pictureH = piece.h * 0.78;
        const canvas = document.createElement('canvas');
        const poster = piece.poster;
        const size = poster ? sourceSize(poster) : { w: 640, h: 360 };
        canvas.width = size.w;
        canvas.height = size.h;
        const ctx = canvas.getContext('2d');
        if (poster) ctx.drawImage(poster, 0, 0, canvas.width, canvas.height);
        else {
          ctx.fillStyle = '#1d1b19';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const tex = makeTexture(canvas, renderer, { mipmap: false });
        const video = document.createElement('video');
        video.src = piece.src;
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.preload = 'auto';
        video.style.cssText = 'position:fixed;width:2px;height:2px;left:-9999px;opacity:0;pointer-events:none';
        document.body.appendChild(video);
        const screen = { video, canvas, ctx, tex, poster };
        lineVideos.push(screen);
        videos.push(screen);
        const base = plane(piece.w, piece.h, flat(0x1c1a17, { shadowSide: THREE.DoubleSide }));
        const barMat = new THREE.MeshBasicMaterial({ map: holes.clone(), fog: false, shadowSide: THREE.DoubleSide });
        barMat.map.wrapT = THREE.RepeatWrapping;
        barMat.map.repeat.y = Math.max(1, piece.h / 0.16);
        barMat.map.colorSpace = THREE.SRGBColorSpace;
        const barMat2 = barMat.clone();
        barMat2.map = holes.clone();
        barMat2.map.wrapT = THREE.RepeatWrapping;
        barMat2.map.repeat.y = barMat.map.repeat.y;
        barMat2.map.colorSpace = THREE.SRGBColorSpace;
        const leftBar = new THREE.Mesh(new THREE.PlaneGeometry(bar, piece.h), barMat);
        leftBar.position.set(-(pictureW / 2 + bar / 2), 0, 0.002);
        leftBar.castShadow = true;
        const rightBar = new THREE.Mesh(new THREE.PlaneGeometry(bar, piece.h), barMat2);
        rightBar.position.set(pictureW / 2 + bar / 2, 0, 0.002);
        rightBar.castShadow = true;
        const pic = plane(pictureW, pictureH, new THREE.MeshBasicMaterial({ map: tex, fog: false, shadowSide: THREE.DoubleSide }));
        pic.position.z = 0.003;
        sheet.add(base, leftBar, rightBar, pic);
        return;
      }
      if (piece.style === 'page' && piece.image) {
        const mount = plane(piece.w, piece.h, paperMat);
        const shotW = piece.w - 0.045;
        const shotH = piece.h - 0.06;
        const tex = makeTexture(piece.image, renderer);
        const shotAspect = piece.shotAspect || piece.aspect || 1;
        const frameAspect = shotW / shotH;
        if (shotAspect < frameAspect * 0.92) {
          const repeatY = Math.max(0.08, shotAspect / frameAspect);
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.repeat.set(1, repeatY);
          tex.offset.y = 1 - repeatY;
          cluster.userData.scroll = { tex, top: 1 - repeatY };
        }
        const shot = plane(shotW, shotH, new THREE.MeshBasicMaterial({ map: tex, fog: false, shadowSide: THREE.DoubleSide }));
        shot.position.set(0, 0.01, 0.003);
        sheet.add(mount, shot);
        return;
      }
      if (piece.style === 'collage') {
        const tex = makeTexture(collageSheet(piece.items.map((item) => item.image).filter(Boolean), piece.note), renderer);
        sheet.add(plane(piece.w, piece.h, new THREE.MeshBasicMaterial({ map: tex, shadowSide: THREE.DoubleSide })));
        return;
      }
      if (piece.style === 'folder') {
        const back = plane(piece.w, piece.h, kraftMat);
        const flap = plane(piece.w * 0.92, piece.h * 0.22, kraftDark);
        flap.position.set(0, piece.h * 0.38, 0.002);
        const slip = plane(piece.w * 0.72, piece.h * 0.55, paperMat);
        slip.position.set(0.01, piece.h * 0.16, 0.003);
        sheet.add(back, flap, slip);
        if (piece.image) {
          const tex = makeTexture(piece.image, renderer);
          const pic = plane(piece.w * 0.62, piece.h * 0.42, new THREE.MeshBasicMaterial({ map: tex, shadowSide: THREE.DoubleSide }));
          pic.position.set(0.012, piece.h * 0.2, 0.005);
          sheet.add(pic);
        }
        return;
      }
      if (piece.style === 'curl' && piece.image) {
        const geo = new THREE.PlaneGeometry(piece.w, piece.h, 10, 1);
        const pos = geo.attributes.position;
        for (let v = 0; v < pos.count; v += 1) {
          const x = pos.getX(v);
          const u = x / (piece.w / 2);
          if (u > 0.55) {
            const t = (u - 0.55) / 0.45;
            pos.setZ(v, Math.sin(t * Math.PI) * piece.w * 0.16);
            pos.setX(v, x - t * t * piece.w * 0.12);
          }
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
          map: makeTexture(piece.image, renderer),
          shadowSide: THREE.DoubleSide,
        }));
        mesh.castShadow = true;
        sheet.add(mesh);
        return;
      }
      if (piece.style === 'burnt' || piece.style === 'cyan') {
        const tex = makeTexture(photoCard(piece.image, piece.style), renderer);
        sheet.add(plane(piece.w, piece.h, new THREE.MeshBasicMaterial({ map: tex, shadowSide: THREE.DoubleSide })));
        return;
      }
      const mount = plane(piece.w, piece.h, paperMat);
      sheet.add(mount);
      if (piece.image) {
        const pic = plane(
          piece.photoW,
          piece.photoH,
          new THREE.MeshBasicMaterial({ map: makeTexture(piece.image, renderer), shadowSide: THREE.DoubleSide }),
        );
        pic.position.set(0, piece.h * 0.04, 0.003);
        sheet.add(pic);
      }
    }

    function hang(pivot, piece, topY) {
      const span = piece.matH || piece.h;
      const sheet = new THREE.Group();
      sheet.position.y = topY - span / 2;
      pivot.add(sheet);
      if (piece.matW) {
        const mat = plane(piece.matW, piece.matH, paperMat);
        mat.position.z = -0.01;
        sheet.add(mat);
      }
      buildPiece(piece, sheet);
      return topY - span;
    }

    function hangColumn(parent, col, stringY, half) {
      const pivot = new THREE.Group();
      pivot.position.set(col.x, stringY + shortSag(col.x, half), 0.012);
      pivot.rotation.z = col.tilt || 0;
      addSHook(pivot, 0.01);
      addDrop(pivot, -0.03, col.drop, col.sway);
      let low = hang(pivot, col.parent, -(0.03 + col.drop));
      if (col.child) {
        addSHook(pivot, low + 0.01);
        addDrop(pivot, low - 0.02, col.childDrop, col.sway * -0.6);
        low = hang(pivot, col.child, low - 0.02 - col.childDrop);
      }
      parent.add(pivot);
      pivots.push(pivot);
      return pivot.position.y + low;
    }

    const heroStyles = ['print', 'curl', 'burnt', 'print', 'cyan', 'curl'];
    const heroStyle = entry.cover ? heroStyles[index % heroStyles.length] : 'print';
    const heroRnd = hash(index + 29);
    const heroSize = unitSize(heroStyle, entry.cover || { aspect: 1 });
    const heroScale = heroStyle === 'cyan' || heroStyle === 'burnt' ? 1.7 : 2.15;
    const printW = heroSize.w * heroScale;
    const printH = heroSize.h * heroScale;
    const matW = Math.max(printW + 0.12, 1.28);
    const matH = Math.max(printH + 0.14, 1.48);
    const hero = {
      style: heroStyle,
      image: entry.cover?.image || null,
      kind: 'image',
      items: entry.cover ? [entry.cover] : [],
      w: printW,
      h: printH,
      matW,
      matH,
      photoW: (heroSize.photoW || heroSize.w * 0.82) * heroScale,
      photoH: (heroSize.photoH || heroSize.h * 0.78) * heroScale,
    };
    const heroDrop = 0.06 + heroRnd() * 0.2;
    const heroPivot = new THREE.Group();
    heroPivot.position.set(0, sagAt(home.x), 0.02);
    heroPivot.rotation.z = (heroRnd() - 0.5) * 0.06;
    addSHook(heroPivot, 0.01);
    addDrop(heroPivot, -0.03, heroDrop, (heroRnd() - 0.5) * 0.015);
    const heroTopLocal = -(0.03 + heroDrop);
    const heroLow = hang(heroPivot, hero, heroTopLocal);
    lineGroup.add(heroPivot);
    pivots.push(heroPivot);
    const heroBottom = heroPivot.position.y + heroLow;
    const heroTop = heroPivot.position.y + heroTopLocal;
    const coverY = (heroTop + heroBottom) / 2;

    const backGroup = new THREE.Group();
    lineGroup.add(backGroup);

    const maskW = Math.max(0.5, matW * 0.56);
    const maskH = Math.max(0.54, matH * 0.56);
    const laid = layoutPieces(
      entry.content,
      index * 19 + 4,
      entry.project.text || '',
      { maxW: maskW, colMax: maskH, tag: true },
    );
    const half = Math.max(0.34, Math.min(maskW / 2, laid.row / 2 + 0.08));
    const stringY = 0;
    let cMinX = half;
    let cMaxX = -half;
    let cMinY = 0.2;
    let cMaxY = -0.2;
    const noteBound = (x0, x1, y0, y1) => {
      cMinX = Math.min(cMinX, x0, x1);
      cMaxX = Math.max(cMaxX, x0, x1);
      cMinY = Math.min(cMinY, y0, y1);
      cMaxY = Math.max(cMaxY, y0, y1);
    };
    if (laid.columns.length || laid.tagH) {
      addShortString(backGroup, stringY, half);
      noteBound(-half, half, stringY - 0.06, stringY + 0.02);
      laid.columns.forEach((col) => {
        const low = hangColumn(backGroup, col, stringY, half);
        noteBound(col.x - col.w / 2, col.x + col.w / 2, low, stringY);
      });
      if (laid.tagH) {
        const pivot = new THREE.Group();
        pivot.position.set(laid.tagX, stringY + shortSag(laid.tagX, half), 0.02);
        pivot.rotation.z = laid.tagTilt || 0;
        addSHook(pivot, 0.01);
        addDrop(pivot, -0.03, laid.tagDrop, 0.01);
        const tag = new THREE.Mesh(
          new THREE.PlaneGeometry(laid.tagW, laid.tagH),
          new THREE.MeshBasicMaterial({
            map: tagTexture(entry.project, renderer),
            transparent: true,
            opacity: 0.92,
            alphaTest: 0.35,
            toneMapped: false,
            shadowSide: THREE.DoubleSide,
          }),
        );
        tag.castShadow = true;
        tag.position.y = -(0.03 + laid.tagDrop + laid.tagH / 2);
        pivot.add(tag);
        pivots.push(pivot);
        backGroup.add(pivot);
        let low = pivot.position.y + tag.position.y - laid.tagH / 2;
        const href = entry.project.links?.[0]?.href;
        if (href) {
          const visitH = 0.16;
          const visitDrop = 0.04;
          const visitTop = tag.position.y - laid.tagH / 2;
          addSHook(pivot, visitTop + 0.008);
          addDrop(pivot, visitTop - 0.01, visitDrop, -0.006);
          const visit = new THREE.Mesh(
            new THREE.PlaneGeometry(Math.min(0.42, laid.tagW), visitH),
            new THREE.MeshBasicMaterial({ map: visitMap, toneMapped: false, fog: false, shadowSide: THREE.DoubleSide }),
          );
          visit.position.y = visitTop - 0.01 - visitDrop - visitH / 2;
          visit.castShadow = true;
          visit.userData.href = href;
          pivot.add(visit);
          visits.push(visit);
          low = Math.min(low, pivot.position.y + visit.position.y - visitH / 2);
        }
        noteBound(laid.tagX - laid.tagW / 2, laid.tagX + laid.tagW / 2, low, pivot.position.y);
      }
    }
    const contentW = Math.max(0.2, cMaxX - cMinX);
    const contentH = Math.max(0.2, cMaxY - cMinY);
    const contentCx = (cMinX + cMaxX) / 2;
    const contentCy = (cMinY + cMaxY) / 2;
    const fit = Math.min(1.45, (maskW * 0.98) / contentW, (maskH * 0.98) / contentH);
    backGroup.scale.setScalar(fit);
    backGroup.position.set(-contentCx * fit, coverY - contentCy * fit, -DEPTH);
    backGroup.traverse((obj) => {
      if (obj.isMesh) obj.castShadow = false;
    });

    lineGroup.position.copy(home);
    scene.add(lineGroup);

    lines.push({
      project: entry.project,
      group: lineGroup,
      backGroup,
      pivots,
      videos: lineVideos,
      scroll: cluster.userData.scroll || null,
      home,
      swingStart: -1,
      coverY: home.y + coverY,
      heroBottom,
      heroTop,
      matW,
      matH,
    });
  });

  let slot = 0;
  let narrow = false;
  let moving = false;
  let moveStart = 0;
  let moveMs = 1200;
  let moveEaseIn = true;
  let poseFov = 22;
  let fovFrom = 22;
  let fovTo = 22;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function fitPose(minX, maxX, minY, maxY, lookZ, fill, oblique) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const spanX = Math.max(0.4, maxX - minX);
    const spanY = Math.max(0.4, maxY - minY);
    const tanV = Math.tan((poseFov * Math.PI) / 360);
    const aspect = Math.max(0.35, camera.aspect);
    const dist = Math.max(
      spanY / (2 * tanV * fill),
      spanX / (2 * tanV * aspect * fill),
    );
    const side = dist * (oblique || 0);
    const pull = dist * (1 + Math.abs(oblique || 0) * 0.35);
    camTarget.set(cx + side, cy, lookZ + pull);
    lookTarget.set(cx + side * 0.12, cy, lookZ);
  }

  function overviewPose() {
    let minY = Infinity;
    let maxY = -Infinity;
    lines.forEach((line) => {
      minY = Math.min(minY, line.home.y + line.heroBottom);
      maxY = Math.max(maxY, line.home.y + line.heroTop + 0.12);
    });
    poseFov = narrow ? 26 : 20;
    fitPose(
      -WALL_HALF - 0.25,
      WALL_HALF + 0.25,
      minY - (narrow ? 0.3 : 0.45),
      maxY + (narrow ? 0.2 : 0.3),
      FRONT_Z,
      narrow ? 0.86 : 0.82,
      0,
    );
  }

  function focusPose(line) {
    const sign = line.home.x >= 0 ? 1 : -1;
    const orbit = narrow ? ORBIT * 0.82 : ORBIT;
    const dist = narrow ? FOCUS_DIST * 0.92 : FOCUS_DIST;
    poseFov = narrow ? 26 : 21;
    camTarget.set(line.home.x + sign * orbit, line.coverY + 0.02, FRONT_Z + dist);
    lookTarget.set(line.home.x + sign * 0.78, line.coverY, FRONT_Z - DEPTH * 0.5);
  }

  function paintPoster(screen) {
    if (!screen.poster) return;
    screen.ctx.drawImage(screen.poster, 0, 0, screen.canvas.width, screen.canvas.height);
    screen.tex.needsUpdate = true;
  }

  function paintFrame(screen) {
    if (screen.video.readyState < 2) return;
    screen.ctx.drawImage(screen.video, 0, 0, screen.canvas.width, screen.canvas.height);
    screen.tex.needsUpdate = true;
  }

  function syncMedia() {
    const focus = slot - 1;
    lines.forEach((line, i) => {
      const on = i === focus;
      line.videos.forEach((screen) => {
        if (on && !document.hidden) {
          const pending = screen.video.play();
          if (pending?.catch) pending.catch(() => {});
        } else {
          screen.video.pause();
          paintPoster(screen);
        }
      });
      if (line.scroll) line.scroll.tex.offset.y = line.scroll.top;
    });
  }

  function aim(next, snap) {
    const count = lines.length + 1;
    slot = ((next % count) + count) % count;
    const focus = slot - 1;
    if (focus < 0) overviewPose();
    else focusPose(lines[focus]);
    camTo.copy(camTarget);
    lookTo.copy(lookTarget);
    fovTo = poseFov;
    lines.forEach((line, i) => {
      line.swingStart = i === focus && !snap && !reduce ? performance.now() : -1;
    });
    syncMedia();
    if (snap || reduce) {
      moving = false;
      lines.forEach((line) => {
        line.pivots.forEach((pivot) => { pivot.rotation.x = 0; });
      });
      camera.fov = fovTo;
      camera.updateProjectionMatrix();
      camera.position.copy(camTo);
      lookNow.copy(lookTo);
      camera.lookAt(lookNow);
      return;
    }
    camFrom.copy(camera.position);
    lookFrom.copy(lookNow);
    fovFrom = camera.fov;
    const travel = camFrom.distanceTo(camTo);
    moveMs = Math.min(1600, Math.max(1000, 760 + travel * 55));
    moveEaseIn = !moving;
    moveStart = performance.now();
    moving = travel > 0.02 || Math.abs(fovFrom - fovTo) > 0.2;
    if (!moving) {
      camera.position.copy(camTo);
      lookNow.copy(lookTo);
      camera.lookAt(lookNow);
    }
  }

  function resize(w, h) {
    narrow = w / Math.max(1, h) < 0.9;
    camera.aspect = w / Math.max(1, h);
    camera.fov = narrow ? 40 : 32;
    camera.updateProjectionMatrix();
    aim(slot, true);
  }

  function update(dt, now) {
    const time = now || performance.now();
    if (document.hidden) pause();
    let e = 1;
    let apply = false;
    if (moving && !reduce) {
      const t = Math.min(1, (time - moveStart) / moveMs);
      e = easeGlide(t, moveEaseIn);
      apply = true;
      if (t >= 1) moving = false;
    }
    const focus = slot - 1;
    lines.forEach((line, i) => {
      const on = i === focus;
      line.pivots.forEach((pivot, k) => {
        let target = 0;
        if (on && !reduce && line.swingStart >= 0) {
          const st = (time - line.swingStart) / 1000 - k * 0.05;
          if (st > 0) target = -0.28 * Math.sin(st * 4) * Math.exp(-1.25 * st);
        }
        if (reduce || on) pivot.rotation.x = target;
        else pivot.rotation.x += (0 - pivot.rotation.x) * Math.min(1, (dt || 0.016) * 6);
      });
      if (on && !document.hidden) {
        line.videos.forEach((screen) => {
          if (screen.video.paused) {
            const pending = screen.video.play();
            if (pending?.catch) pending.catch(() => {});
          }
          paintFrame(screen);
        });
        if (line.scroll && !reduce) {
          const period = 28000;
          const u = (time % period) / period;
          const wave = (1 - Math.cos(u * Math.PI * 2)) / 2;
          line.scroll.tex.offset.y = line.scroll.top * (1 - wave);
        }
      }
    });
    if (apply) {
      camera.fov = fovFrom + (fovTo - fovFrom) * e;
      camera.updateProjectionMatrix();
      camera.position.lerpVectors(camFrom, camTo, e);
      lookNow.lerpVectors(lookFrom, lookTo, e);
    }
    camera.lookAt(lookNow);
  }

  function step(dir) {
    if (!lines.length) return false;
    aim(slot + dir, reduce);
    return true;
  }

  function pointerNDC(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function visitAt(e) {
    if (!visits.length) return null;
    pointerNDC(e);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(visits, false);
    return hits[0]?.object || null;
  }

  function pointerDown(e) {
    const hit = visitAt(e);
    if (!hit?.userData.href) return false;
    window.open(hit.userData.href, '_blank', 'noopener,noreferrer');
    return true;
  }

  function pointerMove(e) {
    const hit = visitAt(e);
    renderer.domElement.style.cursor = hit ? 'pointer' : '';
  }

  function pause() {
    videos.forEach((screen) => screen.video.pause());
  }

  aim(0, true);
  const result = {
    scene,
    camera,
    resize,
    update,
    step,
    pointerDown,
    pointerMove,
    pause,
    nav: () => ({
      index: slot - 1,
      total: lines.length,
      label: slot > 0 ? (lines[slot - 1].project.title || '') : '',
      project: slot > 0 ? lines[slot - 1].project : null,
    }),
  };
  return result;
}
