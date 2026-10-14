import * as THREE from 'three';

// ---------- 2D signed distance fields from canvas drawings ----------
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
function edt(grid, w, h) {
  const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = grid[y * w + x]; edt1d(f, h, d, v, z); for (let y = 0; y < h; y++) grid[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = grid[y * w + x]; edt1d(f, w, d, v, z); for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x]); }
}
// draw(ctx,w,h) paints white shapes; worldW = world width the canvas spans; range = encoded distance range (world)
function sdfTexture(w, h, worldW, range, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
  draw(ctx, w, h);
  const px = ctx.getImageData(0, 0, w, h).data, N = w * h;
  const outside = new Float64Array(N), inside = new Float64Array(N);
  for (let i = 0; i < N; i++) { const on = px[i * 4] > 127; outside[i] = on ? 0 : 1e20; inside[i] = on ? 1e20 : 0; }
  edt(outside, w, h); edt(inside, w, h);
  const data = new Uint8Array(N), s = worldW / w;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, sd = (outside[i] - inside[i]) * s;            // + outside
    data[(h - 1 - y) * w + x] = Math.max(0, Math.min(255, Math.round((0.5 + sd / (2 * range)) * 255)));
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}

export const HELLO = { w: 2.2, h: 0.82 };
export const MARK = { w: 1.5, h: 1.5 };
const RANGE = 0.3;

export function makeTextures() {
  const hello = sdfTexture(1024, 382, HELLO.w, RANGE, (ctx, w, h) => {
    ctx.font = '800 300px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('hello', w / 2, h - 18);
  });
  const mark = sdfTexture(512, 512, MARK.w, RANGE, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2 + 6;
    ctx.lineWidth = 58; ctx.beginPath(); ctx.arc(cx, cy, 196, 0, Math.PI * 2); ctx.stroke();   // ring (the cup from above)
    ctx.beginPath();                                                                            // leaf
    ctx.moveTo(cx, cy - 150);
    ctx.bezierCurveTo(cx + 130, cy - 70, cx + 110, cy + 80, cx, cy + 140);
    ctx.bezierCurveTo(cx - 110, cy + 80, cx - 130, cy - 70, cx, cy - 150); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(cx - 7, cy - 100, 14, 210);                            // vein cut
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 34, h - 40, 68, 40);                              // foot joining ring to wheel
  });
  return { hello, mark };
}

const vert = /* glsl */`
varying vec3 vObj;
void main(){ vObj = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const frag = /* glsl */`
uniform mat4 modelMatrix, projectionMatrix;
uniform sampler2D uHello, uMark;
uniform float uA, uB, uT, uTime, uSpin, uRange;
uniform vec3 uCamObj, uBMin, uBMax;
uniform vec3 uKey, uFill, uClay;
uniform vec2 uHelloSize, uMarkSize;
varying vec3 vObj;

float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }

float extrude(float d2, float z, float h){ vec2 w = vec2(d2, abs(z)-h); return min(max(w.x,w.y),0.0)+length(max(w,0.0)); }
float box2(vec2 p, vec2 b){ vec2 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,q.y),0.0); }

float sdTex(sampler2D tex, vec2 size, vec3 p, float depth, float round){
  vec2 uv = vec2(p.x/size.x+0.5, p.y/size.y);
  float d2 = (texture2D(tex, clamp(uv,0.001,0.999)).r - 0.5) * 2.0 * uRange;
  d2 = max(d2, box2(vec2(p.x, p.y-size.y*0.5), size*0.5));
  // pillowy, hand-pressed: thicker at the core of each stroke
  float h = depth + clamp(-d2*0.6, 0.0, 0.06);
  return extrude(d2 + round, p.z, h) - round;
}
float vesselR(float y){
  float r = 0.36 + 0.36*exp(-pow((y-0.5)/0.3,2.0));
  r -= 0.1*smoothstep(0.75,1.15,y);
  r += 0.07*smoothstep(1.28,1.42,y);
  return r;
}
float sdVessel(vec3 p){
  float len = length(p.xz);
  float r = vesselR(p.y);
  float d = (abs(len - r) - 0.04)*0.8;
  d = max(d, p.y - 1.42);
  d = min(d, max(len - r, abs(p.y-0.05)-0.05));
  return max(d, -p.y);
}
float bowlR(float y){
  float r = 0.28 + 0.72 * smoothstep(0.0, 0.55, y);
  r += 0.06 * smoothstep(0.42, 0.58, y);
  return r;
}
float sdBowl(vec3 p){
  float len = length(p.xz);
  float r = bowlR(p.y);
  float d = (abs(len - r) - 0.045) * 0.85;
  d = max(d, p.y - 0.62);
  float inner = (r - 0.07) - len;
  inner = max(inner, 0.1 - p.y);
  inner = max(inner, p.y - 0.55);
  d = max(d, -inner);
  d = min(d, max(len - 0.22, abs(p.y - 0.04) - 0.04));
  return max(d, -p.y);
}
float sdLump(vec3 p){
  float y = p.y - 0.42;
  vec2 dd = vec2(length(p.xz) - 0.48 + 0.08*y, abs(y) - 0.34);
  return min(max(dd.x,dd.y),0.0) + length(max(dd,0.0)) - 0.13;
}
float sdShape(float i, vec3 p){
  if (i < 0.5) return sdTex(uHello, uHelloSize, p, 0.15, 0.07);
  if (i < 1.5) return sdTex(uMark, uMarkSize, p, 0.12, 0.05);
  if (i < 2.5) return sdVessel(p);
  return sdBowl(p);
}
float map(vec3 p){
  float t = uT;
  float m = sin(3.14159*t);
  float d;
  if (t <= 0.0001) d = sdShape(uA, p);
  else {
    float dA = sdShape(uA, p), dB = sdShape(uB, p);
    d = mix(mix(dA, dB, smoothstep(0.35,0.65,t)), sdLump(p), m*0.9);
  }
  // hand-made irregularity + throwing rings
  float n = noise(p*7.0 + vec3(0.0, 0.0, 0.0)) - 0.5;
  d += n*0.012;
  float rings = sin(p.y*90.0 + noise(p*3.0)*2.0) * (((uB>1.5 && uA>1.5) ? 0.0018 : 0.0006) + 0.003*uSpin);
  d += rings * smoothstep(0.0, 0.06, p.y);
  return d;
}
vec3 calcN(vec3 p){
  const vec2 k = vec2(1,-1); float e = 0.002;
  return normalize(k.xyy*map(p+k.xyy*e)+k.yyx*map(p+k.yyx*e)+k.yxy*map(p+k.yxy*e)+k.xxx*map(p+k.xxx*e));
}
float ao(vec3 p, vec3 n){
  float o=0.0, s=1.0;
  for(int i=1;i<=5;i++){ float h=0.025*float(i); o += (h - map(p+n*h))*s; s*=0.7; }
  return clamp(1.0-2.2*o,0.0,1.0);
}
void main(){
  vec3 ro = uCamObj, rd = normalize(vObj - uCamObj);
  vec3 p = vObj; float hit = 0.0;
  for (int i=0;i<140;i++){
    float d = map(p);
    if (d < 0.0012) { hit = 1.0; break; }
    p += rd * d * 0.75;
    if (any(lessThan(p, uBMin-0.02)) || any(greaterThan(p, uBMax+0.02))) break;
  }
  if (hit < 0.5) discard;
  vec3 nO = calcN(p);
  vec3 n = normalize(mat3(modelMatrix) * nO);
  vec3 wp = (modelMatrix * vec4(p,1.0)).xyz;
  vec3 v = normalize(cameraPosition - wp);
  float occ = ao(p, nO);
  // wet clay: tonal variation, darker where wetter near the wheel
  float tone = noise(p*4.0)*0.5 + noise(p*15.0)*0.25;
  vec3 alb = uClay * (0.85 + 0.25*tone);
  alb *= mix(0.72, 1.0, smoothstep(0.0, 0.25, p.y));
  vec3 L1 = normalize(uKey), L2 = normalize(uFill);
  float dif = clamp(dot(n,L1)*0.5+0.5, 0.0, 1.0); dif = dif*dif;
  float dif2 = clamp(dot(n,L2), 0.0, 1.0);
  vec3 h = normalize(L1+v);
  float wet = 0.55 + 0.45*uSpin;
  float spec = pow(clamp(dot(n,h),0.0,1.0), 48.0) * 0.9 * wet;
  float spec2 = pow(clamp(dot(n,normalize(L2+v)),0.0,1.0), 24.0) * 0.12;
  float fres = pow(1.0 - clamp(dot(n,v),0.0,1.0), 4.0);
  vec3 col = alb * (vec3(1.0,0.95,0.88)*dif*1.55 + vec3(0.62,0.66,0.72)*dif2*0.35 + vec3(0.30,0.27,0.25)) * occ;
  col += vec3(1.0,0.96,0.9) * (spec + spec2) * occ;
  col += vec3(0.95,0.85,0.75) * fres * 0.18 * occ;
  gl_FragColor = vec4(col, 1.0);
  vec4 clip = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  gl_FragDepth = (clip.z / clip.w) * 0.5 + 0.5;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function makeClay(textures) {
  const bmin = new THREE.Vector3(-1.2, 0.0, -1.0), bmax = new THREE.Vector3(1.2, 1.6, 1.0);
  const geo = new THREE.BoxGeometry(bmax.x - bmin.x, bmax.y - bmin.y, bmax.z - bmin.z);
  geo.translate((bmax.x + bmin.x) / 2, (bmax.y + bmin.y) / 2, (bmax.z + bmin.z) / 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: {
      uHello: { value: textures.hello }, uMark: { value: textures.mark },
      uA: { value: 0 }, uB: { value: 0 }, uT: { value: 0 }, uTime: { value: 0 }, uSpin: { value: 0 }, uRange: { value: RANGE },
      uCamObj: { value: new THREE.Vector3() }, uBMin: { value: bmin }, uBMax: { value: bmax },
      uKey: { value: new THREE.Vector3(-2.5, 4, 3) }, uFill: { value: new THREE.Vector3(3, 1.5, -1) },
      uClay: { value: new THREE.Color(0.30, 0.135, 0.075) },
      uHelloSize: { value: new THREE.Vector2(HELLO.w, HELLO.h) }, uMarkSize: { value: new THREE.Vector2(MARK.w, MARK.h) },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
