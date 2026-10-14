import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const BAY_W = 1.48;
const BAY_H = 1.68;
const BAY_D = 0.52;
const POST = 0.08;
const COLS = 5;
const ROWS = 2;

const FLOOR = -BAY_H / 2 + 0.015;

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function createDesign(renderer, { reduce, projects }) {
  const scene = new THREE.Scene();
  const BG = new THREE.Color('#e8e1d6');
  scene.background = BG;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.08, 40);
  const key = new THREE.DirectionalLight(0xfff3e6, 2.7);
  key.position.set(-2.4, 6.4, 7.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00045;
  key.shadow.normalBias = 0.028;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 28;
  key.shadow.camera.left = key.shadow.camera.bottom = -6;
  key.shadow.camera.right = key.shadow.camera.top = 6;
  key.target.position.set(0, 1.6, 0);
  scene.add(key, key.target);
  scene.add(new THREE.DirectionalLight(0xd5deea, 0.55).translateX(4).translateY(3).translateZ(4));
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xb7ab9c, 0.78));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 16),
    new THREE.ShadowMaterial({ opacity: 0.2 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.001;
  ground.receiveShadow = true;
  scene.add(ground);

  const images = new Map();
  await Promise.all(projects.flatMap((p) => p.images.map(async (url) => {
    if (!images.has(url)) images.set(url, await loadImage(url));
  })));

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  function texOf(url) {
    const img = images.get(url);
    if (!img) return null;
    const t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
  function paperMat(map) {
    return new THREE.MeshStandardMaterial({
      map: map || null,
      color: map ? 0xffffff : 0xe7e0d6,
      roughness: 0.58,
      metalness: 0,
    });
  }
  function darkMat() {
    return new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.4, metalness: 0.34 });
  }
  function tag(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  function board(map, w, h, d = 0.014) {
    return tag(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paperMat(map)));
  }

  const totalW = COLS * BAY_W + (COLS + 1) * POST;
  const totalH = ROWS * BAY_H + (ROWS + 1) * POST;
  const unit = new THREE.Group();
  unit.position.y = totalH / 2 + 0.1;
  scene.add(unit);

  const caseMat = new THREE.MeshStandardMaterial({ color: 0x2c2824, roughness: 0.76 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3c352f, roughness: 0.68 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0xddd4c8, roughness: 0.94 });

  const back = new THREE.Mesh(new THREE.PlaneGeometry(totalW - POST * 0.4, totalH - POST * 0.4), backMat);
  back.position.set(0, 0, -BAY_D / 2 + 0.01);
  back.receiveShadow = true;
  unit.add(back);

  for (let c = 0; c <= COLS; c++) {
    const x = -totalW / 2 + POST / 2 + c * (BAY_W + POST);
    const post = new THREE.Mesh(new THREE.BoxGeometry(POST, totalH, BAY_D + 0.05), caseMat);
    post.position.set(x, 0, 0.01);
    post.castShadow = true;
    post.receiveShadow = true;
    unit.add(post);
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = totalH / 2 - POST / 2 - r * (BAY_H + POST);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(totalW, POST, BAY_D + 0.08), shelfMat);
    shelf.position.set(0, y, 0.02);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    unit.add(shelf);
  }
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.1, 0.1, BAY_D + 0.18), caseMat);
  plinth.position.set(0, -totalH / 2 - 0.05, 0.03);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  unit.add(plinth);

  function slot(i) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = -totalW / 2 + POST + BAY_W / 2 + col * (BAY_W + POST);
    const y = totalH / 2 - POST - BAY_H / 2 - row * (BAY_H + POST);
    return new THREE.Vector3(x, y, 0);
  }

  function lean(mesh, x, z, yaw = 0, tilt = -0.12) {
    const h = mesh.geometry.parameters?.height || 0.4;
    mesh.position.set(x, FLOOR + h * 0.5 * Math.cos(Math.abs(tilt)), z);
    mesh.rotation.x = tilt;
    mesh.rotation.y = yaw;
    return mesh;
  }

  function buildBay(project) {
    const g = new THREE.Group();
    const urls = project.images;
    const at = (i) => texOf(urls[Math.min(i, urls.length - 1)]);
    const slug = project.slug;

    if (slug === 'peak-identity') {
      g.add(lean(board(at(1), 0.72, 1.18), 0.22, 0.02, -0.06, -0.16));
      g.add(lean(board(at(0), 0.42, 0.56), -0.38, 0.08, 0.12, -0.08));
      g.add(lean(board(at(2), 0.36, 0.48), -0.34, 0.16, 0.18, -0.04));
    } else if (slug === 'parkit-idintity') {
      g.add(lean(board(at(0), 1.16, 0.66), 0.02, 0.04, 0.04, -0.1));
      g.add(lean(board(at(urls.length - 1), 0.34, 0.46), -0.48, 0.12, 0.2, -0.06));
    } else if (slug === 'brand-idintity') {
      g.add(lean(board(at(0), 0.46, 1.32), 0.02, 0.0, 0.04, -0.08));
    } else if (slug === 'profile-design') {
      const cover = board(at(0), 0.78, 1.05, 0.07);
      const band = tag(new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 1.05, 0.074),
        new THREE.MeshStandardMaterial({ color: 0x8c4a2f, roughness: 0.46 }),
      ));
      band.position.x = -0.39;
      const book = new THREE.Group();
      book.add(cover, band);
      book.position.set(0.02, FLOOR + 0.54, 0.04);
      book.rotation.y = -0.12;
      g.add(book);
    } else if (slug === 'video-editing') {
      const bezel = tag(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 0.04), darkMat()));
      const screen = tag(new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.5), paperMat(at(0))));
      screen.position.z = 0.024;
      const monitor = new THREE.Group();
      monitor.add(bezel, screen);
      monitor.position.set(0.02, FLOOR + 0.42, 0.02);
      monitor.rotation.x = -0.12;
      const foot = tag(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.16), darkMat()));
      foot.position.set(0.02, FLOOR + 0.02, 0.08);
      g.add(monitor, foot);
    } else if (slug === 'cube-design') {
      const cube = tag(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.56), paperMat(at(1))));
      cube.position.set(0.12, FLOOR + 0.34, 0.06);
      cube.rotation.y = 0.62;
      g.add(cube);
      g.add(lean(board(at(0), 0.36, 0.48), -0.4, -0.02, 0.15, -0.1));
      g.add(lean(board(at(2), 0.32, 0.42), -0.36, 0.1, 0.22, -0.05));
    } else if (slug === 'playing-card-design') {
      urls.slice(0, 3).forEach((url, i) => {
        const card = board(texOf(url), 0.42, 0.64, 0.01);
        card.position.set(-0.12 + i * 0.2, FLOOR + 0.34, 0.04 + i * 0.03);
        card.rotation.y = -0.35 + i * 0.28;
        card.rotation.z = -0.06 + i * 0.05;
        g.add(card);
      });
    } else if (slug === 'social-media-posts') {
      const body = tag(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.74, 0.035), darkMat()));
      const screen = tag(new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.6), paperMat(at(1))));
      screen.position.z = 0.02;
      const phone = new THREE.Group();
      phone.add(body, screen);
      phone.position.set(0.16, FLOOR + 0.4, 0.06);
      phone.rotation.y = -0.2;
      phone.rotation.x = -0.08;
      g.add(phone);
      g.add(lean(board(at(0), 0.4, 0.4), -0.36, 0.02, 0.12, -0.08));
      g.add(lean(board(at(2), 0.34, 0.34), -0.32, 0.12, 0.2, -0.04));
    } else if (slug === 'website-design') {
      const base = tag(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.03, 0.68), darkMat()));
      base.position.set(0.02, FLOOR + 0.02, 0.08);
      const lid = tag(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.58, 0.02), darkMat()));
      const screen = tag(new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.48), paperMat(at(0))));
      lid.geometry.translate(0, 0.29, 0);
      screen.geometry.translate(0, 0.29, 0);
      lid.position.set(0.02, FLOOR + 0.04, -0.2);
      screen.position.set(0.02, FLOOR + 0.04, -0.185);
      lid.rotation.x = -1.12;
      screen.rotation.x = -1.12;
      g.add(base, lid, screen);
    } else if (slug === 'vest-design') {
      g.add(lean(board(at(0), 0.62, 0.82), -0.12, 0.02, -0.08, -0.1));
      g.add(lean(board(at(1), 0.56, 0.74), 0.28, 0.1, 0.14, -0.06));
      g.add(lean(board(at(2), 0.34, 0.44), 0.46, 0.16, 0.2, -0.04));
    } else {
      g.add(lean(board(at(0), 0.7, 0.9), 0, 0.04, 0, -0.1));
    }
    return g;
  }

  const bays = [];
  projects.forEach((project, i) => {
    const bay = buildBay(project);
    bay.position.copy(slot(i));
    unit.add(bay);
    bays.push(bay);
  });

  const nicheMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.96, emissive: 0x2a211c, emissiveIntensity: 0.18 });
  const niche = new THREE.Mesh(new THREE.PlaneGeometry(BAY_W - 0.08, BAY_H - 0.08), nicheMat);
  niche.position.z = -BAY_D / 2 + 0.02;
  unit.add(niche);

  const clay = new THREE.MeshStandardMaterial({ color: 0xa8603f, roughness: 0.42 });
  const frame = new THREE.Group();
  const fw = BAY_W - 0.1;
  const fh = BAY_H - 0.1;
  const t = 0.016;
  [[fw, t, 0, fh / 2], [fw, t, 0, -fh / 2], [t, fh, -fw / 2, 0], [t, fh, fw / 2, 0]].forEach(([w, h, x, y]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), clay);
    bar.position.set(x, y, BAY_D / 2 - 0.02);
    frame.add(bar);
  });
  unit.add(frame);

  let index = 0;
  let narrow = false;
  const camTarget = new THREE.Vector3();
  const look = new THREE.Vector3();
  const focus = new THREE.Vector3();

  function placeFocus(i) {
    const n = projects.length ? (i + projects.length) % projects.length : 0;
    const local = projects.length ? slot(n) : new THREE.Vector3();
    focus.copy(local).add(unit.position);
    niche.position.x = local.x;
    niche.position.y = local.y;
    frame.position.x = local.x;
    frame.position.y = local.y;
  }

  function aim(i, snap) {
    placeFocus(i);
    const dist = narrow ? 3.35 : 4.7;
    const yLift = narrow ? 0.22 : 0.08;
    const xShift = narrow ? 0 : -0.22;
    camTarget.set(focus.x + xShift, focus.y + yLift, focus.z + dist);
    look.set(focus.x + (narrow ? 0 : -0.05), focus.y - (narrow ? 0.28 : 0.02), focus.z);
    if (snap || reduce) {
      camera.position.copy(camTarget);
      camera.lookAt(look);
    }
  }

  function resize(w, h) {
    narrow = w / h < 0.9;
    camera.aspect = w / h;
    camera.fov = narrow ? 40 : 30;
    camera.updateProjectionMatrix();
    aim(index, true);
  }

  function update(dt) {
    if (!(reduce)) {
      camera.position.lerp(camTarget, Math.min(1, dt * 2.6));
      camera.lookAt(look);
    }
  }

  function step(dir) {
    if (projects.length < 2) return false;
    index = (index + dir + projects.length) % projects.length;
    aim(index, reduce);
    return true;
  }

  if (projects.length) aim(0, true);

  return {
    scene,
    camera,
    resize,
    update,
    step,
    nav: () => ({
      index,
      total: projects.length,
      label: projects[index]?.title || '',
      project: projects[index] || null,
    }),
  };
}
