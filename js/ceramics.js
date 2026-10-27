import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const TAU = Math.PI * 2;
const RINGS = 80;
const SEGS = 96;

const CLAY_TONES = [
  {
    id: 'terracotta',
    label: 'Terracotta clay',
    color: 'assets/hanouf/pottery/textures/clay-terracotta-color.jpg',
    rough: 'assets/hanouf/pottery/textures/clay-terracotta-roughness.jpg',
    normal: 'assets/hanouf/pottery/textures/clay-terracotta-normal.jpg',
    splat: '#8a4530',
  },
  {
    id: 'stoneware',
    label: 'Stoneware clay',
    color: 'assets/hanouf/pottery/textures/clay-stoneware-color.jpg',
    rough: 'assets/hanouf/pottery/textures/clay-stoneware-roughness.jpg',
    normal: 'assets/hanouf/pottery/textures/clay-stoneware-normal.jpg',
    splat: '#8a8884',
  },
];

function parseOBJ(text) {
  const positions = [];
  const indices = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.charCodeAt(0) === 118 && line.charCodeAt(1) === 32) {
      const p = line.split(' ');
      positions.push(+p[1], +p[2], +p[3]);
    } else if (line.charCodeAt(0) === 102 && line.charCodeAt(1) === 32) {
      const parts = line.split(' ');
      const idx = [];
      for (let k = 1; k < parts.length; k += 1) {
        if (parts[k]) idx.push(parseInt(parts[k], 10) - 1);
      }
      for (let k = 1; k < idx.length - 1; k += 1) indices.push(idx[0], idx[k], idx[k + 1]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

function fitGeo(geo, height) {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);
  geo.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const scale = height / Math.max(size.y, 0.0001);
  geo.scale(scale, scale, scale);
  geo.computeBoundingBox();
  const fitted = geo.boundingBox;
  const half = Math.max(fitted.max.x, -fitted.min.x, fitted.max.z, -fitted.min.z);
  if (half > 1.12) {
    const k = 1.12 / half;
    geo.scale(k, k, k);
  }
  geo.computeVertexNormals();
  return geo;
}

async function loadModel(item) {
  if (!item || !item.model) return null;
  try {
    const res = await fetch(encodeURI(item.model));
    if (!res.ok) return null;
    const geo = fitGeo(parseOBJ(await res.text()), item.height || 1);
    const finish = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: item.color || '#c4b09a',
      roughness: item.roughness == null ? 0.72 : item.roughness,
      metalness: item.metalness == null ? 0.02 : item.metalness,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    }));
    const clay = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    }));
    finish.castShadow = finish.receiveShadow = true;
    clay.castShadow = clay.receiveShadow = true;
    finish.visible = false;
    clay.visible = false;
    return { finish, clay, shell: shellOf(geo) };
  } catch (err) {
    return null;
  }
}

function loadMap(url, colorSpace, renderer) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    new THREE.TextureLoader().load(url, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2.2, 1.6);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (colorSpace) tex.colorSpace = colorSpace;
      tex.needsUpdate = true;
      resolve(tex);
    }, undefined, () => resolve(null));
  });
}

function shellOf(geo) {
  const pos = geo.attributes.position;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const height = Math.max(0.0001, maxY - minY);
  const bins = new Float32Array(RINGS * SEGS);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const yi = Math.min(RINGS - 1, Math.max(0, Math.round(((y - minY) / height) * (RINGS - 1))));
    let theta = Math.atan2(z, x);
    if (theta < 0) theta += TAU;
    const ti = Math.min(SEGS - 1, Math.floor((theta / TAU) * SEGS));
    const r = Math.hypot(x, z);
    const k = yi * SEGS + ti;
    if (r > bins[k]) bins[k] = r;
  }
  for (let pass = 0; pass < 8; pass += 1) {
    const next = new Float32Array(bins);
    for (let y = 0; y < RINGS; y += 1) {
      for (let t = 0; t < SEGS; t += 1) {
        if (bins[y * SEGS + t] > 0) continue;
        let acc = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          const yy = y + dy;
          if (yy < 0 || yy >= RINGS) continue;
          for (let dt = -1; dt <= 1; dt += 1) {
            const v = bins[yy * SEGS + ((t + dt + SEGS) % SEGS)];
            if (v > 0) { acc += v; n += 1; }
          }
        }
        if (n) next[y * SEGS + t] = acc / n;
      }
    }
    bins.set(next);
  }
  const smooth = new Float32Array(bins);
  for (let y = 0; y < RINGS; y += 1) {
    for (let t = 0; t < SEGS; t += 1) {
      let acc = 0;
      let w = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const yy = Math.min(RINGS - 1, Math.max(0, y + dy));
        for (let dt = -1; dt <= 1; dt += 1) {
          const weight = dy === 0 && dt === 0 ? 2 : 1;
          acc += bins[yy * SEGS + ((t + dt + SEGS) % SEGS)] * weight;
          w += weight;
        }
      }
      smooth[y * SEGS + t] = acc / w;
    }
  }
  const out = new Float32Array(RINGS * SEGS * 3);
  for (let y = 0; y < RINGS; y += 1) {
    const fy = y / (RINGS - 1);
    const yy = minY + fy * height;
    for (let t = 0; t < SEGS; t += 1) {
      const theta = (t / SEGS) * TAU;
      const r = Math.max(0.02, smooth[y * SEGS + t]);
      const i = y * SEGS + t;
      out[i * 3] = Math.cos(theta) * r;
      out[i * 3 + 1] = yy;
      out[i * 3 + 2] = Math.sin(theta) * r;
    }
  }
  return out;
}

function makeShellGeometry() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(RINGS * SEGS * 3);
  const uvs = new Float32Array(RINGS * SEGS * 2);
  for (let y = 0; y < RINGS; y += 1) {
    for (let t = 0; t < SEGS; t += 1) {
      const i = y * SEGS + t;
      uvs[i * 2] = t / SEGS;
      uvs[i * 2 + 1] = y / (RINGS - 1);
    }
  }
  const idx = [];
  for (let y = 0; y < RINGS - 1; y += 1) {
    for (let t = 0; t < SEGS; t += 1) {
      const t2 = (t + 1) % SEGS;
      const a = y * SEGS + t;
      const b = y * SEGS + t2;
      const c = (y + 1) * SEGS + t;
      const d = (y + 1) * SEGS + t2;
      idx.push(a, c, b, b, c, d);
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  return geo;
}

function writeShell(geo, positions) {
  const attr = geo.attributes.position;
  attr.array.set(positions);
  attr.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
}

function lerpShell(out, a, b, t) {
  const k = t * t * (3 - 2 * t);
  for (let i = 0; i < out.length; i += 1) out[i] = a[i] + (b[i] - a[i]) * k;
}

export async function createCeramics(renderer, { reduce, projects }) {
  const scene = new THREE.Scene();
  const BG = new THREE.Color('#e8e1d6');
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 9, 17);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const LOOK = new THREE.Vector3(0, 1.02, 0);

  const key = new THREE.DirectionalLight(0xfff1e0, 2.6);
  key.position.set(-3.5, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe6f0, 0.5);
  fill.position.set(4, 2, -2);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xb9ab98, 0.6));

  const table = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: 0xd8cfc2, roughness: 0.92 }),
  );
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.36;
  table.receiveShadow = true;
  scene.add(table);

  const panPts = [[0.0, -0.34], [1.55, -0.34], [1.78, -0.30], [1.86, -0.12], [1.9, 0.04], [1.96, 0.07], [1.97, 0.04], [1.91, -0.14], [1.84, -0.36]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const pan = new THREE.Mesh(
    new THREE.LatheGeometry(panPts, 96),
    new THREE.MeshStandardMaterial({ color: 0xcfc6b9, roughness: 0.55, side: THREE.DoubleSide }),
  );
  pan.castShadow = pan.receiveShadow = true;
  scene.add(pan);

  function headTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#9d9993';
    g.fillRect(0, 0, 1024, 1024);
    for (let r = 4; r < 512; r += 1.6) {
      g.strokeStyle = `rgba(${Math.random() < .5 ? 255 : 40},${Math.random() < .5 ? 255 : 40},${Math.random() < .5 ? 255 : 40},${Math.random() * 0.06})`;
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(512, 512, r, 0, TAU);
      g.stroke();
    }
    for (let i = 0; i < 26; i++) {
      const r = 180 + Math.random() * 300, a = Math.random() * TAU, len = 0.2 + Math.random() * 0.9;
      g.strokeStyle = `rgba(122,70,44,${0.18 + Math.random() * 0.35})`;
      g.lineWidth = 2 + Math.random() * 14;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(512, 512, r, a, a + len);
      g.stroke();
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(40,40,40,.5)';
      const a = i / 6 * TAU;
      g.beginPath();
      g.arc(512 + Math.cos(a) * 420, 512 + Math.sin(a) * 420, 9, 0, TAU);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  const wheel = new THREE.Group();
  scene.add(wheel);
  const headMat = new THREE.MeshStandardMaterial({ map: headTexture(), metalness: 0.75, roughness: 0.38 });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x8e8a84, metalness: 0.85, roughness: 0.3 });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.22, 0.1, 96), [sideMat, headMat, sideMat]);
  head.position.y = -0.05;
  head.castShadow = head.receiveShadow = true;
  wheel.add(head);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.28, 32), sideMat);
  shaft.position.y = -0.24;
  scene.add(shaft);

  function radial() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(30,18,10,.55)');
    gr.addColorStop(1, 'rgba(30,18,10,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: radial(), transparent: true, depthWrite: false }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.002;
  wheel.add(contact);

  const tones = await Promise.all(CLAY_TONES.map(async (tone) => ({
    ...tone,
    colorMap: await loadMap(tone.color, THREE.SRGBColorSpace, renderer),
    roughMap: await loadMap(tone.rough, null, renderer),
    normalMap: await loadMap(tone.normal, null, renderer),
  })));

  const shellPositions = new Float32Array(RINGS * SEGS * 3);
  const shellGeo = makeShellGeometry();
  const shellMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.94,
    metalness: 0,
    side: THREE.DoubleSide,
    normalScale: new THREE.Vector2(0.7, 0.7),
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.castShadow = shell.receiveShadow = true;
  shell.visible = false;
  wheel.add(shell);

  const MAXP = 280;
  const splMat = new THREE.MeshStandardMaterial({ color: 0x7c4329, roughness: 0.3, metalness: 0 });
  const spl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), splMat, MAXP);
  spl.castShadow = true;
  spl.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  spl.count = MAXP;
  scene.add(spl);
  const P = Array.from({ length: MAXP }, () => ({
    alive: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0, landed: 0, life: 0, flat: 0, rot: 0,
  }));
  let pIdx = 0;
  const dummy = new THREE.Object3D();
  function emit() {
    const o = P[pIdx];
    pIdx = (pIdx + 1) % MAXP;
    const a = Math.random() * TAU, r = 0.45 + Math.random() * 0.35, y = 0.15 + Math.random() * 0.9;
    o.p.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const tang = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(-(2.2 + Math.random() * 2.8));
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.6 + Math.random() * 1.6);
    o.v.copy(tang).add(out);
    o.v.y = 0.6 + Math.random() * 2.2;
    o.s = 0.012 + Math.pow(Math.random(), 3) * 0.05;
    o.alive = 1;
    o.landed = 0;
    o.life = 0;
    o.flat = 0;
    o.rot = Math.random() * TAU;
  }
  function updateParticles(dt) {
    for (let i = 0; i < MAXP; i++) {
      const o = P[i];
      if (!o.alive) {
        dummy.scale.setScalar(0);
        dummy.position.set(0, -10, 0);
        dummy.updateMatrix();
        spl.setMatrixAt(i, dummy.matrix);
        continue;
      }
      o.life += dt;
      if (!o.landed) {
        o.v.y -= 9.8 * dt;
        o.p.addScaledVector(o.v, dt);
        const rr = Math.hypot(o.p.x, o.p.z);
        let floor = -10;
        if (rr < 1.84) floor = rr < 1.55 ? -0.34 : -0.34 + (rr - 1.55) * 0.3;
        if (rr > 1.84 && rr < 1.98 && o.p.y < 0.06) { o.v.x *= -0.2; o.v.z *= -0.2; }
        if (rr > 1.98) floor = -0.36;
        if (rr < 1.25 && o.p.y < 0) floor = 0;
        if (o.p.y <= floor + o.s * 0.3) { o.p.y = floor + 0.002; o.landed = 1; o.life = 0; }
      } else {
        o.flat = Math.min(1, o.flat + dt * 10);
        if (o.life > 7) o.alive = 0;
      }
      const fade = o.landed ? Math.max(0, 1 - Math.max(0, o.life - 5) / 2) : 1;
      const f = o.flat;
      dummy.position.copy(o.p);
      dummy.rotation.set(0, o.rot, 0);
      dummy.scale.set(o.s * (1 + f * 1.4) * fade, o.s * (1 - f * 0.8) * fade, o.s * (1 + f * 0.7) * fade);
      dummy.updateMatrix();
      spl.setMatrixAt(i, dummy.matrix);
    }
    spl.instanceMatrix.needsUpdate = true;
  }

  const list = projects.length ? projects : [{ title: '', text: '', rest: true }];
  const models = await Promise.all(list.map((item) => loadModel(item)));
  const choice = list.map((_, i) => i % tones.length);
  models.forEach((entry) => {
    if (!entry) return;
    wheel.add(entry.finish);
    wheel.add(entry.clay);
  });
  let cur = 0;
  let next = 0;
  let t = 0;
  let trans = false;
  let angle = 0;
  let vel = 0;
  let autoUntil = 0;
  let emitAcc = 0;
  const N = list.length;
  let hidden = false;
  let fade = 0;

  function tonePack(i) {
    return tones[choice[(i + N) % N]] || tones[0];
  }

  function paintClay(material, pack) {
    if (!material || !pack) return;
    material.map = pack.colorMap;
    material.roughnessMap = pack.roughMap;
    material.normalMap = pack.normalMap;
    material.color.set('#ffffff');
    material.metalness = 0;
    material.roughness = 0.94;
    material.needsUpdate = true;
  }

  function applyChoice(i) {
    const entry = models[(i + N) % N];
    const pack = tonePack(i);
    if (entry) paintClay(entry.clay.material, pack);
    paintClay(shellMat, pack);
    splMat.color.set(pack.splat);
    syncTones();
  }

  function footprint(i) {
    const entry = models[(i + N) % N];
    if (!entry) return 1.3;
    let maxR = 0.2;
    const src = entry.shell;
    for (let k = 0; k < src.length; k += 3) maxR = Math.max(maxR, Math.hypot(src[k], src[k + 2]));
    return Math.min(2.3, Math.max(0.75, maxR * 2.2));
  }

  function showEntry(i, clayOpacity, finishOpacity) {
    models.forEach((entry, idx) => {
      if (!entry) return;
      const on = idx === i;
      entry.clay.visible = on && clayOpacity > 0.02;
      entry.finish.visible = on && finishOpacity > 0.02;
      entry.clay.material.opacity = on ? clayOpacity : 0;
      entry.finish.material.opacity = on ? finishOpacity : 0;
      entry.clay.material.depthWrite = clayOpacity > 0.85;
      entry.finish.material.depthWrite = finishOpacity > 0.85;
    });
  }

  const toneRoot = document.createElement('div');
  toneRoot.id = 'clayTones';
  toneRoot.hidden = true;
  tones.forEach((pack, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tone = String(index);
    button.setAttribute('aria-label', pack.label);
    button.title = pack.label;
    if (pack.colorMap && pack.colorMap.image) {
      button.style.backgroundImage = `url(${pack.color})`;
    } else {
      button.style.background = pack.splat;
    }
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const target = trans ? next : cur;
      choice[target] = index;
      applyChoice(target);
    });
    toneRoot.appendChild(button);
  });
  document.body.appendChild(toneRoot);

  function syncTones() {
    const selected = choice[cur];
    [...toneRoot.children].forEach((button, index) => {
      button.classList.toggle('on', index === selected);
    });
  }
  applyChoice(0);

  function resize(w, h) {
    const asp = w / h;
    camera.aspect = asp;
    const mobile = asp < 0.85;
    const dist = mobile ? 7.6 : 5.85;
    camera.position.set(0, dist * (mobile ? 0.42 : 0.34), dist);
    camera.lookAt(LOOK);
    if (mobile) camera.setViewOffset(w, h, 0, h * 0.06, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function begin(dir) {
    if (trans || N < 2) return false;
    next = (cur + dir + N) % N;
    if (!models[cur] || !models[next]) return false;
    trans = true;
    t = 0;
    hidden = true;
    fade = 0;
    showEntry(-1, 0, 0);
    applyChoice(next);
    writeShell(shellGeo, models[cur].shell);
    shell.visible = true;
    autoUntil = performance.now() + (reduce ? 0 : 2200);
    return true;
  }

  function finish() {
    cur = next;
    trans = false;
    t = 0;
    hidden = false;
    shell.visible = false;
    applyChoice(cur);
    showEntry(cur, 1, 0);
  }

  const MAXV = 13;
  function update(dt, now) {
    const driving = now < autoUntil;
    if (reduce) {
      if (trans) { t += dt / 0.45; if (t >= 1) finish(); }
      vel = 0;
    } else {
      if (driving) vel += (MAXV - vel) * dt * 1.4;
      else {
        const target = Math.ceil(angle / TAU - 1e-6) * TAU;
        const rem = target - angle;
        vel = Math.min(Math.max(vel * Math.exp(-dt * 1.1), Math.min(rem * 2.0, 1.2)), rem * 2.6 + 0.0001);
        if (rem < 0.0015 && !trans) { angle = target; vel = 0; }
      }
      if (trans) {
        t += dt * Math.max(vel / MAXV, driving ? 0 : 0.35) * 0.55;
        if (driving) {
          emitAcc += dt * 120 * (vel / MAXV) * Math.sin(Math.PI * Math.min(t, 1));
          while (emitAcc > 1) { emit(); emitAcc--; }
        }
        if (t >= 1) finish();
      }
      angle += vel * dt;
    }
    wheel.rotation.y = angle;
    const spin = vel / MAXV;
    const stopped = !trans && !hidden && vel === 0 && now >= autoUntil;
    if (trans && models[cur] && models[next]) {
      const k = Math.min(t, 1);
      lerpShell(shellPositions, models[cur].shell, models[next].shell, k);
      writeShell(shellGeo, shellPositions);
      shell.visible = true;
      showEntry(-1, 0, 0);
      const span = THREE.MathUtils.lerp(footprint(cur), footprint(next), k);
      contact.scale.set(span, span, 1);
    } else if (!trans && models[cur]) {
      if (!stopped) fade = 0;
      else if (reduce) fade = 1;
      else fade = Math.min(1, fade + dt);
      const blend = fade * fade * (3 - 2 * fade);
      shell.visible = false;
      showEntry(cur, 1 - blend, blend);
      const span = footprint(cur);
      contact.scale.set(span, span, 1);
    }
    updateParticles(dt);
    if (!reduce) camera.position.x = Math.sin(now / 4000) * 0.08;
    camera.lookAt(LOOK);
    return spin;
  }

  function currentProject() {
    const p = list[cur];
    if (!p || p.rest || hidden) return null;
    return p;
  }

  return {
    scene,
    camera,
    resize,
    update,
    step: begin,
    spin: () => vel / MAXV,
    setTonesVisible(on) { toneRoot.hidden = !on; },
    nav() {
      const real = projects.length;
      return {
        index: real ? cur : 0,
        total: real,
        label: real && !hidden ? (list[cur].title || '') : '',
        project: currentProject(),
        hiding: hidden && real > 0,
      };
    },
  };
}
