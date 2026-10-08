import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { studio as defaultStudio, projects as samples } from "./projects.js";
import { library, keepStorage, storageUsed } from "./store.js";

/* ════════════════════════════════════════════════════════════
   CONFIG
   ════════════════════════════════════════════════════════════ */
const R = 1.6;          // disc outer radius
const HOLE = 0.2;       // centre hole radius
const HUB = 0.38;       // clear hub ring radius (label starts here)
const T = 0.03;         // disc thickness
const SPACING_X = 3.7;  // horizontal gap between discs
const SPACING_Y = 0.65; // rise per disc (diagonal line)

let items = [];         // what's on screen: your discs, or the samples when empty
let N = 0;
let LOOP = false;       // infinite loop once there are 6+ discs
const records = new Map();

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} },
};

const studio = { ...defaultStudio, name: store.get("studioName") || defaultStudio.name };
function applyStudioName() {
  document.title = `${studio.name} — ${studio.tagline}`;
  $("#brand").textContent = studio.name;
}
applyStudioName();

const isTouch = matchMedia("(pointer: coarse)").matches;
if (isTouch) $("#hint").textContent = "Drag a disc to spin · Swipe to browse · Tap to play";
document.addEventListener("gesturestart", (e) => e.preventDefault()); // no pinch-zoom on iPad

/* ════════════════════════════════════════════════════════════
   RENDERER / SCENE
   ════════════════════════════════════════════════════════════ */
const canvas = $("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 12);

const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(-4, 6, 8);
scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const maxAniso = renderer.capabilities.getMaxAnisotropy();

/* ════════════════════════════════════════════════════════════
   TEXTURES
   ════════════════════════════════════════════════════════════ */
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Accepts a file path/URL (samples) or a Blob saved from the iPad
function loadImage(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const isBlob = src instanceof Blob;
    const url = isBlob ? URL.createObjectURL(src) : src;
    const img = new Image();
    if (!isBlob) img.crossOrigin = "anonymous";
    img.onload = () => { if (isBlob) URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { if (isBlob) URL.revokeObjectURL(url); console.warn("Cover not loaded"); res(null); };
    img.src = url;
  });
}

// Procedural architectural artwork for discs without a cover image
function drawArt(g, S, p, rand) {
  const [top, bottom] = p.palette || ["#cfc6b8", "#3a3a3a"];
  const grd = g.createLinearGradient(0, 0, 0, S);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);

  const ink = p.ink || "rgba(255,255,255,0.85)";
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineCap = "square";
  const style = p.art ?? Math.floor(rand() * 3);

  if (style === 0) {
    // ── skyline elevation with perspective ground
    const base = S * 0.6;
    g.globalAlpha = 0.22;
    g.beginPath();
    g.arc(S * (0.25 + rand() * 0.5), S * 0.27, S * 0.085, 0, Math.PI * 2);
    g.fill();
    let x = S * 0.06;
    while (x < S * 0.94) {
      const w = S * (0.06 + rand() * 0.12);
      const h = S * (0.1 + rand() * 0.3);
      g.globalAlpha = 0.14;
      g.fillRect(x, base - h, w, h);
      g.globalAlpha = 0.9;
      g.lineWidth = 2.5;
      g.strokeRect(x, base - h, w, h);
      g.globalAlpha = 0.45;
      g.lineWidth = 1;
      const rows = Math.max(2, Math.floor(h / (S * 0.026)));
      const cols = Math.max(1, Math.floor(w / (S * 0.022)));
      for (let r = 1; r < rows; r++) {
        const yy = base - h + (r * h) / rows;
        g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
      }
      for (let c = 1; c < cols; c++) {
        const xx = x + (c * w) / cols;
        g.beginPath(); g.moveTo(xx, base - h); g.lineTo(xx, base); g.stroke();
      }
      x += w + S * (0.004 + rand() * 0.03);
    }
    g.globalAlpha = 0.9;
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, base); g.lineTo(S, base); g.stroke();
    g.globalAlpha = 0.3;
    g.lineWidth = 1;
    for (let i = -14; i <= 14; i++) {
      g.beginPath(); g.moveTo(S / 2, base); g.lineTo(S / 2 + i * S * 0.12, S); g.stroke();
    }
    for (let i = 1; i < 9; i++) {
      const yy = base + (S - base) * Math.pow(i / 9, 1.8);
      g.beginPath(); g.moveTo(0, yy); g.lineTo(S, yy); g.stroke();
    }
  } else if (style === 1) {
    // ── floor plan
    g.globalAlpha = 0.12;
    g.lineWidth = 1;
    for (let i = 0; i <= S; i += S / 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke();
    }
    g.globalAlpha = 0.9;
    const split = (x, y, w, h, d) => {
      if (d === 0 || w < S * 0.13 || h < S * 0.13) {
        g.lineWidth = 7;
        g.strokeRect(x, y, w, h);
        if (rand() < 0.5) {
          const r = Math.min(w, h) * 0.28;
          g.lineWidth = 1.5;
          g.beginPath(); g.arc(x, y + h, r, -Math.PI / 2, 0); g.stroke();
          g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + h - r); g.stroke();
        }
        if (rand() < 0.3) {
          g.globalAlpha = 0.12;
          g.fillRect(x, y, w, h);
          g.globalAlpha = 0.9;
        }
        return;
      }
      if (w > h) {
        const c = w * (0.35 + rand() * 0.3);
        split(x, y, c, h, d - 1);
        split(x + c, y, w - c, h, d - 1);
      } else {
        const c = h * (0.35 + rand() * 0.3);
        split(x, y, w, c, d - 1);
        split(x, y + c, w, h - c, d - 1);
      }
    };
    const m = S * 0.14;
    split(m, m, S - 2 * m, S - 2 * m, 4);
    // north arrow
    g.lineWidth = 2;
    g.beginPath(); g.arc(S * 0.8, S * 0.86, S * 0.03, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(S * 0.8, S * 0.82); g.lineTo(S * 0.8, S * 0.9); g.stroke();
  } else {
    // ── axonometric blocks
    const s = S * 0.06;
    const cx = S / 2, cy = S * 0.42;
    const cos = Math.cos(Math.PI / 6), sin = Math.sin(Math.PI / 6);
    const P = (x, y, z) => [cx + (x - y) * cos * s, cy + (x + y) * sin * s - z * s];
    const poly = (pts, alpha) => {
      g.beginPath();
      pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)));
      g.closePath();
      g.globalAlpha = alpha; g.fill();
      g.globalAlpha = 0.9; g.lineWidth = 2; g.stroke();
    };
    const boxes = [];
    for (let i = 0; i < 9; i++) {
      boxes.push({ x: Math.floor(rand() * 6) - 3, y: Math.floor(rand() * 6) - 3, w: 1 + Math.floor(rand() * 2), d: 1 + Math.floor(rand() * 2), h: 1 + rand() * 4 });
    }
    boxes.sort((a, b) => a.x + a.y - (b.x + b.y));
    // ground grid
    g.globalAlpha = 0.25; g.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      let [a, b] = P(i, -6, 0), [c, d] = P(i, 6, 0);
      g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
      [a, b] = P(-6, i, 0); [c, d] = P(6, i, 0);
      g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
    }
    for (const b of boxes) {
      const { x, y, w, d, h } = b;
      poly([P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x, y + d, h)], 0.32); // left face
      poly([P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x + w, y, h)], 0.48); // right face
      poly([P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)], 0.14);         // roof
    }
  }
  g.globalAlpha = 1;
}

function arcText(g, text, r, start) {
  let a = start;
  for (const ch of text) {
    const w = g.measureText(ch).width + 3;
    g.save();
    g.rotate(a + w / 2 / r);
    g.translate(0, -r);
    g.fillText(ch, 0, 0);
    g.restore();
    a += w / r;
  }
}

async function makeLabel(p) {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const rand = seeded(p.title || "x");
  const img = await loadImage(p.cover);

  if (img) {
    const k = Math.max(S / img.width, S / img.height);
    const w = img.width * k, h = img.height * k;
    g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
  } else {
    drawArt(g, S, p, rand);
  }

  // rim vignette so the rim text reads
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S / 2);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.38)");
  g.fillStyle = v;
  g.fillRect(0, 0, S, S);

  // text around the rim
  g.save();
  g.translate(S / 2, S / 2);
  g.fillStyle = "rgba(255,255,255,0.86)";
  g.font = '500 19px "Inter", sans-serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  let parts = [p.location, p.year, p.client, ...(p.tools || [])].filter(Boolean);
  if (parts.length < 2) parts = [...parts, ...(p.rimFallback || []), studio.name].filter(Boolean);
  const rim = parts.join("   ·   ").toUpperCase();
  arcText(g, rim, S * 0.462, -Math.PI * 0.82);
  g.restore();

  // title + studio mark
  if (p.showTitle !== false) {
    const bottomShade = g.createLinearGradient(0, S * 0.55, 0, S);
    bottomShade.addColorStop(0, "rgba(0,0,0,0)");
    bottomShade.addColorStop(1, "rgba(0,0,0,0.25)");
    g.fillStyle = bottomShade;
    g.fillRect(0, S * 0.55, S, S * 0.45);

    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    let fs = S * 0.105;
    const title = (p.title || "").toUpperCase();
    do {
      g.font = `400 ${fs}px "Instrument Serif", serif`;
      fs -= 4;
    } while (g.measureText(title).width > S * 0.66 && fs > 30);
    g.fillText(title, S / 2, S * 0.75);

    g.font = '600 20px "Inter", sans-serif';
    g.fillStyle = "rgba(255,255,255,0.8)";
    const mark = studio.name.toUpperCase().split("").join(String.fromCharCode(8202));
    g.fillText(mark, S / 2, S * 0.82);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function grooveTexture() {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  g.fillStyle = "#3a3a3a";
  g.fillRect(0, 0, S, S);
  for (let r = S * 0.12; r < S / 2; r += 1.25) {
    const v = 40 + Math.random() * 60;
    g.strokeStyle = `rgb(${v},${v},${v})`;
    g.lineWidth = 0.8;
    g.beginPath(); g.arc(S / 2, S / 2, r, 0, Math.PI * 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = maxAniso;
  return t;
}

function shadowTexture() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  r.addColorStop(0, "rgba(0,0,0,0.55)");
  r.addColorStop(0.55, "rgba(0,0,0,0.2)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}


/* ════════════════════════════════════════════════════════════
   DISC GEOMETRY + MATERIALS (shared)
   ════════════════════════════════════════════════════════════ */
const geo = {
  label: new THREE.RingGeometry(HUB, R, 160, 1),
  hub: new THREE.RingGeometry(HOLE, HUB, 96, 1),
  back: new THREE.RingGeometry(HOLE, R, 160, 1),
  rim: new THREE.CylinderGeometry(R, R, T, 160, 1, true),
  inner: new THREE.CylinderGeometry(HOLE, HOLE, T, 64, 1, true),
  stack: new THREE.TorusGeometry(HUB * 0.8, 0.012, 12, 96),
  shadow: new THREE.PlaneGeometry(R * 2.6, R * 2.6),
};
geo.rim.rotateX(Math.PI / 2);
geo.inner.rotateX(Math.PI / 2);
geo.back.rotateY(Math.PI);

const groove = grooveTexture();
const mat = {
  back: new THREE.MeshPhysicalMaterial({
    color: 0xd9dde2, metalness: 1, roughness: 0.18, roughnessMap: groove,
    iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [250, 900],
    clearcoat: 1, clearcoatRoughness: 0.08,
  }),
  rim: new THREE.MeshPhysicalMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.25 }),
  hub: new THREE.MeshPhysicalMaterial({
    color: 0xe9edf1, metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.88,
    clearcoat: 1, clearcoatRoughness: 0.05,
  }),
  stack: new THREE.MeshPhysicalMaterial({ color: 0xdfe3e7, metalness: 0.6, roughness: 0.2 }),
  shadow: new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.22 }),
};

let discs = [];
const hitMeshes = [];

function createDisc(p, i) {
  const group = new THREE.Group();
  const spin = new THREE.Group();
  spin.rotation.order = "YXZ";
  group.add(spin);

  const labelMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8d8d4, roughness: 0.45, metalness: 0.05,
    clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.45,
  });

  const label = new THREE.Mesh(geo.label, labelMat);
  label.position.z = T / 2 + 0.0005;
  const hub = new THREE.Mesh(geo.hub, mat.hub);
  hub.position.z = T / 2 + 0.0004;
  const back = new THREE.Mesh(geo.back, mat.back);
  back.position.z = -T / 2;
  const rim = new THREE.Mesh(geo.rim, mat.rim);
  const inner = new THREE.Mesh(geo.inner, mat.rim);
  const stack = new THREE.Mesh(geo.stack, mat.stack);
  stack.position.z = T / 2 + 0.004;
  spin.add(label, hub, back, rim, inner, stack);

  const shadow = new THREE.Mesh(geo.shadow, mat.shadow);
  scene.add(shadow);

  for (const m of [label, hub, back, rim]) {
    m.userData.disc = i;
    hitMeshes.push(m);
  }

  scene.add(group);
  group.visible = false;
  shadow.visible = false;
  const d = { i, p, group, spin, shadow, labelMat, vel: { x: 0, y: 0 } };
  discs.push(d);
  return d;
}

function clearDiscs() {
  for (const d of discs) {
    scene.remove(d.group, d.shadow);
    d.labelMat.map?.dispose();
    d.labelMat.dispose();
  }
  discs = [];
  hitMeshes.length = 0;
}

/* ════════════════════════════════════════════════════════════
   LIBRARY → ITEMS
   ════════════════════════════════════════════════════════════ */
const PALETTES = [
  ["#d8c3a0", "#6b4f36"], ["#9fb7c4", "#1f3340"], ["#b9bdb4", "#2f352f"],
  ["#f0c79a", "#3b2142"], ["#cfcfcf", "#161616"], ["#c8826a", "#3d1f17"],
];
function fmtTime(sec) {
  if (!sec || !isFinite(sec)) return "";
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function fmtRes(w, h) {
  if (!w || !h) return "";
  const short = Math.min(w, h);
  const tag = short >= 2160 ? "4K" : short >= 1440 ? "1440p" : short >= 1080 ? "1080p" : short >= 720 ? "720p" : "";
  return tag ? `${tag} · ${w}×${h}` : `${w}×${h}`;
}
function toItem(r) {
  const rand = seeded(r.id);
  const notes = [];
  if (r.duration) notes.push({ label: "Runtime", text: fmtTime(r.duration) });
  if (r.width) notes.push({ label: "Resolution", text: fmtRes(r.width, r.height) });
  return {
    id: r.id,
    sample: false,
    title: r.title || "Untitled",
    location: r.location || "",
    year: r.year || "",
    client: r.client || "",
    tools: r.tools || [],
    cover: r.coverBlob || null,
    video: r.videoBlob || null,
    showTitle: r.showTitle !== false,
    palette: PALETTES[Math.floor(rand() * PALETTES.length)],
    art: Math.floor(rand() * 3),
    rimFallback: [fmtTime(r.duration), fmtRes(r.width, r.height)].filter(Boolean),
    notes,
  };
}

async function loadLibrary(focusId, slideIn = false) {
  let recs = [];
  try {
    recs = await library.all();
  } catch (e) {
    console.warn(e);
    toast("Couldn't open the saved library on this device");
  }
  records.clear();
  recs.forEach((r) => records.set(r.id, r));
  items = recs.length
    ? recs.map(toItem)
    : samples.map((p, i) => ({ ...p, id: `sample-${i}`, sample: true }));
  document.body.classList.toggle("is-empty", !recs.length);
  await rebuild(focusId, slideIn);
}

async function rebuild(focusId, slideIn = false) {
  const prevCenter = N ? centerIndex() : 0;
  clearDiscs();
  N = items.length;
  LOOP = N >= 6;
  items.forEach((p, i) => createDisc(p, i));

  if (focusId) {
    const i = Math.max(0, items.findIndex((x) => x.id === focusId));
    if (LOOP) {           // keep the loop position continuous
      const d = mod(i - targetPos + N / 2, N) - N / 2;
      targetPos = Math.round(targetPos + d);
    } else {
      targetPos = i;
    }
    pos = slideIn ? targetPos - 2 : targetPos;   // new discs slide in
  } else {
    targetPos = clamp(prevCenter, 0, N - 1);
    pos = clamp(pos, targetPos - 3, targetPos + 3);
  }
  shownIndex = -1;
  buildIndex();

  await Promise.all(discs.map(async (d) => {
    try {
      d.labelMat.map = await makeLabel(d.p);
      d.labelMat.color.set(0xffffff);
      d.labelMat.needsUpdate = true;
    } catch (e) { console.warn(e); }
  }));
}

/* ════════════════════════════════════════════════════════════
   UI: info, index, toast
   ════════════════════════════════════════════════════════════ */
const info = $("#info");
const notes = $("#notes");
const counter = $("#counter");
let shownIndex = -1;

function showInfo(i) {
  if (i === shownIndex || !items[i]) return;
  shownIndex = i;
  const p = items[i];
  const tools = (p.tools || []).map(esc).join("<br>");
  info.classList.remove("in");
  notes.classList.remove("in");
  info.innerHTML = `
    <h1>${esc(p.title)}</h1>
    ${p.location ? `<div class="row"><span class="k">Location</span><span class="v">${esc(p.location)}</span></div>` : ""}
    ${p.year ? `<div class="row"><span class="k">Year</span><span class="v">${esc(p.year)}</span></div>` : ""}
    ${p.client ? `<div class="row"><span class="k">Client</span><span class="v">${esc(p.client)}</span></div>` : ""}
    ${tools ? `<div class="row"><span class="k">Made with</span><span class="v">${tools}</span></div>` : ""}`;
  notes.innerHTML = (p.notes || []).slice(0, 2).map((n) =>
    `<div class="note"><div class="label">${esc(n.label)}</div><div class="text">${esc(n.text)}</div></div>`).join("");
  void info.offsetWidth;
  info.classList.add("in");
  notes.classList.add("in");
  counter.textContent = `${String(i + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}`;
}

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// Index overlay
const indexEl = $("#index");
const indexBtn = $("#index-toggle");
const indexList = $("#index-list");
function buildIndex() {
  const rows = items.map((p, i) => `
    <li data-i="${i}">
      <span class="t">${esc(p.title)}</span>
      <span class="y">${esc(p.year)}</span>
      ${p.sample ? "<span></span>" : `<button class="del" data-del="${esc(p.id)}" aria-label="Delete ${esc(p.title)}">&times;</button>`}
    </li>`).join("");
  indexList.innerHTML = `<li class="add-row" data-add="1"><span class="t">Add a disc</span></li>` + rows;
}
async function showStorage() {
  const s = await storageUsed();
  const own = items.filter((x) => !x.sample).length;
  const gb = (b) => b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1e6))} MB`;
  $("#storage").textContent = own
    ? `${own} disc${own === 1 ? "" : "s"} saved on this device${s ? ` · ${gb(s.usage)} used` : ""}`
    : "No discs saved yet — the ones shown are samples.";
}
function toggleIndex(open = !indexEl.classList.contains("open")) {
  indexEl.classList.toggle("open", open);
  indexEl.setAttribute("aria-hidden", String(!open));
  indexBtn.setAttribute("aria-expanded", String(open));
  if (open) showStorage();
}
indexBtn.addEventListener("click", () => toggleIndex());
indexEl.addEventListener("click", (e) => {
  if (e.target === indexEl) return toggleIndex(false);
  const del = e.target.closest("[data-del]");
  if (del) return deleteDisc(del.dataset.del);
  const li = e.target.closest("li");
  if (!li) return;
  toggleIndex(false);
  if (li.dataset.add) return openEditor();
  goTo(+li.dataset.i);
});

// Rename the studio by tapping the brand
$("#brand").addEventListener("click", async () => {
  const name = prompt("Your studio or name (printed on every disc):", studio.name);
  if (name === null) return;
  studio.name = name.trim().slice(0, 30) || defaultStudio.name;
  store.set("studioName", studio.name);
  applyStudioName();
  await rebuild();
});

/* ════════════════════════════════════════════════════════════
   VIDEO PLAYER
   ════════════════════════════════════════════════════════════ */
const modal = $("#modal");
const player = $("#player");
let playerURL = null;
let playingId = null;

function videoEmbed(url) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0&modestbranding=1&playsinline=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `<iframe src="https://player.vimeo.com/video/${vm[1]}?autoplay=1&title=0&byline=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  return `<video src="${esc(url)}" controls autoplay playsinline></video>`;
}
function openProject(i) {
  const p = items[i];
  if (!p) return;
  playingId = p.id;
  $("#modal-title").textContent = p.title;
  modal.classList.toggle("sample", !!p.sample);
  if (p.video instanceof Blob) {
    playerURL = URL.createObjectURL(p.video);
    player.innerHTML = `<video src="${playerURL}" controls autoplay playsinline></video>`;
  } else if (p.video) {
    player.innerHTML = videoEmbed(p.video);
  } else {
    player.innerHTML = `<div class="empty">This is a sample disc.<br>Tap <b>+ Add disc</b> to add your own video from Files or Photos.</div>`;
  }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  const v = player.querySelector("video");
  if (v) v.pause();
  setTimeout(() => {
    if (modal.classList.contains("open")) return;
    player.innerHTML = "";
    if (playerURL) { URL.revokeObjectURL(playerURL); playerURL = null; }
  }, 350);
}
$("#modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
$("#modal-edit").addEventListener("click", () => {
  const rec = records.get(playingId);
  closeModal();
  if (rec) openEditor(rec);
});
$("#modal-delete").addEventListener("click", () => deleteDisc(playingId));

async function deleteDisc(id) {
  const rec = records.get(id);
  if (!rec) return;
  if (!confirm(`Delete “${rec.title}”?\n\nThe disc and its saved copy of the video are removed from this device. The original in your Files app is not touched.`)) return;
  try {
    await library.remove(id);
    closeModal();
    await loadLibrary();
    if (indexEl.classList.contains("open")) showStorage();
    toast("Disc deleted");
  } catch (e) {
    console.warn(e);
    toast("Couldn't delete — please try again");
  }
}

/* ════════════════════════════════════════════════════════════
   ADD / EDIT DISC
   ════════════════════════════════════════════════════════════ */
const editor = $("#editor");
const form = $("#editor-form");
const inVideo = $("#in-video");
const inCover = $("#in-cover");
const coverPreview = $("#cover-preview");
const status = $("#editor-status");
const saveBtn = $("#editor-save");
const f = {
  title: $("#f-title"), location: $("#f-location"), year: $("#f-year"),
  client: $("#f-client"), tools: $("#f-tools"), showTitle: $("#f-showtitle"),
};
let editing = null;       // record being edited (null = new)
let pick = null;          // { videoFile, meta, metaPromise, coverBlob, coverFromFrame }
let previewURL = null;

function setPreview(blob) {
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = blob ? URL.createObjectURL(blob) : null;
  coverPreview.style.backgroundImage = previewURL ? `url("${previewURL}")` : "";
  coverPreview.querySelector("span").style.display = previewURL ? "none" : "";
}

function openEditor(rec = null) {
  editing = rec;
  pick = { videoFile: null, meta: null, metaPromise: null, coverBlob: null, coverFromFrame: false };
  form.reset();
  inVideo.value = "";
  inCover.value = "";
  $("#editor-heading").textContent = rec ? "Edit disc" : "Add a disc";
  saveBtn.textContent = rec ? "Save changes" : "Add disc";
  saveBtn.disabled = false;
  status.textContent = "";
  $("#video-name").textContent = rec ? `${rec.videoName || "Current video"} — tap to replace` : "Choose from Files or Photos";
  $("#cover-name").textContent = rec
    ? (rec.coverAuto ? "Frame from the video — tap the disc to choose an image" : "Your image — tap the disc to change it")
    : "Tap the disc to choose an image — or a frame from the video is used";
  $("#use-frame").hidden = !(rec && !rec.coverAuto);
  f.title.value = rec?.title || "";
  f.location.value = rec?.location || "";
  f.year.value = rec?.year || new Date().getFullYear();
  f.client.value = rec?.client || "";
  f.tools.value = (rec?.tools || []).join(", ");
  f.showTitle.checked = rec ? rec.showTitle !== false : true;
  setPreview(rec?.coverBlob || null);
  editor.classList.add("open");
  editor.setAttribute("aria-hidden", "false");
}
function closeEditor() {
  editor.classList.remove("open");
  editor.setAttribute("aria-hidden", "true");
  setTimeout(() => setPreview(null), 300);
}
$("#add-btn").addEventListener("click", () => openEditor());
$("#editor-cancel").addEventListener("click", closeEditor);
editor.addEventListener("click", (e) => { if (e.target === editor) closeEditor(); });

// Read duration / size and grab a still frame for the default cover
function readVideo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.preload = "auto";
    let done = false;
    const finish = (frame) => {
      if (done) return;
      done = true;
      const out = { duration: v.duration || 0, width: v.videoWidth || 0, height: v.videoHeight || 0, frame };
      v.removeAttribute("src");
      v.load();
      URL.revokeObjectURL(url);
      resolve(out);
    };
    setTimeout(() => finish(null), 10000);
    v.addEventListener("error", () => finish(null));
    v.addEventListener("loadeddata", () => {
      const t = isFinite(v.duration) && v.duration > 0 ? Math.min(v.duration * 0.3, 8) : 0.5;
      v.currentTime = t;
    }, { once: true });
    v.addEventListener("seeked", () => {
      try {
        const w = v.videoWidth, h = v.videoHeight;
        if (!w || !h) return finish(null);
        const k = Math.min(1, 1600 / Math.max(w, h));
        const c = document.createElement("canvas");
        c.width = Math.round(w * k);
        c.height = Math.round(h * k);
        c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => finish(b), "image/jpeg", 0.88);
      } catch (_) { finish(null); }
    }, { once: true });
    v.src = url;
    v.load();
  });
}

// Shrink a picked image so the library stays light
function shrinkImage(file, max = 1600) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => resolve(b || file), "image/jpeg", 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

inVideo.addEventListener("change", async () => {
  const file = inVideo.files[0];
  if (!file) return;
  pick.videoFile = file;
  $("#video-name").textContent = file.name;
  if (!f.title.value.trim()) {
    f.title.value = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 60);
  }
  status.textContent = "Reading video…";
  const reading = (pick.metaPromise = readVideo(file));
  const meta = await reading;
  if (pick.videoFile !== file) return;   // another video was picked meanwhile
  pick.meta = meta;
  status.textContent = pick.meta.duration ? `${fmtTime(pick.meta.duration)} · ${fmtRes(pick.meta.width, pick.meta.height)}` : "";
  const usingOwnCover = pick.coverBlob && !pick.coverFromFrame;
  const hadOwnCover = editing && !editing.coverAuto && !pick.coverFromFrame;
  if (!usingOwnCover && !hadOwnCover && pick.meta.frame) {
    pick.coverBlob = pick.meta.frame;
    pick.coverFromFrame = true;
    setPreview(pick.meta.frame);
    $("#cover-name").textContent = "Frame from the video — tap the disc to choose an image";
  }
});

inCover.addEventListener("change", async () => {
  const file = inCover.files[0];
  if (!file) return;
  const img = await shrinkImage(file);
  if (!img) return toast("That image couldn't be opened — try a JPG or PNG");
  pick.coverBlob = img;
  pick.coverFromFrame = false;
  setPreview(img);
  $("#cover-name").textContent = file.name;
  $("#use-frame").hidden = false;
});

$("#use-frame").addEventListener("click", async () => {
  let frame = pick.meta?.frame;
  if (!frame && editing?.videoBlob) {
    status.textContent = "Grabbing a frame…";
    frame = (await readVideo(editing.videoBlob)).frame;
    status.textContent = "";
  }
  if (!frame) return toast("Choose a video first");
  pick.coverBlob = frame;
  pick.coverFromFrame = true;
  setPreview(frame);
  inCover.value = "";
  $("#cover-name").textContent = "Frame from the video";
  $("#use-frame").hidden = true;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!editing && !pick.videoFile) {
    toast("Choose a video first");
    return;
  }
  const title = f.title.value.trim();
  if (!title) { f.title.focus(); return; }

  saveBtn.disabled = true;
  status.textContent = pick.videoFile && pick.videoFile.size > 200e6
    ? "Saving… large videos take a moment"
    : "Saving…";

  try {
    const rec = editing ? { ...editing } : {
      id: crypto.randomUUID ? crypto.randomUUID() : `d${Date.now()}${Math.random().toString(36).slice(2)}`,
      created: Date.now(),
      coverAuto: true,
    };
    if (pick.videoFile) {
      const meta = pick.meta || await pick.metaPromise || await readVideo(pick.videoFile);
      if (!pick.coverBlob && meta.frame && (!editing || editing.coverAuto)) {
        pick.coverBlob = meta.frame;
        pick.coverFromFrame = true;
      }
      rec.videoBlob = pick.videoFile;
      rec.videoName = pick.videoFile.name;
      rec.duration = meta.duration;
      rec.width = meta.width;
      rec.height = meta.height;
    }
    if (pick.coverBlob) {
      rec.coverBlob = pick.coverBlob;
      rec.coverAuto = pick.coverFromFrame;
    }
    rec.title = title;
    rec.location = f.location.value.trim();
    rec.year = f.year.value.trim();
    rec.client = f.client.value.trim();
    rec.tools = f.tools.value.split(",").map((s) => s.trim()).filter(Boolean);
    rec.showTitle = f.showTitle.checked;

    await library.put(rec);
    keepStorage();
    closeEditor();
    await loadLibrary(rec.id, !editing);
    toast(editing ? "Disc updated" : "Disc added");
  } catch (err) {
    console.warn(err);
    const full = /quota/i.test(err?.name || "") || /quota/i.test(err?.message || "");
    status.textContent = full
      ? "Not enough storage on this device for that video."
      : "Couldn't save — please try again.";
    saveBtn.disabled = false;
  }
});

/* ════════════════════════════════════════════════════════════
   NAVIGATION STATE
   ════════════════════════════════════════════════════════════ */
let pos = 0;          // current (smoothed) position along the line
let targetPos = 0;    // where we're heading
let lastInput = 0;

function offset(i) {
  if (!LOOP) return i - pos;
  return mod(i - pos + N / 2, N) - N / 2;
}
function centerIndex() {
  return LOOP ? mod(Math.round(pos), N) : clamp(Math.round(pos), 0, Math.max(0, N - 1));
}
function goTo(i) {
  const d = LOOP ? mod(i - targetPos + N / 2, N) - N / 2 : i - targetPos;
  targetPos = Math.round(targetPos + d);
  lastInput = 0;
}
const step = (dir) => { targetPos = Math.round(targetPos) + dir; lastInput = 0; };
$("#prev").addEventListener("click", () => step(-1));
$("#next").addEventListener("click", () => step(1));

const overlayOpen = () => editor.classList.contains("open") || modal.classList.contains("open");
window.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea")) return;
  if (e.key === "Escape") { closeModal(); closeEditor(); toggleIndex(false); return; }
  if (overlayOpen()) return;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") step(1);
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") step(-1);
  if (e.key === "Enter") openProject(centerIndex());
});

// Wheel: a mouse-wheel notch moves exactly one disc; trackpads glide smoothly
let wheelLock = 0;
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  const now = performance.now();
  const notch = e.deltaMode !== 0 || Math.abs(delta) >= 50;
  if (notch) {
    if (now > wheelLock) { step(Math.sign(delta)); wheelLock = now + 260; }
    return;
  }
  targetPos += delta * 0.006;
  lastInput = now;
}, { passive: false });

/* ════════════════════════════════════════════════════════════
   POINTER: drag disc → spin, drag empty space → scroll, tap → play
   ════════════════════════════════════════════════════════════ */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let dragging = false, mode = null, active = null;
let downT = 0, lastX = 0, lastY = 0, lastT = 0, moved = 0;

function pick3D(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(hitMeshes, false).find((h) => discs[h.object.userData.disc]?.group.visible);
  return hit ? discs[hit.object.userData.disc] : null;
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  dragging = true;
  moved = 0;
  lastX = e.clientX;
  lastY = e.clientY;
  lastT = performance.now();
  downT = e.timeStamp;
  active = pick3D(e);
  mode = active ? "spin" : "scroll";
  if (active) active.vel.x = active.vel.y = 0;
  canvas.classList.add("grabbing");
});

canvas.addEventListener("pointermove", (e) => {
  if (!dragging) {
    if (!isTouch) canvas.classList.toggle("can-grab", !!pick3D(e));
    return;
  }
  const now = performance.now();
  const dt = Math.max(1, now - lastT) / 1000;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  moved += Math.abs(dx) + Math.abs(dy);
  lastX = e.clientX; lastY = e.clientY; lastT = now;

  if (mode === "spin") {
    const k = 0.011;
    active.spin.rotation.y += dx * k;
    active.spin.rotation.x += dy * k;
    active.vel.y = active.vel.y * 0.5 + (dx * k / dt) * 0.5;
    active.vel.x = active.vel.x * 0.5 + (dy * k / dt) * 0.5;
  } else {
    targetPos -= dx / (window.innerWidth * 0.28);
    lastInput = now;
  }
});

function endDrag(e) {
  if (!dragging) return;
  dragging = false;
  canvas.classList.remove("grabbing");
  const isTap = moved < (isTouch ? 10 : 6) && e.timeStamp - downT < 500;
  if (isTap && active) {
    const d = offset(active.i);
    if (Math.abs(d) < 0.5) openProject(active.i);
    else goTo(active.i);
  }
  if (active && performance.now() - lastT > 80) active.vel.x = active.vel.y = 0;
  active = null;
  mode = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/* ════════════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════════════ */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // pull back on narrow / portrait screens so a disc still fits
  camera.position.z = camera.aspect < 1 ? 12 / Math.max(camera.aspect, 0.45) * 0.68 : 12;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

/* ════════════════════════════════════════════════════════════
   LOOP
   ════════════════════════════════════════════════════════════ */
const clock = new THREE.Clock();
const TAU = Math.PI * 2;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (N) {
    if (!(dragging && mode === "scroll") && performance.now() - lastInput > 160) {
      targetPos += (Math.round(targetPos) - targetPos) * (1 - Math.exp(-dt * 10));
    }
    if (!LOOP) targetPos = clamp(targetPos, -0.3, N - 0.7);
    pos += (targetPos - pos) * (1 - Math.exp(-dt * 6));
    showInfo(centerIndex());
  }

  for (const d of discs) {
    const off = offset(d.i);
    const ad = Math.abs(off);
    const g = d.group;
    g.visible = ad < 4.5;
    d.shadow.visible = g.visible;
    if (!g.visible) continue;

    const bob = Math.sin(t * 0.9 + d.i * 1.7) * 0.07;
    const focus = Math.max(0, 1 - ad);
    g.position.set(off * SPACING_X, off * SPACING_Y - 0.35 + bob, -Math.pow(ad, 1.3) * 0.9 + focus * 0.6);
    g.scale.setScalar(1 + focus * 0.08);
    g.rotation.set(
      -0.32 + Math.sin(t * 0.6 + d.i) * 0.035,
      -0.3 + off * 0.06 + Math.sin(t * 0.45 + d.i * 2.3) * 0.03,
      0.12 + Math.sin(t * 0.5 + d.i * 2) * 0.025
    );

    // spin physics: inertia + spring back to the label side
    if (!(dragging && active === d)) {
      for (const ax of ["x", "y"]) {
        const rot = d.spin.rotation[ax];
        const target = Math.round(rot / TAU) * TAU;
        d.vel[ax] += ((target - rot) * 5 - d.vel[ax] * 2.2) * dt;
        d.spin.rotation[ax] += d.vel[ax] * dt;
      }
    }

    d.shadow.position.set(g.position.x + 0.35, g.position.y - 0.55, g.position.z - 1.6);
    d.shadow.scale.set(g.scale.x * 1.05, g.scale.y * 0.8, 1);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* ════════════════════════════════════════════════════════════
   BOOT
   ════════════════════════════════════════════════════════════ */
(async function init() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 80px "Instrument Serif"'),
        document.fonts.load('500 20px "Inter"'),
        document.fonts.load('600 20px "Inter"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)), // offline: don't wait forever for fonts
    ]);
  } catch (_) { /* fall back to system fonts */ }

  await loadLibrary();
  pos = -2.5;           // intro: discs slide in from the right
  targetPos = 0;
  tick();
  canvas.classList.add("ready");
  $("#loader").classList.add("done");
})();
