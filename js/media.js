import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { MODERN } from './modern-map.js';

// Photos request a sibling AVIF or WebP when one was written and is smaller.
// The original file stays the last fallback, and it is not requested on the
// happy path, so a missing sibling never turns into a 404.

export function preferredURL(url) {
  if (!url) return url;
  const alts = MODERN.get(url);
  return alts && alts.length ? alts[0] : url;
}

export function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const chain = [];
    const push = (src) => { if (src && !chain.includes(src)) chain.push(src); };
    const alts = MODERN.get(url) || [];
    alts.forEach(push);
    push(url);
    const img = new Image();
    img.decoding = 'async';
    let i = 0;
    img.onload = () => resolve(img);
    img.onerror = () => {
      i += 1;
      if (i >= chain.length) resolve(null);
      else img.src = chain[i];
    };
    img.src = chain[0];
  });
}

export function textureFromImage(img, renderer, { colorSpace, repeat } = {}) {
  const tex = new THREE.Texture(img);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (colorSpace) tex.colorSpace = colorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.needsUpdate = true;
  return tex;
}

const rooms = new Map();

function disposeObject(obj) {
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((mat) => mat.dispose());
  }
  if (obj.dispose && obj.isLight) obj.dispose();
}

// One RoomEnvironment capture per sigma. Ceramics and Design share 0.04.
// Art keeps 0.05. The generator and the source room are dropped after the
// capture; the PMREM texture is reused.
export function roomTexture(renderer, sigma) {
  const key = String(sigma);
  const hit = rooms.get(key);
  if (hit) return hit;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const tex = pmrem.fromScene(room, sigma).texture;
  pmrem.dispose();
  room.traverse(disposeObject);
  rooms.set(key, tex);
  return tex;
}

export function parseOBJ(text) {
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

let decoderPromise = null;
function meshopt() {
  if (!decoderPromise) {
    decoderPromise = import('./vendor/meshopt_decoder.mjs').then(async (mod) => {
      await mod.MeshoptDecoder.ready;
      return mod.MeshoptDecoder;
    });
  }
  return decoderPromise;
}

async function decodeMesh(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 20) return null;
  if (view.getUint8(0) !== 77 || view.getUint8(1) !== 79 || view.getUint8(2) !== 80 || view.getUint8(3) !== 49) return null;
  const vcount = view.getUint32(4, true);
  const icount = view.getUint32(8, true);
  const vbytes = view.getUint32(12, true);
  const ibytes = view.getUint32(16, true);
  if (20 + vbytes + ibytes > view.byteLength) return null;
  const vsrc = new Uint8Array(buffer, 20, vbytes);
  const isrc = new Uint8Array(buffer, 20 + vbytes, ibytes);
  const dec = await meshopt();
  const vdst = new Uint8Array(vcount * 12);
  dec.decodeVertexBuffer(vdst, vcount, 12, vsrc);
  const idst = new Uint8Array(icount * 4);
  dec.decodeIndexBuffer(idst, icount, 4, isrc);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vdst.buffer), 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idst.buffer), 1));
  return geo;
}

// Meshopt bytes of the same positions the OBJ parser produced. The index
// codec may cycle a triangle; the winding stays the same, so the surface
// does not change. The OBJ is fetched only when the .mesh is missing.
export async function loadGeometry(objURL) {
  const meshURL = objURL.replace(/\.obj$/i, '.mesh');
  try {
    const res = await fetch(encodeURI(meshURL));
    if (res.ok) {
      const geo = await decodeMesh(await res.arrayBuffer());
      if (geo) return geo;
    }
  } catch (err) {
    /* fall through to the OBJ */
  }
  const res = await fetch(encodeURI(objURL));
  if (!res.ok) return null;
  return parseOBJ(await res.text());
}

export function prefetchAssets(urls) {
  const list = [];
  (urls || []).forEach((url) => {
    if (url && !list.includes(url) && !/\.mp4$/i.test(url)) list.push(url);
  });
  if (!list.length) return;
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 700));
  let i = 0;
  const step = () => {
    if (i >= list.length) return;
    const url = list[i];
    i += 1;
    fetch(encodeURI(url), { cache: 'force-cache' }).catch(() => {}).finally(() => idle(step));
  };
  idle(step);
}
