import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { makeTextures, makeClay } from './clay.js';

const TAU = Math.PI * 2;
const CONTACT = [[2.5, 0.9], [1.6, 0.9], [1.5, 1.5], [1.9, 1.9], [1.15, 1.15]];

function spanFor(shape) {
  if (shape < 2.5) return 1.42;
  if (shape < 3.5) return 0.62;
  return 1.52;
}

function loadPhoto(url, renderer) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.needsUpdate = true;
      resolve(tex);
    }, undefined, () => resolve(null));
  });
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
  const LOOK = new THREE.Vector3(0, 0.45, 0);

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

  const clay = makeClay(makeTextures());
  clay.scale.setScalar(1.15);
  wheel.add(clay);
  const U = clay.material.uniforms;

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

  const list = projects.length ? projects : [{ shape: 2, title: '', text: '', images: [], rest: true }];
  const photos = await Promise.all(list.map((item) => loadPhoto(item.images && item.images[0], renderer)));
  const blank = new THREE.DataTexture(new Uint8Array([180, 100, 70, 255]), 1, 1);
  blank.colorSpace = THREE.SRGBColorSpace;
  blank.needsUpdate = true;
  let cur = 0;
  let next = 0;
  let t = 0;
  let trans = false;
  let angle = 0;
  let vel = 0;
  let autoUntil = 0;
  let emitAcc = 0;
  const N = list.length;
  const shapeOf = (i) => (list[(i + N) % N].shape ?? 2);
  U.uA.value = U.uB.value = shapeOf(0);

  function showPhoto(i) {
    const tex = photos[(i + N) % N];
    U.uPhoto.value = tex || blank;
    U.uHasPhoto.value = tex ? 1 : 0;
    U.uSpan.value = spanFor(shapeOf(i));
  }
  showPhoto(0);
  U.uFinish.value = 0;

  let hidden = false;
  let fade = 0;
  let shownFor = -1;

  function resize(w, h) {
    const asp = w / h;
    camera.aspect = asp;
    const mobile = asp < 0.85;
    const dist = mobile ? 11.4 : 8.4;
    camera.position.set(0, dist * (mobile ? 0.46 : 0.38), dist);
    camera.lookAt(LOOK);
    if (mobile) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function begin(dir) {
    if (trans || N < 2) return false;
    next = (cur + dir + N) % N;
    trans = true;
    t = 0;
    hidden = true;
    U.uA.value = shapeOf(cur);
    U.uB.value = shapeOf(next);
    fade = 0;
    U.uFinish.value = 0;
    autoUntil = performance.now() + (reduce ? 0 : 2200);
    return true;
  }

  function finish() {
    cur = next;
    trans = false;
    t = 0;
    hidden = false;
    shownFor = cur;
    U.uA.value = U.uB.value = shapeOf(cur);
    U.uT.value = 0;
    showPhoto(cur);
  }

  const camObj = new THREE.Vector3();
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
    U.uT.value = trans ? Math.min(t, 1) : 0;
    const stopped = !trans && !hidden && vel === 0 && now >= autoUntil;
    if (!stopped) fade = 0;
    else if (reduce) fade = 1;
    else fade = Math.min(1, fade + dt);
    const blend = fade * fade * (3 - 2 * fade);
    U.uFinish.value = blend;
    U.uSpin.value = spin;
    U.uTime.value = now / 1000;
    camObj.copy(camera.position);
    clay.worldToLocal(camObj);
    U.uCamObj.value.copy(camObj);
    const a = CONTACT[shapeOf(cur)] || CONTACT[2];
    const b = CONTACT[shapeOf(next)] || CONTACT[2];
    const k = U.uT.value;
    const lump = Math.sin(Math.PI * k);
    const sx = THREE.MathUtils.lerp(a[0], b[0], k) * (1 - lump * 0.5);
    const sz = THREE.MathUtils.lerp(a[1], b[1], k) * (1 - lump * 0.2) + lump * 0.3;
    contact.scale.set(sx, sz, 1);
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
