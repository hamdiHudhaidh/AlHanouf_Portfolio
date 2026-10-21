import * as THREE from 'three';
import { ARTIST, CERAMICS, DESIGN, EXHIBITION, SCENES } from './projects.js';
import { createCeramics } from './ceramics.js';
import { createDesign } from './design.js';
import { createExhibition } from './exhibition.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const TAU = Math.PI * 2;

const loader = $('#loader');
const canvas = $('#scene');
const aboutEl = $('#about');
const content = $('#content');
const designLabel = $('#designLabel');
const boardLabels = $('#boardLabels');
const splats = $('#splats');
const veil = $('#veil');
const hud = $('#hud');

let renderer = null;

// A canvas with no width/height is 300×150. Drawing into that and stretching
// it across the window is what made the whole site look pixelated. The old
// code only corrected it inside the window resize handler, so a fresh load
// stayed soft until the window was resized.
// Size comes from the canvas layout box, not from the first innerWidth we
// happen to see. DPR stays 1:1 through 2 (100%, 125%, 150%, retina) and
// steps down only when the buffer would pass a 1920×1080 screen at DPR 2.
function viewBox() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (w >= 2 && h >= 2) return { w, h };
  return { w: Math.round(innerWidth), h: Math.round(innerHeight) };
}

function drawingRatio(w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const budget = 1920 * 1080 * 4;
  let ratio = dpr;
  const area = Math.max(1, w * h);
  while (ratio > 1 && area * ratio * ratio > budget) ratio = Math.max(1, +(ratio - 0.25).toFixed(2));
  return ratio;
}

let fitted = '';
function fitRenderer() {
  const { w, h } = viewBox();
  if (w < 2 || h < 2) return;
  const ratio = drawingRatio(w, h);
  const key = `${w}x${h}@${ratio}`;
  if (renderer && key !== fitted) {
    fitted = key;
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
  }
  active?.resize(w, h);
}

function getRenderer() {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  fitRenderer();
  return renderer;
}

const view = { ceramics: null, design: null, art: null };
let current = '';
let active = null;
let booting = null;

function splatSVG(seed, droplets = true) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const n = 22;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    const spike = rnd() < 0.3 ? 1.25 + rnd() * 0.35 : 0.85 + rnd() * 0.2;
    pts.push([50 + Math.cos(a) * 28 * spike, 50 + Math.sin(a) * 28 * spike]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n];
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    d += ` Q${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  let circ = '';
  if (droplets) {
    for (let i = 0; i < 9; i++) {
      const a = rnd() * TAU, r = 36 + rnd() * 12;
      circ += `<circle cx="${(50 + Math.cos(a) * r).toFixed(1)}" cy="${(50 + Math.sin(a) * r).toFixed(1)}" r="${(0.8 + rnd() * 2.6).toFixed(1)}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${d}Z"/>${circ}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function screenSplats(el) {
  const r = el.getBoundingClientRect();
  for (let k = 0; k < 3; k++) {
    const d = document.createElement('div');
    d.className = 'splat';
    const s = 40 + Math.random() * 90;
    d.style.cssText = `left:${r.left + Math.random() * r.width}px;top:${r.top + Math.random() * r.height}px;--s:${s}px;--r:${Math.random() * 360}deg;--m:${splatSVG(Math.floor(Math.random() * 999))};--c:${Math.random() < .5 ? '#8f4d31' : '#a8603f'}`;
    splats.appendChild(d);
    setTimeout(() => d.remove(), 1700);
  }
}

let cardTimer = 0;
function hideCards() {
  clearTimeout(cardTimer);
  content.querySelectorAll('.card').forEach((c) => {
    c.style.webkitMaskImage = c.style.maskImage = splatSVG(11);
    c.classList.remove('in');
    c.classList.add('out');
    c.style.transitionDelay = '0s';
  });
  cardTimer = setTimeout(() => { content.innerHTML = ''; }, reduce ? 0 : 420);
}

function showCards(p) {
  clearTimeout(cardTimer);
  if (!p) { content.innerHTML = ''; return; }
  const bits = [];
  const eyebrow = [p.year, p.eyebrow].filter(Boolean).join(' — ');
  bits.push(`<div class="card c-title">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1>${p.title}</h1></div>`);
  if (p.text) bits.push(`<div class="card c-desc"><p>${p.text}</p></div>`);
  (p.images || []).slice(0, 3).forEach((src, i) => {
    const path = typeof src === 'string' ? src : src.src;
    const alt = typeof src === 'string' ? p.title : (src.alt || p.title);
    bits.push(`<figure class="card c-img i${i + 1}"><img src="${path}" alt="${alt}"></figure>`);
  });
  content.innerHTML = bits.join('');
  const cards = [...content.querySelectorAll('.card')];
  cards.forEach((c, i) => {
    c.style.webkitMaskImage = c.style.maskImage = splatSVG(i + 3);
    c.style.transitionDelay = `${reduce ? 0 : i * 0.1}s`;
    if (!reduce) setTimeout(() => screenSplats(c), i * 90);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => cards.forEach((c) => {
    c.classList.add('in');
    c.addEventListener('transitionend', () => {
      if (c.classList.contains('in')) c.style.webkitMaskImage = c.style.maskImage = 'none';
    }, { once: true });
  })));
}

function showDesign() {
  // The drying line writes her words on a paper tag in the room.
  designLabel.hidden = true;
  designLabel.innerHTML = '';
  designLabel.classList.remove('in');
  boardLabels.hidden = true;
}

function renderAbout() {
  const links = ARTIST.links.map((l) => `<a href="${l.href}" rel="noopener">${l.label}</a>`).join('<span aria-hidden="true">·</span>');
  aboutEl.innerHTML = `
    <figure class="portrait">
      <img src="${ARTIST.portrait}" alt="Portrait placeholder, not a photograph of the artist">
      <figcaption>${ARTIST.portraitNote}</figcaption>
    </figure>
    <div class="about-copy">
      <p class="eyebrow">${ARTIST.name}</p>
      <h1>${ARTIST.welcome}</h1>
      <p class="about-links">${links}</p>
    </div>`;
  if (!reduce) {
    aboutEl.querySelectorAll('.portrait, .about-copy').forEach((el, i) => {
      el.style.webkitMaskImage = el.style.maskImage = splatSVG(i + 2);
      el.classList.add('reveal');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    });
  }
}

function paintNav(id) {
  const count = SCENES.length;
  const index = Math.max(0, SCENES.findIndex((s) => s.id === id));
  const currentScene = SCENES[index];
  const prev = SCENES[(index - 1 + count) % count];
  const next = SCENES[(index + 1) % count];
  $('#pageName').textContent = currentScene.label;
  const prevEl = $('#pagePrev');
  const nextEl = $('#pageNext');
  prevEl.textContent = prev.label;
  prevEl.href = prev.hash;
  nextEl.textContent = next.label;
  nextEl.href = next.hash;
  document.body.dataset.scene = id;
}

function paintHud() {
  const nav = active?.nav?.() || { index: 0, total: 0, label: '' };
  const show = nav.total > 1;
  hud.hidden = !show;
  if (!show) return;
  $('#cIdx').textContent = String(nav.index + 1).padStart(2, '0');
  $('#cTot').textContent = String(nav.total).padStart(2, '0');
  $('#hudTitle').textContent = nav.label || '';
}

async function ensure(id) {
  if (id === 'about') return null;
  if (view[id]) return view[id];
  if (booting) await booting;
  const run = (async () => {
    await document.fonts.ready.catch(() => {});
    const r = getRenderer();
    if (id === 'ceramics') view.ceramics = await createCeramics(r, { reduce, projects: CERAMICS });
    if (id === 'design') view.design = await createDesign(r, { reduce, projects: DESIGN });
    if (id === 'art') view.art = await createExhibition(r, { reduce, pieces: EXHIBITION });
    const box = viewBox();
    view[id].resize(box.w, box.h);
    return view[id];
  })();
  booting = run;
  try { return await run; }
  finally { if (booting === run) booting = null; }
}

function applyChrome() {
  const isAbout = current === 'about';
  aboutEl.hidden = !isAbout;
  canvas.style.visibility = isAbout ? 'hidden' : 'visible';
  if (current !== 'ceramics') hideCards();
  else {
    const info = active.nav();
    if (info.hiding) hideCards();
    else showCards(info.project);
  }
  showDesign();
  boardLabels.hidden = true;
  paintHud();
  paintNav(current);
}

async function go(id) {
  if (!SCENES.some((s) => s.id === id)) id = 'about';
  if (id === current) return;
  if (current === 'design' && id !== 'design') view.design?.pause?.();
  veil.classList.add('on');
  await new Promise((r) => setTimeout(r, reduce ? 20 : 320));
  active = await ensure(id);
  current = id;
  lastProject = null;
  fitRenderer();
  applyChrome();
  if (active && renderer) {
    active.resume?.();
    if (active.render) active.render(renderer);
    else renderer.render(active.scene, active.camera);
  }
  veil.classList.remove('on');
}

function sceneFromHash() {
  const id = location.hash.replace('#', '').split('?')[0];
  if (id === 'exhibition') {
    history.replaceState(null, '', '#art');
    return 'art';
  }
  if (!SCENES.some((s) => s.id === id)) {
    history.replaceState(null, '', '#about');
    return 'about';
  }
  return id;
}

addEventListener('hashchange', () => { go(sceneFromHash()); });

$('#prevBtn').addEventListener('click', () => step(-1));
$('#nextBtn').addEventListener('click', () => step(1));

function step(dir) {
  if (!active?.step) return;
  const before = active.nav?.();
  const moved = active.step(dir);
  if (!moved) return;
  if (current === 'ceramics') {
    const info = active.nav();
    if (info.hiding) hideCards();
    else showCards(info.project);
  }
  paintHud();
  if (before && active.nav().index === before.index && current !== 'ceramics') paintHud();
}

addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (e.code === 'ArrowRight') { e.preventDefault(); step(1); }
  if (e.code === 'ArrowLeft') { e.preventDefault(); step(-1); }
  if (e.code === 'Space' && current !== 'about') { e.preventDefault(); if (!e.repeat) step(1); }
});

let swipe = null;
canvas.addEventListener('pointerdown', (e) => {
  if (!active?.pointerDown) { swipe = { x: e.clientX, y: e.clientY, t: performance.now() }; return; }
  const hit = active.pointerDown(e);
  if (hit) { swipe = null; return; }
  swipe = { x: e.clientX, y: e.clientY, t: performance.now() };
});
addEventListener('pointermove', (e) => { active?.pointerMove?.(e); });
addEventListener('pointerup', (e) => {
  const used = active?.pointerUp?.(e);
  if (used) { swipe = null; paintHud(); return; }
  if (!swipe) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.3 && performance.now() - swipe.t < 700) step(dx < 0 ? 1 : -1);
  swipe = null;
});

addEventListener('resize', () => fitRenderer());

const canvasObserver = new ResizeObserver(() => fitRenderer());
canvasObserver.observe(canvas);

let dprQuery = null;
function onDprChange() {
  fitted = '';
  watchDpr();
  fitRenderer();
}
function watchDpr() {
  dprQuery?.removeEventListener('change', onDprChange);
  dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  dprQuery.addEventListener('change', onDprChange);
}
watchDpr();

function settleFit() {
  fitRenderer();
  requestAnimationFrame(() => fitRenderer());
}
document.addEventListener('DOMContentLoaded', settleFit);
window.addEventListener('load', settleFit);
document.fonts?.ready?.then(() => settleFit()).catch(() => {});

const cursor = $('#cursor');
let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
addEventListener('pointermove', (e) => {
  cursor.classList.remove('off');
  tx = e.clientX;
  ty = e.clientY;
  cursor.classList.toggle('big', !!e.target.closest('button, a, .c-img'));
});

let audio = null;
$('#soundBtn').addEventListener('click', (e) => {
  const b = e.currentTarget;
  if (!audio) {
    const ctx = new AudioContext();
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let lastv = 0;
    for (let i = 0; i < len; i++) { lastv = (lastv + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = lastv * 3.5; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 300;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filt).connect(gain).connect(ctx.destination);
    src.start();
    audio = { ctx, gain, filt, on: false };
  }
  audio.on = !audio.on;
  if (audio.on) audio.ctx.resume();
  b.setAttribute('aria-pressed', String(audio.on));
  b.querySelector('i').textContent = audio.on ? 'on' : 'off';
});

let last = performance.now();
let lastProject = null;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  let spin = 0;
  if (active && current !== 'about') {
    spin = active.update(dt, now) || 0;
    if (renderer) {
      if (active.render) active.render(renderer);
      else renderer.render(active.scene, active.camera);
    }
    const info = active.nav?.();
    const key = `${current}:${info?.index}:${info?.label}:${info?.hiding ? 1 : 0}`;
    if (key !== lastProject) {
      lastProject = key;
      if (current === 'ceramics') {
        if (info?.hiding) hideCards();
        else showCards(info?.project);
      }
      if (current === 'design') showDesign();
      paintHud();
    }
  }
  if (audio?.on) {
    audio.gain.gain.value = current === 'ceramics' ? spin * 0.18 : 0;
    audio.filt.frequency.value = 160 + spin * 600;
  }
  cx += (tx - cx) * 0.22;
  cy += (ty - cy) * 0.22;
  cursor.style.transform = `translate(${cx}px,${cy}px)`;
  requestAnimationFrame(frame);
}

renderAbout();
go(sceneFromHash()).then(() => {
  document.fonts.ready.then(() => setTimeout(() => loader.classList.add('done'), reduce ? 0 : 500));
});
requestAnimationFrame((n) => { last = n; frame(n); });

window.__portfolio = {
  go: (id) => { location.hash = id; },
  step,
  scene: () => current,
  setCurl: (v) => view.design?.setCurl?.(v),
};
