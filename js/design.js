import * as THREE from 'three';
import { RoomEnvironment } from './vendor/addons/RoomEnvironment.js';

// Design is one off-white wall with two layers of twine.
// Two front lines hold every cover. Each project has one back line, the
// same jute, hung just behind its cover, with that project's pieces pegged
// side by side. Nothing on the wall moves. The camera glides, and the
// pieces fade, so a chosen project reads cover on one side and content
// on the other. At 00 every cover is up and the back lines stay hidden.

const WALL_HALF = 4.15;
const SAG = 0.16;
const ROW_PITCH = 2.35;
const TOP_Y = 3.45;
const PER_ROW = 5;
const COL_PITCH = 1.52;
const MAX_W = 4.25;
const COL_MAX = 1.18;
const FRONT_Z = 2.05;
const BACK_Z = 0.2;

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
  canvas.width = 720;
  canvas.height = 220;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f3eadc';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = 'rgba(110, 82, 48, 0.1)';
  g.lineWidth = 1;
  for (let y = 6; y < canvas.height; y += 6) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(canvas.width, y + Math.sin(y * 0.2) * 2);
    g.stroke();
  }
  g.strokeStyle = 'rgba(90, 64, 36, 0.28)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  g.fillStyle = '#2a241e';
  g.font = 'italic 500 68px Cormorant, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Visit site', canvas.width / 2, canvas.height / 2 + 2);
  return makeTexture(canvas, renderer);
}

function sprocketTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 160;
  const g = canvas.getContext('2d');
  g.fillStyle = '#141210';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 4; i++) {
    const y = 14 + i * 38;
    g.fillRect(16, y, 32, 18);
  }
  const tex = makeTexture(canvas, renderer, { mipmap: false });
  tex.wrapT = THREE.RepeatWrapping;
  tex.premultiplyAlpha = false;
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
    const chain = !limits.row && Boolean(next)
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

function windowCookie() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff8f2';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = 'rgba(42, 34, 28, 0.78)';
  g.lineWidth = 40;
  g.lineCap = 'butt';
  for (let x = 64; x < 512; x += 128) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 512);
    g.stroke();
  }
  for (let y = 70; y < 512; y += 140) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function noiseCanvas(size, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  paint(canvas.getContext('2d'), size);
  return canvas;
}

function plasterTextures(renderer) {
  const color = noiseCanvas(512, (g, s) => {
    g.fillStyle = '#ece7df';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2800; i += 1) {
      const v = 210 + Math.random() * 40;
      g.fillStyle = `rgba(${v},${v - 6},${v - 14},0.18)`;
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  });
  const rough = noiseCanvas(512, (g, s) => {
    const img = g.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 170 + Math.random() * 70;
      img.data[i] = n;
      img.data[i + 1] = n;
      img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  const height = noiseCanvas(256, (g, s) => {
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y += 1) {
      for (let x = 0; x < s; x += 1) {
        const n = 128 + (Math.random() - 0.5) * 28;
        const i = (y * s + x) * 4;
        img.data[i] = n;
        img.data[i + 1] = n;
        img.data[i + 2] = n;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
  const normal = noiseCanvas(256, (g, s) => {
    const src = height.getContext('2d').getImageData(0, 0, s, s).data;
    const img = g.createImageData(s, s);
    const hAt = (x, y) => src[(((y + s) % s) * s + ((x + s) % s)) * 4];
    for (let y = 0; y < s; y += 1) {
      for (let x = 0; x < s; x += 1) {
        const dx = hAt(x + 1, y) - hAt(x - 1, y);
        const dy = hAt(x, y + 1) - hAt(x, y - 1);
        const i = (y * s + x) * 4;
        img.data[i] = 128 + dx * 0.8;
        img.data[i + 1] = 128 + dy * 0.8;
        img.data[i + 2] = 255;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
  const colorTex = makeTexture(color, renderer);
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.repeat.set(3.2, 2.2);
  const roughTex = makeTexture(rough, renderer, { mipmap: false });
  roughTex.colorSpace = THREE.NoColorSpace;
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(3.2, 2.2);
  const normalTex = makeTexture(normal, renderer, { mipmap: false });
  normalTex.colorSpace = THREE.NoColorSpace;
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(4, 3);
  return { colorTex, roughTex, normalTex };
}

function juteTextures(renderer) {
  const canvas = noiseCanvas(256, (g, s) => {
    g.fillStyle = '#cbb892';
    g.fillRect(0, 0, s, s);
    g.lineWidth = 2;
    for (let x = -s; x < s * 2; x += 6) {
      g.strokeStyle = x % 12 === 0 ? '#a89068' : 'rgba(255, 244, 228, 0.35)';
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 36, s);
      g.stroke();
    }
    for (let y = 0; y < s; y += 9) {
      g.strokeStyle = 'rgba(90, 58, 28, 0.18)';
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(s, y + 4);
      g.stroke();
    }
  });
  const tex = makeTexture(canvas, renderer);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 2);
  return tex;
}

function woodTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#c6a36a';
  g.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 3) {
    const shade = 150 + Math.sin(y * 0.17) * 28 + Math.random() * 18;
    g.strokeStyle = `rgb(${shade},${Math.round(shade * 0.72)},${Math.round(shade * 0.42)})`;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(128, y + Math.sin(y) * 2);
    g.stroke();
  }
  const tex = makeTexture(canvas, renderer);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function kraftTexture(renderer) {
  const canvas = noiseCanvas(256, (g, s) => {
    g.fillStyle = '#c4a574';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i += 1) {
      const v = 120 + Math.random() * 80;
      g.fillStyle = `rgba(${v},${Math.round(v * 0.72)},${Math.round(v * 0.4)},0.22)`;
      g.fillRect(Math.random() * s, Math.random() * s, 3, 1);
    }
  });
  const tex = makeTexture(canvas, renderer);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function fibreTube(curve, segments, radius, radial = 6) {
  const geo = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) {
    const along = uv.getX(i);
    const around = uv.getY(i) * Math.PI * 2;
    const ridge = radius * 0.16 * Math.sin(around * 3.0 + along * 48.0);
    pos.setXYZ(
      i,
      pos.getX(i) + nrm.getX(i) * ridge,
      pos.getY(i) + nrm.getY(i) * ridge,
      pos.getZ(i) + nrm.getZ(i) * ridge,
    );
  }
  geo.computeVertexNormals();
  return geo;
}

function bentPlane(w, h, bend) {
  const bow = bend || 0;
  const geo = new THREE.PlaneGeometry(w, h, bow ? 8 : 1, bow ? 6 : 1);
  if (!bow) return geo;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const u = pos.getX(i) / (w * 0.5);
    const v = pos.getY(i) / (h * 0.5);
    pos.setZ(i, bow * ((1 - u * u) * 0.62 + (1 - v * v) * 0.38));
  }
  geo.computeVertexNormals();
  return geo;
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
  scene.background = new THREE.Color(0xece7df);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.16;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.08, 80);
  const camTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const camFrom = new THREE.Vector3();
  const camTo = new THREE.Vector3();
  const lookFrom = new THREE.Vector3();
  const lookTo = new THREE.Vector3();
  const lookNow = new THREE.Vector3(1.2, 2.8, 8);
  const gradeSaved = {
    toneMapping: renderer.toneMapping,
    exposure: renderer.toneMappingExposure,
    shadowType: renderer.shadowMap.type,
    autoUpdate: renderer.shadowMap.autoUpdate,
  };
  let graded = false;
  let suspended = false;
  let shadowWarm = 0;

  function shadowSize() {
    const w = renderer.domElement.width || 1280;
    const h = renderer.domElement.height || 720;
    return w * h < 1100 * 800 ? 1024 : 2048;
  }

  scene.add(new THREE.HemisphereLight(0xf7f4ef, 0xe9e2d8, 1.25));
  scene.add(new THREE.AmbientLight(0xf6f1ea, 0.42));
  const sun = new THREE.DirectionalLight(0xfff6f0, 0.85);
  sun.position.set(-11, 12, 16);
  sun.target.position.set(0.6, 2.8, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize(), shadowSize());
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 11;
  sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 46;
  sun.shadow.bias = -0.00022;
  sun.shadow.normalBias = 0.008;
  sun.shadow.radius = 8;
  scene.add(sun, sun.target);

  const windowLight = new THREE.SpotLight(0xfff6f0, 55, 50, 0.92, 0.48, 1);
  windowLight.position.set(-7.5, 10.5, 9.2);
  windowLight.target.position.set(1.4, 2.6, 0);
  windowLight.map = windowCookie();
  windowLight.castShadow = false;
  scene.add(windowLight, windowLight.target);

  const plaster = plasterTextures(renderer);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe5dfd6,
    emissiveIntensity: 0.22,
    map: plaster.colorTex,
    roughnessMap: plaster.roughTex,
    normalMap: plaster.normalTex,
    normalScale: new THREE.Vector2(0.42, 0.42),
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.08,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x8d8983,
    roughness: 0.36,
    metalness: 0.84,
    envMapIntensity: 0.7,
  });
  const twineMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: juteTextures(renderer),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xd2ae74,
    map: woodTexture(renderer),
    roughness: 0.74,
    metalness: 0,
    envMapIntensity: 0.18,
  });
  const kraftMap = kraftTexture(renderer);
  const kraftMat = new THREE.MeshStandardMaterial({
    map: kraftMap,
    color: 0xc4a574,
    roughness: 0.9,
    metalness: 0,
    shadowSide: THREE.DoubleSide,
    envMapIntensity: 0.12,
  });
  const kraftDark = new THREE.MeshStandardMaterial({
    map: kraftMap,
    color: 0xa8885c,
    roughness: 0.88,
    metalness: 0,
    shadowSide: THREE.DoubleSide,
    envMapIntensity: 0.12,
  });
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xfffdf8,
    roughness: 0.92,
    metalness: 0,
    emissive: 0xf3eee6,
    emissiveIntensity: 0.12,
    shadowSide: THREE.DoubleSide,
    envMapIntensity: 0.06,
  });
  const filmMat = new THREE.MeshStandardMaterial({
    color: 0x1a1816,
    roughness: 0.42,
    metalness: 0.18,
    shadowSide: THREE.DoubleSide,
    envMapIntensity: 0.45,
  });
  const holes = sprocketTexture(renderer);
  const visitMap = visitTexture(renderer);

  function photoMat(map, extra = {}) {
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.84,
      metalness: 0,
      envMapIntensity: 0.22,
      shadowSide: THREE.DoubleSide,
      ...extra,
    });
  }

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(46, 28), wallMat);
  wall.position.set(0, 3.1, 0);
  wall.receiveShadow = true;
  scene.add(wall);

  const hookShape = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.034, 0),
    new THREE.Vector3(0.02, 0.024, 0),
    new THREE.Vector3(0.02, 0.006, 0),
    new THREE.Vector3(0, -0.004, 0),
    new THREE.Vector3(-0.016, -0.016, 0),
    new THREE.Vector3(-0.012, -0.03, 0),
    new THREE.Vector3(0.004, -0.04, 0),
  ]);
  const hookGeo = new THREE.TubeGeometry(hookShape, 16, 0.006, 6, false);
  const pegHalfGeo = new THREE.BoxGeometry(0.016, 0.12, 0.011);
  const pegSpringGeo = new THREE.TorusGeometry(0.012, 0.0026, 6, 12);
  const knotGeo = new THREE.TorusGeometry(0.032, 0.009, 6, 12);
  const eyeGeo = new THREE.TorusGeometry(0.07, 0.014, 8, 18);
  const screwGeo = new THREE.CylinderGeometry(0.009, 0.006, 0.05, 6);

  function addSHook(parent, y) {
    const hook = new THREE.Mesh(hookGeo, metalMat);
    hook.position.y = y;
    hook.castShadow = true;
    parent.add(hook);
  }

  function addPeg(parent, y) {
    const peg = new THREE.Group();
    const left = new THREE.Mesh(pegHalfGeo, woodMat);
    left.position.set(-0.009, 0.028, 0.006);
    left.rotation.z = 0.12;
    const right = new THREE.Mesh(pegHalfGeo, woodMat);
    right.position.set(0.009, 0.028, 0.006);
    right.rotation.z = -0.12;
    const spring = new THREE.Mesh(pegSpringGeo, metalMat);
    spring.rotation.x = Math.PI / 2;
    spring.position.set(0, 0.012, 0.008);
    left.castShadow = true;
    right.castShadow = true;
    spring.castShadow = true;
    peg.add(left, right, spring);
    peg.position.y = y;
    parent.add(peg);
  }

  function addDrop(parent, y0, length, sway) {
    const pts = [];
    const steps = 6;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      pts.push(new THREE.Vector3(Math.sin(t * Math.PI) * sway, y0 - t * length, 0.008));
    }
    const mesh = new THREE.Mesh(
      fibreTube(new THREE.CatmullRomCurve3(pts), 8, 0.011, 6),
      twineMat,
    );
    mesh.castShadow = true;
    parent.add(mesh);
  }

  function addKnot(parent, x, y, z) {
    const knot = new THREE.Mesh(knotGeo, twineMat);
    knot.rotation.y = Math.PI / 2;
    knot.rotation.z = 0.5;
    knot.position.set(x, y, z);
    knot.castShadow = true;
    parent.add(knot);
  }

  function addString(rowY) {
    const pts = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const x = -WALL_HALF + (i / steps) * WALL_HALF * 2;
      pts.push(new THREE.Vector3(x, sagAt(x), 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const twine = new THREE.Mesh(fibreTube(curve, 80, 0.024, 8), twineMat);
    twine.castShadow = true;
    twine.position.set(0, rowY, FRONT_Z);
    scene.add(twine);
    [-WALL_HALF, WALL_HALF].forEach((x) => {
      const hook = new THREE.Group();
      const ring = new THREE.Mesh(eyeGeo, metalMat);
      ring.rotation.y = Math.PI / 2;
      ring.castShadow = true;
      const screw = new THREE.Mesh(screwGeo, metalMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.z = -0.02;
      screw.castShadow = true;
      hook.add(ring, screw);
      hook.position.set(x, rowY + sagAt(x), FRONT_Z);
      scene.add(hook);
      addKnot(scene, x, rowY + sagAt(x), FRONT_Z);
    });
  }

  const rowCount = Math.max(1, Math.ceil(prepared.length / PER_ROW));
  for (let row = 0; row < rowCount; row++) addString(TOP_Y - row * ROW_PITCH);

  const lines = [];
  const visits = [];
  const videos = [];

  function addBackString(parent, y, half) {
    const sagAmp = Math.min(0.16, Math.max(0.05, half * 0.055));
    const sagAtX = (x) => {
      const u = x / Math.max(half, 0.01);
      return -sagAmp * (1 - u * u);
    };
    const pts = [];
    const steps = 32;
    for (let i = 0; i <= steps; i += 1) {
      const x = -half + (i / steps) * half * 2;
      pts.push(new THREE.Vector3(x, y + sagAtX(x), 0));
    }
    const mesh = new THREE.Mesh(
      fibreTube(new THREE.CatmullRomCurve3(pts), 56, 0.024, 8),
      twineMat,
    );
    mesh.castShadow = true;
    parent.add(mesh);
    [-half, half].forEach((x) => {
      const hook = new THREE.Group();
      const ring = new THREE.Mesh(eyeGeo, metalMat);
      ring.rotation.y = Math.PI / 2;
      ring.castShadow = true;
      const screw = new THREE.Mesh(screwGeo, metalMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.z = -0.02;
      screw.castShadow = true;
      hook.add(ring, screw);
      hook.position.set(x, y + sagAtX(x), 0);
      parent.add(hook);
      addKnot(parent, x, hook.position.y, 0.012);
    });
    return sagAtX;
  }

    prepared.forEach((entry, index) => {
    const place = hash(index + 11);
    const row = Math.floor(index / PER_ROW);
    const col = index % PER_ROW;
    const count = Math.min(PER_ROW, prepared.length - row * PER_ROW);
    const jitter = (place() - 0.5) * 0.06;
    const side = (col - (count - 1) / 2) * COL_PITCH + jitter;
    const home = new THREE.Vector3(side, TOP_Y - row * ROW_PITCH, FRONT_Z);
    const lineGroup = new THREE.Group();
    const cluster = lineGroup;

    const pivots = [];
    const lineVideos = [];
    let bottom = -0.15;

    function plane(w, h, material, bend = 0.008) {
      const mesh = new THREE.Mesh(bentPlane(w, h, bend), material);
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
        const base = plane(piece.w, piece.h, filmMat, 0.003);
        const barMat = new THREE.MeshStandardMaterial({
          map: holes.clone(),
          roughness: 0.4,
          metalness: 0.2,
          transparent: true,
          alphaTest: 0.4,
          shadowSide: THREE.DoubleSide,
          envMapIntensity: 0.4,
        });
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
        const pic = plane(pictureW, pictureH, photoMat(tex, { roughness: 0.28, metalness: 0.06, envMapIntensity: 0.55 }), 0.002);
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
        const shot = plane(shotW, shotH, photoMat(tex, { roughness: 0.72 }), 0.004);
        shot.position.set(0, 0.01, 0.003);
        sheet.add(mount, shot);
        return;
      }
      if (piece.style === 'collage') {
        const tex = makeTexture(collageSheet(piece.items.map((item) => item.image).filter(Boolean), piece.note), renderer);
        sheet.add(plane(piece.w, piece.h, photoMat(tex)));
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
          const pic = plane(piece.w * 0.62, piece.h * 0.42, photoMat(tex), 0.003);
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
        const mesh = new THREE.Mesh(geo, photoMat(makeTexture(piece.image, renderer), { roughness: 0.8 }));
        mesh.castShadow = true;
        sheet.add(mesh);
        return;
      }
      if (piece.style === 'burnt' || piece.style === 'cyan') {
        const tex = makeTexture(photoCard(piece.image, piece.style), renderer);
        sheet.add(plane(piece.w, piece.h, photoMat(tex, { roughness: piece.style === 'cyan' ? 0.7 : 0.86 })));
        return;
      }
      const mount = plane(piece.w, piece.h, paperMat);
      sheet.add(mount);
      if (piece.image) {
        const pic = plane(
          piece.photoW,
          piece.photoH,
          photoMat(makeTexture(piece.image, renderer)),
        );
        pic.position.set(0, 0, 0.004);
        sheet.add(pic);
      }
    }

    function hang(pivot, piece, topY) {
      const span = piece.matH || piece.h;
      const sheet = new THREE.Group();
      sheet.position.y = topY - span / 2;
      sheet.userData.billboard = true;
      pivot.add(sheet);
      if (piece.matW) {
        const mat = plane(piece.matW, piece.matH, paperMat);
        mat.position.z = -0.01;
        sheet.add(mat);
      }
      buildPiece(piece, sheet);
      return topY - span;
    }

    function hangPeg(parent, x, sag, drop, tilt, sway) {
      const pivot = new THREE.Group();
      pivot.position.set(x, sag, 0.02);
      pivot.rotation.z = tilt || 0;
      addPeg(pivot, 0.012);
      addDrop(pivot, -0.03, drop, sway || 0);
      parent.add(pivot);
      pivots.push(pivot);
      return pivot;
    }

    const heroRnd = hash(index + 29);
    const aspect = Math.max(0.72, Math.min(entry.cover?.aspect || 1, 1.35));
    const printH = 1.05;
    const printW = printH * aspect;
    const margin = 0.065;
    const hero = {
      style: 'print',
      image: entry.cover?.image || null,
      kind: 'image',
      items: entry.cover ? [entry.cover] : [],
      w: printW,
      h: printH,
      photoW: printW * (1 - margin * 2),
      photoH: printH * (1 - margin * 2),
    };
    const matW = printW;
    const matH = printH;
    const heroDrop = 0.06 + heroRnd() * 0.2;
    const heroPivot = new THREE.Group();
    heroPivot.position.set(0, sagAt(home.x), 0.02);
    heroPivot.rotation.z = (heroRnd() - 0.5) * 0.06;
    addPeg(heroPivot, 0.012);
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

    const laid = layoutPieces(
      entry.content,
      index * 19 + 4,
      entry.project.text || '',
      { maxW: 3.6, colMax: 1.35, tag: true, row: true },
    );
    const pegGap = 0.16;
    const pegPieces = laid.columns.map((col) => col.parent);
    let rowW = 0;
    pegPieces.forEach((piece, i) => {
      rowW += piece.w + (i ? pegGap : 0);
    });
    if (laid.tagH) rowW += (pegPieces.length ? pegGap : 0) + laid.tagW;
    const half = Math.max(0.55, rowW / 2 + 0.28);
    const sagAtX = (laid.columns.length || laid.tagH) ? addBackString(backGroup, 0, half) : () => 0;
    const pegRnd = hash(index * 19 + 4);
    let cursorX = -rowW / 2;
    pegPieces.forEach((piece) => {
      const x = cursorX + piece.w / 2;
      cursorX += piece.w + pegGap;
      const drop = 0.07 + pegRnd() * 0.06;
      const pivot = hangPeg(
        backGroup,
        x,
        sagAtX(x),
        drop,
        (pegRnd() - 0.5) * 0.05,
        (pegRnd() - 0.5) * 0.012,
      );
      hang(pivot, piece, -(0.03 + drop));
    });
    if (laid.tagH) {
      const x = pegPieces.length ? cursorX + laid.tagW / 2 : 0;
      const drop = 0.07 + pegRnd() * 0.05;
      const pivot = hangPeg(backGroup, x, sagAtX(x), drop, (pegRnd() - 0.5) * 0.04, 0.008);
      const tag = new THREE.Mesh(
        bentPlane(laid.tagW, laid.tagH, 0.006),
        new THREE.MeshStandardMaterial({
          map: tagTexture(entry.project, renderer),
          transparent: true,
          opacity: 0.86,
          alphaTest: 0.12,
          roughness: 0.72,
          metalness: 0,
          envMapIntensity: 0.08,
          shadowSide: THREE.DoubleSide,
        }),
      );
      tag.castShadow = true;
      tag.userData.billboard = true;
      tag.position.y = -(0.03 + drop + laid.tagH / 2);
      pivot.add(tag);
      const href = entry.project.links?.[0]?.href;
      if (href) {
        const visitH = 0.16;
        const visitDrop = 0.035;
        const visitTop = tag.position.y - laid.tagH / 2;
        addDrop(pivot, visitTop - 0.008, visitDrop, -0.004);
        const visit = new THREE.Mesh(
          bentPlane(Math.min(0.42, laid.tagW), visitH, 0.004),
          photoMat(visitMap, { roughness: 0.9, envMapIntensity: 0.08 }),
        );
        visit.position.y = visitTop - 0.008 - visitDrop - visitH / 2;
        visit.castShadow = true;
        visit.userData.billboard = true;
        visit.userData.href = href;
        pivot.add(visit);
        visits.push(visit);
      }
    }
    backGroup.updateWorldMatrix(true, true);
    const backBox = new THREE.Box3().setFromObject(backGroup);
    const contentCx = (backBox.min.x + backBox.max.x) / 2;
    const contentCy = (backBox.min.y + backBox.max.y) / 2;
    const contentW = Math.max(0.2, backBox.max.x - backBox.min.x);
    const contentH = Math.max(0.2, backBox.max.y - backBox.min.y);
    const faceBox = new THREE.Box3();
    let faceAny = false;
    backGroup.traverse((obj) => {
      if (!obj.userData || !obj.userData.billboard) return;
      faceBox.expandByObject(obj);
      faceAny = true;
    });
    const faceCx = faceAny ? (faceBox.min.x + faceBox.max.x) / 2 : contentCx;
    const faceCy = faceAny ? (faceBox.min.y + faceBox.max.y) / 2 : contentCy;
    const faceW = faceAny ? Math.max(0.2, faceBox.max.x - faceBox.min.x) : contentW;
    const faceH = faceAny ? Math.max(0.2, faceBox.max.y - faceBox.min.y) : contentH;
    backGroup.position.set(0, 0, -BACK_Z);

    lineGroup.position.copy(home);
    lineGroup.updateWorldMatrix(true, true);
    const coverWorld = new THREE.Box3().setFromObject(heroPivot.children[heroPivot.children.length - 1]);
    scene.add(lineGroup);

    const faces = [];
    const materials = [];
    lineGroup.traverse((obj) => {
      if (obj.userData && obj.userData.billboard) faces.push(obj);
      if (!obj.isMesh || !obj.material) return;
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      const cloned = list.map((mat) => {
        const copy = mat.clone();
        copy.userData.baseOpacity = mat.opacity == null ? 1 : mat.opacity;
        copy.transparent = true;
        copy.opacity = copy.userData.baseOpacity;
        return copy;
      });
      obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
      cloned.forEach((mat) => materials.push(mat));
    });

    lines.push({
      project: entry.project,
      group: lineGroup,
      coverSheet: heroPivot.children[heroPivot.children.length - 1],
      backGroup,
      pivots,
      faces,
      materials,
      videos: lineVideos,
      scroll: cluster.userData.scroll || null,
      home,
      coverY: home.y + coverY,
      heroBottom,
      heroTop,
      matW,
      matH,
      contentCx,
      contentCy,
      contentW,
      contentH,
      faceCx,
      faceCy,
      faceW,
      faceH,
      backMinX: 0,
      backMaxX: 0,
      backMinY: 0,
      backMaxY: 0,
      coverMinX: coverWorld.min.x,
      coverMaxX: coverWorld.max.x,
      coverMinY: coverWorld.min.y,
      coverMaxY: coverWorld.max.y,
    });
  });

  lines.forEach((line, index) => {
    const row = Math.floor(index / PER_ROW);
    const left = index - 1;
    const right = index + 1;
    const onRow = (i) => i >= 0 && i < lines.length && Math.floor(i / PER_ROW) === row;
    const neighbor = onRow(left) ? lines[left] : lines[right];
    const hostW = Math.max(0.45, neighbor.coverMaxX - neighbor.coverMinX);
    const hostH = Math.max(0.45, neighbor.coverMaxY - neighbor.coverMinY);
    const scale = Math.min(
      (hostW * 0.9) / line.contentW,
      (hostH * 0.86) / line.contentH,
    );
    const hostCx = (neighbor.coverMinX + neighbor.coverMaxX) / 2;
    const hostCy = (neighbor.coverMinY + neighbor.coverMaxY) / 2;
    line.backGroup.scale.setScalar(scale);
    line.backGroup.position.set(
      (hostCx - line.home.x) - line.contentCx * scale,
      (hostCy - line.home.y) - line.contentCy * scale,
      -BACK_Z,
    );
    line.backGroup.updateWorldMatrix(true, true);
    const backWorld = new THREE.Box3();
    let backAny = false;
    line.backGroup.traverse((obj) => {
      if (!obj.userData || !obj.userData.billboard) return;
      backWorld.expandByObject(obj);
      backAny = true;
    });
    if (!backAny) backWorld.setFromObject(line.backGroup);
    line.backMinX = backWorld.min.x;
    line.backMaxX = backWorld.max.x;
    line.backMinY = backWorld.min.y;
    line.backMaxY = backWorld.max.y;
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
  let fadeFrom = -1;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function opacityFor(index, glide) {
    const focus = slot - 1;
    const eased = reduce ? 1 : glide;
    if (eased >= 1) return focus < 0 || index === focus ? 1 : 0;
    if (fadeFrom < 0 && focus >= 0) return index === focus ? 1 : 1 - eased;
    if (focus < 0) return index === fadeFrom ? 1 : eased;
    if (index === focus) return eased;
    if (index === fadeFrom) return 1 - eased;
    return 0;
  }

  function applyOpacity(index, amount) {
    const line = lines[index];
    const shown = amount > 0.015;
    line.group.visible = shown;
    if (!shown) return;
    line.materials.forEach((mat) => {
      mat.opacity = mat.userData.baseOpacity * amount;
      mat.depthWrite = amount > 0.96;
    });
  }

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
    poseFov = narrow ? 34 : 28;
    fitPose(
      -WALL_HALF - 0.25,
      WALL_HALF + 0.25,
      minY - (narrow ? 0.3 : 0.45),
      maxY + (narrow ? 0.2 : 0.3),
      FRONT_Z,
      narrow ? 0.9 : 0.88,
      narrow ? 0.03 : 0.045,
    );
  }

  const probeCam = camera.clone();
  const probeCorner = new THREE.Vector3();

  function projectRoot(root, cam) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    let any = false;
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) return;
      const geo = obj.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const bb = geo.boundingBox;
      if (!bb || bb.isEmpty()) return;
      any = true;
      for (const x of [bb.min.x, bb.max.x]) {
        for (const y of [bb.min.y, bb.max.y]) {
          for (const z of [bb.min.z, bb.max.z]) {
            probeCorner.set(x, y, z).applyMatrix4(obj.matrixWorld).project(cam);
            x0 = Math.min(x0, probeCorner.x);
            x1 = Math.max(x1, probeCorner.x);
            y0 = Math.min(y0, probeCorner.y);
            y1 = Math.max(y1, probeCorner.y);
          }
        }
      }
    });
    return any ? { x0, x1, y0, y1 } : null;
  }

  function projectFaces(line, cam, skipCover) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    let any = false;
    line.faces.forEach((obj) => {
      if (skipCover && obj === line.coverSheet) return;
      const rect = projectRoot(obj, cam);
      if (!rect) return;
      any = true;
      x0 = Math.min(x0, rect.x0);
      x1 = Math.max(x1, rect.x1);
      y0 = Math.min(y0, rect.y0);
      y1 = Math.max(y1, rect.y1);
    });
    return any ? { x0, x1, y0, y1 } : null;
  }

  function focusPose(line) {
    const aspect = Math.max(0.35, camera.aspect);
    const tall = aspect < 0.9;
    const fov = tall ? 42 : 32;
    const tanV = Math.tan((fov * Math.PI) / 360);
    const coverL = line.coverMinX;
    const coverR = line.coverMaxX;
    const leftOut = coverL - line.backMinX;
    const rightOut = line.backMaxX - coverR;
    const left = leftOut >= rightOut ? line.backMinX : coverL;
    const right = leftOut >= rightOut ? coverR : line.backMaxX;
    const bottom = Math.min(line.backMinY, line.coverMinY);
    const top = Math.max(line.backMaxY, line.coverMaxY);
    const spanX = Math.max(0.6, right - left);
    const spanY = Math.max(0.45, top - bottom);
    const cx = (left + right) / 2;
    const cy = (bottom + top) / 2;
    const dist = Math.max(
      spanY / (2 * tanV * (tall ? 0.7 : 0.78)),
      spanX / (2 * tanV * aspect * (tall ? 0.86 : 0.84)),
      1.8,
    );
    const side = dist * 0.07;
    poseFov = fov;
    camTarget.set(cx + side, cy, FRONT_Z + dist);
    lookTarget.set(cx + side * 0.18, cy, FRONT_Z - 0.04);

    const frameL = -0.96;
    const frameR = 0.95;
    const frameB = tall ? -0.8 : -0.72;
    const frameT = tall ? 0.86 : 0.78;
    for (let iter = 0; iter < 3; iter += 1) {
      probeCam.fov = poseFov;
      probeCam.aspect = aspect;
      probeCam.up.set(0, 1, 0);
      probeCam.position.copy(camTarget);
      probeCam.lookAt(lookTarget);
      probeCam.updateProjectionMatrix();
      probeCam.updateMatrixWorld(true);
      const cover = projectRoot(line.coverSheet, probeCam);
      const back = projectFaces(line, probeCam, true);
      if (!cover || !back) break;
      const x0 = Math.min(cover.x0, back.x0);
      const x1 = Math.max(cover.x1, back.x1);
      const y0 = Math.min(cover.y0, back.y0);
      const y1 = Math.max(cover.y1, back.y1);
      const fit = Math.min(
        (frameR - frameL) / Math.max(0.2, x1 - x0),
        (frameT - frameB) / Math.max(0.2, y1 - y0),
      );
      if (fit < 0.98) {
        const pull = camTarget.z - FRONT_Z;
        camTarget.z = FRONT_Z + pull / Math.max(0.72, fit);
        lookTarget.z = FRONT_Z - 0.04;
      }
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      const wantX = (frameL + frameR) / 2;
      const wantY = (frameB + frameT) / 2;
      const halfW = (camTarget.z - FRONT_Z) * tanV * aspect;
      const halfH = (camTarget.z - FRONT_Z) * tanV;
      const shiftX = (mx - wantX) * halfW;
      const shiftY = (my - wantY) * halfH;
      camTarget.x += shiftX;
      lookTarget.x += shiftX;
      camTarget.y += shiftY;
      lookTarget.y += shiftY;
      if (fit > 0.98 && Math.abs(mx - wantX) < 0.04 && Math.abs(my - wantY) < 0.04) break;
    }
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
    fadeFrom = slot - 1;
    slot = ((next % count) + count) % count;
    const focus = slot - 1;
    if (focus < 0) overviewPose();
    else focusPose(lines[focus]);
    camTo.copy(camTarget);
    lookTo.copy(lookTarget);
    fovTo = poseFov;
    syncMedia();
    shadowWarm = 3;
    if (snap || reduce) {
      moving = false;
      camera.fov = fovTo;
      camera.updateProjectionMatrix();
      camera.position.copy(camTo);
      lookNow.copy(lookTo);
      camera.lookAt(lookNow);
      camera.updateMatrixWorld(true);
      lines.forEach((line, i) => applyOpacity(i, focus < 0 || i === focus ? 1 : 0));
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
    const size = shadowSize();
    if (sun.shadow.mapSize.x !== size) {
      sun.shadow.mapSize.set(size, size);
      shadowWarm = 3;
    }
    aim(slot, true);
  }

  function gradeOn() {
    if (suspended) return;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 2.15;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    if (!graded) {
      renderer.shadowMap.needsUpdate = true;
      shadowWarm = 6;
    }
    graded = true;
  }

  function gradeOff() {
    suspended = true;
    if (!graded) return;
    renderer.toneMapping = gradeSaved.toneMapping;
    renderer.toneMappingExposure = gradeSaved.exposure;
    renderer.shadowMap.type = gradeSaved.shadowType;
    renderer.shadowMap.autoUpdate = gradeSaved.autoUpdate;
    renderer.shadowMap.needsUpdate = true;
    graded = false;
  }

  function resume() {
    suspended = false;
    gradeOn();
  }

  function update(dt, now) {
    const time = now || performance.now();
    if (document.hidden) {
      videos.forEach((screen) => screen.video.pause());
      return;
    }
    if (suspended) return;
    gradeOn();
    let glide = 1;
    if (moving && !reduce) {
      const t = Math.min(1, (time - moveStart) / moveMs);
      glide = easeGlide(t, moveEaseIn);
      camera.fov = fovFrom + (fovTo - fovFrom) * glide;
      camera.updateProjectionMatrix();
      camera.position.lerpVectors(camFrom, camTo, glide);
      lookNow.lerpVectors(lookFrom, lookTo, glide);
      if (t >= 1) moving = false;
    }
    const focus = slot - 1;
    lines.forEach((line, i) => {
      if (i === focus && !document.hidden) {
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
      applyOpacity(i, opacityFor(i, moving ? glide : 1));
    });
    camera.lookAt(lookNow);
    if (moving || shadowWarm > 0) {
      renderer.shadowMap.needsUpdate = true;
      if (shadowWarm > 0) shadowWarm -= 1;
    }
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
    gradeOff();
  }

  function render(gl) {
    gradeOn();
    if (suspended) gradeOff();
    gl.setRenderTarget(null);
    gl.render(scene, camera);
  }

  aim(0, true);
  const result = {
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
      total: lines.length,
      label: slot > 0 ? (lines[slot - 1].project.title || '') : '',
      project: slot > 0 ? lines[slot - 1].project : null,
    }),
  };
  return result;
}
