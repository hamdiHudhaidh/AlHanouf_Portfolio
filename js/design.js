import * as THREE from 'three';
import { RoomEnvironment } from './vendor/addons/RoomEnvironment.js';
import { ARTIST } from './projects.js';

// Design is a ring binder on a black ground. 00 is the closed cover.
// Each later number opens one project: a coloured divider, a page turn
// around the rings, and that project's pictures, film, or site.

const TEX_W = 720;
const TEX_H = 992;
const PAGE_W = 1.05;
const PAGE_H = PAGE_W * (TEX_H / TEX_W);
const GUTTER = 0.016;
const HOLE_X = 0.108;
const RING_Z = 0.02;
const RING_Y = [0.46, 0, -0.46];
const TAB_W = 0.15;
const TAB_COLORS = ['#6f8fbf', '#e7a0b4', '#f2d15a', '#3f9a4a', '#f0a04a', '#d6453d', '#8d6bb5', '#3aa8a0', '#c4785a', '#8a9a4a'];
const CREAM = '#f3f0e6';
const INK = '#1c1916';

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

function drawRules(ctx, header, footer, holes) {
  const leftX = holes === 'left' ? 98 : 42;
  const rightX = holes === 'right' ? TEX_W - 98 : TEX_W - 42;
  ctx.save();
  ctx.strokeStyle = 'rgba(22,18,14,0.72)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, 58);
  ctx.lineTo(rightX, 58);
  ctx.moveTo(leftX, TEX_H - 58);
  ctx.lineTo(rightX, TEX_H - 58);
  ctx.stroke();
  ctx.fillStyle = 'rgba(22,18,14,0.82)';
  ctx.font = '500 13px Inter';
  ctx.textBaseline = 'middle';
  const place = (labels, y) => {
    fillTracked(ctx, labels[0] || '', leftX, y, 'left', 1.6);
    fillTracked(ctx, labels[1] || '', TEX_W / 2, y, 'center', 1.6);
    fillTracked(ctx, labels[2] || '', rightX, y, 'right', 1.6);
  };
  place(header, 34);
  ctx.font = '500 12px Inter';
  place(footer, TEX_H - 34);
  ctx.restore();
}

function drawSheet(ctx, { fill, header, footer, holes }) {
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
  drawRules(ctx, header, footer, holes === 'right' ? 'right' : 'left');
  punch(ctx, holes === 'right' ? 'right' : 'left');
}

function contentBox(holes) {
  if (holes === 'right') return { x: 42, w: TEX_W - 42 - 108 };
  return { x: 108, w: TEX_W - 108 - 42 };
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
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = CREAM;
  ctx.font = '500 15px Inter';
  ctx.textBaseline = 'middle';
  fillTracked(ctx, 'VISIT SITE', x + w / 2, y + h / 2, 'center', 1.8);
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

function tabTexture(title, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  const label = String(title || '').toUpperCase();
  let size = 42;
  let tracking = 1.2;
  ctx.font = `500 ${size}px Inter`;
  while (size > 11 && trackedWidth(ctx, label, tracking) > 196) {
    size -= 1;
    tracking = size > 18 ? 1 : 0.3;
    ctx.font = `500 ${size}px Inter`;
  }
  fillTracked(ctx, label, 0, 0, 'center', tracking);
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(256, 250, 20, 256, 256, 250);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.2)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
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
    (project.items || []).forEach((item) => {
      if (item.src) sources.add(item.src);
      if (item.poster) sources.add(item.poster);
    });
  });
  const images = new Map();
  await Promise.all([...sources].map(async (src) => {
    images.set(src, await loadImage(src));
  }));

  const pages = projects.map((project, index) => {
    const num = String(index + 1).padStart(2, '0');
    const color = TAB_COLORS[index % TAB_COLORS.length];
    const fill = mixHex(color, '#f6f3ec', 0.12);
    const seen = new Set();
    const coverSrc = project.images?.[0];
    if (coverSrc) seen.add(coverSrc);
    const stills = [];
    (project.images || []).slice(1).forEach((src) => {
      if (seen.has(src)) return;
      seen.add(src);
      if (images.get(src)) stills.push(images.get(src));
    });
    const videos = [];
    let website = null;
    (project.items || []).forEach((item) => {
      if (item.kind === 'image') {
        if (seen.has(item.src)) return;
        seen.add(item.src);
        if (images.get(item.src)) stills.push(images.get(item.src));
      } else if (item.kind === 'video') {
        videos.push({ video: makeVideo(item.src), poster: images.get(item.poster) || null });
      } else if (item.kind === 'website' && !website) {
        website = { image: images.get(item.src) || null, href: item.href || '' };
      }
    });
    return {
      project,
      index,
      num,
      color,
      fill,
      title: project.title || '',
      text: project.text || '',
      year: project.year || '',
      cover: images.get(coverSrc) || null,
      stills,
      videos,
      website,
      scroll: 0,
      films: [],
      visitRect: null,
      dynamic: videos.length > 0 || !!website,
    };
  });

  const nameFooter = coverFooter();

  function header(num) {
    return ['DESIGN', 'PORTFOLIO', num];
  }

  function paintBase(canvas, page, holes) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const num = page ? page.num : '00';
    const fill = page ? page.fill : CREAM;
    const footer = page ? footerParts(page.title, page.year, page.num) : nameFooter;
    drawSheet(ctx, { fill, header: header(num), footer, holes });
    const box = contentBox(holes);
    const top = 86;
    const bottom = TEX_H - 78;
    if (!page) {
      ctx.fillStyle = INK;
      ctx.textBaseline = 'middle';
      ctx.font = '500 24px Inter';
      fillTracked(ctx, String(ARTIST.name || '').toUpperCase(), TEX_W / 2, TEX_H / 2 - 86, 'center', 1.5);
      ctx.font = '800 104px Inter';
      ctx.textAlign = 'center';
      const word = 'Design';
      let size = 104;
      ctx.font = `800 ${size}px Inter`;
      while (size > 64 && ctx.measureText(word).width > TEX_W - 150) {
        size -= 4;
        ctx.font = `800 ${size}px Inter`;
      }
      ctx.fillText(word, TEX_W / 2, TEX_H / 2 + 36);
      ctx.textAlign = 'left';
      return;
    }
    if (holes === 'right') {
      ctx.fillStyle = INK;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      let size = 68;
      ctx.font = `800 ${size}px Inter`;
      let lines = wrapLines(ctx, page.title.toUpperCase(), box.w);
      while (size > 34 && lines.length > 3) {
        size -= 2;
        ctx.font = `800 ${size}px Inter`;
        lines = wrapLines(ctx, page.title.toUpperCase(), box.w);
      }
      let y = top;
      lines.forEach((line) => {
        ctx.fillText(line, box.x, y);
        y += size * 0.94;
      });
      y += 22;
      drawContain(ctx, page.cover, box.x, y, box.w, bottom - y);
      return;
    }
    ctx.fillStyle = INK;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    let y = top;
    const mediaCount = page.stills.length + page.videos.length + (page.website ? 1 : 0);
    if (page.text && mediaCount === 0) {
      let size = 36;
      ctx.font = `400 ${size}px Inter`;
      let lines = wrapLines(ctx, page.text, box.w * 0.92);
      while (size > 22 && lines.length > 8) {
        size -= 2;
        ctx.font = `400 ${size}px Inter`;
        lines = wrapLines(ctx, page.text, box.w * 0.92);
      }
      const lh = size * 1.35;
      const block = lines.length * lh;
      y = top + Math.max(0, (bottom - top - block) / 2);
      lines.forEach((line) => {
        ctx.fillText(line, box.x, y);
        y += lh;
      });
      return;
    }
    if (page.text) {
      ctx.font = '400 20px Inter';
      const lines = wrapLines(ctx, page.text, box.w);
      lines.forEach((line) => {
        ctx.fillText(line, box.x, y);
        y += 28;
      });
      y += 16;
    }
    const avail = bottom - y;
    if (page.website) {
      const filmH = page.videos.length ? Math.min(200, avail * 0.28) : 0;
      const visitH = page.website.href ? 48 : 0;
      const webH = Math.max(80, avail - filmH - visitH - (filmH ? 14 : 0) - (visitH ? 12 : 0));
      page.webRect = { x: box.x, y, w: box.w, h: webH };
      y += webH + 12;
      if (page.website.href) {
        const bw = Math.min(230, box.w);
        page.visitRect = { x: box.x, y, w: bw, h: 42 };
        drawVisitTag(ctx, box.x, y, bw, 42);
        y += 42 + 14;
      }
      page.films = filmRects(page.videos, box.x, y, box.w, Math.max(0, bottom - y));
      page.films.forEach((film) => drawFilm(ctx, film.rect, film.poster));
      return;
    }
    if (page.videos.length && page.stills.length) {
      const filmH = Math.min(230, avail * 0.4);
      layoutStills(ctx, page.stills, box.x, y, box.w, avail - filmH - 12);
      page.films = filmRects(page.videos, box.x, y + avail - filmH, box.w, filmH);
      page.films.forEach((film) => drawFilm(ctx, film.rect, film.poster));
      return;
    }
    if (page.videos.length) {
      page.films = filmRects(page.videos, box.x, y, box.w, avail);
      page.films.forEach((film) => drawFilm(ctx, film.rect, film.poster));
      return;
    }
    layoutStills(ctx, page.stills, box.x, y, box.w, avail);
  }

  function drawWebsite(ctx, page) {
    const image = page.website && page.website.image;
    const rect = page.webRect;
    if (!image || !rect) return;
    const { x, y, w, h } = rect;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = '#f7f4ee';
    ctx.fillRect(x, y, w, h);
    const sw = image.naturalWidth || image.width;
    const shFull = image.naturalHeight || image.height;
    const scale = w / sw;
    const srcH = Math.min(shFull, h / scale);
    const maxScroll = Math.max(1, shFull - srcH);
    const sy = reduce ? 0 : page.scroll % maxScroll;
    ctx.drawImage(image, 0, sy, sw, srcH, x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = 'rgba(22,18,14,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function paintDynamic(page) {
    if (!page || !page.dynamic) return;
    const ctx = page.live.getContext('2d');
    ctx.drawImage(page.base, 0, 0);
    if (page.website) drawWebsite(ctx, page);
    page.films.forEach((film) => {
      const frame = film.video.readyState >= 2 ? film.video : film.poster;
      drawFilm(ctx, film.rect, frame);
    });
    page.rightTex.needsUpdate = true;
  }

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
    if (page.dynamic) {
      page.live = document.createElement('canvas');
      page.live.width = TEX_W;
      page.live.height = TEX_H;
      page.live.getContext('2d').drawImage(page.base, 0, 0);
      if (page.website) drawWebsite(page.live.getContext('2d'), page);
    }
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;
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
    page.leftTex = makeTexture(page.left, false);
    page.rightTex = makeTexture(page.dynamic ? page.live : page.base, page.dynamic);
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

  scene.add(new THREE.HemisphereLight(0xf4f7fb, 0x1a1c20, 0.78));
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const key = new THREE.DirectionalLight(0xfff7ef, 2.35);
  key.position.set(-2.4, 3.6, 5.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe4edf8, 0.7);
  fill.position.set(3.4, 0.4, 3.6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.28);
  rim.position.set(0.4, -2.2, 2.4);
  scene.add(rim);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 18),
    new THREE.MeshBasicMaterial({ color: 0x070707 }),
  );
  backdrop.position.z = -0.9;
  scene.add(backdrop);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 3.3),
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
      pos.setXYZ(i, x * Math.cos(ang), y, x * Math.sin(ang) + 0.008);
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

  const tabMargin = PAGE_H * 0.055;
  const tabSpan = (PAGE_H - tabMargin * 2) / Math.max(1, pages.length);
  const tabH = tabSpan * 0.9;
  const tabs = pages.map((page, i) => {
    const fg = luminance(page.color) > 0.58 ? INK : '#f6f3ee';
    const group = new THREE.Group();
    group.userData.slot = i + 1;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(TAB_W, tabH, 0.012),
      new THREE.MeshBasicMaterial({ color: page.color }),
    );
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(TAB_W * 0.9, tabH * 0.9),
      new THREE.MeshBasicMaterial({ map: tabTexture(page.title, fg), transparent: true, depthWrite: false }),
    );
    label.position.z = 0.0075;
    body.renderOrder = 2;
    label.renderOrder = 3;
    group.add(body);
    group.add(label);
    group.position.y = PAGE_H / 2 - tabMargin - tabSpan * (i + 0.5);
    scene.add(group);
    return { group, from: 0, to: 0, y: group.position.y };
  });

  function tabTarget(i, which) {
    return i < which - 1 ? Math.PI : 0;
  }

  function poseTab(tab, angle) {
    const outward = Math.cos(angle) >= 0 ? 1 : -1;
    const edge = GUTTER + PAGE_W;
    tab.group.position.set(
      Math.cos(angle) * edge + outward * (TAB_W / 2),
      tab.y,
      Math.sin(angle) * 0.18,
    );
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
    renderer.toneMappingExposure = gradeSaved.exposure * 1.14;
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
    tabs.forEach((tab, i) => {
      const angle = tabTarget(i, which);
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
      start: performance.now(),
      dur: 1080,
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
    showCurl(true);
    deform(turn.fromAngle);
    tabs.forEach((tab, i) => {
      tab.from = tabTarget(i, from);
      tab.to = tabTarget(i, to);
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
    if (which === 0 || narrow) {
      const left = -HOLE_X - 0.02;
      const right = GUTTER + PAGE_W + TAB_W + 0.02;
      halfW = (right - left) / 2;
      halfH = PAGE_H / 2 + 0.02;
      focusX = (left + right) / 2;
    } else {
      halfW = GUTTER + PAGE_W + TAB_W + 0.03;
      halfH = PAGE_H / 2 + 0.03;
      focusX = 0;
    }
    const distV = halfH / (tanV * usable * 0.93);
    const distH = halfW / (tanH * (narrow ? 0.88 : 0.93));
    const dist = Math.max(distV, distH) * (narrow ? 1.02 : 1.04);
    const topLimit = 1 - 2 * top;
    const botLimit = -1 + 2 * bottom;
    const safeCenter = (topLimit + botLimit) / 2;
    const look = new THREE.Vector3(focusX, focusY - dist * tanV * safeCenter, 0);
    const ox = narrow ? 0.04 : 0.2;
    const oy = narrow ? 0.05 : 0.16;
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
      const t = Math.min(1, (now - turn.start) / turn.dur);
      const e = easeInOut(t);
      deform(turn.fromAngle + (turn.toAngle - turn.fromAngle) * e);
      poseTabs(e);
      if (t >= 1) {
        turning = false;
        applyRest(slot);
      }
    }
    const active = slot > 0 ? pages[slot - 1] : null;
    if (active && active.website && !reduce && !suspended) active.scroll += dt * 260;
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
