import * as THREE from 'three';

// Design is a print moodboard. The camera stays on the whole sheet.
// Prints sit at slight angles and overlap, the way a pinned board does.
// Choosing a work enlarges that cluster and lays a white veil over the others.
// Her words and the project's other photos sit on the page, over that veil.
// 00 eases everything back. The camera does not move.

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function easeGlide(t, easeIn) {
  if (!easeIn) return 1 - (1 - t) * (1 - t);
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function blob(rx, ry) {
  const shape = new THREE.Shape();
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 1 + 0.07 * Math.sin(a * 3 + 0.6) + 0.035 * Math.sin(a * 5 + 1.4);
    const x = Math.cos(a) * rx * wobble;
    const y = Math.sin(a) * ry * wobble;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return new THREE.ShapeGeometry(shape);
}

function rotHalf(w, h, rot) {
  const c = Math.abs(Math.cos(rot));
  const s = Math.abs(Math.sin(rot));
  return { hw: (w * c + h * s) / 2, hh: (w * s + h * c) / 2 };
}

// Pack one project's photos into a loose, overlapping cluster.
// The first image stays a little larger than the rest. Rotation and overlap
// come from a fixed seed so the board does not reshuffle on each visit.
function arrange(aspects, seed) {
  const rnd = rand(seed);
  const n = aspects.length;
  const cellH = n > 5 ? 1.02 : n > 2 ? 1.24 : n > 1 ? 1.48 : 1.92;
  const items = aspects.map((ar, i) => {
    const emphasis = i === 0 ? 1.16 + rnd() * 0.1 : 0.72 + rnd() * 0.3;
    let h = cellH * emphasis;
    let w = h * Math.max(0.2, ar);
    const maxW = n === 1 ? 2.9 : 2.08;
    if (w > maxW) {
      w = maxW * (0.86 + rnd() * 0.14);
      h = w / Math.max(0.2, ar);
    }
    return { w, h, rot: (rnd() - 0.5) * 0.28 };
  });

  const maxRow = n > 4 ? 4.85 : 4.15;
  const rows = [];
  let row = [];
  let rowW = 0;
  items.forEach((it) => {
    const peek = rowW + (row.length ? -(0.08 + rnd() * 0.1) : 0) + it.w;
    if (row.length && peek > maxRow) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    const gap = row.length ? -(0.07 + rnd() * 0.12) : 0;
    row.push({ ...it, gap });
    rowW += it.w + (row.length > 1 ? gap : 0);
  });
  if (row.length) rows.push(row);

  const placed = [];
  let y = 0;
  rows.forEach((r) => {
    const h = Math.max(...r.map((it) => it.h));
    let w = 0;
    r.forEach((it, idx) => { w += it.w + (idx ? it.gap : 0); });
    let x = -w / 2 + (rnd() - 0.5) * 0.32;
    const rowShift = (rnd() - 0.5) * 0.18;
    r.forEach((it) => {
      placed.push({
        x: x + it.w / 2,
        y: -(y + h / 2) + (rnd() - 0.5) * 0.22 + rowShift,
        w: it.w,
        h: it.h,
        rot: it.rot,
      });
      x += it.w + it.gap;
    });
    y += h * (0.72 + rnd() * 0.12);
  });

  if (!placed.length) return { placed, width: 1, height: 1 };

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  placed.forEach((p) => {
    const { hw, hh } = rotHalf(p.w, p.h, p.rot);
    minX = Math.min(minX, p.x - hw);
    maxX = Math.max(maxX, p.x + hw);
    minY = Math.min(minY, p.y - hh);
    maxY = Math.max(maxY, p.y + hh);
  });
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  placed.forEach((p) => {
    p.x -= midX;
    p.y -= midY;
  });
  return { placed, width: Math.max(0.2, maxX - minX), height: Math.max(0.2, maxY - minY) };
}

export async function createDesign(renderer, { reduce, projects }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e1d6');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 280);

  const loaded = await Promise.all(projects.map(async (project) => {
    const images = await Promise.all(project.images.map((url) => loadImage(url)));
    return images
      .map((img, imageIndex) => (img ? { img, imageIndex, ar: img.naturalWidth / img.naturalHeight } : null))
      .filter(Boolean);
  }));

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  function textureOf(img) {
    const t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }

  const blocks = loaded.map((images, i) => ({
    ...arrange(images.map((image) => image.ar), 1200 + i * 97),
    index: i,
  }));
  const rndCol = rand(418);
  const colGap = 0.16;
  const columns = [[], []];
  blocks.forEach((block, i) => columns[i % 2].push(block));
  const colW = columns.map((col) => Math.max(1, ...col.map((block) => block.width), 1));
  const totalW = colW[0] + colGap + colW[1];
  const colX = [-totalW / 2 + colW[0] / 2, totalW / 2 - colW[1] / 2];
  const placedBlocks = [];
  columns.forEach((col, side) => {
    let top = side === 1 ? -0.48 - rndCol() * 0.4 : rndCol() * 0.25;
    col.forEach((block) => {
      const groupRot = (rndCol() - 0.5) * 0.11;
      placedBlocks[block.index] = {
        ...block,
        centerX: colX[side] + (rndCol() - 0.5) * 0.5,
        centerY: top - block.height / 2,
        side: side === 0 ? 'left' : 'right',
        groupRot,
      };
      top -= block.height - (0.04 + rndCol() * 0.24);
    });
  });
  const ys = placedBlocks.map((block) => {
    const { hh } = rotHalf(block.width, block.height, block.groupRot);
    return [block.centerY - hh, block.centerY + hh];
  }).flat();
  const yShift = ys.length ? -((Math.min(...ys) + Math.max(...ys)) / 2) : 0;
  placedBlocks.forEach((block) => { block.centerY += yShift; });

  let clusterMinX = Infinity;
  let clusterMaxX = -Infinity;
  let clusterMinY = Infinity;
  let clusterMaxY = -Infinity;
  placedBlocks.forEach((block) => {
    const { hw, hh } = rotHalf(block.width, block.height, block.groupRot);
    clusterMinX = Math.min(clusterMinX, block.centerX - hw);
    clusterMaxX = Math.max(clusterMaxX, block.centerX + hw);
    clusterMinY = Math.min(clusterMinY, block.centerY - hh);
    clusterMaxY = Math.max(clusterMaxY, block.centerY + hh);
  });
  if (!placedBlocks.length) {
    clusterMinX = -1;
    clusterMaxX = 1;
    clusterMinY = -1;
    clusterMaxY = 1;
  }

  const labelRoot = document.getElementById('boardLabels');
  labelRoot.innerHTML = '';

  const entries = [];
  const swatches = [];
  const wash = new THREE.Color('#ffffff');

  placedBlocks.forEach((block, i) => {
    const group = new THREE.Group();
    group.position.set(block.centerX, block.centerY, 0);
    group.rotation.z = block.groupRot;
    scene.add(group);
    const images = loaded[i];
    let hero = null;
    images.forEach((image, ii) => {
      const spot = block.placed[ii];
      const mat = new THREE.MeshBasicMaterial({
        map: textureOf(image.img),
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        depthWrite: true,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spot.w, spot.h), mat);
      mesh.position.set(spot.x, spot.y, 0.06 + ii * 0.014);
      mesh.rotation.z = spot.rot;
      mesh.renderOrder = 1;
      group.add(mesh);
      const shade = new THREE.Mesh(
        new THREE.PlaneGeometry(spot.w, spot.h),
        new THREE.MeshBasicMaterial({ color: 0x2a2622, transparent: true, opacity: 0.08, depthWrite: false }),
      );
      shade.position.set(spot.x + 0.04, spot.y - 0.045, 0.03 + ii * 0.014);
      shade.rotation.z = spot.rot;
      shade.renderOrder = 0;
      group.add(shade);
      if (ii === 0) hero = mesh;
    });

    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(block.width + 0.28, block.height + 0.28),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
    );
    veil.position.z = 0.42;
    veil.renderOrder = 3;
    group.add(veil);

    const outward = block.side === 'right' ? 1 : -1;
    const anchor = new THREE.Vector3(
      block.centerX + outward * (block.width / 2 + 0.58),
      block.centerY + (i % 2 === 0 ? 0.2 : -0.16),
      0,
    );
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x1d1b19, transparent: true, opacity: 0.8 });
    const endMat = new THREE.MeshBasicMaterial({ color: 0x1d1b19, transparent: true, opacity: 0.8 });
    let dotMesh = null;
    if (hero) {
      const spot = block.placed[0];
      dotMesh = new THREE.Mesh(new THREE.CircleGeometry(0.042, 18), dotMat);
      dotMesh.position.set(outward * (spot.w / 2 + 0.02), 0, 0.04);
      hero.add(dotMesh);
    }
    const endDot = new THREE.Mesh(new THREE.CircleGeometry(0.026, 14), endMat);
    endDot.position.set(anchor.x, anchor.y, 0.12);
    scene.add(endDot);

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1d1b19, transparent: true, opacity: 0.7 });
    const line = new THREE.Line(lineGeo, lineMat);
    line.frustumCulled = false;
    scene.add(line);

    const label = document.createElement('div');
    label.className = `board-label ${block.side}`;
    label.textContent = projects[i].title || '';
    labelRoot.appendChild(label);

    entries.push({
      group,
      veil,
      center: new THREE.Vector3(block.centerX, block.centerY, 0),
      w: block.width,
      h: block.height,
      dotMesh,
      dotMat,
      endMat,
      endDot,
      line,
      anchor,
      label,
      side: block.side,
    });
  });

  ['left', 'right'].forEach((side) => {
    const col = entries.filter((entry) => entry.side === side).sort((a, b) => b.anchor.y - a.anchor.y);
    for (let i = 1; i < col.length; i++) {
      const limit = col[i - 1].anchor.y - 0.42;
      if (col[i].anchor.y > limit) col[i].anchor.y = limit;
    }
  });
  entries.forEach((entry) => {
    entry.endDot.position.y = entry.anchor.y;
  });

  const swatchSpots = [
    { fx: -0.02, fy: 1.02, rx: 0.5, ry: 0.3, rot: 0.45, color: '#a8603f' },
    { fx: 1.03, fy: 0.94, rx: 0.36, ry: 0.5, rot: -0.35, color: '#2c2824' },
    { fx: -0.05, fy: 0.58, rx: 0.28, ry: 0.4, rot: 0.2, color: '#8c4a2f' },
    { fx: 1.05, fy: 0.42, rx: 0.48, ry: 0.26, rot: 0.18, color: '#b7ab9c' },
    { fx: 0.01, fy: 0.14, rx: 0.34, ry: 0.22, rot: -0.55, color: '#5b554d' },
    { fx: 0.98, fy: 0.06, rx: 0.42, ry: 0.28, rot: 0.4, color: '#6e3b2a' },
    { fx: 0.56, fy: 1.06, rx: 0.32, ry: 0.18, rot: -0.25, color: '#c4a090' },
    { fx: 0.32, fy: -0.04, rx: 0.24, ry: 0.16, rot: 0.7, color: '#1d1b19' },
  ];
  const spanW = clusterMaxX - clusterMinX;
  const spanH = clusterMaxY - clusterMinY;
  swatchSpots.forEach((spot) => {
    const mesh = new THREE.Mesh(
      blob(spot.rx, spot.ry),
      new THREE.MeshBasicMaterial({ color: spot.color }),
    );
    mesh.position.set(
      clusterMinX + spot.fx * spanW,
      clusterMinY + spot.fy * spanH,
      0.02,
    );
    mesh.rotation.z = spot.rot;
    mesh.userData.base = new THREE.Color(spot.color);
    scene.add(mesh);
    swatches.push(mesh);
  });

  const padL = 2.6;
  const padR = 5.6;
  const padY = 1.05;
  const paperW = spanW + padL + padR;
  const paperH = spanH + padY * 2;
  const paperCx = (clusterMinX - padL + clusterMaxX + padR) / 2;
  const paperCy = (clusterMinY + clusterMaxY) / 2;
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(paperW, paperH),
    new THREE.MeshBasicMaterial({ color: 0xf7f1e8 }),
  );
  paper.position.set(paperCx, paperCy, 0);
  scene.add(paper);
  const under = new THREE.Mesh(
    new THREE.PlaneGeometry(paperW, paperH),
    new THREE.MeshBasicMaterial({ color: 0x2a2622, transparent: true, opacity: 0.05, depthWrite: false }),
  );
  under.position.set(paperCx + 0.08, paperCy - 0.1, -0.02);
  scene.add(under);

  const labelXs = entries.map((entry) => entry.anchor.x);
  const overview = {
    minX: Math.min(clusterMinX, ...labelXs) - 1.7,
    maxX: Math.max(clusterMaxX, ...labelXs) + 1.7,
    minY: clusterMinY - 0.5,
    maxY: clusterMaxY + 0.5,
  };

  let slot = 0;
  let narrow = false;
  let viewW = 1440;
  let viewH = 900;
  const veilFrom = entries.map(() => 0);
  const veilTo = entries.map(() => 0);
  const veilNow = entries.map(() => 0);
  const scaleFrom = entries.map(() => 1);
  const scaleTo = entries.map(() => 1);
  const scaleNow = entries.map(() => 1);
  const posFrom = entries.map((entry) => entry.center.clone());
  const posTo = entries.map((entry) => entry.center.clone());
  const posNow = entries.map((entry) => entry.center.clone());
  let swatchFrom = 1;
  let swatchTo = 1;
  let swatchNow = 1;
  let animStart = 0;
  let animMs = 1000;
  let animating = false;
  let easeIn = true;
  const tmp = new THREE.Vector3();
  const FOCUS_SCALE = 1.62;

  function fitBoard() {
    const fov = narrow ? 40 : 30;
    camera.fov = fov;
    camera.aspect = Math.max(0.35, viewW / Math.max(1, viewH));
    camera.updateProjectionMatrix();
    const tanV = Math.tan((camera.fov * Math.PI) / 360);
    const spanX = overview.maxX - overview.minX;
    const spanY = overview.maxY - overview.minY;
    const dist = Math.max(spanY / (2 * tanV * 0.9), spanX / (2 * tanV * camera.aspect * 0.9), 2);
    const cx = (overview.minX + overview.maxX) / 2;
    const cy = (overview.minY + overview.maxY) / 2;
    camera.position.set(cx, cy, dist);
    camera.lookAt(cx, cy, 0);
  }

  function boardVisible() {
    const tanV = Math.tan((camera.fov * Math.PI) / 360);
    const visH = 2 * camera.position.z * tanV;
    return { visW: visH * camera.aspect, visH };
  }

  function placeTarget(i, focus) {
    const entry = entries[i];
    posTo[i].copy(entry.center);
    if (i !== focus) return;
    const { visW, visH } = boardVisible();
    if (narrow) {
      const limit = overview.maxY - (entry.h * FOCUS_SCALE) / 2 - 0.08;
      posTo[i].y = Math.min(entry.center.y + visH * 0.2, limit);
    } else {
      const limit = overview.minX + (entry.w * FOCUS_SCALE) / 2 + 0.12;
      posTo[i].x = Math.max(entry.center.x - visW * 0.18, limit);
    }
  }

  function applyVisual() {
    entries.forEach((entry, i) => {
      const sc = scaleNow[i];
      const lift = Math.max(0, (sc - 1) / (FOCUS_SCALE - 1));
      entry.veil.material.opacity = veilNow[i];
      entry.group.scale.setScalar(sc);
      entry.group.position.set(posNow[i].x, posNow[i].y, lift * 0.9);
      entry.group.updateMatrixWorld(true);
      entry.group.traverse((obj) => {
        if (obj.isMesh && obj !== entry.veil && obj.geometry?.type === 'PlaneGeometry') {
          obj.renderOrder = lift > 0.04 ? 5 : 1;
        }
      });
      const shown = 1 - veilNow[i] / 0.6;
      entry.line.material.opacity = 0.12 + 0.58 * shown;
      entry.dotMat.opacity = 0.12 + 0.68 * shown;
      entry.endMat.opacity = 0.12 + 0.68 * shown;
      if (entry.dotMesh) entry.dotMesh.getWorldPosition(tmp);
      else tmp.set(entry.center.x, entry.center.y, 0.08);
      const attr = entry.line.geometry.attributes.position;
      attr.setXYZ(0, tmp.x, tmp.y, 0.12);
      attr.setXYZ(1, entry.anchor.x, entry.anchor.y, 0.12);
      attr.needsUpdate = true;
      entry.line.geometry.computeBoundingSphere();
      const p = entry.anchor.clone().project(camera);
      const x = (p.x * 0.5 + 0.5) * viewW;
      const y = (-p.y * 0.5 + 0.5) * viewH;
      const shift = entry.side === 'right' ? '0, -50%' : '-100%, -50%';
      entry.label.style.transform = `translate(${x}px, ${y}px) translate(${shift})`;
      const onScreen = p.z < 1 && x > -220 && x < viewW + 40 && y > -30 && y < viewH + 30;
      entry.label.style.opacity = onScreen ? String(Math.max(0, shown)) : '0';
    });
    swatches.forEach((mesh) => {
      mesh.material.color.copy(mesh.userData.base).lerp(wash, (1 - swatchNow) * 0.6);
    });
  }

  function aim(next, snap) {
    slot = next;
    const focus = slot === 0 ? -1 : slot - 1;
    entries.forEach((_, i) => {
      veilTo[i] = focus === -1 || i === focus ? 0 : 0.6;
      scaleTo[i] = i === focus ? FOCUS_SCALE : 1;
      placeTarget(i, focus);
    });
    swatchTo = focus === -1 ? 1 : 0;
    if (snap || reduce) {
      veilTo.forEach((v, i) => { veilNow[i] = veilFrom[i] = v; });
      scaleTo.forEach((v, i) => { scaleNow[i] = scaleFrom[i] = v; });
      posTo.forEach((v, i) => { posNow[i].copy(v); posFrom[i].copy(v); });
      swatchNow = swatchFrom = swatchTo;
      animating = false;
      applyVisual();
      return;
    }
    veilNow.forEach((v, i) => { veilFrom[i] = v; });
    scaleNow.forEach((v, i) => { scaleFrom[i] = v; });
    posNow.forEach((v, i) => { posFrom[i].copy(v); });
    swatchFrom = swatchNow;
    easeIn = !animating;
    animStart = performance.now();
    animMs = 1000;
    animating = true;
  }

  function resize(w, h) {
    viewW = w;
    viewH = h;
    narrow = w / h < 0.9;
    fitBoard();
    aim(slot, true);
  }

  function update(dt, now) {
    if (animating && !reduce) {
      const t = Math.min(1, ((now || performance.now()) - animStart) / animMs);
      const e = easeGlide(t, easeIn);
      veilFrom.forEach((v, i) => { veilNow[i] = v + (veilTo[i] - v) * e; });
      scaleFrom.forEach((v, i) => { scaleNow[i] = v + (scaleTo[i] - v) * e; });
      posFrom.forEach((v, i) => posNow[i].lerpVectors(v, posTo[i], e));
      swatchNow = swatchFrom + (swatchTo - swatchFrom) * e;
      if (t >= 1) animating = false;
    }
    applyVisual();
  }

  function step(dir) {
    const n = projects.length + 1;
    if (projects.length < 1) return false;
    aim((slot + dir + n) % n, reduce);
    return true;
  }

  fitBoard();
  aim(0, true);

  return {
    scene,
    camera,
    resize,
    update,
    step,
    nav: () => {
      const project = slot === 0 ? null : projects[slot - 1] || null;
      return {
        index: slot - 1,
        total: projects.length,
        label: project?.title || '',
        project,
      };
    },
  };
}
