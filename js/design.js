import * as THREE from 'three';
import { RoomEnvironment } from './vendor/addons/RoomEnvironment.js';
import { ARTIST } from './projects.js';

// Design is a ring binder on the same bone ground as the other scenes.
// 00 is the closed cover. Each later number is one project, in category
// order. Only the first project of a category has a divider tab, labelled
// with that category in one horizontal size. A two-word label wraps so the
// tab only sticks out a short way past the page. Every page is the cover
// white. Only the tab is coloured, and the type on the page uses that colour.
// Each spread is filled with that project's own images, videos and text.
// A video keeps its own aspect ratio. The page turns around the rings.

const TEX_W = 720;
const TEX_H = 992;
const PAGE_W = 1.05;
const PAGE_H = PAGE_W * (TEX_H / TEX_W);
const GUTTER = 0.016;
const HOLE_X = 0.108;
const RING_Z = 0.02;
const RING_Y = [0.46, 0, -0.46];
const SECTION_COLORS = ['#6f8fbf', '#e7a0b4', '#f2d15a', '#3f9a4a', '#f0a04a', '#d6453d', '#8d6bb5', '#3aa8a0', '#c4785a', '#8a9a4a'];
const CREAM = '#f3f0e6';
const INK = '#1c1916';

function groupByCategory(list) {
  const order = [];
  const buckets = new Map();
  list.forEach((project) => {
    const key = project.category || project.title || '';
    if (!buckets.has(key)) {
      order.push(key);
      buckets.set(key, []);
    }
    buckets.get(key).push(project);
  });
  const grouped = [];
  order.forEach((key) => buckets.get(key).forEach((project) => grouped.push(project)));
  return grouped;
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
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

function mixHex(hex, toward, t) {
  const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = parse(hex);
  const b = parse(toward);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
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
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.src = src;
  return video;
}

function trackedWidth(ctx, text, tracking) {
  const chars = [...text];
  if (!chars.length) return 0;
  return chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + tracking * (chars.length - 1);
}

function fillTracked(ctx, text, x, y, align, tracking) {
  const chars = [...text];
  if (!chars.length) return;
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let cx = x;
  if (align === 'center') cx = x - total / 2;
  if (align === 'right') cx = x - total;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + tracking;
  });
  ctx.textAlign = prev;
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
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawContain(ctx, img, x, y, w, h) {
  if (!img || w < 2 || h < 2) return;
  const ir = (img.naturalWidth || img.width) / (img.naturalHeight || img.height || 1);
  const r = w / h;
  let dw;
  let dh;
  if (ir > r) {
    dw = w;
    dh = w / ir;
  } else {
    dh = h;
    dw = h * ir;
  }
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(20,16,12,0.18)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function grainCanvas() {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + Math.random() * 150;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
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

const GRAIN = grainCanvas();

function punch(ctx, side) {
  const inset = ((HOLE_X - GUTTER) / PAGE_W) * TEX_W;
  const x = side === 'right' ? TEX_W - inset : inset;
  ctx.globalCompositeOperation = 'destination-out';
  RING_Y.forEach((worldY) => {
    const y = (0.5 - worldY / PAGE_H) * TEX_H;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
  ctx.save();
  RING_Y.forEach((worldY) => {
    const y = (0.5 - worldY / PAGE_H) * TEX_H;
    const shade = ctx.createRadialGradient(x - 2, y - 2, 3, x, y, 18);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.7, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawRules(ctx, header, footer, holes, ink) {
  const leftX = holes === 'left' ? 98 : 42;
  const rightX = holes === 'right' ? TEX_W - 98 : TEX_W - 42;
  const light = luminance(ink) > 0.7;
  ctx.save();
  ctx.strokeStyle = light ? 'rgba(246,241,230,0.72)' : 'rgba(22,18,14,0.55)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(leftX, 58);
  ctx.lineTo(rightX, 58);
  ctx.moveTo(leftX, TEX_H - 58);
  ctx.lineTo(rightX, TEX_H - 58);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = '600 14px Inter, "Noto Naskh Arabic", sans-serif';
  ctx.textBaseline = 'middle';
  const place = (labels, y, tracking) => {
    fillTracked(ctx, labels[0] || '', leftX, y, 'left', tracking);
    fillTracked(ctx, labels[1] || '', TEX_W / 2, y, 'center', tracking);
    fillTracked(ctx, labels[2] || '', rightX, y, 'right', tracking);
  };
  place(header, 34, 2.8);
  ctx.font = '500 13px Inter, "Noto Naskh Arabic", sans-serif';
  place(footer, TEX_H - 34, 2.2);
  ctx.restore();
}

function drawSheet(ctx, { fill, header, footer, holes, ink }) {
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat');
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.restore();
  const spineAtLeft = holes !== 'right';
  const grad = ctx.createLinearGradient(spineAtLeft ? 0 : TEX_W, 0, spineAtLeft ? 150 : TEX_W - 150, 0);
  grad.addColorStop(0, 'rgba(20,16,12,0.11)');
  grad.addColorStop(1, 'rgba(20,16,12,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  drawRules(ctx, header, footer, holes === 'right' ? 'right' : 'left', ink || INK);
  punch(ctx, holes === 'right' ? 'right' : 'left');
}

function contentBox(holes) {
  if (holes === 'right') return { x: 42, w: TEX_W - 42 - 108 };
  return { x: 108, w: TEX_W - 108 - 42 };
}

function sheetInk(fill) {
  return luminance(fill) > 0.68 ? INK : '#f6f1e6';
}

function inkOf(hex) {
  const color = new THREE.Color(hex || INK);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  if (hsl.s < 0.28) hsl.s = 0.42;
  if (hsl.l > 0.4) hsl.l = 0.36;
  return `#${new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s), hsl.l).getHexString()}`;
}

function aspectOf(slot) {
  const video = slot && slot.video;
  if (slot && slot.kind === 'video' && video && video.videoWidth && video.videoHeight) {
    return video.videoWidth / video.videoHeight;
  }
  const img = slot && (slot.poster || slot.image);
  const w = img ? (img.naturalWidth || img.videoWidth || img.width) : 1;
  const h = img ? (img.naturalHeight || img.videoHeight || img.height) : 1;
  if (!w || !h) return 1;
  return w / h;
}

function preloadVideo(video) {
  return new Promise((resolve) => {
    if (!video) { resolve(); return; }
    if (video.readyState >= 2) { resolve(); return; }
    const done = () => {
      video.removeEventListener('loadeddata', done);
      video.removeEventListener('error', done);
      resolve();
    };
    video.addEventListener('loadeddata', done);
    video.addEventListener('error', done);
    setTimeout(done, 2500);
  });
}

function traceRound(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function coverImage(ctx, img, x, y, w, h) {
  if (!img || w < 2 || h < 2) return;
  const iw = img.naturalWidth || img.videoWidth || img.width;
  const ih = img.naturalHeight || img.videoHeight || img.height || 1;
  if (!iw || !ih) return;
  const ir = iw / ih;
  const tr = w / h;
  let dw;
  let dh;
  if (ir > tr) {
    dh = h;
    dw = h * ir;
  } else {
    dw = w;
    dh = w / ir;
  }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawTile(ctx, slot, x, y, w, h) {
  if (w < 4 || h < 4) return;
  const r = Math.max(10, Math.min(18, Math.round(Math.min(w, h) * 0.08)));
  ctx.save();
  ctx.shadowColor = 'rgba(20,16,12,0.30)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = 'rgba(255,252,246,0.20)';
  traceRound(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
  const frame = slot && (slot.image || slot.poster);
  if (frame) {
    ctx.save();
    traceRound(ctx, x, y, w, h, r);
    ctx.clip();
    coverImage(ctx, frame, x, y, w, h);
    ctx.restore();
  }
  if (slot) slot.rect = { x, y, w, h, r };
}

function paintLive(ctx, slot) {
  if (!slot || !slot.rect) return;
  const { x, y, w, h, r } = slot.rect;
  ctx.save();
  traceRound(ctx, x, y, w, h, r || 12);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,252,246,0.16)';
  ctx.fillRect(x, y, w, h);
  if (slot.kind === 'website' && slot.image) {
    const image = slot.image;
    const sw = image.naturalWidth || image.width;
    const shFull = image.naturalHeight || image.height;
    const scale = w / sw;
    const srcH = Math.min(shFull, h / scale);
    const maxScroll = Math.max(1, shFull - srcH);
    const sy = slot.scroll == null ? 0 : slot.scroll % maxScroll;
    ctx.drawImage(image, 0, sy, sw, srcH, x, y, w, h);
  } else if (slot.kind === 'video') {
    const frame = slot.video && slot.video.readyState >= 2 ? slot.video : (slot.poster || slot.image);
    if (frame) drawContain(ctx, frame, x, y, w, h);
  }
  ctx.restore();
}

function drawSwatches(ctx, swatches, x, y, w, ink) {
  const n = swatches.length;
  if (!n) return 0;
  const gap = Math.max(10, Math.round(w / 40));
  const sw = Math.min(72, Math.floor((w - gap * (n - 1)) / n));
  const named = swatches.some((s) => s.name);
  swatches.forEach((swatch, i) => {
    const sx = x + i * (sw + gap);
    ctx.save();
    ctx.shadowColor = 'rgba(20,16,12,0.24)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = swatch.hex;
    traceRound(ctx, sx, y, sw, sw, 10);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(20,16,12,0.28)';
    ctx.lineWidth = 1;
    traceRound(ctx, sx, y, sw, sw, 10);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    let ly = y + sw + 6;
    if (swatch.name) {
      ctx.font = '600 12px Inter, "Noto Naskh Arabic", sans-serif';
      ctx.fillText(swatch.name, sx, ly);
      ly += 15;
    }
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillText(swatch.hex, sx, ly);
  });
  return sw + (named ? 40 : 24);
}

function drawFilm(ctx, rect, frame) {
  const { x, y, w, h } = rect;
  ctx.fillStyle = '#141414';
  ctx.fillRect(x, y, w, h);
  const band = Math.max(12, Math.min(22, w * 0.08));
  const count = Math.max(4, Math.floor((h - 10) / 18));
  ctx.fillStyle = CREAM;
  for (let i = 0; i < count; i += 1) {
    const hy = y + 6 + ((h - 16) / count) * i;
    ctx.fillRect(x + 3, hy, band - 8, 7);
    ctx.fillRect(x + w - band + 5, hy, band - 8, 7);
  }
  if (frame) drawContain(ctx, frame, x + band, y + 5, w - band * 2, h - 10);
}

function drawVisitTag(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = INK;
  traceRound(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = CREAM;
  const size = Math.max(11, Math.min(15, Math.floor(h * 0.42)));
  ctx.font = `600 ${size}px Inter`;
  ctx.textBaseline = 'middle';
  fillTracked(ctx, 'VISIT SITE', x + w / 2, y + h / 2, 'center', 1.1);
  ctx.restore();
}

function layoutStills(ctx, stills, x, y, w, h) {
  const n = stills.length;
  if (!n || h < 8) return;
  const cols = n === 1 ? 1 : n >= 5 ? 3 : 2;
  const rows = Math.ceil(n / cols);
  const gap = 12;
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = (h - gap * (rows - 1)) / rows;
  stills.forEach((img, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    drawContain(ctx, img, x + c * (cw + gap), y + r * (ch + gap), cw, ch);
  });
}

function filmRects(videos, x, y, w, h) {
  const n = videos.length;
  if (!n || h < 8) return [];
  const cols = n >= 4 ? 2 : n === 3 ? 3 : 1;
  const rows = Math.ceil(n / cols);
  const gap = 10;
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = (h - gap * (rows - 1)) / rows;
  return videos.map((video, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    return {
      video: video.video,
      poster: video.poster,
      rect: { x: x + c * (cw + gap), y: y + r * (ch + gap), w: cw, h: ch },
    };
  });
}

function footerParts(title, year, num) {
  const words = String(title || '').toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length >= 3) return [year, words.slice(0, -1).join(' '), words[words.length - 1]];
  if (words.length === 2) return [year, words[0], words[1]];
  if (words.length === 1) return [year, words[0], num];
  return [year, num, ''];
}

function coverFooter() {
  const words = String(ARTIST.name || '').toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length >= 3) return [words[0], words.slice(1, -1).join(' '), words[words.length - 1]];
  return [words[0] || '', words[1] || '', words[2] || ''];
}

// Short stick-out, like an index divider. The word stays horizontal.
// Two-word labels wrap onto two lines instead of lengthening the tab.
const TAB_FONT = 120;
const TAB_TRACK = 1;
const TAB_STICK = 0.26;

function labelLines(label) {
  const words = String(label || '').toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [words[0] || ''];
  if (words.length === 2) return words;
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

function tabTypeFor(labels) {
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `800 ${TAB_FONT}px Inter`;
  const layouts = labels.map(labelLines);
  const widest = Math.max(1, ...layouts.flat().map((line) => trackedWidth(probe, line, TAB_TRACK)));
  const maxLines = Math.max(1, ...layouts.map((lines) => lines.length));
  const padX = Math.round(TAB_FONT * 0.14);
  const padY = Math.round(TAB_FONT * 0.1);
  const lineH = Math.round(TAB_FONT * 1.12);
  return {
    size: TAB_FONT,
    tracking: TAB_TRACK,
    lineH,
    width: Math.ceil(widest + padX * 2),
    height: Math.ceil(maxLines * lineH + padY * 2),
  };
}

function tabTexture(title, fg, type) {
  const lines = labelLines(title);
  const canvas = document.createElement('canvas');
  canvas.width = type.width;
  canvas.height = type.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${type.size}px Inter`;
  const block = type.lineH * lines.length;
  let y = canvas.height / 2 - block / 2 + type.lineH / 2;
  lines.forEach((line) => {
    fillTracked(ctx, line, canvas.width / 2, y, 'center', type.tracking);
    y += type.lineH;
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function tabGeometry(w, h) {
  const r = Math.min(0.045, h * 0.34, w * 0.4);
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw - r, -hh);
  shape.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hh - r);
  shape.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-hw, hh);
  shape.lineTo(-hw, -hh);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: false,
    curveSegments: 10,
  });
  geo.translate(0, 0, -0.009);
  return geo;
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(256, 250, 20, 256, 256, 250);
  grd.addColorStop(0, 'rgba(92,74,58,0.20)');
  grd.addColorStop(0.5, 'rgba(92,74,58,0.07)');
  grd.addColorStop(1, 'rgba(92,74,58,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export async function createDesign(renderer, { reduce, projects }) {
  const sources = new Set();
  projects.forEach((project) => {
    (project.images || []).forEach((src) => sources.add(src));
    (project.slots || project.items || []).forEach((item) => {
      if (item && item.src) sources.add(item.src);
      if (item && item.poster) sources.add(item.poster);
    });
  });
  const images = new Map();
  await Promise.all([...sources].map(async (src) => {
    images.set(src, await loadImage(src));
  }));

  function mediaSlot(item) {
    if (!item) return null;
    if (item.kind === 'video') {
      return {
        kind: 'video',
        video: makeVideo(item.src),
        poster: images.get(item.poster) || null,
        image: images.get(item.poster) || null,
      };
    }
    if (item.kind === 'website') {
      return { kind: 'website', image: images.get(item.src) || null, href: item.href || '', scroll: 0 };
    }
    const image = images.get(item.src) || null;
    if (!image) return null;
    return { kind: 'image', image };
  }

  const ordered = groupByCategory(projects);
  const pages = ordered.map((project, index) => {
    const num = String(index + 1).padStart(2, '0');
    const raw = project.slots || [];
    const slots = raw.map((item) => mediaSlot(item)).filter(Boolean);
    const videos = slots.filter((slot) => slot && slot.kind === 'video');
    const website = slots.find((slot) => slot && slot.kind === 'website') || null;
    const leftDyn = false;
    const rightDyn = false;
    return {
      project,
      index,
      num,
      color: SECTION_COLORS[0],
      fill: CREAM,
      title: project.title || '',
      text: project.text || '',
      label: project.label || project.category || '',
      year: project.year || '',
      rightTitle: project.rightTitle || '',
      rightText: project.rightText || '',
      swatches: project.swatches || [],
      slots,
      videos,
      website,
      scroll: 0,
      visitRect: null,
      leftDyn,
      rightDyn,
      dynamic: leftDyn || rightDyn,
      section: 0,
    };
  });

  const sections = [];
  pages.forEach((page) => {
    const key = page.project.category || page.title || page.num;
    const prev = sections[sections.length - 1];
    if (!prev || prev.key !== key) {
      sections.push({
        key,
        label: key,
        first: page.index,
        color: SECTION_COLORS[sections.length % SECTION_COLORS.length],
      });
    }
    const section = sections[sections.length - 1];
    page.section = sections.length - 1;
    page.color = section.color;
    page.fill = CREAM;
    page.ink = inkOf(section.color);
  });

  const nameFooter = coverFooter();

  function runningHeader(page, holes) {
    if (!page) return ['DESIGN', 'PORTFOLIO', '00'];
    if (holes === 'right') return [String(page.title || '').toUpperCase(), '', ''];
    const bits = [page.label, page.year].filter(Boolean).join('  ').toUpperCase();
    return [bits, '', ''];
  }

  function planSpread(page) {
    const items = page.slots.map((slot) => ({ slot, aspect: Math.max(0.2, aspectOf(slot)) }));
    const sites = items.filter((item) => item.slot.kind === 'website');
    const rest = items.filter((item) => item.slot.kind !== 'website');
    const left = [];
    const right = [];
    if (!rest.length) {
      right.push(...sites);
    } else if (rest.length === 1 && !sites.length) {
      right.push(rest[0]);
    } else {
      const leftCount = Math.max(1, Math.ceil(rest.length / 2));
      left.push(...rest.slice(0, leftCount));
      right.push(...rest.slice(leftCount), ...sites);
    }
    left.forEach((item) => { item.slot.page = 'left'; });
    right.forEach((item) => { item.slot.page = 'right'; });
    page.plan = { left, right };
    page.leftDyn = left.some((item) => item.slot.kind === 'video');
    page.rightDyn = right.some((item) => item.slot.kind === 'video');
    page.dynamic = page.leftDyn || page.rightDyn;
  }

  function drawCopy(ctx, page, x, y, w, ink, roomy) {
    const face = 'Inter, "Noto Naskh Arabic", sans-serif';
    ctx.fillStyle = ink;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    let cursor = y;
    if (page.label) {
      ctx.font = '600 15px Inter, "Noto Naskh Arabic", sans-serif';
      fillTracked(ctx, String(page.label).toUpperCase(), x, cursor + 12, 'left', 2.2);
      cursor += 36;
    }
    const title = String(page.title || '');
    if (title) {
      let size = roomy ? 64 : 40;
      ctx.font = `800 ${size}px ${face}`;
      let lines = wrapLines(ctx, title, w);
      const cap = roomy ? 4 : 2;
      while (size > 26 && lines.length > cap) {
        size -= 2;
        ctx.font = `800 ${size}px ${face}`;
        lines = wrapLines(ctx, title, w);
      }
      lines.slice(0, cap).forEach((line) => {
        ctx.fillText(line, x, cursor);
        cursor += size * 1.02;
      });
      cursor += 12;
    }
    if (page.text) {
      ctx.font = `400 ${roomy ? 22 : 18}px ${face}`;
      const lead = roomy ? 30 : 24;
      wrapLines(ctx, page.text, w).slice(0, roomy ? 8 : 4).forEach((line) => {
        ctx.fillText(line, x, cursor);
        cursor += lead;
      });
      cursor += 8;
    }
    if (page.swatches.length) cursor += drawSwatches(ctx, page.swatches, x, cursor, w, ink) + 16;
    return cursor;
  }

  function drawNote(ctx, page, x, y, w, ink) {
    const face = 'Inter, "Noto Naskh Arabic", sans-serif';
    ctx.fillStyle = ink;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    let cursor = y;
    if (page.rightTitle) {
      let size = 32;
      ctx.font = `800 ${size}px ${face}`;
      let lines = wrapLines(ctx, page.rightTitle, w);
      while (size > 22 && lines.length > 2) {
        size -= 2;
        ctx.font = `800 ${size}px ${face}`;
        lines = wrapLines(ctx, page.rightTitle, w);
      }
      lines.slice(0, 2).forEach((line) => {
        ctx.fillText(line, x, cursor);
        cursor += size * 1.05;
      });
      cursor += 8;
    }
    if (page.rightText) {
      ctx.font = `400 18px ${face}`;
      wrapLines(ctx, page.rightText, w).slice(0, 4).forEach((line) => {
        ctx.fillText(line, x, cursor);
        cursor += 24;
      });
      cursor += 12;
    }
    return cursor;
  }

  function placeMedia(ctx, item, x, y, w, h, page, side) {
    if (w < 8 || h < 8) return;
    const slot = item.slot;
    const r = Math.max(8, Math.min(16, Math.round(Math.min(w, h) * 0.045)));
    const frame = slot.poster || slot.image;
    ctx.save();
    ctx.shadowColor = 'rgba(20,16,12,0.22)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    traceRound(ctx, x, y, w, h, r);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    ctx.restore();
    if (frame) {
      ctx.save();
      traceRound(ctx, x, y, w, h, r);
      ctx.clip();
      drawContain(ctx, frame, x, y, w, h);
      ctx.restore();
    }
    slot.rect = { x, y, w, h, r };
    slot.page = side;
    if (side === 'right' && slot.kind === 'website' && slot.href) {
      const bw = Math.min(168, w - 20);
      const bh = 32;
      page.visitRect = { x: x + 10, y: y + h - bh - 10, w: bw, h: bh };
      drawVisitTag(ctx, page.visitRect.x, page.visitRect.y, bw, bh);
    }
  }

  function packMedia(ctx, items, area, page, side) {
    if (!items.length || area.h < 24 || area.w < 24) return;
    const gap = 14;
    if (items.length === 1) {
      placeMedia(ctx, items[0], area.x, area.y, area.w, area.h, page, side);
      return;
    }
    const rows = items.length <= 2 ? 1 : items.length <= 5 ? 2 : items.length <= 9 ? 3 : 4;
    const per = Math.ceil(items.length / rows);
    const groups = [];
    for (let i = 0; i < items.length; i += per) groups.push(items.slice(i, i + per));
    const naturals = groups.map((group) => {
      const sum = group.reduce((total, item) => total + item.aspect, 0);
      return (area.w - gap * (group.length - 1)) / Math.max(0.01, sum);
    });
    const sumH = naturals.reduce((total, value) => total + value, 0);
    const avail = area.h - gap * (groups.length - 1);
    const scale = Math.min(1, avail / Math.max(1, sumH));
    const used = sumH * scale + gap * (groups.length - 1);
    let y = area.y + Math.max(0, (area.h - used) / 2);
    groups.forEach((group, index) => {
      const h = naturals[index] * scale;
      let x = area.x;
      group.forEach((item) => {
        const w = h * item.aspect;
        placeMedia(ctx, item, x, y, w, h, page, side);
        x += w + gap;
      });
      y += h + gap;
    });
  }

  function paintSpread(ctx, page, holes, ink) {
    const box = contentBox(holes);
    const side = holes === 'right' ? 'left' : 'right';
    const items = page.plan ? page.plan[side] : [];
    const top = 76;
    const bottom = TEX_H - 72;
    let y = top;
    const roomy = side === 'left' && !items.length;
    if (side === 'left') y = drawCopy(ctx, page, box.x, y, box.w, ink, roomy);
    else if (page.rightTitle || page.rightText) y = drawNote(ctx, page, box.x, y, box.w, ink);
    if (side === 'right') page.visitRect = null;
    packMedia(ctx, items, { x: box.x, y, w: box.w, h: Math.max(40, bottom - y) }, page, side);
  }

  function paintBase(canvas, page, holes) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const fill = page ? page.fill : CREAM;
    const ink = page ? (page.ink || inkOf(page.color)) : INK;
    const footer = page ? footerParts(page.title, page.year, page.num) : nameFooter;
    drawSheet(ctx, { fill, header: runningHeader(page, holes), footer, holes, ink });
    if (!page) {
      ctx.fillStyle = INK;
      ctx.textBaseline = 'middle';
      ctx.font = '500 24px Inter';
      fillTracked(ctx, String(ARTIST.name || '').toUpperCase(), TEX_W / 2, TEX_H / 2 - 86, 'center', 1.5);
      ctx.textAlign = 'center';
      let size = 104;
      ctx.font = `800 ${size}px Inter`;
      while (size > 64 && ctx.measureText('Design').width > TEX_W - 150) {
        size -= 4;
        ctx.font = `800 ${size}px Inter`;
      }
      ctx.fillText('Design', TEX_W / 2, TEX_H / 2 + 36);
      ctx.textAlign = 'left';
      return;
    }
    paintSpread(ctx, page, holes, ink);
  }

  function paintDynamic(page) {
    if (!page || !page.dynamic) return;
    if (page.website) page.website.scroll = reduce ? 0 : page.scroll;
    if (page.leftDyn && page.leftLive) {
      const ctx = page.leftLive.getContext('2d');
      ctx.drawImage(page.left, 0, 0);
      page.slots.forEach((slot) => {
        if (slot && slot.page === 'left' && slot.kind === 'video') paintLive(ctx, slot);
      });
      if (page.leftTex) page.leftTex.needsUpdate = true;
    }
    if (page.rightDyn && page.live) {
      const ctx = page.live.getContext('2d');
      ctx.drawImage(page.base, 0, 0);
      page.slots.forEach((slot) => {
        if (slot && slot.page === 'right' && slot.kind === 'video') paintLive(ctx, slot);
      });
      if (page.visitRect) {
        const rect = page.visitRect;
        drawVisitTag(ctx, rect.x, rect.y, rect.w, rect.h);
      }
      if (page.rightTex) page.rightTex.needsUpdate = true;
    }
  }

  const pendingVideos = [];
  pages.forEach((page) => page.videos.forEach((entry) => pendingVideos.push(entry.video)));
  await Promise.all(pendingVideos.map((video) => preloadVideo(video)));
  pages.forEach((page) => planSpread(page));

  const coverCanvas = document.createElement('canvas');
  coverCanvas.width = TEX_W;
  coverCanvas.height = TEX_H;
  paintBase(coverCanvas, null, 'left');

  pages.forEach((page) => {
    page.left = document.createElement('canvas');
    page.left.width = TEX_W;
    page.left.height = TEX_H;
    paintBase(page.left, page, 'right');
    page.base = document.createElement('canvas');
    page.base.width = TEX_W;
    page.base.height = TEX_H;
    paintBase(page.base, page, 'left');
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e1d6');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  pmrem.dispose();

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
      roughness: 0.9,
      roughnessMap: rough,
      metalness: 0,
      envMapIntensity: 0.2,
      side,
      alphaTest: 0.45,
    });
  }

  const coverTex = makeTexture(coverCanvas, false);
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
  const key = new THREE.DirectionalLight(0xfff7ef, 1.55);
  key.position.set(-2.4, 3.6, 5.2);
  scene.add(key);
  const fillLight = new THREE.DirectionalLight(0xf3ece3, 0.42);
  fillLight.position.set(3.4, 0.4, 3.6);
  scene.add(fillLight);
  const rim = new THREE.DirectionalLight(0xfff8f0, 0.16);
  rim.position.set(0.4, -2.2, 2.4);
  scene.add(rim);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.9),
    new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }),
  );
  shadow.position.set(0.05, -0.04, -0.5);
  scene.add(shadow);

  const metal = new THREE.MeshStandardMaterial({
    color: 0xe4e7ec,
    metalness: 0.94,
    roughness: 0.2,
    envMap: scene.environment,
    envMapIntensity: 1.35,
  });
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.018, PAGE_H * 0.72, 0.014), metal);
  spine.position.z = RING_Z * 0.35;
  scene.add(spine);
  const ringGeo = new THREE.TorusGeometry(HOLE_X, 0.012, 20, 56);
  RING_Y.forEach((y) => {
    const ring = new THREE.Mesh(ringGeo, metal);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y, RING_Z);
    scene.add(ring);
  });

  const stackMat = [0, 1, 2, 3].map((i) => new THREE.MeshStandardMaterial({
    color: new THREE.Color(CREAM).offsetHSL(0, 0, -0.015 * i),
    roughness: 0.95,
    metalness: 0,
  }));
  const rightStack = [];
  const leftStack = [];
  function addStack(sign, list) {
    for (let i = 0; i < 4; i += 1) {
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W + 0.008, PAGE_H + 0.01), stackMat[i]);
      sheet.position.set(
        sign * (GUTTER + PAGE_W / 2 + 0.0035),
        -0.0032 * (i + 1),
        0.008 - 0.0032 * (i + 1),
      );
      scene.add(sheet);
      list.push(sheet);
    }
  }
  addStack(1, rightStack);
  addStack(-1, leftStack);

  const rightMat = paperMaterial(coverTex, THREE.FrontSide);
  const leftMat = paperMaterial(pages[0] ? pages[0].leftTex : coverTex, THREE.FrontSide);
  const rightPage = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), rightMat);
  rightPage.position.set(GUTTER + PAGE_W / 2, 0, 0.014);
  const leftPage = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), leftMat);
  leftPage.position.set(-(GUTTER + PAGE_W / 2), 0, 0.014);
  leftPage.visible = false;
  scene.add(rightPage);
  scene.add(leftPage);

  const curlGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 42, 26);
  curlGeo.translate(GUTTER + PAGE_W / 2, 0, 0);
  const restPos = new Float32Array(curlGeo.attributes.position.array);
  const frontMat = paperMaterial(coverTex, THREE.FrontSide);
  const backMat = paperMaterial(coverTex, THREE.BackSide);
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
      const y = restPos[i * 3 + 1];
      const t = THREE.MathUtils.clamp((x - GUTTER) / PAGE_W, 0, 1);
      const ang = angle + Math.sin(angle) * lead * t * t;
      pos.setXYZ(i, x * Math.cos(ang), y, x * Math.sin(ang) + 0.028);
    }
    pos.needsUpdate = true;
    curlGeo.computeVertexNormals();
    curlGeo.computeBoundingSphere();
  }

  const visit = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  visit.visible = false;
  visit.position.z = 0.02;
  rightPage.add(visit);

  const tabMargin = PAGE_H * 0.04;
  const tabCount = Math.max(1, sections.length);
  const tabSpan = (PAGE_H - tabMargin * 2) / tabCount;
  const tabH = tabSpan * 0.9;
  if (document.fonts?.load) {
    try { await document.fonts.load(`800 ${TAB_FONT}px Inter`); } catch (err) { /* measure with the fallback face */ }
  }
  const tabType = tabTypeFor(sections.map((section) => section.label));
  const innerW = TAB_STICK * 0.84;
  const innerH = tabH * 0.82;
  const aspect = tabType.width / tabType.height;
  let labelW = innerW;
  let labelH = labelW / aspect;
  if (labelH > innerH) {
    labelH = innerH;
    labelW = labelH * aspect;
  }
  const tabW = labelW / 0.84;
  const tabGeo = tabGeometry(tabW, tabH);
  const tabs = sections.map((section, i) => {
    const fg = luminance(section.color) > 0.58 ? INK : '#f6f3ee';
    const group = new THREE.Group();
    group.userData.slot = section.first + 1;
    const body = new THREE.Mesh(
      tabGeo,
      new THREE.MeshBasicMaterial({ color: section.color, side: THREE.DoubleSide }),
    );
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(labelW, labelH),
      new THREE.MeshBasicMaterial({ map: tabTexture(section.label, fg, tabType), transparent: true, depthWrite: false }),
    );
    label.position.z = 0.012;
    body.renderOrder = 2;
    label.renderOrder = 3;
    group.add(body);
    group.add(label);
    group.position.y = PAGE_H / 2 - tabMargin - tabSpan * (i + 0.5);
    scene.add(group);
    return { group, body, from: 0, to: 0, y: group.position.y, section: i };
  });

  function tabTarget(sectionIndex, which) {
    if (which <= 0) return 0;
    const open = pages[which - 1] ? pages[which - 1].section : 0;
    return open > sectionIndex ? Math.PI : 0;
  }

  function poseTab(tab, angle) {
    const outward = Math.cos(angle) >= 0 ? 1 : -1;
    const edge = GUTTER + PAGE_W;
    tab.group.position.set(
      Math.cos(angle) * edge + outward * (tabW / 2),
      tab.y,
      Math.sin(angle) * 0.18,
    );
    tab.body.scale.x = outward;
  }

  function poseTabs(t) {
    tabs.forEach((tab) => poseTab(tab, tab.from + (tab.to - tab.from) * t));
  }

  function texRight(which) {
    if (which <= 0) return coverTex;
    return pages[which - 1].rightTex;
  }

  function texLeft(which) {
    if (which <= 0) return null;
    return pages[which - 1].leftTex;
  }

  let slot = 0;
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

  function placeVisit(which) {
    const page = which > 0 ? pages[which - 1] : null;
    if (!page || !page.visitRect || !page.website || !page.website.href) {
      visit.visible = false;
      visit.userData.href = '';
      return;
    }
    const rect = page.visitRect;
    const u = (rect.x + rect.w / 2) / TEX_W;
    const v = (rect.y + rect.h / 2) / TEX_H;
    visit.position.set((u - 0.5) * PAGE_W, (0.5 - v) * PAGE_H, 0.02);
    visit.scale.set((rect.w / TEX_W) * PAGE_W * 1.12, (rect.h / TEX_H) * PAGE_H * 1.35, 1);
    visit.userData.href = page.website.href;
    visit.visible = true;
  }

  function applyRest(which) {
    rightMat.map = texRight(which);
    rightMat.needsUpdate = true;
    if (which <= 0) {
      leftPage.visible = false;
    } else {
      leftPage.visible = true;
      leftMat.map = texLeft(which);
      leftMat.needsUpdate = true;
    }
    curlFront.visible = false;
    curlBack.visible = false;
    leftStack.forEach((sheet) => { sheet.visible = which > 0; });
    placeVisit(which);
    tabs.forEach((tab) => {
      const angle = tabTarget(tab.section, which);
      tab.from = angle;
      tab.to = angle;
      poseTab(tab, angle);
    });
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
      backMat.map = flipped(texLeft(to) || coverTex);
      rightMat.map = texRight(to);
      if (from <= 0) leftPage.visible = false;
      else {
        leftPage.visible = true;
        leftMat.map = texLeft(from);
      }
    } else {
      frontMat.map = texRight(to);
      backMat.map = flipped(texLeft(from) || texRight(from));
      rightMat.map = texRight(from);
      if (to <= 0) leftPage.visible = false;
      else {
        leftPage.visible = true;
        leftMat.map = texLeft(to);
      }
    }
    frontMat.needsUpdate = true;
    backMat.needsUpdate = true;
    rightMat.needsUpdate = true;
    leftMat.needsUpdate = true;
    visit.visible = false;
    if (from > 0) paintDynamic(pages[from - 1]);
    if (to > 0) paintDynamic(pages[to - 1]);
    showCurl(true);
    deform(turn.fromAngle);
    tabs.forEach((tab) => {
      tab.from = tabTarget(tab.section, from);
      tab.to = tabTarget(tab.section, to);
    });
    turning = true;
  }

  function direction(from, to) {
    if (to === 0) return -1;
    if (from === 0) return 1;
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

  function computePose(which) {
    const narrow = narrowNow();
    const aspect = viewW / Math.max(1, viewH);
    const fov = narrow ? 30 : 28;
    const v = THREE.MathUtils.degToRad(fov);
    const tanV = Math.tan(v / 2);
    const tanH = tanV * aspect;
    const { top, bottom } = margins();
    const usable = Math.max(0.42, 1 - top - bottom);
    let halfW;
    let halfH;
    let focusX;
    const focusY = 0;
    if (which === 0) {
      const left = -HOLE_X - 0.02;
      const right = GUTTER + PAGE_W + tabW + 0.04;
      halfW = (right - left) / 2;
      halfH = PAGE_H / 2 + 0.04;
      focusX = (left + right) / 2;
    } else {
      halfW = GUTTER + PAGE_W + tabW + (narrow ? 0.04 : 0.05);
      halfH = PAGE_H / 2 + 0.04;
      focusX = 0;
    }
    const distV = halfH / (tanV * usable * 0.93);
    const distH = halfW / (tanH * (narrow ? 0.98 : 0.93));
    const dist = Math.max(distV, distH) * (narrow ? 1.0 : 1.04);
    const topLimit = 1 - 2 * top;
    const botLimit = -1 + 2 * bottom;
    const safeCenter = (topLimit + botLimit) / 2;
    const look = new THREE.Vector3(focusX, focusY - dist * tanV * safeCenter, 0);
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

  function moveCamera(which, snap) {
    const pose = computePose(which);
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
        } else {
          entry.video.pause();
        }
      });
    });
  }

  function aim(next, snap) {
    const count = pages.length + 1;
    const dest = ((next % count) + count) % count;
    const from = slot;
    if (dest === from) {
      if (!turning) moveCamera(dest, snap);
      return;
    }
    if (turning && !snap && !reduce) applyRest(from);
    const dir = direction(from, dest);
    slot = dest;
    if (snap || reduce) {
      turning = false;
      turn = null;
      applyRest(dest);
      moveCamera(dest, true);
      syncMedia();
      return;
    }
    startTurn(from, dest, dir);
    moveCamera(dest, false);
    syncMedia();
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pointerNDC(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function visitAt(e) {
    if (!visit.visible || !visit.userData.href) return null;
    pointerNDC(e);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(visit, false);
    return hits.length ? visit : null;
  }

  function tabAt(e) {
    pointerNDC(e);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(tabs.map((tab) => tab.group), true);
    if (!hits.length) return 0;
    let node = hits[0].object;
    while (node) {
      if (node.userData && node.userData.slot) return node.userData.slot;
      node = node.parent;
    }
    return 0;
  }

  function resize(w, h) {
    viewW = w;
    viewH = h;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    moveCamera(slot, !camAnimating);
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
      poseTabs(e);
      if (t >= 1) {
        turning = false;
        applyRest(slot);
      }
    }
    const active = slot > 0 ? pages[slot - 1] : null;
    if (active && active.website && !reduce && !suspended) active.scroll += dt * 42;
    if (active && active.dynamic) paintDynamic(active);
    if (turning && turn && turn.from > 0) {
      const previous = pages[turn.from - 1];
      if (previous && previous.dynamic && previous !== active) paintDynamic(previous);
    }
  }

  function step(dir) {
    if (!pages.length) return false;
    aim(slot + (dir < 0 ? -1 : 1), reduce);
    return true;
  }

  function pointerDown(e) {
    const hit = visitAt(e);
    if (hit) {
      window.open(hit.userData.href, '_blank', 'noopener,noreferrer');
      return true;
    }
    const next = tabAt(e);
    if (next) {
      aim(next, reduce);
      return true;
    }
    return false;
  }

  function pointerMove(e) {
    const hit = visitAt(e) || tabAt(e);
    renderer.domElement.style.cursor = hit ? 'pointer' : '';
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

  applyRest(0);
  aim(0, true);

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
      label: slot > 0 ? (pages[slot - 1].title || '') : '',
      project: slot > 0 ? pages[slot - 1].project : null,
    }),
  };
}
