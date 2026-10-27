import * as THREE from 'three';
import { loadImage, roomTexture } from './media.js';

// Design is an open cream hard-cover folder. There are no rings.
// Peak Identity and MEQAF Identity each have two spreads, painted to match
// Hamdi's template pages. A tall rounded tab carries the project name.
// Videos play inside the laptop and iPad screens, muted, looping, and inline.
// The right-hand page still curls; the turn duration and the lift off the
// page stay as they were so the spread does not flash.

const TEX_W = 860;
const TEX_H = 1054;
const PAGE_W = 1.08;
const PAGE_H = PAGE_W * (TEX_H / TEX_W);
const GUTTER = 0.012;
const TAB_W = 0.15;
const TAB_H = 0.62;
const PAGE = '#ECEAE6';
const INK = '#141414';
const PAD = 22;
const GAP = 9;

// Screen holes measured on the device mockups, as fractions of the picture.
const LAPTOP_SCREEN = { x: 0.082, y: 0.218, w: 0.555, h: 0.395 };
const IPAD_SCREEN = { x: 0.222, y: 0.108, w: 0.556, h: 0.782 };

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function makeVideo(src) {
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.src = src;
  return video;
}

function preloadVideo(video) {
  return new Promise((resolve) => {
    if (!video) { resolve(); return; }
    if (video.readyState >= 1) { resolve(); return; }
    const done = () => {
      video.removeEventListener('loadedmetadata', done);
      video.removeEventListener('error', done);
      resolve();
    };
    video.addEventListener('loadedmetadata', done);
    video.addEventListener('error', done);
    setTimeout(done, 1200);
  });
}

function wrapLines(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(ctx, text, x, y, maxW, lead) {
  wrapLines(ctx, text, maxW).forEach((line) => {
    ctx.fillText(line, x, y);
    y += lead;
  });
  return y;
}

function mediaSize(img) {
  const w = img.naturalWidth || img.videoWidth || img.width || 1;
  const h = img.naturalHeight || img.videoHeight || img.height || 1;
  return { w, h, r: w / Math.max(1, h) };
}

function placed(img, x, y, w, h, mode) {
  const { r } = mediaSize(img);
  const box = w / Math.max(1, h);
  let dw;
  let dh;
  if (mode === 'contain') {
    if (r > box) { dw = w; dh = w / r; } else { dh = h; dw = h * r; }
  } else if (r > box) { dh = h; dw = h * r; } else { dw = w; dh = w / r; }
  return { dx: x + (w - dw) / 2, dy: y + (h - dh) / 2, dw, dh };
}

function drawPhoto(ctx, img, x, y, w, h) {
  if (!img || w < 2 || h < 2) return;
  const p = placed(img, x, y, w, h, 'cover');
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, p.dx, p.dy, p.dw, p.dh);
  ctx.restore();
}

function drawDevice(ctx, img, x, y, w, h) {
  if (!img || w < 2 || h < 2) return { dx: x, dy: y, dw: w, dh: h };
  const p = placed(img, x, y, w, h, 'contain');
  ctx.drawImage(img, p.dx, p.dy, p.dw, p.dh);
  return p;
}

function paintScreen(ctx, screen) {
  const video = screen.video;
  if (!video || video.readyState < 2) return;
  const { x, y, w, h } = screen.rect;
  if (w < 2 || h < 2) return;
  const p = placed(video, x, y, w, h, 'contain');
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(video, p.dx, p.dy, p.dw, p.dh);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function roundedShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const radius = Math.min(r, w / 2, h / 2);
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + radius);
  shape.lineTo(x + w, y + h - radius);
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  shape.lineTo(x + radius, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function roughTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 190 + Math.random() * 65;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.5, 4.5);
  return tex;
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(256, 250, 20, 256, 256, 250);
  grd.addColorStop(0, 'rgba(92,74,58,0.22)');
  grd.addColorStop(0.55, 'rgba(92,74,58,0.07)');
  grd.addColorStop(1, 'rgba(92,74,58,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function tabTexture(label, color, anisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 980;
  const ctx = canvas.getContext('2d');
  roundRect(ctx, 8, 8, 224, 964, 48);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.save();
  ctx.translate(120, 490);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#141414';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 72;
  ctx.font = `800 ${size}px Inter, sans-serif`;
  while (size > 36 && ctx.measureText(label).width > 900) {
    size -= 2;
    ctx.font = `800 ${size}px Inter, sans-serif`;
  }
  ctx.fillText(label, 0, 0);
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function solidTabTexture(color, anisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  roundRect(ctx, 8, 8, 224, 404, 48);
  ctx.fillStyle = color;
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function beginPage(ctx, side) {
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  const at = side === 'left' ? TEX_W : 0;
  const dir = side === 'left' ? -1 : 1;
  const shade = ctx.createLinearGradient(at, 0, at + dir * 48, 0);
  shade.addColorStop(0, 'rgba(48,38,28,0.11)');
  shade.addColorStop(1, 'rgba(48,38,28,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
}

function paintCopy(ctx, spec, side) {
  beginPage(ctx, side);
  const x = 48;
  const maxW = TEX_W - 96;
  const compact = !spec.body && !spec.lead;
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let y = compact ? 40 : 52;
  const titleSize = compact ? 78 : 108;
  ctx.font = `800 ${titleSize}px Inter, sans-serif`;
  ctx.fillText(spec.title || '', x, y);
  y += titleSize + 6;
  ctx.font = '800 26px Inter, sans-serif';
  ctx.fillText(spec.kicker || '', x, y);
  y += 34;
  ctx.fillText(spec.year || '', x, y);
  y += compact ? 26 : 42;
  if (spec.lead) {
    ctx.font = '800 22px Inter, sans-serif';
    y = drawWrapped(ctx, spec.lead, x, y, maxW, 30);
    y += 18;
  }
  ctx.font = '800 18px Inter, sans-serif';
  (spec.body || []).forEach((para) => {
    y = drawWrapped(ctx, para, x, y, maxW, 26);
    y += 18;
  });
  return y;
}

function drawSwatches(ctx, list, x, y, w, h) {
  if (!list || !list.length || w < 8 || h < 8) return;
  const gap = 5;
  const bh = (h - gap * (list.length - 1)) / list.length;
  list.forEach((swatch, index) => {
    const yy = y + index * (bh + gap);
    ctx.fillStyle = swatch.hex;
    ctx.fillRect(x, yy, w, bh);
    if (luminance(swatch.hex) > 0.9) {
      ctx.strokeStyle = 'rgba(20,16,12,0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, yy + 0.5, w - 1, bh - 1);
    }
    ctx.fillStyle = luminance(swatch.hex) > 0.55 ? INK : '#f4f1ea';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = Math.max(10, Math.min(14, Math.floor(w * 0.13)));
    ctx.font = `800 ${size}px Inter, sans-serif`;
    let lines = wrapLines(ctx, swatch.name || '', w - 8);
    while (size > 9 && lines.length > 2) {
      size -= 1;
      ctx.font = `800 ${size}px Inter, sans-serif`;
      lines = wrapLines(ctx, swatch.name || '', w - 8);
    }
    const lead = size + 1;
    const mid = yy + bh / 2 - ((lines.length - 1) * lead) / 2;
    lines.forEach((line, i) => ctx.fillText(line, x + w / 2, mid + i * lead));
  });
}

function rememberScreen(page, side, video, hole, drawn) {
  if (!video || !drawn) return;
  page.screens.push({
    side,
    video,
    rect: {
      x: drawn.dx + hole.x * drawn.dw,
      y: drawn.dy + hole.y * drawn.dh,
      w: hole.w * drawn.dw,
      h: hole.h * drawn.dh,
    },
  });
}

function paintSpread(ctx, spec, page, side, images) {
  beginPage(ctx, side);
  const photo = (src) => images.get(src) || null;
  const x = PAD;
  const y = PAD;
  const w = TEX_W - PAD * 2;
  const h = TEX_H - PAD * 2;
  if (spec.kind === 'peak-1') {
    const topH = h * 0.545;
    drawPhoto(ctx, photo(spec.board), x, y, w, topH);
    const botY = y + topH + GAP;
    const botH = y + h - botY;
    const leftW = w * 0.48;
    drawPhoto(ctx, photo(spec.saxon), x, botY, leftW, botH);
    const cx = x + leftW + GAP;
    const cw = x + w - cx;
    const cardH = botH * 0.4;
    const cardW = (cw - GAP) / 2;
    drawPhoto(ctx, photo(spec.cardLeft), cx, botY, cardW, cardH);
    drawPhoto(ctx, photo(spec.cardRight), cx + cardW + GAP, botY, cardW, cardH);
    const lowY = botY + cardH + GAP;
    const lowH = botY + botH - lowY;
    drawPhoto(ctx, photo(spec.yearPost), cx, lowY, cardW, lowH);
    drawPhoto(ctx, photo(spec.staff), cx + cardW + GAP, lowY, cardW, lowH);
    return;
  }
  if (spec.kind === 'peak-2-left') {
    const cursor = paintCopy(ctx, spec, side);
    const rowY = cursor + 8;
    const rowH = h * 0.2;
    const half = (w - GAP) / 2;
    drawPhoto(ctx, photo(spec.badges), x, rowY, half, rowH);
    drawPhoto(ctx, photo(spec.folder), x + half + GAP, rowY, half, rowH);
    const lowY = rowY + rowH + GAP;
    const lowH = TEX_H - PAD - lowY;
    const swatchW = 112;
    const laptopW = w - swatchW - GAP;
    const drawn = drawDevice(ctx, photo(spec.laptop), x, lowY, laptopW, lowH);
    const laptop = page.videos.find((entry) => entry.src === spec.video.src);
    rememberScreen(page, side, laptop && laptop.video, LAPTOP_SCREEN, drawn);
    drawSwatches(ctx, spec.swatches, x + laptopW + GAP, lowY, swatchW, lowH);
    return;
  }
  if (spec.kind === 'peak-2-right') {
    const topH = h * 0.4;
    const half = (w - GAP) / 2;
    const leftDrawn = drawDevice(ctx, photo(spec.ipadLeft), x, y, half, topH);
    const rightDrawn = drawDevice(ctx, photo(spec.ipadRight), x + half + GAP, y, half, topH);
    const leftVideo = page.videos.find((entry) => entry.src === spec.videoLeft.src);
    const rightVideo = page.videos.find((entry) => entry.src === spec.videoRight.src);
    rememberScreen(page, side, leftVideo && leftVideo.video, IPAD_SCREEN, leftDrawn);
    rememberScreen(page, side, rightVideo && rightVideo.video, IPAD_SCREEN, rightDrawn);
    const botY = y + topH + GAP;
    drawPhoto(ctx, photo(spec.profile), x, botY, w, y + h - botY);
    return;
  }
  if (spec.kind === 'meqaf-1') {
    const topH = h * 0.3;
    const swatchW = 108;
    const paperW = w * 0.28;
    const stickerW = w - paperW - swatchW - GAP * 2;
    drawPhoto(ctx, photo(spec.paper), x, y, paperW, topH);
    drawPhoto(ctx, photo(spec.sticker), x + paperW + GAP, y, stickerW, topH);
    drawSwatches(ctx, spec.swatches, x + paperW + stickerW + GAP * 2, y, swatchW, topH);
    const midY = y + topH + GAP;
    const midH = h * 0.34;
    const half = (w - GAP) / 2;
    drawPhoto(ctx, photo(spec.boxOpen), x, midY, half, midH);
    drawPhoto(ctx, photo(spec.boxClosed), x + half + GAP, midY, half, midH);
    const botY = midY + midH + GAP;
    const botH = y + h - botY;
    const logoW = w * 0.4;
    drawPhoto(ctx, photo(spec.logo), x, botY, logoW, botH);
    drawPhoto(ctx, photo(spec.magnet), x + logoW + GAP, botY, w - logoW - GAP, botH);
    return;
  }
  if (spec.kind === 'meqaf-2-left') {
    const cursor = paintCopy(ctx, spec, side);
    const gridY = cursor + 10;
    const gridH = TEX_H - PAD - gridY;
    const cellW = (w - GAP) / 2;
    const cellH = (gridH - GAP) / 2;
    drawPhoto(ctx, photo(spec.post), x, gridY, cellW, cellH);
    drawPhoto(ctx, photo(spec.patternRed), x + cellW + GAP, gridY, cellW, cellH);
    drawPhoto(ctx, photo(spec.patternCream), x, gridY + cellH + GAP, cellW, cellH);
    drawPhoto(ctx, photo(spec.magnets), x + cellW + GAP, gridY + cellH + GAP, cellW, cellH);
    return;
  }
  if (spec.kind === 'meqaf-2-right') {
    const leftW = w * 0.46;
    const rightX = x + leftW + GAP;
    const rightW = x + w - rightX;
    const cardH = h * 0.3;
    const flyerH = h * 0.34;
    drawPhoto(ctx, photo(spec.card), x, y, leftW, cardH);
    drawPhoto(ctx, photo(spec.flyer), x, y + cardH + GAP, leftW, flyerH);
    const logoY = y + cardH + flyerH + GAP * 2;
    drawPhoto(ctx, photo(spec.logo), x, logoY, leftW, y + h - logoY);
    const postH = h * 0.56;
    drawPhoto(ctx, photo(spec.post), rightX, y, rightW, postH);
    drawPhoto(ctx, photo(spec.sheet), rightX, y + postH + GAP, rightW, y + h - (y + postH + GAP));
  }
}

function collectSources(projects) {
  const sources = new Set();
  const walk = (value) => {
    if (!value) return;
    if (typeof value === 'string') {
      if (value.startsWith('assets/') && !/\.mp4$/i.test(value)) sources.add(value);
      return;
    }
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (typeof value === 'object') Object.values(value).forEach(walk);
  };
  projects.forEach((project) => walk(project.spreads));
  return sources;
}

function collectVideos(spec) {
  const videos = [];
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.src === 'string' && /\.mp4$/i.test(value.src)) videos.push(value);
    Object.values(value).forEach((child) => {
      if (child && typeof child === 'object') walk(child);
    });
  };
  walk(spec);
  return videos;
}

export async function createDesign(renderer, { reduce, projects }) {
  const images = new Map();
  await Promise.all([...collectSources(projects)].map(async (src) => {
    images.set(src, await loadImage(src));
  }));
  if (document.fonts?.load) {
    try {
      await document.fonts.load('800 64px Inter');
      await document.fonts.load('800 18px Inter');
    } catch (err) { /* measure with the fallback face */ }
  }

  const pages = [];
  projects.forEach((project) => {
    (project.spreads || []).forEach((spread) => {
      const videos = [];
      const seen = new Set();
      ['left', 'right'].forEach((side) => {
        collectVideos(spread[side]).forEach((item) => {
          if (seen.has(item.src)) return;
          seen.add(item.src);
          videos.push({ src: item.src, video: makeVideo(item.src), poster: images.get(item.poster) || null });
        });
      });
      pages.push({
        project,
        title: project.title || '',
        spread,
        videos,
        screens: [],
        leftDyn: false,
        rightDyn: false,
      });
    });
  });

  await Promise.all(pages.flatMap((page) => page.videos.map((entry) => preloadVideo(entry.video))));

  pages.forEach((page) => {
    page.left = document.createElement('canvas');
    page.left.width = TEX_W;
    page.left.height = TEX_H;
    page.base = document.createElement('canvas');
    page.base.width = TEX_W;
    page.base.height = TEX_H;
    const leftSpec = page.spread.left || { kind: 'copy', title: page.title };
    const rightSpec = page.spread.right || { kind: 'copy', title: page.title };
    if (leftSpec.kind === 'copy') paintCopy(page.left.getContext('2d'), leftSpec, 'left');
    else paintSpread(page.left.getContext('2d'), leftSpec, page, 'left', images);
    if (rightSpec.kind === 'copy') paintCopy(page.base.getContext('2d'), rightSpec, 'right');
    else paintSpread(page.base.getContext('2d'), rightSpec, page, 'right', images);
    page.leftDyn = page.screens.some((screen) => screen.side === 'left');
    page.rightDyn = page.screens.some((screen) => screen.side === 'right');
    page.dynamic = page.leftDyn || page.rightDyn;
    if (page.leftDyn) {
      page.leftLive = document.createElement('canvas');
      page.leftLive.width = TEX_W;
      page.leftLive.height = TEX_H;
      page.leftLive.getContext('2d').drawImage(page.left, 0, 0);
    }
    if (page.rightDyn) {
      page.live = document.createElement('canvas');
      page.live.width = TEX_W;
      page.live.height = TEX_H;
      page.live.getContext('2d').drawImage(page.base, 0, 0);
    }
  });

  function paintDynamic(page) {
    if (!page || !page.dynamic) return;
    if (page.leftDyn && page.leftLive) {
      const ctx = page.leftLive.getContext('2d');
      ctx.drawImage(page.left, 0, 0);
      page.screens.forEach((screen) => { if (screen.side === 'left') paintScreen(ctx, screen); });
      if (page.leftTex) page.leftTex.needsUpdate = true;
    }
    if (page.rightDyn && page.live) {
      const ctx = page.live.getContext('2d');
      ctx.drawImage(page.base, 0, 0);
      page.screens.forEach((screen) => { if (screen.side === 'right') paintScreen(ctx, screen); });
      if (page.rightTex) page.rightTex.needsUpdate = true;
    }
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e1d6');
  scene.environment = roomTexture(renderer, 0.04);
  scene.environmentIntensity = 0.42;

  const rough = roughTexture();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  function makeTexture(source, dynamic) {
    const tex = new THREE.CanvasTexture(source);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    tex.generateMipmaps = !dynamic;
    tex.minFilter = dynamic ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  function paperMaterial(map, side) {
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.92,
      roughnessMap: rough,
      metalness: 0,
      envMapIntensity: 0.16,
      side,
    });
  }

  pages.forEach((page) => {
    page.leftTex = makeTexture(page.leftDyn ? page.leftLive : page.left, page.leftDyn);
    page.rightTex = makeTexture(page.rightDyn ? page.live : page.base, page.rightDyn);
    paintDynamic(page);
  });

  const flipCache = new Map();
  function flipped(tex) {
    let copy = flipCache.get(tex);
    if (!copy) {
      copy = tex.clone();
      copy.wrapS = THREE.RepeatWrapping;
      copy.repeat.x = -1;
      copy.offset.x = 1;
      copy.needsUpdate = true;
      flipCache.set(tex, copy);
    }
    return copy;
  }

  const camera = new THREE.PerspectiveCamera(28, 1, 0.06, 50);
  const lookNow = new THREE.Vector3();
  const lookFrom = new THREE.Vector3();
  const lookTo = new THREE.Vector3();
  const camFrom = new THREE.Vector3();
  const camTo = new THREE.Vector3();
  let roll = 0.03;
  let rollFrom = 0.03;
  let rollTo = 0.03;
  let fovFrom = 28;
  let fovTo = 28;
  let camAnimating = false;
  let camStart = 0;
  let viewW = 1;
  let viewH = 1;

  scene.add(new THREE.HemisphereLight(0xf7f1e8, 0xc4b5a4, 0.9));
  scene.add(new THREE.AmbientLight(0xfff6ee, 0.34));
  const key = new THREE.DirectionalLight(0xfff7ef, 1.45);
  key.position.set(-2.4, 3.6, 5.2);
  scene.add(key);
  const fillLight = new THREE.DirectionalLight(0xf3ece3, 0.42);
  fillLight.position.set(3.4, 0.4, 3.6);
  scene.add(fillLight);
  const rim = new THREE.DirectionalLight(0xfff8f0, 0.16);
  rim.position.set(0.4, -2.2, 2.4);
  scene.add(rim);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 2.05),
    new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }),
  );
  shadow.position.set(0.02, -0.05, -0.08);
  scene.add(shadow);

  const coverW = (GUTTER + PAGE_W) * 2 + 0.12;
  const coverH = PAGE_H + 0.11;
  const boardMat = new THREE.MeshStandardMaterial({ color: 0xddd6cb, roughness: 0.9, metalness: 0 });
  const coverMat = new THREE.MeshStandardMaterial({ color: 0xe7e1d6, roughness: 0.84, metalness: 0 });
  const board = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(coverW + 0.03, coverH + 0.025, 0.055), 8), boardMat);
  board.position.z = -0.03;
  const cover = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(coverW, coverH, 0.05), 8), coverMat);
  cover.position.z = -0.012;
  scene.add(board);
  scene.add(cover);

  const stackMat = [0, 1, 2, 3].map((i) => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e4ded4').offsetHSL(0, 0, -0.012 * i),
    roughness: 0.96,
    metalness: 0,
  }));
  function addStack(sign) {
    for (let i = 0; i < 4; i += 1) {
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W + 0.01, PAGE_H + 0.008), stackMat[i]);
      sheet.position.set(sign * (GUTTER + PAGE_W / 2), -0.0035 * (i + 1), 0.006 - 0.0026 * i);
      scene.add(sheet);
    }
  }
  addStack(1);
  addStack(-1);

  const first = pages[0];
  const rightMat = paperMaterial(first ? first.rightTex : makeTexture(document.createElement('canvas'), false), THREE.FrontSide);
  const leftMat = paperMaterial(first ? first.leftTex : rightMat.map, THREE.FrontSide);
  const rightPage = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), rightMat);
  rightPage.position.set(GUTTER + PAGE_W / 2, 0, 0.016);
  const leftPage = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), leftMat);
  leftPage.position.set(-(GUTTER + PAGE_W / 2), 0, 0.016);
  scene.add(rightPage);
  scene.add(leftPage);

  const curlGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 42, 26);
  curlGeo.translate(GUTTER + PAGE_W / 2, 0, 0);
  const restPos = new Float32Array(curlGeo.attributes.position.array);
  const frontMat = paperMaterial(first ? first.rightTex : rightMat.map, THREE.FrontSide);
  const backMat = paperMaterial(first ? first.leftTex : leftMat.map, THREE.BackSide);
  const curlFront = new THREE.Mesh(curlGeo, frontMat);
  const curlBack = new THREE.Mesh(curlGeo, backMat);
  curlFront.frustumCulled = false;
  curlBack.frustumCulled = false;
  curlFront.visible = false;
  curlBack.visible = false;
  scene.add(curlFront);
  scene.add(curlBack);

  function deform(angle) {
    const pos = curlGeo.attributes.position;
    const lead = 0.5;
    for (let i = 0; i < pos.count; i += 1) {
      const x = restPos[i * 3];
      const yPos = restPos[i * 3 + 1];
      const t = THREE.MathUtils.clamp((x - GUTTER) / PAGE_W, 0, 1);
      const ang = angle + Math.sin(angle) * lead * t * t;
      pos.setXYZ(i, x * Math.cos(ang), yPos, x * Math.sin(ang) + 0.028);
    }
    pos.needsUpdate = true;
    curlGeo.computeVertexNormals();
    curlGeo.computeBoundingSphere();
  }

  const peakProject = projects.find((project) => project.title === 'Peak') || projects[0];
  const meqafProject = projects.find((project) => project.title === 'MEQAF') || projects[projects.length - 1];
  const peakTex = tabTexture(peakProject?.tab || 'Peak Identity', peakProject?.tabColor || '#E0612A', anisotropy);
  const meqafTex = tabTexture(meqafProject?.tab || 'MEQAF Identity', meqafProject?.tabColor || '#9D0F28', anisotropy);
  const belowTex = solidTabTexture(peakProject?.tabColor || '#E0612A', anisotropy);

  function tabMesh(map, width, height) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }),
    );
    mesh.renderOrder = 3;
    scene.add(mesh);
    return mesh;
  }

  const mainTab = tabMesh(peakTex, TAB_W, TAB_H);
  const belowH = TAB_H * 0.46;
  const belowTab = tabMesh(belowTex, TAB_W, belowH);
  const rightTab = tabMesh(meqafTex, TAB_W, TAB_H * 0.92);
  const mainY = PAGE_H * 0.04;
  const edge = GUTTER + PAGE_W;
  mainTab.position.set(-edge - TAB_W / 2 + 0.012, mainY, 0.04);
  belowTab.position.set(-edge - TAB_W / 2 + 0.012, mainY - TAB_H / 2 - belowH * 0.16, 0.036);
  rightTab.position.set(edge + TAB_W / 2 - 0.012, PAGE_H * 0.16, 0.04);

  function firstSlot(title) {
    const index = pages.findIndex((page) => page.title === title);
    return index < 0 ? 1 : index + 1;
  }

  function layoutTabs(which, hideRight) {
    const page = pages[which - 1];
    if (!page) return;
    const project = page.project;
    const mine = project.title === 'MEQAF' ? meqafTex : peakTex;
    mainTab.material.map = mine;
    mainTab.material.needsUpdate = true;
    mainTab.userData.slot = firstSlot(project.title);
    if (project.peekBelow) {
      belowTab.visible = true;
      belowTab.userData.slot = firstSlot(project.peekBelow.opens);
    } else {
      belowTab.visible = false;
      belowTab.userData.slot = 0;
    }
    if (!hideRight && project.peekRight) {
      rightTab.visible = true;
      rightTab.material.map = meqafTex;
      rightTab.material.needsUpdate = true;
      rightTab.userData.slot = firstSlot(project.peekRight.opens);
    } else {
      rightTab.visible = false;
      rightTab.userData.slot = 0;
    }
  }

  function texRight(which) {
    return pages[which - 1] ? pages[which - 1].rightTex : rightMat.map;
  }

  function texLeft(which) {
    return pages[which - 1] ? pages[which - 1].leftTex : leftMat.map;
  }

  let slot = 1;
  let turning = false;
  let turn = null;
  let suspended = false;
  const gradeSaved = {
    toneMapping: renderer.toneMapping,
    exposure: renderer.toneMappingExposure,
  };
  let graded = false;

  function gradeOn() {
    if (graded) return;
    graded = true;
    renderer.toneMappingExposure = gradeSaved.exposure;
  }

  function gradeOff() {
    if (!graded) return;
    graded = false;
    renderer.toneMapping = gradeSaved.toneMapping;
    renderer.toneMappingExposure = gradeSaved.exposure;
  }

  function applyRest(which) {
    const open = Math.min(pages.length, Math.max(1, which));
    rightMat.map = texRight(open);
    leftMat.map = texLeft(open);
    rightMat.needsUpdate = true;
    leftMat.needsUpdate = true;
    leftPage.visible = true;
    curlFront.visible = false;
    curlBack.visible = false;
    layoutTabs(open, false);
  }

  function showCurl(on) {
    curlFront.visible = on;
    curlBack.visible = on;
  }

  function startTurn(from, to, dir) {
    turn = {
      from,
      to,
      dir,
      fromAngle: dir > 0 ? 0 : Math.PI,
      toAngle: dir > 0 ? Math.PI : 0,
      elapsed: 0,
      dur: 1.08,
    };
    if (dir > 0) {
      frontMat.map = texRight(from);
      backMat.map = flipped(texLeft(to));
      rightMat.map = texRight(to);
      leftMat.map = texLeft(from);
    } else {
      frontMat.map = texRight(to);
      backMat.map = flipped(texLeft(from));
      rightMat.map = texRight(from);
      leftMat.map = texLeft(to);
    }
    frontMat.needsUpdate = true;
    backMat.needsUpdate = true;
    rightMat.needsUpdate = true;
    leftMat.needsUpdate = true;
    leftPage.visible = true;
    paintDynamic(pages[from - 1]);
    paintDynamic(pages[to - 1]);
    showCurl(true);
    deform(turn.fromAngle);
    layoutTabs(dir > 0 ? from : to, true);
    turning = true;
  }

  function direction(from, to) {
    if (from === pages.length && to === 1) return 1;
    if (from === 1 && to === pages.length) return -1;
    return to > from ? 1 : -1;
  }

  function narrowNow() {
    return viewW / Math.max(1, viewH) < 0.9;
  }

  function margins() {
    const narrowCss = viewW <= 820;
    const top = (narrowCss ? 68 : 78) / Math.max(1, viewH);
    const bottom = (narrowCss ? 176 : 112) / Math.max(1, viewH);
    return { top, bottom };
  }

  function computePose() {
    const narrow = narrowNow();
    const aspect = viewW / Math.max(1, viewH);
    const fov = narrow ? 30 : 28;
    const v = THREE.MathUtils.degToRad(fov);
    const tanV = Math.tan(v / 2);
    const tanH = tanV * aspect;
    const { top, bottom } = margins();
    const usable = Math.max(0.42, 1 - top - bottom);
    const halfW = GUTTER + PAGE_W + TAB_W + (narrow ? 0.035 : 0.05);
    const halfH = PAGE_H / 2 + 0.05;
    const distV = halfH / (tanV * usable * 0.93);
    const distH = halfW / (tanH * (narrow ? 0.98 : 0.93));
    const dist = Math.max(distV, distH) * (narrow ? 1.0 : 1.04);
    const topLimit = 1 - 2 * top;
    const botLimit = -1 + 2 * bottom;
    const safeCenter = (topLimit + botLimit) / 2;
    const look = new THREE.Vector3(0, 0 - dist * tanV * safeCenter, 0);
    const ox = narrow ? 0 : 0.2;
    const oy = narrow ? 0.02 : 0.16;
    const pos = new THREE.Vector3(look.x + ox, look.y + oy, dist);
    return { pos, look, fov, roll: narrow ? -0.012 : 0.03 };
  }

  function applyCamera() {
    camera.up.set(0, 1, 0);
    camera.lookAt(lookNow);
    camera.rotateZ(roll);
    camera.updateMatrixWorld();
  }

  function moveCamera(snap) {
    const pose = computePose();
    camTo.copy(pose.pos);
    lookTo.copy(pose.look);
    fovTo = pose.fov;
    rollTo = pose.roll;
    if (snap || reduce) {
      camera.position.copy(camTo);
      lookNow.copy(lookTo);
      camera.fov = fovTo;
      roll = rollTo;
      camera.updateProjectionMatrix();
      camAnimating = false;
      applyCamera();
      return;
    }
    camFrom.copy(camera.position);
    lookFrom.copy(lookNow);
    fovFrom = camera.fov;
    rollFrom = roll;
    camStart = performance.now();
    camAnimating = true;
  }

  function syncMedia() {
    const idx = slot - 1;
    pages.forEach((page, i) => {
      const on = i === idx && !suspended && !document.hidden;
      page.videos.forEach((entry) => {
        if (on) {
          const pending = entry.video.play();
          if (pending && pending.catch) pending.catch(() => {});
        } else entry.video.pause();
      });
    });
  }

  function wrap(next) {
    const count = Math.max(1, pages.length);
    let dest = next;
    while (dest < 1) dest += count;
    while (dest > count) dest -= count;
    return dest;
  }

  function aim(next, snap) {
    if (!pages.length) return;
    const dest = wrap(next);
    const from = slot;
    if (dest === from) {
      if (!turning) moveCamera(snap);
      return;
    }
    if (turning && !snap && !reduce) applyRest(from);
    const dir = direction(from, dest);
    slot = dest;
    if (snap || reduce) {
      turning = false;
      turn = null;
      applyRest(dest);
      moveCamera(true);
      syncMedia();
      return;
    }
    startTurn(from, dest, dir);
    moveCamera(false);
    syncMedia();
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tabMeshes = [mainTab, belowTab, rightTab];

  function pointerNDC(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function tabAt(e) {
    pointerNDC(e);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(tabMeshes.filter((mesh) => mesh.visible), false);
    if (!hits.length) return 0;
    return hits[0].object.userData.slot || 0;
  }

  function resize(w, h) {
    viewW = w;
    viewH = h;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    moveCamera(!camAnimating);
  }

  function update(dt, now) {
    if (camAnimating) {
      const t = Math.min(1, (now - camStart) / 1100);
      const e = easeInOut(t);
      camera.position.lerpVectors(camFrom, camTo, e);
      lookNow.lerpVectors(lookFrom, lookTo, e);
      camera.fov = fovFrom + (fovTo - fovFrom) * e;
      roll = rollFrom + (rollTo - rollFrom) * e;
      camera.updateProjectionMatrix();
      if (t >= 1) camAnimating = false;
    }
    applyCamera();
    if (turning && turn) {
      turn.elapsed += dt;
      const t = Math.min(1, turn.elapsed / turn.dur);
      const e = easeInOut(t);
      deform(turn.fromAngle + (turn.toAngle - turn.fromAngle) * e);
      if (t >= 1) {
        turning = false;
        applyRest(slot);
      }
    }
    const refresh = (page) => {
      if (!page || !page.dynamic) return;
      paintDynamic(page);
      [page.leftTex, page.rightTex].forEach((tex) => {
        const copy = tex && flipCache.get(tex);
        if (copy) copy.needsUpdate = true;
      });
    };
    const active = pages[slot - 1];
    refresh(active);
    if (turning && turn && turn.from > 0 && pages[turn.from - 1] !== active) refresh(pages[turn.from - 1]);
  }

  function step(dir) {
    if (!pages.length) return false;
    aim(slot + (dir < 0 ? -1 : 1), reduce);
    return true;
  }

  function pointerDown(e) {
    const next = tabAt(e);
    if (next) {
      aim(next, reduce);
      return true;
    }
    return false;
  }

  function pointerMove(e) {
    renderer.domElement.style.cursor = tabAt(e) ? 'pointer' : '';
  }

  function pause() {
    suspended = true;
    pages.forEach((page) => page.videos.forEach((entry) => entry.video.pause()));
    gradeOff();
  }

  function resume() {
    suspended = false;
    gradeOn();
    syncMedia();
  }

  function render(gl) {
    if (!suspended) gradeOn();
    gl.setRenderTarget(null);
    gl.render(scene, camera);
  }

  applyRest(1);
  moveCamera(true);
  syncMedia();

  return {
    scene,
    camera,
    resize,
    update,
    render,
    resume,
    step,
    pointerDown,
    pointerMove,
    pause,
    nav: () => ({
      index: slot - 1,
      total: pages.length,
      label: pages[slot - 1] ? pages[slot - 1].title : '',
      project: pages[slot - 1] ? pages[slot - 1].project : null,
    }),
  };
}
