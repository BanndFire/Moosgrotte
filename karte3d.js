/* ============================================================
   karte3d.js – die 3D-Karte (Oberwelt)

   Eigene kleine 3D-Darstellung auf dem Spiel-Canvas, ohne Zusatz-Bibliothek.
   - Ebenen mit gleicher Welt-Nummer (world in levels.js) bilden eine Welt.
     Die Kamera zeigt immer die ganze Welt auf einmal.
   - Die Ebenen liegen frei verteilt (WORLD.layouts), die Pfade schlängeln sich hin und her.
     Die Welt füllt das ganze Bild: Hügel, Wälder und Berge rundherum.
   - Jede Ebene ist ein runder Knopf im Boden. Um den Knopf liegt ein Platz,
     auf dem die Figur frei laufen kann (aber nicht weiter).
   - Ist eine Ebene geschafft, erscheint der Pfad zur nächsten Ebene.
     Auf dem Pfad läuft die Figur von selbst.
   - Von der letzten Ebene einer Welt führt eine Rutsche hinunter in die nächste Welt.
   - Auf dem Knopf startet SPRUNG / Leertaste / Enter die Ebene.
   ============================================================ */

const WORLD = {
  names: {1: 'Sonnenland', 2: 'Moosgrotte'},   // Namen der Welten (oben links)
  // Lage der Ebenen pro Welt: [nach rechts, nach hinten]. Gibt es mehr Ebenen als Punkte, wird automatisch verteilt.
  layouts: {
    1: [[1, 1], [5.5, 2.2], [9, 0.6], [13.5, 2.5], [11, 6], [6.5, 5.6], [2, 7.5], [5, 11.4], [9.8, 11], [14.5, 8.8], [18.5, 11], [22, 13.8]],
    2: [[1, 2], [5.5, 0.8], [8.5, 4], [4.5, 6.5], [8, 9.5], [12.5, 8]],
  },
  spreadX: 1.45,      // Abstand der Ebenen nach rechts (grösser = weiter auseinander)
  spreadZ: 0.9,       // Abstand der Ebenen nach hinten
  plaza: 1.45,        // Radius des Platzes um einen Knopf
  padR: 0.85,         // Radius des Knopfs (darauf stehen = Ebene starten möglich)
  stepGap: 0.34,      // Abstand der Pfadsteine
  walkSpeed: 0.05,    // Tempo, wenn die Figur selbst auf dem Pfad läuft
  freeSpeed: 0.04,    // Tempo auf dem Platz
  slideSpeed: 0.3,    // Höchsttempo auf der Rutsche
  revealSecs: 2.0,    // so lange dauert es, bis ein neuer Pfad ganz sichtbar ist
  cell: 0.7,          // Grösse der Geländekacheln
  figure: 1.6,        // Grösse der Figur auf der Karte
  pitch: 0.95,        // Blickwinkel der Kamera (grösser = mehr von oben)
};

const WORLDS = [], NODES = [], PATHS = [];
let W = null, mapBuilt = false;
const WL = {x: 0, z: 0, y: 0, node: 0, mode: 'free', path: -1, dir: 1, s: 0, part: 'A', v: 0, face: 1, walk: 0, vx: 0, vz: 0, fade: 0, fadeDir: 0};
const WCAM = {x: 0, y: 0, z: 0};
let reveal = null, wF = 400, wSin = 0, wCos = 1, worldHint = 0;
const mapCache = document.createElement('canvas'), mapCtx = mapCache.getContext('2d');
let mapCacheKey = '';

const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const nodeOpen = i => i === 0 || (save.done[i - 1] && !(reveal && reveal.path === i - 1));
const pathShown = i => save.done[i] && !!PATHS[i];
const frontier = () => { const i = save.done.findIndex(d => !d); return i < 0 ? LEVELS.length - 1 : i; };
// Abstand für die Farbe der Gegend: Burgen färben nur ihre nächste Umgebung
const zoneDist = (n, x, z) => { const d = Math.hypot(n.x - x, n.z - z); return n.th.brick ? (d < 4.5 ? d + 1.5 : 1e9) : d; };
const rgbOf = th => th.rgb || (th.rgb = {top: hex2rgb(th.top), stone: hex2rgb(th.stone), light: hex2rgb(th.light), deep: hex2rgb(th.deep), blade: hex2rgb(th.blade)});

/* ---------- Welten, Ebenen-Knöpfe und Wege anlegen (einmal) ---------- */
function buildMap() {
  const ids = [...new Set(LEVELS.map(d => d.world || 1))];
  for (const id of ids) WORLDS.push({id, levels: LEVELS.map((d, i) => (d.world || 1) === id ? i : -1).filter(i => i >= 0)});
  for (const w of WORLDS) {
    const n = w.levels.length, cols = n > 8 ? 4 : n > 4 ? 3 : n, lay = WORLD.layouts[w.id];
    w.levels.forEach((li, k) => {
      const th = THEMES[LEVELS[li].theme] || THEMES.moss;
      let x, z;
      if (lay && lay.length === n) { x = lay[k][0] * WORLD.spreadX; z = lay[k][1] * WORLD.spreadZ; }
      else { const r = Math.floor(k / cols), c = r % 2 ? cols - 1 - k % cols : k % cols; x = c * 5.5 + (hash(li, 3) - 0.5) * 2; z = r * 5 + (hash(3, li) - 0.5) * 2; }
      rgbOf(th);
      NODES[li] = {world: w, th, sky: !!th.sky, boss: LEVELS[li].boss, x, z, h: 0.5 + hash(li, 9) * 0.9 + z * 0.04};
    });
    const ns = w.levels.map(i => NODES[i]);
    w.minx = Math.min(...ns.map(n => n.x)); w.maxx = Math.max(...ns.map(n => n.x));
    w.minz = Math.min(...ns.map(n => n.z)); w.maxz = Math.max(...ns.map(n => n.z));
    w.sky = ns.filter(n => n.sky).length * 2 >= ns.length;
  }
  for (let i = 0; i < LEVELS.length - 1; i++) PATHS[i] = makePath(i);
  // Burgen suchen sich neben ihrem Knopf einen Platz, wo kein Pfad und keine andere Ebene ist
  for (const nd of NODES) if (nd.boss) {
    const near = PATHS.filter(p => p.type === 'walk' && p.world === nd.world).flatMap(p => p.pts), others = NODES.filter(n => n !== nd && n.world === nd.world);
    const p0 = PATHS.find(p => p.type === 'slide' && (NODES[p.a] === nd)); if (p0) near.push(p0.hole, ...p0.A.pts);
    let best = null, bv = -1;
    for (const [ox, oz] of [[0, 2.5], [1.7, 2.3], [-1.7, 2.3], [2.7, 1.2], [-2.7, 1.2]]) {   // nur hinter oder neben dem Knopf
      const cx = nd.x + ox, cz = nd.z + oz;
      const v = Math.min(...near.map(q => Math.hypot(q.x - cx, q.z - cz)), ...others.map(n => Math.hypot(n.x - cx, n.z - cz) - 2.2)) + (oz > 2 ? 0.4 : 0);
      if (v > bv) { bv = v; best = {x: cx, z: cz}; }
    }
    nd.castle = best;
  }
  for (const w of WORLDS) buildTerrain(w);
  mapBuilt = true;
}
function cubic(p0, p1, p2, p3, steps) {
  const pts = []; let s = 0;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, m = 1 - t, q = {};
    for (const a of ['x', 'y', 'z']) if (p0[a] !== undefined) q[a] = m*m*m*p0[a] + 3*m*m*t*p1[a] + 3*m*t*t*p2[a] + t*t*t*p3[a];
    if (k) s += Math.hypot(q.x - pts[k - 1].x, (q.y || 0) - (pts[k - 1].y || 0), q.z - pts[k - 1].z);
    q.s = s; pts.push(q);
  }
  return {pts, len: s};
}
function makePath(i) {
  const a = NODES[i], b = NODES[i + 1], E = WORLD.plaza - 0.2;
  if (a.world === b.world) {
    // normaler Weg: Platzrand zu Platzrand, leicht geschwungen
    const dx = b.x - a.x, dz = b.z - a.z, L0 = Math.hypot(dx, dz), ux = dx / L0, uz = dz / L0;
    const p0 = {x: a.x + ux * E, z: a.z + uz * E}, p3 = {x: b.x - ux * E, z: b.z - uz * E};
    // zufällige Bögen: mal ein grosser Bogen, mal eine S-Kurve
    const b1 = (hash(i, 17) - 0.5) * 3.4, b2 = (hash(17, i) - 0.5) * 3.4;
    const c = cubic(p0, {x: p0.x + dx * 0.3 - uz * b1, z: p0.z + dz * 0.3 + ux * b1}, {x: p3.x - dx * 0.3 - uz * b2, z: p3.z - dz * 0.3 + ux * b2}, p3, 120);
    return {a: i, b: i + 1, type: 'walk', world: a.world, ...c, stones: []};
  }
  // Rutsche: von der letzten Ebene einer Welt in ein Loch im Boden, in der nächsten Welt aus einem Tunnel heraus
  const hole = {x: a.x + 4.2, z: a.z - 0.8}, hx = hole.x - a.x, hz = hole.z - a.z, hl = Math.hypot(hx, hz);
  const sa = {x: a.x + hx / hl * E, y: a.h + 0.3, z: a.z + hz / hl * E};
  const A = cubic(sa, {x: sa.x + hx / hl * 1.2, y: sa.y + 0.9, z: sa.z + hz / hl * 1.2}, {x: hole.x - hx / hl * 1.0, y: a.h + 0.6, z: hole.z - hz / hl * 1.0}, {x: hole.x, y: a.h - 1.8, z: hole.z}, 90);
  const mouth = {x: b.x - 4.4, z: b.z + 1.8, y: b.h + 3.0}, mx = b.x - mouth.x, mz = b.z - mouth.z, ml = Math.hypot(mx, mz);
  const eb = {x: b.x - mx / ml * E, y: b.h + 0.3, z: b.z - mz / ml * E};
  const B = cubic({x: mouth.x, y: mouth.y + 0.4, z: mouth.z}, {x: mouth.x + mx / ml * 1.5, y: mouth.y - 0.2, z: mouth.z + mz / ml * 1.5}, {x: eb.x - mx / ml * 1.2, y: eb.y + 0.6, z: eb.z - mz / ml * 1.2}, eb, 90);
  return {a: i, b: i + 1, type: 'slide', hole: {...hole, y: a.h}, mouth, A: {...A, world: a.world}, B: {...B, world: b.world}};
}
function pointAt(p, s) {
  const pts = p.pts; s = clamp(s, 0, p.len);
  let k = 1; while (k < pts.length - 1 && pts[k].s < s) k++;
  const a = pts[k - 1], b = pts[k], t = (s - a.s) / ((b.s - a.s) || 1);
  return {x: a.x + (b.x - a.x) * t, y: a.y === undefined ? undefined : a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t};
}
function heightAt(x, z, w = W) {
  const cs = WORLD.cell, fx = clamp((x - w.x0) / cs, 0, w.nx - 1.001), fz = clamp((z - w.z0) / cs, 0, w.nz - 1.001), ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
  const h = (a, b) => w.hm[b * w.nx + a];
  return (h(ix, iz) * (1 - tx) + h(ix + 1, iz) * tx) * (1 - tz) + (h(ix, iz + 1) * (1 - tx) + h(ix + 1, iz + 1) * tx) * tz;
}
function buildTerrain(w) {
  const cs = WORLD.cell, ns = w.levels.map(i => NODES[i]);
  w.x0 = w.minx - 24; w.z0 = w.minz - 16;
  w.nx = Math.ceil((w.maxx + 24 - w.x0) / cs) + 1; w.nz = Math.ceil((w.maxz + 20 - w.z0) / cs) + 1;
  const walks = PATHS.filter(p => p.type === 'walk' && p.world === w);
  const slideOut = PATHS.find(p => p.type === 'slide' && p.A.world === w), slideIn = PATHS.find(p => p.type === 'slide' && p.B.world === w);
  w.hm = new Float32Array(w.nx * w.nz); w.near = new Float32Array(w.nx * w.nz);
  for (let iz = 0; iz < w.nz; iz++) for (let ix = 0; ix < w.nx; ix++) {
    const x = w.x0 + ix * cs, z = w.z0 + iz * cs;
    let h = 0.5 + 0.45 * Math.sin(x * 0.45 + 1.3) * Math.cos(z * 0.5) + 0.3 * Math.sin(x * 1.1 + z * 0.8) + 0.18 * Math.cos(x * 1.9 - z * 1.4);
    // rundherum Hügel und hinten Berge, damit die Welt das ganze Bild füllt
    if (z > w.maxz + 4) h += Math.pow(z - (w.maxz + 4), 1.45) * 0.8 * (0.8 + 0.4 * Math.sin(x * 0.35 + hash(ix, 3)));
    if (x < w.minx - 6) h += Math.pow(w.minx - 6 - x, 1.2) * 0.3;
    if (x > w.maxx + 6) h += Math.pow(x - (w.maxx + 6), 1.2) * 0.3;
    if (slideOut) { const d = Math.hypot(x - slideOut.hole.x, z - slideOut.hole.z); h += (slideOut.hole.y - h) * smooth(3.2, 1.2, d) - smooth(1.3, 0, d) * 0.5; }   // Mulde um das Loch
    if (slideIn) { const d = Math.hypot(x - slideIn.mouth.x, z - slideIn.mouth.z); h += (slideIn.mouth.y - 0.6 - h) * smooth(4.2, 1.2, d); }                        // Felshügel mit Tunnel
    let best = 99, bh = 0;
    for (const p of walks) for (let k = 0; k < p.pts.length; k += 3) {
      const q = p.pts[k], d = Math.hypot(q.x - x, q.z - z);
      if (d < best) { best = d; bh = NODES[p.a].h + (NODES[p.b].h - NODES[p.a].h) * smooth(0, 1, q.s / p.len); }
    }
    w.near[iz * w.nx + ix] = best;
    h += (bh - h) * smooth(1.8, 0.4, best);
    for (const nd of ns) h += (nd.h - h) * smooth(WORLD.plaza + 2.2, WORLD.plaza + 0.2, Math.hypot(nd.x - x, nd.z - z));
    w.hm[iz * w.nx + ix] = h;
  }
  // Pfadsteine
  for (const p of walks) {
    p.stones = [];
    for (let s = WORLD.stepGap / 2; s < p.len; s += WORLD.stepGap) {
      const q = pointAt(p, s);
      p.stones.push({x: q.x + (hash(p.stones.length, p.a) - 0.5) * 0.08, z: q.z, y: heightAt(q.x, q.z, w) + 0.03, born: -999, r: 0.11 + hash(p.a, p.stones.length) * 0.04});
    }
  }
  // Deko (wird zusammen mit dem Gelände einmal gemalt)
  w.decor = [];
  const avoid = (x, z) => ns.some(nd => Math.hypot(nd.x - x, nd.z - z) < WORLD.plaza + 0.7 || (nd.castle && Math.hypot(nd.castle.x - x, nd.castle.z - z) < 2.3))
    || [slideOut && slideOut.A, slideIn && slideIn.B].some(sp => sp && sp.pts.some(q => Math.hypot(q.x - x, q.z - z) < 1.3))
    || (slideIn && Math.hypot(slideIn.mouth.x - x, slideIn.mouth.z - z) < 2.6);
  for (let iz = 2; iz < w.nz - 4; iz++) for (let ix = 2; ix < w.nx - 3; ix++) {
    const k = hash(ix * 5 + 11, iz * 3 + 7);
    if (k < 0.76) continue;
    const x = w.x0 + (ix + 0.2 + hash(ix, iz + 9) * 0.6) * cs, z = w.z0 + (iz + 0.2 + hash(ix + 4, iz) * 0.6) * cs;
    if (w.near[iz * w.nx + ix] < 0.9 || avoid(x, z)) continue;
    let nd = ns[0], bd = 1e9; for (const n of ns) { const d = zoneDist(n, x, z); if (d < bd) { bd = d; nd = n; } }
    const type = !w.sky && k > 0.95 ? 'spire' : w.sky && !nd.th.brick && (k > 0.95 || (k > 0.88 && bd > 7)) ? 'tree' : nd.th.decor[Math.floor(hash(ix * 3, iz * 11) * nd.th.decor.length)];
    w.decor.push({x, z, y: heightAt(x, z, w), type, k, th: nd.th, big: 0.9 + hash(iz, ix * 2) * 0.6});
  }
  w.flies = Array.from({length: w.sky ? 14 : 30}, (_, i) => ({x: w.minx - 3 + hash(i, 21) * (w.maxx - w.minx + 6), z: w.minz - 2 + hash(21, i) * (w.maxz - w.minz + 4), p: hash(i, 5) * 6}));
}

/* ---------- Kamera: die ganze Welt passt ins Bild ---------- */
const PV = {x: 0, y: 0, z: 0, s: 0, ok: false};
function wproj(x, y, z, o = PV) {
  const dx = x - WCAM.x, dy = y - WCAM.y, dz = z - WCAM.z;
  const Y = dy * wCos + dz * wSin, Z = -dy * wSin + dz * wCos;
  o.z = Z; o.ok = Z > 0.4;
  if (!o.ok) return o;
  o.s = wF / Z; o.x = VW / 2 + dx * o.s; o.y = VH * 0.54 - Y * o.s;
  return o;
}
function fitCamera(w) {
  wF = VH * 1.25; wSin = Math.sin(WORLD.pitch); wCos = Math.cos(WORLD.pitch);
  const ns = w.levels.map(i => NODES[i]), cx = (w.minx + w.maxx) / 2, cz = (w.minz + w.maxz) / 2 + 0.4, cy = ns.reduce((a, n) => a + n.h, 0) / ns.length;
  const R = WORLD.plaza + 0.3, bottom = document.body.classList.contains('no-touch') ? VH - 18 : VH * 0.8;   // unten Platz für die Steuerung
  for (let D = 6; D < 90; D += 0.5) {
    WCAM.x = cx; WCAM.y = cy + wSin * D; WCAM.z = cz - wCos * D;
    const fits = ns.every(n => [[n.x - R, n.h, n.z - R], [n.x + R, n.h, n.z - R], [n.x - R, n.h + 1.6, n.z + R], [n.x + R, n.h + 1.6, n.z + R]].every(([x, y, z]) => {
      const q = wproj(x, y, z); return q.ok && q.x > 22 && q.x < VW - 22 && q.y > 62 && q.y < bottom;
    }));
    if (fits) return;
  }
}

/* ---------- Betreten und Bewegen ---------- */
function enterWorld(node, revealPath = -1, keepMenu = false) {
  if (!mapBuilt) buildMap();
  node = clamp(node | 0, 0, LEVELS.length - 1);
  reveal = revealPath >= 0 && PATHS[revealPath] ? {path: revealPath, t: -0.3} : null;
  if (!nodeOpen(node)) node = frontier();
  const nd = NODES[node];
  W = nd.world;
  Object.assign(WL, {node, mode: 'free', path: -1, x: nd.x, z: nd.z - 0.2, vx: 0, vz: 0, face: 1, walk: 0, fade: 0, fadeDir: 0});
  WL.y = heightAt(WL.x, WL.z);
  if (reveal && PATHS[revealPath].stones) for (const st of PATHS[revealPath].stones) st.born = 0;
  inLevel = false; state = 'world'; save.at = node; persist();
  document.body.classList.add('in-world');
  if (!keepMenu) closeMenu();
}
function startWalk(path, dir) {
  const p = PATHS[path];
  if (p.type === 'slide') Object.assign(WL, {mode: 'slide', path, dir, part: dir > 0 ? 'A' : 'B', s: dir > 0 ? 0 : p.B.len, v: dir > 0 ? 0.04 : 0.05});
  else Object.assign(WL, {mode: 'walk', path, dir, s: dir > 0 ? 0 : p.len});
  sfx.check();
}
function arrive(node, from) {
  const nd = NODES[node], dx = from.x - nd.x, dz = from.z - nd.z, d = Math.hypot(dx, dz) || 1;
  Object.assign(WL, {mode: 'free', node, path: -1, x: nd.x + dx / d * 0.55, z: nd.z + dz / d * 0.55, vx: 0, vz: 0, walk: 0});
  save.at = node; persist();
}
function pathStart(i) { const p = PATHS[i]; return p.type === 'slide' ? p.A.pts[0] : p.pts[0]; }
function pathEnd(i) { const p = PATHS[i]; const pts = p.type === 'slide' ? p.B.pts : p.pts; return pts[pts.length - 1]; }
function updateWorld() {
  if (!mapBuilt) buildMap();
  const nd = NODES[WL.node];
  if (WL.fadeDir) {   // Überblendung beim Wechsel der Welt
    WL.fade = clamp(WL.fade + WL.fadeDir * 0.06, 0, 1);
    if (WL.fade >= 1 && WL.fadeDir > 0) {
      const p = PATHS[WL.path];
      W = WL.dir > 0 ? p.B.world : p.A.world; WL.part = WL.dir > 0 ? 'B' : 'A';
      WL.s = WL.dir > 0 ? 0 : p.A.len; WL.fadeDir = -1; mapCacheKey = '';
    } else if (WL.fade <= 0 && WL.fadeDir < 0) WL.fadeDir = 0;
  }
  if (reveal) {
    reveal.t += 1 / (60 * WORLD.revealSecs);
    const p = PATHS[reveal.path];
    if (p.stones) {
      const show = Math.floor(clamp(reveal.t, 0, 1) * p.stones.length);
      for (let k = 0; k < show; k++) if (!p.stones[k].born) { p.stones[k].born = tick; if (k % 3 === 0) tone('triangle', 420 + k * 14, 620 + k * 14, 0.07, 0.03); }
    } else if (tick % 8 === 0 && reveal.t > 0 && reveal.t < 1) tone('triangle', 300 + reveal.t * 500, 400 + reveal.t * 500, 0.06, 0.03);
    if (reveal.t >= 1.3) { sfx.secret(); toast(p.type === 'slide' ? 'Eine Rutsche ist erschienen!' : 'Neuer Weg freigelegt!'); reveal = null; worldHint = 0; }
  } else if (WL.mode === 'free') {
    let ix = (key.right ? 1 : 0) - (key.left ? 1 : 0), iz = (key.up ? 1 : 0) - (key.down ? 1 : 0);
    const l = Math.hypot(ix, iz) || 1; ix /= l; iz /= l;
    WL.vx += (ix * WORLD.freeSpeed - WL.vx) * 0.25; WL.vz += (iz * WORLD.freeSpeed - WL.vz) * 0.25;
    let x = WL.x + WL.vx, z = WL.z + WL.vz;
    const dx = x - nd.x, dz = z - nd.z, d = Math.hypot(dx, dz), R = WORLD.plaza - 0.15;
    if (d > R) { x = nd.x + dx / d * R; z = nd.z + dz / d * R; }   // nicht vom Platz herunter
    WL.x = x; WL.z = z;
    if (Math.abs(WL.vx) > 0.003) WL.face = WL.vx > 0 ? 1 : -1;
    const moving = Math.hypot(WL.vx, WL.vz) > 0.015;
    WL.walk = moving ? WL.walk + 0.25 : 0;
    if (moving) {
      worldHint = 1;
      const o = PATHS[WL.node] && pathShown(WL.node) ? pathStart(WL.node) : null, n = PATHS[WL.node - 1] ? pathEnd(WL.node - 1) : null;
      if (o && Math.hypot(WL.x - o.x, WL.z - o.z) < 0.4) startWalk(WL.node, 1);
      else if (n && Math.hypot(WL.x - n.x, WL.z - n.z) < 0.4) startWalk(WL.node - 1, -1);
    }
    const onPad = Math.hypot(WL.x - nd.x, WL.z - nd.z) < WORLD.padR;
    if (onPad && pressed.jump && !key.up && nodeOpen(WL.node)) { initAudio(); startLevel(WL.node); return; }
  } else if (WL.mode === 'walk') {
    const p = PATHS[WL.path];
    WL.s += WL.dir * WORLD.walkSpeed;
    if (WL.s >= p.len) arrive(p.b, p.pts[p.pts.length - 1]);
    else if (WL.s <= 0) arrive(p.a, p.pts[0]);
    else { const q = pointAt(p, WL.s); if (Math.abs(q.x - WL.x) > 0.002) WL.face = q.x > WL.x ? 1 : -1; WL.x = q.x; WL.z = q.z; WL.walk += 0.3; }
  } else if (WL.mode === 'slide') {
    // Rutsche: runter wird es schnell, hinauf geht es gemütlich
    const p = PATHS[WL.path], part = WL.part === 'A' ? p.A : p.B;
    if (WL.fadeDir <= 0 || WL.fade < 1) {
      WL.v = WL.dir > 0 ? Math.min(WORLD.slideSpeed, WL.v + 0.006) : 0.05;
      WL.s += WL.dir * WL.v;
      const q = pointAt(part, WL.s);
      if (Math.abs(q.x - WL.x) > 0.002) WL.face = q.x > WL.x ? 1 : -1;
      WL.x = q.x; WL.z = q.z; WL.y = q.y; WL.walk = WL.dir > 0 ? 0 : WL.walk + 0.3;
      if (WL.dir > 0 && WL.part === 'A' && WL.s >= part.len && !WL.fadeDir) { WL.fadeDir = 1; tone('sine', 700, 200, 0.6, 0.06); }
      if (WL.dir < 0 && WL.part === 'B' && WL.s <= 0 && !WL.fadeDir) WL.fadeDir = 1;
      if (WL.dir > 0 && WL.part === 'B' && WL.s >= part.len) arrive(p.b, part.pts[part.pts.length - 1]);
      if (WL.dir < 0 && WL.part === 'A' && WL.s <= 0) arrive(p.a, part.pts[0]);
    }
    return;
  }
  WL.y = heightAt(WL.x, WL.z);
}

/* ---------- Zeichnen ---------- */
function flatness(x, y, z) { const dy = WCAM.y - y, dh = Math.hypot(z - WCAM.z, x - WCAM.x); return dy / Math.hypot(dy, dh); }
function drawDisc(x, y, z, r, fill, seg = 22) {
  ctx.beginPath();
  for (let j = 0; j < seg; j++) {
    const a = j / seg * Math.PI * 2, q = wproj(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
    if (!q.ok) return;
    j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function drawPad(i) {
  const nd = NODES[i], open = nodeOpen(i), done = save.done[i], y = nd.h + 0.03, R = WORLD.padR;
  const pulse = 0.5 + 0.5 * Math.sin(tick * 0.08);
  drawDisc(nd.x, y - 0.01, nd.z, R * 1.4, `rgb(${nd.th.rgb.deep.join(',')})`, 26);
  drawDisc(nd.x, y, nd.z, R * 1.24, '#3b3150', 26);
  drawDisc(nd.x, y + 0.01, nd.z, R, done ? '#7fc46a' : open ? `rgb(255,${165 + pulse * 40 | 0},${60 + pulse * 30 | 0})` : '#2c2540', 26);
  drawDisc(nd.x - 0.1, y + 0.02, nd.z + 0.1, R * 0.55, done ? 'rgba(220,255,200,.35)' : open ? 'rgba(255,240,190,.45)' : 'rgba(255,255,255,.04)', 16);
  if (!open) return;
  const b = wproj(nd.x, y, nd.z, {}), t = wproj(nd.x, y + 2.6, nd.z, {});
  if (b.ok && t.ok && !done) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, b.y, 0, t.y);
    g.addColorStop(0, `rgba(255,190,90,${0.28 + pulse * 0.1})`); g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(b.x - 0.6 * b.s, b.y); ctx.lineTo(b.x + 0.6 * b.s, b.y); ctx.lineTo(t.x + 0.25 * t.s, t.y); ctx.lineTo(t.x - 0.25 * t.s, t.y); ctx.fill();
    ctx.restore();
  }
  const q = wproj(nd.x, y + 2.1 + Math.sin(tick * 0.05 + i) * 0.06, nd.z, {});
  if (!q.ok) return;
  const r = Math.max(9, 0.42 * q.s);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(q.x + 1, q.y + 1.5, r, 0, 7); ctx.fill();
  ctx.fillStyle = done ? '#7fc46a' : '#ffb547'; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = done ? '#c4f2b5' : '#ffe0a0'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.stroke();
  ctx.fillStyle = done ? '#102010' : '#22140a'; ctx.font = `700 ${r * 1.1 | 0}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(i + 1), q.x, q.y + r * 0.05);
}
function drawStone(st, prev) {
  const age = tick - st.born, k = st.born <= 0 ? 1 : age < 16 ? Math.sin(age / 16 * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1;
  if (k <= 0) return;
  const q = wproj(st.x, st.y, st.z, {});
  if (!q.ok) return;
  if (prev) {
    const a = wproj(prev.x, prev.y, prev.z, {});
    if (a.ok) { ctx.strokeStyle = 'rgba(40,28,22,.4)'; ctx.lineWidth = 0.34 * q.s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
  }
  const rx = st.r * q.s * k, ry = rx * flatness(st.x, st.y, st.z);
  ctx.fillStyle = 'rgba(255,200,110,.18)'; ctx.beginPath(); ctx.ellipse(q.x, q.y, rx * 2.1, ry * 2.1, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8d29a'; ctx.beginPath(); ctx.ellipse(q.x, q.y, rx, ry, 0, 0, 7); ctx.fill();
}
function drawSlideSeg(a, b) {
  // ein Stück Rutsche: Rinne mit hellen Rändern und Stützen bis zum Boden
  const nx = -(b.z - a.z), nz = b.x - a.x, nl = Math.hypot(nx, nz) || 1, wd = 0.32;
  const ox = nx / nl * wd, oz = nz / nl * wd;
  const p1 = wproj(a.x + ox, a.y, a.z + oz, {}), p2 = wproj(b.x + ox, b.y, b.z + oz, {}), p3 = wproj(b.x - ox, b.y, b.z - oz, {}), p4 = wproj(a.x - ox, a.y, a.z - oz, {});
  if (!p1.ok || !p2.ok || !p3.ok || !p4.ok) return;
  const gy = a.y - heightAt(a.x, a.z);
  if (gy > 0.4 && Math.floor(a.s / 1.4) !== Math.floor(b.s / 1.4)) {
    const top = wproj(a.x, a.y, a.z, {}), bot = wproj(a.x, a.y - Math.min(gy, 14), a.z, {});
    if (top.ok && bot.ok) { ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = Math.max(1.5, 0.1 * top.s); ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke(); }
  }
  ctx.fillStyle = '#e0503a'; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = Math.max(1.2, 0.08 * p1.s);
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.moveTo(p4.x, p4.y); ctx.lineTo(p3.x, p3.y); ctx.stroke();
}
function drawCastle(nd) {
  const q = wproj(nd.castle.x, heightAt(nd.castle.x, nd.castle.z), nd.castle.z, {});
  if (!q.ok) return;
  const th = nd.th, u = q.s, big = nd.boss === 'big' ? 1.2 : 1, w = 2.6 * u * big, h = 1.1 * u * big, tw = 0.7 * u * big, tH = 1.9 * u * big;
  ctx.fillStyle = th.stone; ctx.fillRect(q.x - w / 2, q.y - h, w, h);
  for (let x = -w / 2; x < w / 2 - 0.15 * u; x += 0.36 * u) ctx.fillRect(q.x + x, q.y - h - 0.18 * u, 0.2 * u, 0.18 * u);
  for (const sx of [-1, 1]) {
    const x = q.x + sx * (w / 2) - tw / 2;
    ctx.fillStyle = th.light; ctx.fillRect(x, q.y - tH, tw, tH);
    ctx.fillStyle = th.roof || '#b04a4a'; ctx.beginPath(); ctx.moveTo(x - 0.1 * u, q.y - tH); ctx.lineTo(x + tw / 2, q.y - tH - 0.8 * u * big); ctx.lineTo(x + tw + 0.1 * u, q.y - tH); ctx.fill();
  }
  ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.moveTo(q.x - 0.35 * u, q.y); ctx.lineTo(q.x - 0.35 * u, q.y - 0.55 * u); ctx.arc(q.x, q.y - 0.55 * u, 0.35 * u, Math.PI, 0); ctx.lineTo(q.x + 0.35 * u, q.y); ctx.fill();
  ctx.fillStyle = '#6b5a4a'; ctx.fillRect(q.x - 0.025 * u, q.y - h - 1.1 * u, 0.05 * u, 0.95 * u);
  ctx.fillStyle = th.roof || '#c0392b'; ctx.beginPath(); ctx.moveTo(q.x, q.y - h - 1.1 * u); ctx.lineTo(q.x + 0.55 * u, q.y - h - 0.98 * u); ctx.lineTo(q.x, q.y - h - 0.82 * u); ctx.fill();
}
function drawHole(h) {
  // dunkles Loch im Boden, in dem die Rutsche verschwindet
  const y = heightAt(h.x, h.z) + 0.02;
  drawDisc(h.x, y, h.z, 1.25, '#6b5a4a', 26);
  drawDisc(h.x, y + 0.01, h.z, 1.0, '#140c08', 26);
  drawDisc(h.x, y + 0.02, h.z + 0.2, 0.75, '#050302', 22);
}
function drawMouth(m, th) {
  // Tunnelausgang im Felshügel, aus dem die Rutsche kommt
  const q = wproj(m.x, m.y - 0.6, m.z + 0.4, {});
  if (!q.ok) return;
  const u = q.s;
  ctx.fillStyle = th.stone; ctx.beginPath(); ctx.ellipse(q.x, q.y, 1.6 * u, 1.3 * u, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = th.light; ctx.beginPath(); ctx.ellipse(q.x - 0.5 * u, q.y - 0.2 * u, 0.9 * u, 0.9 * u, 0, Math.PI, Math.PI * 1.5); ctx.lineTo(q.x - 0.5 * u, q.y); ctx.fill();
  ctx.fillStyle = '#07040c'; ctx.beginPath(); ctx.ellipse(q.x, q.y, 0.75 * u, 0.85 * u, 0, Math.PI, 0); ctx.fill();
}
function drawSpire(q, th, big) {
  const h = 1.3 * big * q.s, w = 0.26 * big * q.s;
  ctx.fillStyle = th.stone; ctx.beginPath(); ctx.moveTo(q.x - w, q.y); ctx.lineTo(q.x + w * 0.2, q.y - h); ctx.lineTo(q.x + w, q.y); ctx.fill();
  ctx.fillStyle = th.light; ctx.beginPath(); ctx.moveTo(q.x - w, q.y); ctx.lineTo(q.x + w * 0.2, q.y - h); ctx.lineTo(q.x - w * 0.15, q.y); ctx.fill();
}
function drawWorldLumi() {
  const q = wproj(WL.x, WL.y, WL.z, {});
  if (!q.ok) return;
  if (WL.mode !== 'slide') { const f = flatness(WL.x, WL.y, WL.z); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(q.x, q.y, 0.36 * q.s, 0.36 * q.s * f, 0, 0, 7); ctx.fill(); }
  const bob = WL.walk ? Math.abs(Math.sin(WL.walk)) * 0.05 : 0;
  ctx.save(); ctx.translate(q.x, q.y - bob * q.s); const sc = q.s * 0.03 * WORLD.figure; ctx.scale(sc, sc);
  drawLumi(ctx, 0, 0, {sx: WL.mode === 'slide' ? 1.15 : 1, sy: WL.mode === 'slide' ? 0.85 : 1, face: WL.face, walk: WL.walk, ground: true, dim: false});
  ctx.restore();
}

/* Gelände, Himmel und Deko ändern sich nicht: einmal malen und als Bild merken */
function renderStatic() {
  ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = true;
  const w = W, cs = WORLD.cell, sky = w.sky;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  if (sky) { g.addColorStop(0, '#b9d9e6'); g.addColorStop(1, '#cfe6ea'); } else { g.addColorStop(0, '#1a1430'); g.addColorStop(1, '#241c3c'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // Gitterpunkte projizieren
  const PX = new Float32Array(w.nx * w.nz * 3);
  for (let iz = 0; iz < w.nz; iz++) for (let ix = 0; ix < w.nx; ix++) {
    const q = wproj(w.x0 + ix * cs, w.hm[iz * w.nx + ix], w.z0 + iz * cs), o = (iz * w.nx + ix) * 3;
    PX[o] = q.x; PX[o + 1] = q.y; PX[o + 2] = q.ok ? q.z : -1;
  }
  const ns = w.levels.map(i => NODES[i]), Ld = [-0.45, 0.85, -0.35], ll = Math.hypot(...Ld);
  const fogC = sky ? [190, 218, 226] : [36, 28, 60], zc = (PX[((w.nz >> 1) * w.nx + (w.nx >> 1)) * 3 + 2]) || 20;
  const rows = [];
  for (const d of w.decor) { const r = Math.floor((d.z - w.z0) / cs); (rows[r] || (rows[r] = [])).push(d); }
  for (const nd of ns) if (nd.castle) { const r = Math.floor((nd.castle.z - w.z0) / cs); (rows[r] || (rows[r] = [])).push({castle: nd, z: nd.castle.z}); }
  for (const p of PATHS) if (p.type === 'slide') {
    if (p.A.world === w) { const r = Math.floor((p.hole.z - 1 - w.z0) / cs); (rows[r] || (rows[r] = [])).push({hole: p.hole, z: p.hole.z - 1}); }
    if (p.B.world === w) { const r = Math.floor((p.mouth.z - w.z0) / cs); (rows[r] || (rows[r] = [])).push({mouth: p.mouth, th: NODES[p.b].th, z: p.mouth.z}); }
  }
  for (let iz = w.nz - 2; iz >= 0; iz--) {
    for (let ix = 0; ix < w.nx - 1; ix++) {
      const a = (iz * w.nx + ix) * 3, b = a + 3, c = ((iz + 1) * w.nx + ix + 1) * 3, d = c - 3;
      if (PX[a + 2] < 0 || PX[b + 2] < 0 || PX[c + 2] < 0 || PX[d + 2] < 0) continue;
      const H = (x, z) => w.hm[z * w.nx + x], h00 = H(ix, iz), h10 = H(ix + 1, iz), h01 = H(ix, iz + 1), h11 = H(ix + 1, iz + 1);
      let nx = ((h00 - h10) + (h01 - h11)) / 2 / cs, nz = ((h00 - h01) + (h10 - h11)) / 2 / cs, ny = 1;
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      const diff = Math.max(0, (nx * Ld[0] + ny * Ld[1] + nz * Ld[2]) / ll), slope = 1 - ny;
      const cx = w.x0 + (ix + 0.5) * cs, cz = w.z0 + (iz + 0.5) * cs;
      let n1 = ns[0], n2 = ns[0], d1 = 1e9, d2 = 1e9;
      for (const n of ns) { const dd = zoneDist(n, cx, cz); if (dd < d1) { d2 = d1; n2 = n1; d1 = dd; n1 = n; } else if (dd < d2) { d2 = dd; n2 = n; } }
      const zcol = n => {
        const t = n.th.rgb, v = hash(ix, iz);
        let col = lerp3(t.top, t.stone, smooth(0.08, 0.32, slope) * 0.85 + (cz > w.maxz + 3 ? 0.55 : 0));
        if (sky && cz > w.maxz + 2.5) col = lerp3(col, [104, 150, 128], 0.85 * smooth(w.maxz + 2.5, w.maxz + 5, cz));   // ferne Hügel
        col = lerp3(col, t.light, v * 0.2);
        const dp = Math.hypot(n.x - cx, n.z - cz);
        if (dp < WORLD.plaza + 0.3) col = lerp3(col, lerp3(t.light, [200, 190, 170], 0.15), 0.55 * smooth(WORLD.plaza + 0.3, WORLD.plaza - 0.3, dp));
        return col;
      };
      let col = lerp3(zcol(n1), zcol(n2), 0.5 * (1 - smooth(0, sky ? 2.5 : 5, d2 - d1)));
      const sh = 0.4 + 0.75 * diff, fog = smooth(zc * 1.1, zc * 2.2, (PX[a + 2] + PX[c + 2]) / 2) * (sky ? 0.7 : 1);
      col = lerp3([col[0] * sh, col[1] * sh, col[2] * sh], fogC, fog);
      const css = `rgb(${Math.min(255, col[0]) | 0},${Math.min(255, col[1]) | 0},${Math.min(255, col[2]) | 0})`;
      ctx.beginPath(); ctx.moveTo(PX[a], PX[a + 1]); ctx.lineTo(PX[b], PX[b + 1]); ctx.lineTo(PX[c], PX[c + 1]); ctx.lineTo(PX[d], PX[d + 1]); ctx.closePath();
      ctx.fillStyle = css; ctx.strokeStyle = css; ctx.lineWidth = 0.7; ctx.fill(); ctx.stroke();
    }
    const list = rows[iz];
    if (list) for (const it of list.sort((p, q) => q.z - p.z)) {
      if (it.castle) { drawCastle(it.castle); continue; }
      if (it.hole) { drawHole(it.hole); continue; }
      if (it.mouth) { drawMouth(it.mouth, it.th); continue; }
      const q = wproj(it.x, it.y, it.z, {});
      if (!q.ok) continue;
      if (it.type === 'spire') { drawSpire(q, it.th, it.big); continue; }
      const sc = q.s / 32 * it.big * (it.type === 'tree' ? 0.75 : 0.85);
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(sc, sc); drawDecor(it.type, -16, 0, it.k, it.th); ctx.restore();
    }
  }
  const vg = ctx.createRadialGradient(VW / 2, VH * 0.55, VH * 0.4, VW / 2, VH * 0.55, VW * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${sky ? 0.15 : 0.35})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  mapCache.width = cv.width; mapCache.height = cv.height;
  mapCtx.setTransform(1, 0, 0, 1, 0, 0); mapCtx.drawImage(cv, 0, 0);
}
function renderWorld() {
  if (!mapBuilt) buildMap();
  const key = `${W.id}|${VW}|${VH}|${cv.width}|${cv.height}|${document.body.classList.contains('no-touch')}`;
  if (key !== mapCacheKey) { fitCamera(W); renderStatic(); mapCacheKey = key; }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(mapCache, 0, 0);
  ctx.setTransform(S, 0, 0, S, 0, 0);
  const sky = W.sky, [sr, sg, sb] = skin().rgb;
  // Licht der offenen Knöpfe und um die Figur (vor allem in der Höhle)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, z, r, c, a) => { const q = wproj(x, y, z, {}); if (!q.ok) return; const R = r * q.s, g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, R);
    g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.fillRect(q.x - R, q.y - R, R * 2, R * 2); };
  for (const i of W.levels) if (nodeOpen(i)) glow(NODES[i].x, NODES[i].h, NODES[i].z, 2.6, save.done[i] ? '127,196,106' : '255,181,71', sky ? 0.12 : 0.3);
  glow(WL.x, WL.y + 0.3, WL.z, 3, `${sr},${sg},${sb}`, sky ? 0.1 : 0.3);
  ctx.restore();
  // bewegliche Dinge von hinten nach vorne
  const items = [];
  for (const i of W.levels) items.push({z: NODES[i].z + 0.9, fn: () => drawPad(i)});
  for (let i = 0; i < PATHS.length; i++) {
    const p = PATHS[i];
    if (!save.done[i]) continue;
    const part = reveal && reveal.path === i ? clamp(reveal.t, 0, 1) : 1;
    if (p.type === 'walk' && p.world === W) {
      const show = Math.floor(part * p.stones.length);
      for (let k = 0; k < show; k++) { const st = p.stones[k], prev = k ? p.stones[k - 1] : null; items.push({z: st.z + 0.2, fn: () => drawStone(st, prev)}); }
    } else if (p.type === 'slide') {
      for (const sp of [p.A, p.B]) {
        if (sp.world !== W) continue;
        const pts = sp.pts, upto = sp === p.A ? Math.floor(part * (pts.length - 1)) : pts.length - 1;
        for (let k = 0; k < upto; k++) { const a = pts[k], b = pts[k + 1]; items.push({z: (a.z + b.z) / 2 + 0.3, fn: () => drawSlideSeg(a, b)}); }
      }
    }
  }
  items.push({z: WL.z - 0.05, fn: drawWorldLumi});
  for (const f of W.flies) {
    const x = f.x + Math.sin(tick * 0.008 + f.p) * 0.8, z = f.z + Math.cos(tick * 0.006 + f.p) * 0.6, y = heightAt(x, z) + 0.7 + Math.sin(tick * 0.03 + f.p * 3) * 0.3;
    items.push({z, fn: () => {
      const q = wproj(x, y, z, {}); if (!q.ok) return;
      const a = 0.45 + 0.4 * Math.sin(tick * 0.09 + f.p * 5), c = sky ? '255,255,230' : '180,240,160';
      ctx.fillStyle = `rgba(${c},${a * 0.25})`; ctx.beginPath(); ctx.arc(q.x, q.y, 0.16 * q.s, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(${c},${a})`; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.8, 0.045 * q.s), 0, 7); ctx.fill();
    }});
  }
  items.sort((p, q) => q.z - p.z);
  for (const it of items) it.fn();
  drawWorldHud();
  if (WL.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${WL.fade})`; ctx.fillRect(0, 0, VW, VH); }
}
function drawWorldHud() {
  const sky = W.sky;
  const g = ctx.createLinearGradient(0, 0, 0, 46); g.addColorStop(0, 'rgba(6,4,14,.85)'); g.addColorStop(1, 'rgba(6,4,14,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 46);
  small(`Welt ${W.id} · ${WORLD.names[W.id] || ''}`, 14, 18, 16, '#ffffff', 'left');
  if (NET.room) small(`Gruppe ${NET.room} · ${Object.keys(NET.peers).length} dabei`, 14, 38, 13, '#cdaeff', 'left');
  if (menuOpen) return;
  const touchOn = !document.body.classList.contains('no-touch');
  const nd = NODES[WL.node], d = LEVELS[WL.node], best = save.best[WL.node];
  const onPad = !reveal && WL.mode === 'free' && Math.hypot(WL.x - nd.x, WL.z - nd.z) < WORLD.padR;
  if (onPad && nodeOpen(WL.node)) {
    // kleine Karte oben in der Leiste, damit die Ebenen frei bleiben
    const cw = 310, cx = Math.max(VW / 2, 196 + cw / 2), done = save.done[WL.node];
    ctx.fillStyle = 'rgba(8,5,16,.85)'; ctx.fillRect(cx - cw / 2, 4, cw, 50);
    ctx.fillStyle = done ? '#7fc46a' : '#ffb547'; ctx.fillRect(cx - cw / 2, 52, cw, 2);
    small(`${WL.node + 1} · ${d.name}` + (d.boss ? (d.boss === 'big' ? ' · Endboss' : ' · Zwischenboss') : ''), cx, 17, 16, done ? '#a8f597' : '#ffb547');
    small((best ? `Bestzeit ${fmt(best.time)} · Funken ${best.sparks || 0}` : 'Noch nicht geschafft') +
      ` · ${touchOn ? 'SPRUNG' : 'Leertaste'}: Los!`, cx, 38, 12.5, '#e6def5');
  } else if (!reveal && WL.mode === 'free' && !worldHint) {
    small(touchOn ? 'Mit dem Steuerkreuz läufst du über den Platz' : 'Mit den Pfeiltasten läufst du über den Platz', VW / 2, 66, 15, sky ? '#ffffff' : '#d6cbff');
  }
  if (!reveal && WL.mode === 'free' && !onPad && pathShown(WL.node) && worldHint)
    small(PATHS[WL.node].type === 'slide' ? `Lauf zur Rutsche, dann rutscht ${heroName()} hinunter` : `Lauf auf den Pfad, dann geht ${heroName()} von selbst weiter`,
      VW / 2, VH - 22, 14, sky ? 'rgba(20,30,40,.85)' : 'rgba(236,229,247,.75)');
  if (toastT > 0) {
    ctx.globalAlpha = Math.min(1, toastT / 30);
    ctx.font = `500 17px ${BODY}`; const tw = Math.max(260, ctx.measureText(toastMsg).width + 36);
    ctx.fillStyle = 'rgba(8,5,16,.8)'; ctx.fillRect(VW / 2 - tw / 2, 134, tw, 34);
    small(toastMsg, VW / 2, 151, 17, '#cdaeff');
    ctx.globalAlpha = 1;
  }
}
