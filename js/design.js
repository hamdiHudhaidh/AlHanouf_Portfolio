import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const PAPER = '#f4efe6';
const INK = '#1d1b19';
const CLAY = '#a8603f';
const MUTED = '#5b554d';

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
  const words = String(text || '').split(/\s+/);
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
        g.fillText(`${rest}…`, x, y);
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
  let dw = w, dh = h, dx = x, dy = y;
  if (ir > r) { dh = w / ir; dy = y + (h - dh) / 2; }
  else { dw = h * ir; dx = x + (w - dw) / 2; }
  g.drawImage(img, dx, dy, dw, dh);
}

function makePageCanvas() {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 1200;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { c, tex, g: c.getContext('2d') };
}

function paintLeft(page, img, index, total) {
  const { c, g, tex } = page;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(29,27,25,.08)';
  g.strokeRect(28, 28, c.width - 56, c.height - 56);
  if (img) {
    g.save();
    roundRect(g, 64, 70, c.width - 128, c.height - 210, 8);
    g.clip();
    g.fillStyle = '#e7e0d6';
    g.fillRect(64, 70, c.width - 128, c.height - 210);
    drawContain(g, img, 64, 70, c.width - 128, c.height - 210);
    g.restore();
  }
  g.fillStyle = MUTED;
  g.font = '500 22px Inter, sans-serif';
  g.textAlign = 'left';
  if (total > 1) g.fillText(`${String(index + 1).padStart(2, '0')}  /  ${String(total).padStart(2, '0')}`, 72, c.height - 78);
  g.textAlign = 'right';
  g.fillText('image', c.width - 72, c.height - 78);
  tex.needsUpdate = true;
}

function paintRight(page, project) {
  const { c, g, tex } = page;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(29,27,25,.08)';
  g.strokeRect(28, 28, c.width - 56, c.height - 56);
  let y = 150;
  g.textAlign = 'left';
  if (project.year) {
    g.fillStyle = CLAY;
    g.font = '500 22px Inter, sans-serif';
    g.fillText(String(project.year), 78, y);
    y += 70;
  }
  g.fillStyle = INK;
  g.font = '500 78px Cormorant, Georgia, serif';
  y = wrap(g, project.title, 78, y, c.width - 160, 84, 3) + 28;
  if (project.text) {
    g.fillStyle = MUTED;
    g.font = '400 28px Inter, sans-serif';
    y = wrap(g, project.text, 78, y, c.width - 160, 42, 6) + 20;
  }
  const links = [{ label: 'Original portfolio', href: project.source }, ...(project.links || [])];
  g.fillStyle = INK;
  g.font = '500 22px Inter, sans-serif';
  for (const link of links) {
    y = wrap(g, link.label, 78, y, c.width - 160, 32, 2) + 8;
  }
  // dog-ear
  g.fillStyle = '#e4d9cc';
  g.beginPath();
  g.moveTo(c.width - 36, c.height - 150);
  g.lineTo(c.width - 36, c.height - 36);
  g.lineTo(c.width - 150, c.height - 36);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(29,27,25,.18)';
  g.stroke();
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

function paperTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d5cdc1';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const v = 180 + Math.random() * 50;
    g.fillStyle = `rgba(${v},${v - 8},${v - 16},${Math.random() * 0.15})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 4);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function curlGeo(geo, amount) {
  const base = geo.userData.base;
  const pos = geo.attributes.position;
  const w = geo.parameters.width;
  for (let i = 0; i < pos.count; i++) {
    const x0 = base[i * 3];
    const y0 = base[i * 3 + 1];
    const u = Math.min(1, Math.max(0, x0 / w));
    const a = amount * Math.PI * Math.pow(u, 0.62);
    pos.setXYZ(i, Math.cos(a) * x0, y0, Math.sin(a) * x0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function pageGeo(w, h, side) {
  const geo = new THREE.PlaneGeometry(w, h, 22, 8);
  geo.translate(side * w / 2, 0, 0);
  geo.userData.base = Float32Array.from(geo.attributes.position.array);
  return geo;
}

export async function createDesign(renderer, { reduce, projects }) {
  const scene = new THREE.Scene();
  const BG = new THREE.Color('#e8e1d6');
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 11, 22);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  const key = new THREE.DirectionalLight(0xfff3e4, 2.4);
  key.position.set(-3, 7, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = key.shadow.camera.bottom = -6;
  key.shadow.camera.right = key.shadow.camera.top = 6;
  scene.add(key);
  scene.add(new THREE.DirectionalLight(0xd5deea, 0.45).translateX(4).translateY(3).translateZ(-2));
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xb7ab9c, 0.7));

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.12, 5.2),
    new THREE.MeshStandardMaterial({ map: paperTex(), color: 0xe7dfd4, roughness: 0.92 }),
  );
  table.position.y = -0.06;
  table.receiveShadow = true;
  scene.add(table);
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(7.28, 0.08, 5.28),
    new THREE.MeshStandardMaterial({ color: 0xc9bfb2, roughness: 0.8 }),
  );
  edge.position.y = -0.14;
  scene.add(edge);

  const images = new Map();
  await Promise.all(projects.flatMap((p) => p.images.map(async (url) => {
    if (!images.has(url)) images.set(url, await loadImage(url));
  })));

  const texOf = (url) => {
    const img = images.get(url);
    if (!img) return null;
    const t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  };

  const PW = 1.05;
  const PH = 1.4;
  const leftPage = makePageCanvas();
  const rightPage = makePageCanvas();
  const backPage = makePageCanvas();
  const leftMat = new THREE.MeshStandardMaterial({ map: leftPage.tex, roughness: 0.86, metalness: 0 });
  const rightMat = new THREE.MeshStandardMaterial({ map: rightPage.tex, roughness: 0.86, side: THREE.FrontSide });
  const backMat = new THREE.MeshStandardMaterial({ map: backPage.tex, roughness: 0.86, side: THREE.BackSide });

  const book = new THREE.Group();
  book.rotation.x = -Math.PI / 2;
  book.position.y = 0.012;
  scene.add(book);

  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(PW * 2 + 0.08, PH + 0.08, 0.025),
    new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.55 }),
  );
  cover.position.z = -0.02;
  book.add(cover);

  const leftGeo = pageGeo(PW, PH, -1);
  const leftMesh = new THREE.Mesh(leftGeo, leftMat);
  leftMesh.castShadow = true;
  leftMesh.receiveShadow = true;
  book.add(leftMesh);

  const rightGeo = pageGeo(PW, PH, 1);
  const rightMesh = new THREE.Mesh(rightGeo, rightMat);
  const backMesh = new THREE.Mesh(rightGeo, backMat);
  rightMesh.castShadow = true;
  rightMesh.receiveShadow = true;
  book.add(rightMesh, backMesh);

  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, PH, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x8c4a2f, roughness: 0.45 }),
  );
  book.add(spine);

  let index = 0;
  let photo = 0;
  let curl = 0;
  let curlTo = 0;
  let flipping = 0;
  let pending = 0;

  function project(i) { return projects[(i + projects.length) % projects.length]; }
  function imgAt(p, n) { return images.get(p.images[n] || p.images[0]) || null; }

  function redraw() {
    const p = project(index);
    const n = p.images.length;
    photo = ((photo % n) + n) % n;
    paintLeft(leftPage, imgAt(p, photo), photo, n);
    paintRight(rightPage, p);
    const nxt = project(index + (flipping < 0 ? -1 : 1));
    paintLeft(backPage, imgAt(nxt, 0), 0, nxt.images.length);
  }
  redraw();

  function commit(dir) {
    index = (index + dir + projects.length) % projects.length;
    photo = 0;
    curl = 0;
    curlTo = 0;
    flipping = 0;
    curlGeo(rightGeo, 0);
    redraw();
    markActive();
  }

  function step(dir) {
    if (!projects.length || flipping) return false;
    if (reduce) { commit(dir); return true; }
    flipping = dir;
    if (dir < 0) {
      index = (index - 1 + projects.length) % projects.length;
      photo = 0;
      redraw();
      curl = 1;
      curlTo = 0;
      curlGeo(rightGeo, 1);
    } else {
      curlTo = 1;
      redraw();
    }
    return true;
  }

  function cyclePhoto(dir) {
    const p = project(index);
    if (p.images.length < 2 || flipping) return;
    photo = (photo + dir + p.images.length) % p.images.length;
    paintLeft(leftPage, imgAt(p, photo), photo, p.images.length);
  }

  const mockups = [];
  function addMock(slug, mesh) {
    mesh.userData.slug = slug;
    mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(mesh);
    mockups.push(mesh);
  }

  function framed(tex, w, h, d = 0.02) {
    const g = new THREE.Group();
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(w, d, h),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, color: 0xffffff }),
    );
    g.add(face);
    return g;
  }

  const place = {
    'peak-identity': () => {
      const g = framed(texOf(projects.find((p) => p.slug === 'peak-identity').images[1] || projects[0].images[0]), 0.72, 0.96);
      g.position.set(-1.85, 0.03, -1.15);
      g.rotation.y = 0.28;
      return g;
    },
    'parkit-idintity': () => {
      const p = projects.find((x) => x.slug === 'parkit-idintity');
      const g = framed(texOf(p.images[0]), 0.78, 0.52);
      g.position.set(1.9, 0.03, -1.2);
      g.rotation.y = -0.4;
      return g;
    },
    'brand-idintity': () => {
      const p = projects.find((x) => x.slug === 'brand-idintity');
      const g = framed(texOf(p.images[0]), 0.34, 1.15);
      g.position.set(-2.15, 0.03, 0.15);
      g.rotation.y = 0.5;
      return g;
    },
    'profile-design': () => {
      const p = projects.find((x) => x.slug === 'profile-design');
      const g = new THREE.Group();
      const coverM = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.045, 0.56),
        new THREE.MeshStandardMaterial({ map: texOf(p.images[0]), roughness: 0.55 }),
      );
      g.add(coverM);
      g.position.set(-1.55, 0.04, 1.25);
      g.rotation.y = 0.25;
      return g;
    },
    'cube-design': () => {
      const p = projects.find((x) => x.slug === 'cube-design');
      const mat = new THREE.MeshStandardMaterial({ map: texOf(p.images[1] || p.images[0]), roughness: 0.45 });
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), mat);
      g.position.set(1.85, 0.28, 0.15);
      g.rotation.y = 0.6;
      return g;
    },
    'playing-card-design': () => {
      const p = projects.find((x) => x.slug === 'playing-card-design');
      const g = new THREE.Group();
      p.images.slice(0, 3).forEach((url, i) => {
        const c = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.012, 0.5),
          new THREE.MeshStandardMaterial({ map: texOf(url), roughness: 0.5 }),
        );
        c.position.set(i * 0.05, i * 0.014, i * 0.02);
        c.rotation.y = -0.35 + i * 0.18;
        g.add(c);
      });
      g.position.set(1.35, 0.02, 1.2);
      return g;
    },
    'social-media-posts': () => {
      const p = projects.find((x) => x.slug === 'social-media-posts');
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.028, 0.68),
        new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.4, metalness: 0.4 }),
      );
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.58),
        new THREE.MeshStandardMaterial({ map: texOf(p.images[1] || p.images[0]), roughness: 0.4 }),
      );
      screen.rotation.x = -Math.PI / 2;
      screen.position.y = 0.016;
      g.add(body, screen);
      g.position.set(0.15, 0.02, -1.45);
      g.rotation.y = -0.15;
      return g;
    },
    'website-design': () => {
      const p = projects.find((x) => x.slug === 'website-design');
      const g = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.025, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x2c2926, roughness: 0.45, metalness: 0.3 }),
      );
      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.5, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x2c2926, roughness: 0.45 }),
      );
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.82, 0.42),
        new THREE.MeshStandardMaterial({ map: texOf(p.images[0]), roughness: 0.4 }),
      );
      lid.position.set(0, 0.26, -0.28);
      lid.rotation.x = -0.7;
      screen.position.set(0, 0.26, -0.26);
      screen.rotation.x = -0.7;
      g.add(base, lid, screen);
      g.position.set(1.7, 0.03, 0.95);
      g.rotation.y = -0.5;
      return g;
    },
    'video-editing': () => {
      const p = projects.find((x) => x.slug === 'video-editing');
      const g = framed(texOf(p.images[0]), 0.7, 0.46);
      g.position.set(-0.35, 0.03, 1.45);
      g.rotation.y = 0.1;
      return g;
    },
    'vest-design': () => {
      const p = projects.find((x) => x.slug === 'vest-design');
      const g = framed(texOf(p.images[0]), 0.62, 0.62, 0.012);
      g.position.set(-1.95, 0.02, 1.05);
      g.rotation.y = 0.2;
      return g;
    },
  };

  for (const p of projects) {
    const make = place[p.slug];
    if (make) addMock(p.slug, make());
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.48, 40),
    new THREE.MeshBasicMaterial({ color: 0xa8603f, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);

  function markActive() {
    const slug = project(index).slug;
    mockups.forEach((m) => { m.userData.lift = m.userData.slug === slug ? 0.07 : 0; });
  }
  markActive();

  let drag = null;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function hitPage(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(rightMesh, false)[0] || null;
  }

  function pointerDown(ev) {
    const hit = hitPage(ev);
    if (!hit) return false;
    const local = rightMesh.worldToLocal(hit.point.clone());
    const corner = local.x > PW * 0.62;
    drag = { x: ev.clientX, y: ev.clientY, corner, moved: false };
    return corner ? 'corner' : 'page';
  }
  function pointerMove(ev) {
    if (!drag?.corner || flipping) return;
    const dx = drag.x - ev.clientX;
    drag.moved = true;
    curlTo = Math.min(1, Math.max(0, dx / 280));
    curl = curlTo;
  }
  function pointerUp(ev) {
    if (!drag) return false;
    const dx = drag.x - ev.clientX;
    const dy = Math.abs(ev.clientY - drag.y);
    const was = drag;
    drag = null;
    if (was.corner) {
      if (curl > 0.34) { flipping = 1; curlTo = 1; }
      else curlTo = 0;
      return true;
    }
    if (Math.hypot(dx, dy) < 8) cyclePhoto(1);
    return false;
  }

  let narrow = false;
  function resize(w, h) {
    narrow = w / h < 0.9;
    camera.aspect = w / h;
    camera.fov = narrow ? 33 : 28;
    if (narrow) camera.position.set(0, 4.05, 0.42);
    else camera.position.set(0.04, 5.35, 1.7);
    camera.lookAt(0, 0, narrow ? 0.05 : 0);
    camera.updateProjectionMatrix();
  }

  function update(dt) {
    if (!reduce) {
      const speed = flipping ? 1.15 : 2.4;
      curl += (curlTo - curl) * Math.min(1, dt * (speed * 3));
      if (flipping > 0 && curl > 0.995) commit(1);
      if (flipping < 0 && curl < 0.01) {
        curl = 0;
        curlTo = 0;
        flipping = 0;
        curlGeo(rightGeo, 0);
        markActive();
      }
    }
    curlGeo(rightGeo, reduce ? 0 : curl);
    const slug = project(index).slug;
    mockups.forEach((m) => {
      const base = m.userData.baseY ?? (m.userData.baseY = m.position.y);
      const target = base + (m.userData.lift || 0);
      m.position.y += (target - m.position.y) * Math.min(1, dt * 4);
      if (m.userData.slug === slug) ring.position.set(m.position.x, 0.021, m.position.z);
    });
    const s = slug ? 1 : 0.6;
    const sc = mockups.find((m) => m.userData.slug === slug);
    ring.scale.setScalar(sc ? 1.15 : 0.2);
  }

  return {
    scene,
    camera,
    resize,
    update,
    step,
    pointerDown,
    pointerMove,
    pointerUp,
    setCurl(v) { curl = curlTo = v; if (!flipping) curlGeo(rightGeo, v); },
    nav: () => ({ index, total: projects.length, label: project(index).title }),
  };
}
