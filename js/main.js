import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { makeTextures, makeClay } from './clay.js';
import { PROJECTS } from './projects.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const TAU = Math.PI * 2;

// ---------------- renderer / scene ----------------
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const BG = new THREE.Color('#e8e1d6');
scene.background = BG; scene.fog = new THREE.Fog(BG, 9, 17);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
const LOOK = new THREE.Vector3(0, 0.45, 0);

const key = new THREE.DirectionalLight(0xfff1e0, 2.6); key.position.set(-3.5, 6, 4);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004;
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
scene.add(key);
const fill = new THREE.DirectionalLight(0xdfe6f0, 0.5); fill.position.set(4, 2, -2); scene.add(fill);
scene.add(new THREE.HemisphereLight(0xfff8ee, 0xb9ab98, 0.6));

// table
const tableMat = new THREE.MeshStandardMaterial({ color: 0xd8cfc2, roughness: 0.92 });
const table = new THREE.Mesh(new THREE.CircleGeometry(30, 64), tableMat);
table.rotation.x = -Math.PI / 2; table.position.y = -0.36; table.receiveShadow = true; scene.add(table);

// splash pan (lathe)
const panPts = [[0.0, -0.34], [1.55, -0.34], [1.78, -0.30], [1.86, -0.12], [1.9, 0.04], [1.96, 0.07], [1.97, 0.04], [1.91, -0.14], [1.84, -0.36]]
  .map(([x, y]) => new THREE.Vector2(x, y));
const pan = new THREE.Mesh(new THREE.LatheGeometry(panPts, 128), new THREE.MeshStandardMaterial({ color: 0xcfc6b9, roughness: 0.55, side: THREE.DoubleSide }));
pan.castShadow = pan.receiveShadow = true; scene.add(pan);

// wheel head with brushed / slip texture on top
function headTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = '#9d9993'; g.fillRect(0, 0, 1024, 1024);
  for (let r = 4; r < 512; r += 1.6) { g.strokeStyle = `rgba(${Math.random() < .5 ? 255 : 40},${Math.random() < .5 ? 255 : 40},${Math.random() < .5 ? 255 : 40},${Math.random() * 0.06})`; g.lineWidth = 1.2; g.beginPath(); g.arc(512, 512, r, 0, TAU); g.stroke(); }
  // clay slip smears (show rotation)
  for (let i = 0; i < 26; i++) {
    const r = 180 + Math.random() * 300, a = Math.random() * TAU, len = 0.2 + Math.random() * 0.9;
    g.strokeStyle = `rgba(122,70,44,${0.18 + Math.random() * 0.35})`; g.lineWidth = 2 + Math.random() * 14; g.lineCap = 'round';
    g.beginPath(); g.arc(512, 512, r, a, a + len); g.stroke();
  }
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(40,40,40,.5)'; const a = i / 6 * TAU; g.beginPath(); g.arc(512 + Math.cos(a) * 420, 512 + Math.sin(a) * 420, 9, 0, TAU); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const wheel = new THREE.Group(); scene.add(wheel);
const headMat = new THREE.MeshStandardMaterial({ map: headTexture(), metalness: 0.75, roughness: 0.38 });
const sideMat = new THREE.MeshStandardMaterial({ color: 0x8e8a84, metalness: 0.85, roughness: 0.3 });
const head = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.22, 0.1, 128), [sideMat, headMat, sideMat]);
head.position.y = -0.05; head.castShadow = head.receiveShadow = true; wheel.add(head);
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.28, 32), sideMat); shaft.position.y = -0.24; scene.add(shaft);

// soft contact shadow under clay
function radial() { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(30,18,10,.55)'); gr.addColorStop(1, 'rgba(30,18,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }
const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radial(), transparent: true, depthWrite: false }));
contact.rotation.x = -Math.PI / 2; contact.position.y = 0.002; wheel.add(contact);
const CONTACT = [[2.5, 0.9], [1.6, 0.9], [1.5, 1.5]];

// clay
await document.fonts.load('800 300px Inter').catch(() => {});
const clay = makeClay(makeTextures());
clay.scale.setScalar(1.15); wheel.add(clay);
const U = clay.material.uniforms;

// splatter particles
const MAXP = 420;
const splMat = new THREE.MeshStandardMaterial({ color: 0x7c4329, roughness: 0.3, metalness: 0 });
const spl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), splMat, MAXP);
spl.castShadow = true; spl.instanceMatrix.setUsage(THREE.DynamicDrawUsage); spl.count = MAXP; scene.add(spl);
const P = Array.from({ length: MAXP }, () => ({ alive: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0, landed: 0, life: 0, flat: 0, rot: 0 }));
let pIdx = 0;
const dummy = new THREE.Object3D();
function emit(angle) {
  const o = P[pIdx]; pIdx = (pIdx + 1) % MAXP;
  const a = Math.random() * TAU, r = 0.45 + Math.random() * 0.35, y = 0.15 + Math.random() * 0.9;
  o.p.set(Math.cos(a) * r, y, Math.sin(a) * r);
  const tang = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(-(2.2 + Math.random() * 2.8));
  const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.6 + Math.random() * 1.6);
  o.v.copy(tang).add(out); o.v.y = 0.6 + Math.random() * 2.2;
  o.s = 0.012 + Math.pow(Math.random(), 3) * 0.05; o.alive = 1; o.landed = 0; o.life = 0; o.flat = 0; o.rot = Math.random() * TAU;
}
function updateParticles(dt) {
  for (let i = 0; i < MAXP; i++) {
    const o = P[i];
    if (!o.alive) { dummy.scale.setScalar(0); dummy.position.set(0, -10, 0); dummy.updateMatrix(); spl.setMatrixAt(i, dummy.matrix); continue; }
    o.life += dt;
    if (!o.landed) {
      o.v.y -= 9.8 * dt; o.p.addScaledVector(o.v, dt);
      const rr = Math.hypot(o.p.x, o.p.z);
      let floor = -10;
      if (rr < 1.84) floor = rr < 1.55 ? -0.34 : -0.34 + (rr - 1.55) * 0.3;
      if (rr > 1.84 && rr < 1.98 && o.p.y < 0.06) { o.v.x *= -0.2; o.v.z *= -0.2; } // hit the pan wall
      if (rr > 1.98) floor = -0.36;
      if (rr < 1.25 && o.p.y < 0) floor = 0;
      if (o.p.y <= floor + o.s * 0.3) { o.p.y = floor + 0.002; o.landed = 1; o.life = 0; }
    } else { o.flat = Math.min(1, o.flat + dt * 10); if (o.life > 7) o.alive = 0; }
    const fade = o.landed ? Math.max(0, 1 - Math.max(0, o.life - 5) / 2) : 1;
    const f = o.flat;
    dummy.position.copy(o.p); dummy.rotation.set(0, o.rot, 0);
    dummy.scale.set(o.s * (1 + f * 1.4) * fade, o.s * (1 - f * 0.8) * fade, o.s * (1 + f * 0.7) * fade);
    dummy.updateMatrix(); spl.setMatrixAt(i, dummy.matrix);
  }
  spl.instanceMatrix.needsUpdate = true;
}

// ---------------- layout ----------------
function resize() {
  const w = innerWidth, h = innerHeight, asp = w / h;
  renderer.setSize(w, h, false); camera.aspect = asp;
  const mobile = asp < 0.85;
  const dist = mobile ? 12.5 : 8.6;
  camera.position.set(0, dist * 0.36, dist);
  camera.lookAt(LOOK);
  if (mobile) camera.setViewOffset(w, h, 0, h * 0.14, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------------- state machine ----------------
let cur = 0, next = 0, t = 0, trans = false, angle = 0, vel = 0, pressed = false, autoUntil = 0, dir = 1, last = performance.now(), emitAcc = 0;
const N = PROJECTS.length;
const pedal = $('#pedal');
function startTransition(d = 1) {
  if (trans) return;
  dir = d; next = (cur + d + N) % N; trans = true; t = 0;
  U.uA.value = PROJECTS[cur].shape; U.uB.value = PROJECTS[next].shape;
  hideCards();
}
function press(v) {
  if (v && !pressed) { startTransition(1); }
  pressed = v; pedal.classList.toggle('down', v);
}
pedal.addEventListener('pointerdown', (e) => { e.preventDefault(); pedal.setPointerCapture(e.pointerId); press(true); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => pedal.addEventListener(ev, () => press(false)));
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(true); }
  if (e.code === 'ArrowRight') { startTransition(1); autoUntil = performance.now() + 2200; }
  if (e.code === 'ArrowLeft') { startTransition(-1); autoUntil = performance.now() + 2200; }
  if (e.code === 'Escape') closePanels();
});
addEventListener('keyup', (e) => { if (e.code === 'Space') press(false); });
$('#nextBtn').onclick = () => { startTransition(1); autoUntil = performance.now() + 2200; };
$('#prevBtn').onclick = () => { startTransition(-1); autoUntil = performance.now() + 2200; };

function finishTransition() {
  cur = next; trans = false; t = 0;
  U.uA.value = U.uB.value = PROJECTS[cur].shape; U.uT.value = 0;
  setTimeout(() => showCards(PROJECTS[cur]), reduce ? 0 : 250);
}

// ---------------- content cards with splatter masks ----------------
function splatSVG(seed, droplets = true) {
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const n = 22, pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU; const spike = rnd() < 0.3 ? 1.25 + rnd() * 0.35 : 0.85 + rnd() * 0.2;
    pts.push([50 + Math.cos(a) * 28 * spike, 50 + Math.sin(a) * 28 * spike]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) { const p0 = pts[i], p1 = pts[(i + 1) % n]; const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2; d += ` Q${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`; }
  let circ = '';
  if (droplets) for (let i = 0; i < 9; i++) { const a = rnd() * TAU, r = 36 + rnd() * 12; circ += `<circle cx="${(50 + Math.cos(a) * r).toFixed(1)}" cy="${(50 + Math.sin(a) * r).toFixed(1)}" r="${(0.8 + rnd() * 2.6).toFixed(1)}"/>`; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${d}Z"/>${circ}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
const content = $('#content');
let cardTimer = 0;
function hideCards() {
  clearTimeout(cardTimer);
  content.querySelectorAll('.card').forEach((c, i) => { c.style.webkitMaskImage = c.style.maskImage = splatSVG(i + 11); c.classList.remove('in'); c.classList.add('out'); c.style.transitionDelay = '0s'; });
  cardTimer = setTimeout(() => { if (trans) content.innerHTML = ''; }, 500);
  $('#hudTitle').textContent = '…';
}
function showCards(p) {
  clearTimeout(cardTimer);
  content.className = p.cls;
  let html = `<div class="card c-title"><p class="eyebrow">${p.eyebrow}</p><h1>${p.title}</h1></div>
    <div class="card c-desc"><p>${p.desc}</p></div>`;
  if (p.meta) html += `<div class="card c-meta"><dl>${p.meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
  p.images.forEach(([src, cap, cls]) => { html += `<figure class="card c-img ${cls}"><img src="${src}" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`; });
  content.innerHTML = html;
  const cards = [...content.querySelectorAll('.card')];
  cards.forEach((c, i) => {
    const m = splatSVG(i + cur * 7 + 3);
    c.style.webkitMaskImage = c.style.maskImage = m;
    c.style.transitionDelay = `${reduce ? 0 : i * 0.12}s`;
    if (!reduce) setTimeout(() => screenSplats(c), i * 120);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => cards.forEach((c) => {
    c.classList.add('in');
    c.addEventListener('transitionend', () => { if (c.classList.contains('in')) c.style.webkitMaskImage = c.style.maskImage = 'none'; }, { once: true });
  })));
  $('#cIdx').textContent = String(cur).padStart(2, '0');
  $('#hudTitle').textContent = p.label;
}
const splats = $('#splats');
function screenSplats(el) {
  const r = el.getBoundingClientRect();
  for (let k = 0; k < 3; k++) {
    const d = document.createElement('div'); d.className = 'splat';
    const s = 40 + Math.random() * 90;
    d.style.cssText = `left:${r.left + Math.random() * r.width}px;top:${r.top + Math.random() * r.height}px;--s:${s}px;--r:${Math.random() * 360}deg;--m:${splatSVG(Math.floor(Math.random() * 999))};--c:${Math.random() < .5 ? '#8f4d31' : '#a8603f'}`;
    splats.appendChild(d); setTimeout(() => d.remove(), 1700);
  }
}

// ---------------- panels, cursor, sound ----------------
function closePanels() { document.querySelectorAll('.panel').forEach((p) => { p.classList.remove('open'); p.setAttribute('aria-hidden', 'true'); }); }
document.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => {
  const p = $('#panel-' + b.dataset.panel), open = p.classList.contains('open'); closePanels();
  if (!open) { p.classList.add('open'); p.setAttribute('aria-hidden', 'false'); }
}));
document.querySelectorAll('.panel-close').forEach((b) => b.addEventListener('click', closePanels));

const cursor = $('#cursor'); let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; cursor.classList.toggle('big', !!e.target.closest('button,a,.c-img')); });

let audio = null;
$('#soundBtn').addEventListener('click', (e) => {
  const b = e.currentTarget;
  if (!audio) {
    const ctx = new AudioContext(); const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let lastv = 0; for (let i = 0; i < len; i++) { lastv = (lastv + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = lastv * 3.5; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300;
    const gain = ctx.createGain(); gain.gain.value = 0; src.connect(filt).connect(gain).connect(ctx.destination); src.start();
    audio = { ctx, gain, filt, on: false };
  }
  audio.on = !audio.on; if (audio.on) audio.ctx.resume();
  b.setAttribute('aria-pressed', audio.on); b.querySelector('i').textContent = audio.on ? 'on' : 'off';
});

// ---------------- loop ----------------
const MAXV = 13;
const camObj = new THREE.Vector3();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const driving = pressed || now < autoUntil;
  if (reduce) {
    if (trans) { t += dt / 0.7; if (t >= 1) finishTransition(); }
    vel = 0;
  } else {
    if (driving) vel += (MAXV - vel) * dt * 1.4;
    else {
      const target = Math.ceil(angle / TAU - 1e-6) * TAU, rem = target - angle;
      vel = Math.min(Math.max(vel * Math.exp(-dt * 1.1), Math.min(rem * 2.0, 1.2)), rem * 2.6 + 0.0001);
      if (rem < 0.0015 && !trans) { angle = target; vel = 0; }
    }
    if (trans) {
      t += dt * Math.max(vel / MAXV, driving ? 0 : 0.35) * 0.5;
      if (driving) { emitAcc += dt * 140 * (vel / MAXV) * Math.sin(Math.PI * Math.min(t, 1)); while (emitAcc > 1) { emit(angle); emitAcc--; } }
      if (t >= 1) finishTransition();
    }
    angle += vel * dt;
  }
  wheel.rotation.y = angle;
  const spin = vel / MAXV;
  U.uT.value = trans ? Math.min(t, 1) : 0;
  U.uSpin.value = spin;
  U.uTime.value = now / 1000;
  camObj.copy(camera.position); clay.worldToLocal(camObj); U.uCamObj.value.copy(camObj);
  // contact shadow footprint
  const a = CONTACT[U.uA.value], b = CONTACT[U.uB.value], k = U.uT.value, lump = Math.sin(Math.PI * k);
  const sx = THREE.MathUtils.lerp(a[0], b[0], k) * (1 - lump * 0.5), sz = THREE.MathUtils.lerp(a[1], b[1], k) * (1 - lump * 0.2) + lump * 0.3;
  contact.scale.set(sx, sz, 1);
  updateParticles(dt);
  // subtle camera breathing + spin push-in
  const base = camera.position.length();
  camera.position.x = Math.sin(now / 4000) * 0.08; camera.lookAt(LOOK);
  renderer.render(scene, camera);
  // HUD
  $('#rpm').textContent = Math.round(vel * 60 / TAU);
  cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22; cursor.style.transform = `translate(${cx}px,${cy}px)`;
  if (audio && audio.on) { audio.gain.gain.value = spin * 0.18; audio.filt.frequency.value = 160 + spin * 600; }
  requestAnimationFrame(frame);
}
requestAnimationFrame((n) => { last = n; frame(n); });
showCards(PROJECTS[0]);
document.fonts.ready.then(() => setTimeout(() => $('#loader').classList.add('done'), 600));
window.__portfolio = { press, startTransition, state: () => ({ cur, trans, t, vel }) };
