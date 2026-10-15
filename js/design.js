import * as THREE from 'three';

// Graphic Design is a print moodboard: every project image on one sheet,
// hairline leaders to her titles, and a glide from the full board (00)
// into one work at a time.

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

function printMaterial(map, uSat) {
  const mat = new THREE.MeshBasicMaterial({ map, color: 0xffffff });
  mat.customProgramCacheKey = () => 'moodboard-sat';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSat = uSat;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSat;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         {
           float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
           diffuseColor.rgb = mix(vec3(luma), diffuseColor.rgb, uSat);
           diffuseColor.rgb *= mix(0.56, 1.0, uSat);
         }`,
      );
  };
  return mat;
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

// Shelf-pack one project's photos into a loose block. Sizes follow the real
// aspect ratios. The first image is a little larger than the rest.
function arrange(aspects) {
  const n = aspects.length;
  const cellH = n > 5 ? 0.98 : n > 2 ? 1.2 : n > 1 ? 1.42 : 1.85;
  const items = aspects.map((ar, i) => {
    const emphasis = i === 0 ? 1.26 : 0.84 + (i % 3) * 0.07;
    let h = cellH * emphasis;
    let w = h * ar;
    const maxW = n === 1 ? 3.15 : 2.28;
    if (w > maxW) {
      w = maxW;
      h = w / ar;
    }
    return { w, h };
  });
  const maxRow = n > 4 ? 5.35 : 4.7;
  const gap = 0.11;
  const rows = [];
  let row = [];
  let rowW = 0;
  items.forEach((it) => {
    const next = rowW + (row.length ? gap : 0) + it.w;
    if (row.length && next > maxRow) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    row.push(it);
    rowW += (row.length > 1 ? gap : 0) + it.w;
  });
  if (row.length) rows.push(row);

  let y = 0;
  const placed = [];
  rows.forEach((r, ri) => {
    const h = Math.max(...r.map((it) => it.h));
    const w = r.reduce((s, it) => s + it.w, 0) + gap * (r.length - 1);
    let x = -w / 2 + (ri % 2 === 0 ? -0.07 : 0.09);
    r.forEach((it, ii) => {
      const oy = ((ii % 2 === 0 ? 1 : -1) * Math.min(0.05, (h - it.h) * 0.35));
      placed.push({ x: x + it.w / 2, y: -(y + it.h / 2) + oy, w: it.w, h: it.h });
      x += it.w + gap;
    });
    y += h + gap + 0.02;
  });
  const height = Math.max(0.2, y - gap);
  const shift = height / 2;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  placed.forEach((p) => {
    p.y += shift;
    minX = Math.min(minX, p.x - p.w / 2);
    maxX = Math.max(maxX, p.x + p.w / 2);
    minY = Math.min(minY, p.y - p.h / 2);
    maxY = Math.max(maxY, p.y + p.h / 2);
  });
  return {
    placed,
    width: Math.max(0.2, maxX - minX),
    height: Math.max(0.2, maxY - minY),
  };
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

  const blocks = loaded.map((images, i) => ({ ...arrange(images.map((image) => image.ar)), index: i }));
  const gapB = 0.36;
  const colGap = 0.48;
  const columns = [[], []];
  blocks.forEach((block, i) => columns[i % 2].push(block));
  const colW = columns.map((col) => Math.max(1, ...col.map((block) => block.width), 1));
  const totalW = colW[0] + colGap + colW[1];
  const colX = [-totalW / 2 + colW[0] / 2, totalW / 2 - colW[1] / 2];
  const placedBlocks = [];
  columns.forEach((col, side) => {
    let top = side === 1 ? -0.42 : 0;
    col.forEach((block) => {
      placedBlocks[block.index] = {
        ...block,
        centerX: colX[side],
        centerY: top - block.height / 2,
        side: side === 0 ? 'left' : 'right',
      };
      top -= block.height + gapB;
    });
  });
  const ys = placedBlocks.map((block) => [block.centerY - block.height / 2, block.centerY + block.height / 2]).flat();
  const yShift = ys.length ? -((Math.min(...ys) + Math.max(...ys)) / 2) : 0;
  placedBlocks.forEach((block) => { block.centerY += yShift; });

  let clusterMinX = Infinity;
  let clusterMaxX = -Infinity;
  let clusterMinY = Infinity;
  let clusterMaxY = -Infinity;
  placedBlocks.forEach((block) => {
    clusterMinX = Math.min(clusterMinX, block.centerX - block.width / 2);
    clusterMaxX = Math.max(clusterMaxX, block.centerX + block.width / 2);
    clusterMinY = Math.min(clusterMinY, block.centerY - block.height / 2);
    clusterMaxY = Math.max(clusterMaxY, block.centerY + block.height / 2);
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
  const grey = new THREE.Color('#7d7872');

  placedBlocks.forEach((block, i) => {
    const group = new THREE.Group();
    group.position.set(block.centerX, block.centerY, 0);
    scene.add(group);
    const uSats = [];
    const images = loaded[i];
    let hero = null;
    images.forEach((image, ii) => {
      const spot = block.placed[ii];
      const uSat = { value: 1 };
      uSats.push(uSat);
      const mat = printMaterial(textureOf(image.img), uSat);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spot.w, spot.h), mat);
      mesh.position.set(spot.x, spot.y, 0.05 + ii * 0.004);
      mesh.rotation.z = ((i * 3 + ii * 5) % 5 - 2) * 0.007;
      group.add(mesh);
      const shade = new THREE.Mesh(
        new THREE.PlaneGeometry(spot.w, spot.h),
        new THREE.MeshBasicMaterial({ color: 0x2a2622, transparent: true, opacity: 0.07, depthWrite: false }),
      );
      shade.position.set(spot.x + 0.035, spot.y - 0.04, 0.03);
      group.add(shade);
      if (ii === 0) hero = mesh;
    });

    const outward = block.side === 'right' ? 1 : -1;
    const anchor = new THREE.Vector3(
      block.centerX + outward * (block.width / 2 + 0.42),
      block.centerY + (i % 2 === 0 ? 0.18 : -0.14),
      0,
    );
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x1d1b19, transparent: true, opacity: 0.8 });
    const endMat = new THREE.MeshBasicMaterial({ color: 0x1d1b19, transparent: true, opacity: 0.8 });
    let dotMesh = null;
    if (hero) {
      const spot = block.placed[0];
      dotMesh = new THREE.Mesh(new THREE.CircleGeometry(0.042, 18), dotMat);
      dotMesh.position.set(outward * (spot.w / 2 + 0.01), 0, 0.03);
      hero.add(dotMesh);
    }
    const endDot = new THREE.Mesh(new THREE.CircleGeometry(0.026, 14), endMat);
    endDot.position.set(anchor.x, anchor.y, 0.1);
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
      center: new THREE.Vector3(block.centerX, block.centerY, 0),
      w: block.width,
      h: block.height,
      uSats,
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
      const limit = col[i - 1].anchor.y - 0.46;
      if (col[i].anchor.y > limit) col[i].anchor.y = limit;
    }
  });
  entries.forEach((entry) => {
    entry.endDot.position.y = entry.anchor.y;
  });

  const swatchSpots = [
    { fx: -0.02, fy: 1.01, rx: 0.5, ry: 0.3, rot: 0.45, color: '#a8603f' },
    { fx: 1.03, fy: 0.94, rx: 0.36, ry: 0.5, rot: -0.35, color: '#2c2824' },
    { fx: -0.04, fy: 0.62, rx: 0.28, ry: 0.4, rot: 0.2, color: '#8c4a2f' },
    { fx: 1.05, fy: 0.46, rx: 0.48, ry: 0.26, rot: 0.18, color: '#b7ab9c' },
    { fx: 0.02, fy: 0.16, rx: 0.34, ry: 0.22, rot: -0.55, color: '#5b554d' },
    { fx: 0.98, fy: 0.08, rx: 0.42, ry: 0.28, rot: 0.4, color: '#6e3b2a' },
    { fx: 0.58, fy: 1.05, rx: 0.32, ry: 0.18, rot: -0.25, color: '#c4a090' },
    { fx: 0.34, fy: -0.03, rx: 0.24, ry: 0.16, rot: 0.7, color: '#1d1b19' },
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

  const padL = 3.15;
  const padR = 6.4;
  const padY = 1.15;
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
    minX: Math.min(clusterMinX, ...labelXs, clusterMinX) - 2.15,
    maxX: Math.max(clusterMaxX, ...labelXs, clusterMaxX) + 2.15,
    minY: clusterMinY - 0.55,
    maxY: clusterMaxY + 0.55,
  };

  let slot = 0;
  let narrow = false;
  let viewW = 1440;
  let viewH = 900;
  const posFrom = new THREE.Vector3();
  const posTo = new THREE.Vector3();
  const lookFrom = new THREE.Vector3();
  const lookTo = new THREE.Vector3();
  const lookNow = new THREE.Vector3();
  const satFrom = entries.map(() => 1);
  const satTo = entries.map(() => 1);
  const satNow = entries.map(() => 1);
  const scaleFrom = entries.map(() => 1);
  const scaleTo = entries.map(() => 1);
  const scaleNow = entries.map(() => 1);
  let swatchFrom = 1;
  let swatchTo = 1;
  let swatchNow = 1;
  let glideStart = 0;
  let glideMs = 1;
  let gliding = false;
  let glideEaseIn = true;
  const tmp = new THREE.Vector3();

  function frameTarget() {
    const fov = narrow ? 40 : 30;
    camera.fov = fov;
    const aspect = Math.max(0.35, viewW / Math.max(1, viewH));
    const tanV = Math.tan((fov * Math.PI) / 360);
    const tanH = tanV * aspect;
    if (slot === 0 || !entries.length) {
      const spanX = overview.maxX - overview.minX;
      const spanY = overview.maxY - overview.minY;
      const dist = Math.max(spanY / (2 * tanV * 0.9), spanX / (2 * tanH * 0.9), 2);
      const cx = (overview.minX + overview.maxX) / 2;
      const cy = (overview.minY + overview.maxY) / 2;
      lookTo.set(cx, cy, 0);
      posTo.set(cx, cy, dist);
      return;
    }
    const entry = entries[slot - 1];
    const sc = 1.1;
    const boxW = entry.w * sc + 0.3;
    const boxH = entry.h * sc + 0.3;
    const dist = Math.max(
      boxH / (2 * tanV * (narrow ? 0.32 : 0.68)),
      boxW / (2 * tanH * (narrow ? 0.78 : 0.46)),
      1.5,
    );
    const visW = 2 * dist * tanH;
    const visH = 2 * dist * tanV;
    const biasX = narrow ? 0 : 0.17;
    const biasY = narrow ? -0.27 : 0;
    lookTo.set(entry.center.x + biasX * visW, entry.center.y + biasY * visH, 0);
    posTo.set(lookTo.x, lookTo.y, dist);
  }

  function applyVisual() {
    entries.forEach((entry, i) => {
      const sat = satNow[i];
      const sc = scaleNow[i];
      entry.uSats.forEach((u) => { u.value = sat; });
      entry.group.scale.setScalar(sc);
      entry.group.position.z = (sc - 1) * 0.7;
      entry.group.updateMatrixWorld(true);
      const fade = 0.14 + 0.66 * sat;
      entry.line.material.opacity = fade;
      entry.dotMat.opacity = fade;
      entry.endMat.opacity = fade;
      if (entry.dotMesh) entry.dotMesh.getWorldPosition(tmp);
      else tmp.set(entry.center.x, entry.center.y, 0.08);
      const attr = entry.line.geometry.attributes.position;
      attr.setXYZ(0, tmp.x, tmp.y, 0.1);
      attr.setXYZ(1, entry.anchor.x, entry.anchor.y, 0.1);
      attr.needsUpdate = true;
      entry.line.geometry.computeBoundingSphere();
      const p = entry.anchor.clone().project(camera);
      const x = (p.x * 0.5 + 0.5) * viewW;
      const y = (-p.y * 0.5 + 0.5) * viewH;
      const shift = entry.side === 'right' ? '0, -50%' : '-100%, -50%';
      entry.label.style.transform = `translate(${x}px, ${y}px) translate(${shift})`;
      const onScreen = p.z < 1 && x > -220 && x < viewW + 40 && y > -30 && y < viewH + 30;
      entry.label.style.opacity = onScreen ? String(0.18 + 0.82 * sat) : '0';
    });
    swatches.forEach((mesh) => {
      mesh.material.color.copy(mesh.userData.base).lerp(grey, 1 - swatchNow);
    });
  }

  function aim(next, snap) {
    slot = next;
    const focus = slot === 0 ? -1 : slot - 1;
    entries.forEach((_, i) => {
      satTo[i] = focus === -1 || i === focus ? 1 : 0;
      scaleTo[i] = i === focus ? 1.1 : 1;
    });
    swatchTo = focus === -1 ? 1 : 0;
    frameTarget();
    if (snap || reduce) {
      gliding = false;
      camera.position.copy(posTo);
      lookNow.copy(lookTo);
      camera.lookAt(lookNow);
      satTo.forEach((v, i) => { satNow[i] = satFrom[i] = v; });
      scaleTo.forEach((v, i) => { scaleNow[i] = scaleFrom[i] = v; });
      swatchNow = swatchFrom = swatchTo;
      applyVisual();
      return;
    }
    posFrom.copy(camera.position);
    lookFrom.copy(lookNow);
    satNow.forEach((v, i) => { satFrom[i] = v; });
    scaleNow.forEach((v, i) => { scaleFrom[i] = v; });
    swatchFrom = swatchNow;
    const distM = Math.max(posFrom.distanceTo(posTo), lookFrom.distanceTo(lookTo));
    glideMs = Math.min(1700, Math.max(980, 760 + distM * 70));
    glideEaseIn = !gliding;
    glideStart = performance.now();
    gliding = distM > 0.02;
    if (!gliding) {
      camera.position.copy(posTo);
      lookNow.copy(lookTo);
      camera.lookAt(lookNow);
      satTo.forEach((v, i) => { satNow[i] = v; });
      scaleTo.forEach((v, i) => { scaleNow[i] = v; });
      swatchNow = swatchTo;
      applyVisual();
    }
  }

  function resize(w, h) {
    viewW = w;
    viewH = h;
    narrow = w / h < 0.9;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    aim(slot, true);
  }

  function update(dt, now) {
    const moving = gliding && !reduce;
    let e = 1;
    if (moving) {
      const t = Math.min(1, ((now || performance.now()) - glideStart) / glideMs);
      e = easeGlide(t, glideEaseIn);
      camera.position.lerpVectors(posFrom, posTo, e);
      lookNow.lerpVectors(lookFrom, lookTo, e);
      if (t >= 1) gliding = false;
      satFrom.forEach((v, i) => { satNow[i] = v + (satTo[i] - v) * e; });
      scaleFrom.forEach((v, i) => { scaleNow[i] = v + (scaleTo[i] - v) * e; });
      swatchNow = swatchFrom + (swatchTo - swatchFrom) * e;
    }
    camera.lookAt(lookNow);
    applyVisual();
  }

  function step(dir) {
    const n = projects.length + 1;
    if (projects.length < 1) return false;
    aim((slot + dir + n) % n, reduce);
    return true;
  }

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
