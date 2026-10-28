import * as THREE from 'three';
import { loadImage, roomTexture } from './media.js';

// Each spread is Hamdi's template photograph, split into the two pages.
// The type, tiles, tabs, and folder are in that picture, so they are not
// redrawn. A video is drawn only into its device screen, and only when the
// decoder has a new frame. The right-hand page still curls.

const PAGE_H = 1.42;
const BG = '#f1ede8';

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function makeVideo(src) {
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.disablePictureInPicture = true;
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

function imageTexture(image, anisotropy) {
  const tex = new THREE.Texture(image);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export async function createDesign(renderer, { reduce, projects }) {
  const pages = [];
  projects.forEach((project) => {
    (project.spreads || []).forEach((spread) => {
      pages.push({ project, title: project.title || '', spread, screens: [] });
    });
  });

  const sources = new Set();
  pages.forEach((page) => {
    if (page.spread.left) sources.add(page.spread.left);
    if (page.spread.right) sources.add(page.spread.right);
  });
  const images = new Map();
  await Promise.all([...sources].map(async (src) => {
    images.set(src, await loadImage(src));
  }));

  const firstLeft = images.get(pages[0]?.spread.left);
  const firstRight = images.get(pages[0]?.spread.right);
  const leftW = PAGE_H * ((firstLeft?.naturalWidth || 1) / (firstLeft?.naturalHeight || 1));
  const rightW = PAGE_H * ((firstRight?.naturalWidth || 1) / (firstRight?.naturalHeight || 1));

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  pages.forEach((page) => {
    page.leftTex = imageTexture(images.get(page.spread.left), anisotropy);
    page.rightTex = imageTexture(images.get(page.spread.right), anisotropy);
    page.videos = (page.spread.screens || []).map((screen) => ({
      screen,
      video: makeVideo(screen.src),
    }));
  });
  await Promise.all(pages.flatMap((page) => page.videos.map((entry) => preloadVideo(entry.video))));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.environment = roomTexture(renderer, 0.04);
  scene.environmentIntensity = 0.2;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.06, 50);
  const lookNow = new THREE.Vector3();
  const lookFrom = new THREE.Vector3();
  const lookTo = new THREE.Vector3();
  const camFrom = new THREE.Vector3();
  const camTo = new THREE.Vector3();
  let roll = 0;
  let rollFrom = 0;
  let rollTo = 0;
  let fovFrom = 28;
  let fovTo = 28;
  let camAnimating = false;
  let camStart = 0;
  let viewW = 1;
  let viewH = 1;

  scene.add(new THREE.HemisphereLight(0xf7f1e8, 0xc4b5a4, 0.35));
  scene.add(new THREE.AmbientLight(0xfff6ee, 0.2));

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(leftW + rightW + 0.3, PAGE_H * 0.55),
    new THREE.MeshBasicMaterial({
      color: 0xc4b6a6,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  shadow.position.set((rightW - leftW) / 2, -PAGE_H * 0.46, -0.04);
  scene.add(shadow);

  function pageMaterial(map) {
    return new THREE.MeshBasicMaterial({ map, toneMapped: false, side: THREE.FrontSide });
  }

  const rightMat = pageMaterial(pages[0].rightTex);
  const leftMat = pageMaterial(pages[0].leftTex);
  const rightPage = new THREE.Mesh(new THREE.PlaneGeometry(rightW, PAGE_H), rightMat);
  rightPage.position.set(rightW / 2 - 0.001, 0, 0.016);
  const leftPage = new THREE.Mesh(new THREE.PlaneGeometry(leftW, PAGE_H), leftMat);
  leftPage.position.set(-leftW / 2 + 0.001, 0, 0.016);
  scene.add(rightPage);
  scene.add(leftPage);

  const curlGeo = new THREE.PlaneGeometry(rightW, PAGE_H, 42, 26);
  curlGeo.translate(rightW / 2, 0, 0);
  const restPos = new Float32Array(curlGeo.attributes.position.array);
  const frontMat = pageMaterial(pages[0].rightTex);
  const backMat = pageMaterial(pages[0].leftTex);
  backMat.side = THREE.BackSide;
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
      const t = THREE.MathUtils.clamp(x / rightW, 0, 1);
      const ang = angle + Math.sin(angle) * lead * t * t;
      pos.setXYZ(i, x * Math.cos(ang), yPos, x * Math.sin(ang) + 0.028);
    }
    pos.needsUpdate = true;
  }

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

  const holders = [];
  pages.forEach((page, index) => {
    page.videos.forEach((entry) => {
      const rect = entry.screen.rect;
      const pageW = entry.screen.side === 'left' ? leftW : rightW;
      const canvas = document.createElement('canvas');
      const worldW = rect.w * pageW;
      const worldH = rect.h * PAGE_H;
      const pixels = 520 / Math.max(worldW, worldH);
      canvas.width = Math.max(2, Math.round(worldW * pixels));
      canvas.height = Math.max(2, Math.round(worldH * pixels));
      const ctx = canvas.getContext('2d', { alpha: false });
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(rect.w * pageW, rect.h * PAGE_H),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
      );
      mesh.position.set(
        (rect.x + rect.w / 2 - 0.5) * pageW,
        (0.5 - (rect.y + rect.h / 2)) * PAGE_H,
        0.008,
      );
      mesh.visible = false;
      mesh.renderOrder = 2;
      (entry.screen.side === 'left' ? leftPage : rightPage).add(mesh);
      let armed = false;
      const paint = () => {
        const video = entry.video;
        if (video.readyState < 2 || !video.videoWidth) return;
        const ir = video.videoWidth / video.videoHeight;
        const box = canvas.width / canvas.height;
        let dw;
        let dh;
        if (ir > box) { dh = canvas.height; dw = dh * ir; } else { dw = canvas.width; dh = dw / ir; }
        const sx = (canvas.width - dw) / 2;
        const sy = (canvas.height - dh) / 2;
        ctx.drawImage(video, sx, sy, dw, dh);
        tex.needsUpdate = true;
      };
      const arm = () => {
        if (armed || !mesh.visible) return;
        const video = entry.video;
        armed = true;
        const next = () => {
          armed = false;
          if (!mesh.visible || video.paused) return;
          paint();
          arm();
        };
        if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(next);
        else requestAnimationFrame(next);
      };
      holders.push({
        index,
        side: entry.screen.side,
        video: entry.video,
        mesh,
        show() {
          mesh.visible = true;
          const pending = entry.video.play();
          if (pending && pending.catch) pending.catch(() => {});
          arm();
        },
        hide() {
          mesh.visible = false;
          entry.video.pause();
        },
      });
    });
  });

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

  function texRight(which) {
    return pages[which - 1] ? pages[which - 1].rightTex : rightMat.map;
  }

  function texLeft(which) {
    return pages[which - 1] ? pages[which - 1].leftTex : leftMat.map;
  }

  function showScreens(leftIndex, rightIndex) {
    const on = !suspended && !document.hidden;
    holders.forEach((holder) => {
      const visible = on && ((holder.side === 'left' && holder.index === leftIndex)
        || (holder.side === 'right' && holder.index === rightIndex));
      if (visible) holder.show();
      else holder.hide();
    });
  }

  function applyRest(which) {
    const open = Math.min(pages.length, Math.max(1, which));
    rightMat.map = texRight(open);
    leftMat.map = texLeft(open);
    curlFront.visible = false;
    curlBack.visible = false;
    showScreens(open - 1, open - 1);
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
      showScreens(from - 1, to - 1);
    } else {
      frontMat.map = texRight(to);
      backMat.map = flipped(texLeft(from));
      rightMat.map = texRight(from);
      leftMat.map = texLeft(to);
      showScreens(to - 1, from - 1);
    }
    curlFront.visible = true;
    curlBack.visible = true;
    deform(turn.fromAngle);
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
    const span = leftW + rightW;
    const focusX = (rightW - leftW) / 2;
    const halfW = span / 2 + (narrow ? 0.03 : 0.04);
    const halfH = PAGE_H / 2 + 0.03;
    const distV = halfH / (tanV * usable * 0.96);
    const distH = halfW / (tanH * (narrow ? 0.98 : 0.96));
    const dist = Math.max(distV, distH) * (narrow ? 1 : 1.02);
    const topLimit = 1 - 2 * top;
    const botLimit = -1 + 2 * bottom;
    const safeCenter = (topLimit + botLimit) / 2;
    const look = new THREE.Vector3(focusX, -dist * tanV * safeCenter, 0);
    const pos = new THREE.Vector3(look.x + (narrow ? 0 : 0.04), look.y + (narrow ? 0.01 : 0.05), dist);
    return { pos, look, fov, roll: narrow ? 0 : 0.006 };
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
      return;
    }
    startTurn(from, dest, dir);
    moveCamera(false);
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pointerNDC(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function firstSlot(title) {
    const index = pages.findIndex((page) => page.title === title);
    return index < 0 ? 1 : index + 1;
  }

  function tabAt(e) {
    if (turning) return 0;
    pointerNDC(e);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([leftPage, rightPage], false);
    if (!hits.length || !hits[0].uv) return 0;
    const hit = hits[0];
    const page = pages[slot - 1];
    if (!page) return 0;
    if (hit.object === leftPage && hit.uv.x < 0.16) {
      if (page.title === 'MEQAF' && hit.uv.y < 0.42) return firstSlot('Peak');
      return firstSlot(page.title);
    }
    if (hit.object === rightPage && page.title === 'Peak' && hit.uv.x > 0.86 && hit.uv.y > 0.5) {
      return firstSlot('MEQAF');
    }
    return 0;
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
  }

  function step(dir) {
    if (!pages.length) return false;
    aim(slot + (dir < 0 ? -1 : 1), reduce);
    return true;
  }

  function pointerDown(e) {
    const next = tabAt(e);
    if (next && next !== slot) {
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
    holders.forEach((holder) => holder.hide());
    gradeOff();
  }

  function resume() {
    suspended = false;
    gradeOn();
    if (!turning) applyRest(slot);
    else showScreens(turn && turn.dir > 0 ? turn.from - 1 : turn.to - 1, turn && turn.dir > 0 ? turn.to - 1 : turn.from - 1);
  }

  function render(gl) {
    if (!suspended) gradeOn();
    gl.setRenderTarget(null);
    gl.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) holders.forEach((holder) => holder.hide());
    else if (!suspended && !turning) applyRest(slot);
  });

  applyRest(1);
  moveCamera(true);

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
