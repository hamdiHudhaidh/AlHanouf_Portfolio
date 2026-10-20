import * as THREE from 'three';

// Design is a print studio. Ten lines are strung across the room, one project
// each. The prints, the paper tag, and the pegs are what move: the chosen line
// slides forward and the sheets swing once on their pegs, then settle. The
// other lines step back under a white veil. 00 is the whole room. The camera
// eases along with that slide and never cuts.

const WIRE = 5.85;
const UPPER_Y = 3.16;
const LOWER_Y = 1.36;
const UPPER_Z = [-6.55, -5.05, -3.55, -2.05, -0.55];
const LOWER_Z = [-5.8, -4.3, -2.8, -1.3, 0.2];
const SHIFTS = [-1.15, 0.95, -0.4, 1.15, -1.05, 0.45, -1.35, 0.85, 0.1, -0.75];
const MAX_ROW = 3.2;
const GAP = 0.05;
const FRONT_Z = 2.35;

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
  canvas.width = 1024;
  canvas.height = 1280;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f7f1e8';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = 'rgba(29,27,25,0.38)';
  g.lineWidth = 6;
  g.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  g.fillStyle = '#e7e0d6';
  g.beginPath();
  g.arc(canvas.width / 2, 58, 16, 0, Math.PI * 2);
  g.fill();

  let y = 150;
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
    breakLines(g, project.title, 860).slice(0, 3).forEach((row) => {
      g.fillText(row, 78, y);
      y += 96;
    });
    y += 16;
  }
  if (project.text) {
    g.fillStyle = '#1d1b19';
    g.font = '400 46px Inter, sans-serif';
    breakLines(g, project.text, 860).slice(0, 6).forEach((row) => {
      g.fillText(row, 78, y);
      y += 62;
    });
    y += 18;
  }
  const href = project.links?.[0]?.href;
  if (href) {
    g.fillStyle = '#5b554d';
    g.font = '400 34px Inter, sans-serif';
    breakLines(g, href, 860).slice(0, 3).forEach((row) => {
      g.fillText(row, 78, y);
      y += 46;
    });
  }
  return makeTexture(canvas, renderer);
}

function visitTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 280;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f7f1e8';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = 'rgba(29,27,25,0.45)';
  g.lineWidth = 8;
  g.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  g.fillStyle = '#1d1b19';
  g.font = '500 92px Inter, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Visit site', canvas.width / 2, canvas.height / 2 + 4);
  g.strokeStyle = '#a8603f';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(250, 196);
  g.lineTo(650, 196);
  g.stroke();
  return makeTexture(canvas, renderer);
}

function sprocketTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 160;
  const g = canvas.getContext('2d');
  g.fillStyle = '#1d1b19';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#f3eee6';
  for (let i = 0; i < 4; i++) {
    const y = 14 + i * 38;
    g.fillRect(16, y, 32, 18);
  }
  const tex = makeTexture(canvas, renderer, { mipmap: false });
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function itemsOf(project) {
  if (project.items?.length) return project.items;
  return (project.images || []).map((src) => ({ kind: 'image', src }));
}

function layoutPieces(items, maxH) {
  if (!items.length) return { pieces: [], row: 0 };
  const n = items.length;
  const targetH = n >= 6 ? 0.72 : n >= 4 ? 0.88 : n === 1 ? 1.26 : 1.08;
  const pieces = items.map((item) => {
    const aspect = Math.max(0.2, item.aspect || 1);
    let h = item.kind === 'website' ? 1.46 : targetH;
    const w = item.kind === 'website' ? h * 0.58 : h * aspect;
    return { ...item, w, h, aspect };
  });
  let row = pieces.reduce((sum, p) => sum + p.w, 0) + GAP * Math.max(0, n - 1);
  const tallest = Math.max(...pieces.map((p) => p.h));
  const fit = Math.min(1, MAX_ROW / Math.max(row, 0.01), maxH / Math.max(tallest, 0.01));
  if (fit < 1) {
    pieces.forEach((p) => { p.w *= fit; p.h *= fit; });
    row *= fit;
  }
  let x = -row / 2;
  pieces.forEach((p) => {
    p.x = x + p.w / 2;
    x += p.w + GAP;
  });
  return { pieces, row };
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
    prepared.push({ project, items: ready });
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe6dfd4);
  scene.fog = new THREE.Fog(0xe6dfd4, 18, 36);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.08, 80);
  const camTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const camFrom = new THREE.Vector3();
  const camTo = new THREE.Vector3();
  const lookFrom = new THREE.Vector3();
  const lookTo = new THREE.Vector3();
  const lookNow = new THREE.Vector3(0, 1.6, -3);
  const fogPoint = new THREE.Vector3();

  scene.add(new THREE.HemisphereLight(0xf7f1e8, 0xcfc4b6, 0.92));
  scene.add(new THREE.AmbientLight(0xffffff, 0.38));
  const sun = new THREE.DirectionalLight(0xfff6ea, 0.85);
  sun.position.set(-3.2, 7.2, 4.4);
  scene.add(sun);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd4, roughness: 0.96 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xcfc4b6, roughness: 0.94 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xc4a27a, roughness: 0.7 });
  const springMat = new THREE.MeshStandardMaterial({ color: 0x6e4b32, roughness: 0.42, metalness: 0.28 });
  const paperMat = new THREE.MeshBasicMaterial({ color: 0xf4efe6, fog: false });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.38, metalness: 0.18 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 36), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 7.2), wallMat);
  back.position.set(0, 3.35, -8.4);
  scene.add(back);
  const windowLight = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 2.15),
    new THREE.MeshBasicMaterial({ color: 0xf7f1e8, fog: false }),
  );
  windowLight.position.set(2.3, 3.7, -8.32);
  scene.add(windowLight);
  [-6.25, 6.25].forEach((x) => {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(36, 7.2), wallMat);
    side.position.set(x, 3.35, 2);
    side.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(side);
  });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 18), wallMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 6.7, -0.4);
  scene.add(ceiling);

  const pegBody = new THREE.BoxGeometry(0.03, 0.072, 0.02);
  const pegBite = new THREE.BoxGeometry(0.034, 0.012, 0.022);
  const pegSpring = new THREE.TorusGeometry(0.012, 0.0032, 6, 10);
  const holes = sprocketTexture(renderer);
  const visitMap = visitTexture(renderer);

  function addPeg(parent, x) {
    const peg = new THREE.Group();
    const body = new THREE.Mesh(pegBody, woodMat);
    body.position.y = -0.028;
    const bite = new THREE.Mesh(pegBite, woodMat);
    bite.position.y = 0.012;
    const spring = new THREE.Mesh(pegSpring, springMat);
    spring.rotation.y = Math.PI / 2;
    spring.position.y = 0.008;
    peg.add(bite, body, spring);
    peg.position.set(x, 0, 0.012);
    parent.add(peg);
  }

  const lines = [];
  const visits = [];
  const videos = [];

  prepared.forEach((entry, index) => {
    const upper = index % 2 === 0;
    const tier = Math.floor(index / 2);
    const home = new THREE.Vector3(0, upper ? UPPER_Y : LOWER_Y, (upper ? UPPER_Z : LOWER_Z)[tier]);
    const maxH = upper ? 1.52 : 0.98;
    const laid = layoutPieces(entry.items, maxH);
    const lineGroup = new THREE.Group();
    const cluster = new THREE.Group();
    lineGroup.add(cluster);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, WIRE * 2, 8), wireMat);
    wire.rotation.z = Math.PI / 2;
    lineGroup.add(wire);
    [-WIRE, WIRE].forEach((x) => {
      const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.04), woodMat);
      cleat.position.set(x, home.y, home.z);
      scene.add(cleat);
    });

    const pivots = [];
    const lineVideos = [];
    let bottom = -0.2;

    laid.pieces.forEach((piece, i) => {
      const pivot = new THREE.Group();
      pivot.position.set(piece.x, 0, 0.01 + i * 0.006);
      const pegSpan = piece.w * 0.28;
      if (piece.w > 0.42) {
        addPeg(pivot, -pegSpan);
        addPeg(pivot, pegSpan);
      } else addPeg(pivot, 0);

      const sheet = new THREE.Group();
      sheet.position.y = -(0.05 + piece.h / 2);
      pivot.add(sheet);
      cluster.add(pivot);
      pivots.push(pivot);
      bottom = Math.min(bottom, -0.05 - piece.h);

      if (piece.kind === 'video') {
        const bar = Math.min(0.05, piece.w * 0.075);
        const pictureW = Math.max(0.08, piece.w - bar * 2);
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
        const barMat = new THREE.MeshBasicMaterial({ map: holes.clone(), fog: false });
        barMat.map.wrapT = THREE.RepeatWrapping;
        barMat.map.repeat.y = Math.max(1, piece.h / 0.18);
        barMat.map.colorSpace = THREE.SRGBColorSpace;
        const barMat2 = barMat.clone();
        barMat2.map = holes.clone();
        barMat2.map.wrapT = THREE.RepeatWrapping;
        barMat2.map.repeat.y = barMat.map.repeat.y;
        barMat2.map.colorSpace = THREE.SRGBColorSpace;
        const left = new THREE.Mesh(new THREE.PlaneGeometry(bar, piece.h), barMat);
        left.position.x = -(pictureW / 2 + bar / 2);
        const right = new THREE.Mesh(new THREE.PlaneGeometry(bar, piece.h), barMat2);
        right.position.x = pictureW / 2 + bar / 2;
        const pic = new THREE.Mesh(
          new THREE.PlaneGeometry(pictureW, piece.h),
          new THREE.MeshBasicMaterial({ map: tex, fog: false }),
        );
        sheet.add(left, right, pic);
      } else if (piece.kind === 'website' && piece.image) {
        const mount = new THREE.Mesh(new THREE.PlaneGeometry(piece.w, piece.h), paperMat);
        mount.position.z = -0.004;
        const shotW = piece.w - 0.05;
        const shotH = piece.h - 0.07;
        const tex = makeTexture(piece.image, renderer);
        const shotAspect = piece.shotAspect || piece.aspect;
        const frameAspect = shotW / shotH;
        let scroll = null;
        if (shotAspect < frameAspect * 0.92) {
          const repeatY = Math.max(0.08, shotAspect / frameAspect);
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.repeat.set(1, repeatY);
          tex.offset.y = 1 - repeatY;
          scroll = { tex, top: 1 - repeatY };
        }
        const shot = new THREE.Mesh(
          new THREE.PlaneGeometry(shotW, shotH),
          new THREE.MeshBasicMaterial({ map: tex, fog: false }),
        );
        shot.position.y = 0.012;
        sheet.add(mount, shot);
        if (scroll) cluster.userData.scroll = scroll;
      } else {
        const mount = new THREE.Mesh(
          new THREE.PlaneGeometry(piece.w + 0.03, piece.h + 0.03),
          paperMat,
        );
        mount.position.z = -0.004;
        sheet.add(mount);
        if (piece.image) {
          const tex = makeTexture(piece.image, renderer);
          const pic = new THREE.Mesh(
            new THREE.PlaneGeometry(piece.w, piece.h),
            new THREE.MeshBasicMaterial({ map: tex, fog: false }),
          );
          pic.position.z = 0.001;
          sheet.add(pic);
        }
      }
    });

    const tagW = 0.56;
    const tagH = 0.84;
    const tagX = laid.row / 2 + 0.1 + tagW / 2;
    const tagPivot = new THREE.Group();
    tagPivot.position.set(tagX, 0, 0.02);
    addPeg(tagPivot, 0);
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(tagW, tagH),
      new THREE.MeshBasicMaterial({ map: tagTexture(entry.project, renderer), toneMapped: false, fog: false }),
    );
    tag.position.y = -(0.055 + tagH / 2);
    tagPivot.add(tag);
    pivots.push(tagPivot);
    cluster.add(tagPivot);
    bottom = Math.min(bottom, tag.position.y - tagH / 2);

    const href = entry.project.links?.[0]?.href;
    if (href) {
      const visitH = 0.2;
      const visit = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, visitH),
        new THREE.MeshBasicMaterial({ map: visitMap, toneMapped: false, fog: false }),
      );
      visit.position.y = tag.position.y - tagH / 2 - 0.045 - visitH / 2;
      visit.userData.href = href;
      tagPivot.add(visit);
      visits.push(visit);
      bottom = Math.min(bottom, visit.position.y - visitH / 2);
    }

    const left = -laid.row / 2;
    const right = tagX + tagW / 2;
    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(right - left + 0.28, -bottom + 0.18),
      new THREE.MeshBasicMaterial({
        color: 0xfffaf4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      }),
    );
    veil.position.set((left + right) / 2, bottom / 2, 0.09);
    veil.renderOrder = 4;
    cluster.add(veil);

    lineGroup.position.copy(home);
    cluster.position.x = SHIFTS[index] || 0;
    scene.add(lineGroup);

    const frontY = 1.5 - bottom / 2;
    lines.push({
      project: entry.project,
      group: lineGroup,
      cluster,
      veil,
      pivots,
      videos: lineVideos,
      scroll: cluster.userData.scroll || null,
      home,
      front: new THREE.Vector3(0, frontY, FRONT_Z),
      back: new THREE.Vector3(home.x, home.y, home.z - 1.2),
      from: home.clone(),
      to: home.clone(),
      shiftHome: SHIFTS[index] || 0,
      shiftFrom: SHIFTS[index] || 0,
      shiftTo: SHIFTS[index] || 0,
      scaleFrom: 1,
      scaleTo: 1,
      opFrom: 0,
      opTo: 0,
      swingStart: -1,
      left,
      right,
      bottom,
    });
  });

  let slot = 0;
  let narrow = false;
  let moving = false;
  let moveStart = 0;
  let moveMs = 1200;
  let moveEaseIn = true;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function updateFog() {
    fogPoint.set(0, 1.6, -3);
    const reach = Math.max(6, camera.position.distanceTo(fogPoint));
    scene.fog.near = reach + 8;
    scene.fog.far = reach + 28;
  }

  function fitPose(minX, maxX, minY, maxY, lookZ, fill) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const spanX = Math.max(0.4, maxX - minX);
    const spanY = Math.max(0.4, maxY - minY);
    const tanV = Math.tan((camera.fov * Math.PI) / 360);
    const aspect = Math.max(0.35, camera.aspect);
    const dist = Math.max(
      spanY / (2 * tanV * fill),
      spanX / (2 * tanV * aspect * fill),
    );
    camTarget.set(cx, cy, lookZ + dist);
    lookTarget.set(cx, cy, lookZ);
  }

  function overviewPose() {
    let minY = 0.2;
    let maxY = UPPER_Y + 0.2;
    lines.forEach((line) => {
      minY = Math.min(minY, line.home.y + line.bottom);
      maxY = Math.max(maxY, line.home.y + 0.08);
    });
    const padX = narrow ? 0.15 : 0.45;
    const padY = narrow ? 0.18 : 0.42;
    fitPose(-WIRE - padX, WIRE + padX, minY - padY, maxY + padY, -2.9, narrow ? 0.94 : 0.84);
  }

  function focusPose(line) {
    const y = line.front.y;
    const z = line.front.z;
    fitPose(
      line.left - 0.16,
      line.right + 0.18,
      y + line.bottom - 0.1,
      y + 0.16,
      z,
      narrow ? 0.9 : 0.86,
    );
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
    slot = ((next % count) + count) % count;
    const focus = slot - 1;
    if (focus < 0) overviewPose();
    else focusPose(lines[focus]);
    camTo.copy(camTarget);
    lookTo.copy(lookTarget);
    lines.forEach((line, i) => {
      line.from.copy(line.group.position);
      line.shiftFrom = line.cluster.position.x;
      line.scaleFrom = line.cluster.scale.x;
      line.opFrom = line.veil.material.opacity;
      if (focus < 0) {
        line.to.copy(line.home);
        line.shiftTo = line.shiftHome;
        line.scaleTo = 1;
        line.opTo = 0;
        line.swingStart = -1;
      } else if (i === focus) {
        line.to.copy(line.front);
        line.shiftTo = 0;
        line.scaleTo = 1;
        line.opTo = 0;
        line.swingStart = snap || reduce ? -1 : performance.now();
      } else {
        line.to.copy(line.back);
        line.shiftTo = line.shiftHome;
        line.scaleTo = 0.9;
        line.opTo = 0.5;
        line.swingStart = -1;
      }
      line.veil.renderOrder = i === focus ? 2 : 5;
    });
    syncMedia();
    if (snap || reduce) {
      moving = false;
      lines.forEach((line) => {
        line.group.position.copy(line.to);
        line.cluster.position.x = line.shiftTo;
        line.cluster.scale.setScalar(line.scaleTo);
        line.veil.material.opacity = line.opTo;
        line.pivots.forEach((pivot) => { pivot.rotation.x = 0; });
      });
      camera.position.copy(camTo);
      lookNow.copy(lookTo);
      camera.lookAt(lookNow);
      updateFog();
      return;
    }
    camFrom.copy(camera.position);
    lookFrom.copy(lookNow);
    let travel = camFrom.distanceTo(camTo);
    lines.forEach((line) => { travel = Math.max(travel, line.from.distanceTo(line.to)); });
    moveMs = Math.min(1600, Math.max(1000, 760 + travel * 70));
    moveEaseIn = !moving;
    moveStart = performance.now();
    moving = travel > 0.02;
    if (!moving) {
      camera.position.copy(camTo);
      lookNow.copy(lookTo);
      camera.lookAt(lookNow);
    }
    updateFog();
  }

  function resize(w, h) {
    narrow = w / Math.max(1, h) < 0.9;
    camera.aspect = w / Math.max(1, h);
    camera.fov = narrow ? 40 : 32;
    camera.updateProjectionMatrix();
    aim(slot, true);
  }

  function update(dt, now) {
    const time = now || performance.now();
    if (document.hidden) pause();
    let e = 1;
    let apply = false;
    if (moving && !reduce) {
      const t = Math.min(1, (time - moveStart) / moveMs);
      e = easeGlide(t, moveEaseIn);
      apply = true;
      if (t >= 1) moving = false;
    }
    const focus = slot - 1;
    lines.forEach((line, i) => {
      if (apply) {
        line.group.position.lerpVectors(line.from, line.to, e);
        line.cluster.position.x = line.shiftFrom + (line.shiftTo - line.shiftFrom) * e;
        const s = line.scaleFrom + (line.scaleTo - line.scaleFrom) * e;
        line.cluster.scale.setScalar(s);
        line.veil.material.opacity = line.opFrom + (line.opTo - line.opFrom) * e;
      }
      const on = i === focus;
      line.pivots.forEach((pivot, k) => {
        let target = 0;
        if (on && !reduce && line.swingStart >= 0) {
          const st = (time - line.swingStart) / 1000 - k * 0.05;
          if (st > 0) target = -0.28 * Math.sin(st * 4) * Math.exp(-1.25 * st);
        }
        if (reduce || on) pivot.rotation.x = target;
        else pivot.rotation.x += (0 - pivot.rotation.x) * Math.min(1, (dt || 0.016) * 6);
      });
      if (on && !document.hidden) {
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
    });
    if (apply) {
      camera.position.lerpVectors(camFrom, camTo, e);
      lookNow.lerpVectors(lookFrom, lookTo, e);
    }
    camera.lookAt(lookNow);
    updateFog();
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
  }

  aim(0, true);

  return {
    scene,
    camera,
    resize,
    update,
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
}
