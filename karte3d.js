/* ============================================================
   karte3d.js – die 3D-Karte (Oberwelt)

   Eine eigene kleine 3D-Darstellung auf dem Spiel-Canvas, ohne Zusatz-Bibliothek.
   - Jede Ebene ist ein runder Knopf im Boden. Um den Knopf liegt ein Platz,
     auf dem Lumi mit Pfeiltasten / Steuerkreuz frei laufen kann (aber nicht weiter).
   - Ist eine Ebene geschafft, erscheint Stein für Stein ein Pfad zur nächsten Ebene.
   - Läuft Lumi auf den Anfang eines Pfads, wandert sie von selbst bis zum nächsten Knopf.
   - Auf dem Knopf startet SPRUNG / Leertaste / Enter die Ebene.
   Neue Ebenen in levels.js bekommen automatisch einen eigenen Knopf auf der Karte.
   ============================================================ */

const WORLD = {
  plaza: 2.0,         // Radius des Platzes um einen Knopf
  padR: 1.0,          // Radius des Knopfs (darauf stehen = Ebene starten möglich)
  stepGap: 0.42,      // Abstand der Pfadsteine
  walkSpeed: 0.07,    // Tempo, wenn Lumi selbst auf dem Pfad läuft
  freeSpeed: 0.06,    // Tempo auf dem Platz
  revealSecs: 2.6,    // so lange dauert es, bis ein neuer Pfad ganz sichtbar ist
  depth: 26,          // Tiefe des Geländes
  heights: [0.6, 1.7, 1.0, 2.4, 1.6, 3.0],   // Höhe der Plätze, wiederholt sich bei mehr Ebenen
};
const W = {built: false, nodes: [], paths: [], decor: [], flies: [], hm: null, near: null, quads: null, hw: 0, hd: 0, w: 0, d: WORLD.depth};
const WL = {x: 0, z: 0, y: 0, node: 0, mode: 'free', path: -1, dir: 1, s: 0, face: 1, walk: 0, vx: 0, vz: 0};
const WCAM = {x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, init: false};
const PITCH = 0.66, CAM_UP = 7.5, CAM_BACK = 9.5;
let reveal = null, wF = 400, wSin = 0, wCos = 1, worldHint = 0;

const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const nodeOpen = i => i === 0 || (save.done[i - 1] && !(reveal && reveal.path === i - 1));
const pathShown = i => save.done[i] && !!W.paths[i];
const frontier = () => { const i = save.done.findIndex(d => !d); return i < 0 ? LEVELS.length - 1 : i; };

/* ---------- Gelände bauen (einmal) ---------- */
function heightAt(x, z) {
  const fx = clamp(x, 0, W.hw - 1.001), fz = clamp(z, 0, W.hd - 1.001), ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
  const h = (a, b) => W.hm[b * W.hw + a];
  return (h(ix, iz) * (1 - tx) + h(ix + 1, iz) * tx) * (1 - tz) + (h(ix, iz + 1) * (1 - tx) + h(ix + 1, iz + 1) * tx) * tz;
}
function pointAt(p, s) {
  const pts = p.pts; s = clamp(s, 0, p.len);
  let k = 1; while (k < pts.length - 1 && pts[k].s < s) k++;
  const a = pts[k - 1], b = pts[k], t = (s - a.s) / ((b.s - a.s) || 1);
  return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t};
}
function zoneAt(x) {
  const ns = W.nodes;
  if (x <= ns[0].x) return [0, 0];
  for (let k = 0; k < ns.length - 1; k++) if (x < ns[k + 1].x) return [k, smooth(0.3, 0.7, (x - ns[k].x) / (ns[k + 1].x - ns[k].x))];
  return [ns.length - 1, 0];
}
function buildWorld() {
  const n = LEVELS.length;
  W.nodes = LEVELS.map((d, i) => {
    const th = THEMES[d.theme] || THEMES.moss;
    if (!th.rgb) th.rgb = {top: hex2rgb(th.top), stone: hex2rgb(th.stone), light: hex2rgb(th.light), deep: hex2rgb(th.deep), blade: hex2rgb(th.blade), hi: hex2rgb(th.topHi)};
    return {x: 6 + i * 9.5, z: i % 2 ? 16 : 9.5, h: WORLD.heights[i % WORLD.heights.length] + Math.floor(i / WORLD.heights.length) * 0.7, th};
  });
  W.w = W.nodes[n - 1].x + 8; W.hw = Math.ceil(W.w) + 1; W.hd = W.d + 1;

  // Pfade: geschwungene Kurven von Platzrand zu Platzrand
  W.paths = [];
  for (let i = 0; i < n - 1; i++) {
    const a = W.nodes[i], b = W.nodes[i + 1], dx = b.x - a.x, dz = b.z - a.z, len0 = Math.hypot(dx, dz), ux = dx / len0, uz = dz / len0;
    const p0 = {x: a.x + ux * 1.6, z: a.z + uz * 1.6}, p3 = {x: b.x - ux * 1.6, z: b.z - uz * 1.6};
    const bend = i % 2 ? -2.4 : 2.4, px = -uz * bend, pz = ux * bend;
    const p1 = {x: p0.x + dx * 0.3 + px, z: p0.z + dz * 0.3 + pz}, p2 = {x: p3.x - dx * 0.3 + px, z: p3.z - dz * 0.3 + pz};
    const pts = []; let s = 0;
    for (let k = 0; k <= 200; k++) {
      const t = k / 200, m = 1 - t;
      const q = {x: m*m*m*p0.x + 3*m*m*t*p1.x + 3*m*t*t*p2.x + t*t*t*p3.x, z: m*m*m*p0.z + 3*m*m*t*p1.z + 3*m*t*t*p2.z + t*t*t*p3.z};
      if (k) s += Math.hypot(q.x - pts[k - 1].x, q.z - pts[k - 1].z);
      q.s = s; pts.push(q);
    }
    W.paths.push({a: i, b: i + 1, pts, len: s, h0: a.h, h1: b.h, stones: []});
  }

  // Höhenkarte: sanfte Hügel, Felsen hinten, flache Plätze und Pfade
  W.hm = new Float32Array(W.hw * W.hd); W.near = new Float32Array(W.hw * W.hd);
  for (let iz = 0; iz < W.hd; iz++) for (let ix = 0; ix < W.hw; ix++) {
    const x = ix, z = iz;
    let h = 0.8 + 0.55 * Math.sin(x * 0.37 + 1.3) * Math.cos(z * 0.43) + 0.35 * Math.sin(x * 0.9 + z * 0.7) + 0.22 * Math.cos(x * 1.7 - z * 1.3);
    if (z > W.d - 7) h += Math.pow(z - (W.d - 7), 1.5) * 0.75 * (0.75 + 0.5 * hash(ix, 3));
    if (x < 2.5) h += (2.5 - x) * 1.4;
    if (x > W.w - 2.5) h += (x - (W.w - 2.5)) * 1.4;
    if (z < 2) h -= (2 - z) * 1.2;
    let best = 99, bh = 0;
    for (const p of W.paths) for (let k = 0; k < p.pts.length; k += 3) {
      const q = p.pts[k], d = Math.hypot(q.x - x, q.z - z);
      if (d < best) { best = d; bh = p.h0 + (p.h1 - p.h0) * smooth(0, 1, q.s / p.len); }
    }
    W.near[iz * W.hw + ix] = best;
    h += (bh - h) * smooth(2.4, 0.6, best);
    for (const nd of W.nodes) h += (nd.h - h) * smooth(WORLD.plaza + 2.6, WORLD.plaza + 0.3, Math.hypot(nd.x - x, nd.z - z));
    W.hm[iz * W.hw + ix] = h;
  }

  // Pfadsteine
  for (const p of W.paths) {
    p.stones = [];
    for (let s = WORLD.stepGap / 2; s < p.len; s += WORLD.stepGap) {
      const q = pointAt(p, s);
      p.stones.push({x: q.x + (hash(p.stones.length, p.a) - 0.5) * 0.12, z: q.z, y: heightAt(q.x, q.z) + 0.03, born: -999, r: 0.15 + hash(p.a, p.stones.length) * 0.06});
    }
  }

  // Farben der Geländeflächen (mit fester Beleuchtung von links oben)
  const Ld = [-0.45, 0.85, -0.35], ll = Math.hypot(...Ld); Ld[0] /= ll; Ld[1] /= ll; Ld[2] /= ll;
  W.quads = new Float32Array((W.hw - 1) * W.d * 3);
  const H = (x, z) => W.hm[z * W.hw + x];
  for (let iz = 0; iz < W.d; iz++) for (let ix = 0; ix < W.hw - 1; ix++) {
    const h00 = H(ix, iz), h10 = H(ix + 1, iz), h01 = H(ix, iz + 1), h11 = H(ix + 1, iz + 1);
    let nx = ((h00 - h10) + (h01 - h11)) / 2, nz = ((h00 - h01) + (h10 - h11)) / 2, ny = 1;
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const diff = Math.max(0, nx * Ld[0] + ny * Ld[1] + nz * Ld[2]), slope = 1 - ny, cx = ix + 0.5, cz = iz + 0.5;
    const [k, t] = zoneAt(cx);
    const zc = j => {
      const nd = W.nodes[j], c = nd.th.rgb, v = hash(ix, iz);
      let col = lerp3(c.top, c.stone, smooth(0.06, 0.28, slope) * 0.85 + (cz > W.d - 6 ? 0.5 : 0));
      col = lerp3(col, c.light, v * 0.22);
      const dp = Math.hypot(nd.x - cx, nd.z - cz);
      if (dp < WORLD.plaza + 0.4) col = lerp3(col, lerp3(c.light, [200, 190, 170], 0.15), 0.55 * smooth(WORLD.plaza + 0.4, WORLD.plaza - 0.4, dp));
      return col;
    };
    const col = lerp3(zc(k), zc(Math.min(k + 1, n - 1)), t), sh = 0.38 + 0.78 * diff, o = (iz * (W.hw - 1) + ix) * 3;
    W.quads[o] = col[0] * sh; W.quads[o + 1] = col[1] * sh; W.quads[o + 2] = col[2] * sh;
  }

  // Deko: Pilze, Kristalle, Gras, Steine … je nach Gegend
  W.decor = [];
  for (let iz = 2; iz < W.d - 3; iz++) for (let ix = 2; ix < W.hw - 3; ix++) {
    const k = hash(ix * 5 + 11, iz * 3 + 7);
    if (k < 0.74) continue;
    const x = ix + 0.2 + hash(ix, iz + 9) * 0.6, z = iz + 0.2 + hash(ix + 4, iz) * 0.6;
    if (W.near[iz * W.hw + ix] < 1.3) continue;
    if (W.nodes.some(nd => Math.hypot(nd.x - x, nd.z - z) < WORLD.plaza + 0.8)) continue;
    const [zk, zt] = zoneAt(x), nd = W.nodes[zt > 0.5 ? Math.min(zk + 1, n - 1) : zk];
    const type = k > 0.965 && z > 14 ? 'spire' : nd.th.decor[Math.floor(hash(ix * 3, iz * 11) * nd.th.decor.length)];
    W.decor.push({x, z, y: heightAt(x, z), type, k, th: nd.th, big: 1.3 + hash(iz, ix * 2) * 1.2});
  }
  W.flies = Array.from({length: 34}, (_, i) => ({x: 3 + hash(i, 21) * (W.w - 6), z: 3 + hash(21, i) * (W.d - 9), p: hash(i, 5) * 6, c: W.nodes[zoneAt(3 + hash(i, 21) * (W.w - 6))[0]].th.spore}));
  W.built = true;
}

/* ---------- Betreten und Bewegen ---------- */
function enterWorld(node, revealPath = -1, keepMenu = false) {
  if (!W.built) buildWorld();
  node = clamp(node | 0, 0, W.nodes.length - 1);
  reveal = revealPath >= 0 && W.paths[revealPath] ? {path: revealPath, t: -0.3} : null;
  if (!nodeOpen(node)) node = frontier();
  const nd = W.nodes[node];
  Object.assign(WL, {node, mode: 'free', path: -1, x: nd.x, z: nd.z - 0.2, vx: 0, vz: 0, face: 1, walk: 0});
  WL.y = heightAt(WL.x, WL.z);
  if (reveal) for (const st of W.paths[revealPath].stones) st.born = 0;
  WCAM.init = false;
  inLevel = false; state = 'world'; save.at = node; persist();
  document.body.classList.add('in-world');
  if (!keepMenu) closeMenu();
}
function startWalk(path, dir) {
  const p = W.paths[path];
  Object.assign(WL, {mode: 'walk', path, dir, s: dir > 0 ? 0 : p.len});
  sfx.check();
}
function arrive(node, from) {
  const nd = W.nodes[node], dx = from.x - nd.x, dz = from.z - nd.z, d = Math.hypot(dx, dz) || 1;
  Object.assign(WL, {mode: 'free', node, path: -1, x: nd.x + dx / d * 0.7, z: nd.z + dz / d * 0.7, vx: 0, vz: 0, walk: 0});
  save.at = node; persist();
}
function updateWorld() {
  if (!W.built) buildWorld();
  const nd = W.nodes[WL.node];
  if (reveal) {
    // Neuer Pfad erscheint Stein für Stein, die Kamera fährt mit
    reveal.t += 1 / (60 * WORLD.revealSecs);
    const p = W.paths[reveal.path], show = Math.floor(clamp(reveal.t, 0, 1) * p.stones.length);
    for (let k = 0; k < show; k++) if (!p.stones[k].born) {
      p.stones[k].born = tick;
      if (k % 3 === 0) tone('triangle', 420 + k * 14, 620 + k * 14, 0.07, 0.03);
    }
    if (reveal.t >= 1.35) { reveal = null; sfx.secret(); toast('Neuer Weg freigelegt!'); worldHint = 0; }
  } else if (WL.mode === 'free') {
    let ix = (key.right ? 1 : 0) - (key.left ? 1 : 0), iz = (key.up ? 1 : 0) - (key.down ? 1 : 0);
    const l = Math.hypot(ix, iz) || 1; ix /= l; iz /= l;
    WL.vx += (ix * WORLD.freeSpeed - WL.vx) * 0.25; WL.vz += (iz * WORLD.freeSpeed - WL.vz) * 0.25;
    let x = WL.x + WL.vx, z = WL.z + WL.vz;
    const dx = x - nd.x, dz = z - nd.z, d = Math.hypot(dx, dz), R = WORLD.plaza - 0.2;
    if (d > R) { x = nd.x + dx / d * R; z = nd.z + dz / d * R; }   // nicht vom Platz herunter
    WL.x = x; WL.z = z;
    if (Math.abs(WL.vx) > 0.004) WL.face = WL.vx > 0 ? 1 : -1;
    const moving = Math.hypot(WL.vx, WL.vz) > 0.02;
    WL.walk = moving ? WL.walk + 0.25 : 0;
    if (moving) {
      worldHint = 1;
      const out = W.paths[WL.node], inn = W.paths[WL.node - 1];
      if (out && pathShown(WL.node) && Math.hypot(WL.x - out.pts[0].x, WL.z - out.pts[0].z) < 0.5) startWalk(WL.node, 1);
      else if (inn && Math.hypot(WL.x - inn.pts[inn.pts.length - 1].x, WL.z - inn.pts[inn.pts.length - 1].z) < 0.5) startWalk(WL.node - 1, -1);
    }
    const onPad = Math.hypot(WL.x - nd.x, WL.z - nd.z) < WORLD.padR;
    if (onPad && pressed.jump && !key.up && nodeOpen(WL.node)) { initAudio(); startLevel(WL.node); return; }
  } else {
    // Lumi läuft selbst den Pfad entlang
    const p = W.paths[WL.path];
    WL.s += WL.dir * WORLD.walkSpeed;
    if (WL.s >= p.len) arrive(p.b, p.pts[p.pts.length - 1]);
    else if (WL.s <= 0) arrive(p.a, p.pts[0]);
    else {
      const q = pointAt(p, WL.s);
      if (Math.abs(q.x - WL.x) > 0.002) WL.face = q.x > WL.x ? 1 : -1;
      WL.x = q.x; WL.z = q.z; WL.walk += 0.3;
    }
  }
  WL.y = heightAt(WL.x, WL.z);
  let tx = WL.x, tz = WL.z;
  if (reveal) { const p = W.paths[reveal.path], q = pointAt(p, clamp(reveal.t, 0, 1) * p.len); tx = q.x; tz = q.z; }
  const k = WCAM.init ? 0.07 : 1; WCAM.init = true;
  WCAM.tx += (tx - WCAM.tx) * k; WCAM.tz += (tz - WCAM.tz) * k; WCAM.ty += (heightAt(tx, tz) - WCAM.ty) * k;
}

/* ---------- Zeichnen ---------- */
const PV = {x: 0, y: 0, z: 0, s: 0, ok: false};
function wproj(x, y, z, o = PV) {
  const dx = x - WCAM.x, dy = y - WCAM.y, dz = z - WCAM.z;
  const Y = dy * wCos + dz * wSin, Z = -dy * wSin + dz * wCos;
  o.z = Z; o.ok = Z > 0.4;
  if (!o.ok) return o;
  o.s = wF / Z; o.x = VW / 2 + dx * o.s; o.y = VH * 0.56 - Y * o.s;
  return o;
}
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
  const nd = W.nodes[i], open = nodeOpen(i), done = save.done[i], y = nd.h + 0.03;
  const pulse = 0.5 + 0.5 * Math.sin(tick * 0.08);
  drawDisc(nd.x, y - 0.01, nd.z, 1.2, `rgb(${nd.th.rgb.deep.join(',')})`, 28);
  drawDisc(nd.x, y, nd.z, 1.05, '#3b3150', 28);
  const inner = done ? '#7fc46a' : open ? `rgb(255,${165 + pulse * 40 | 0},${60 + pulse * 30 | 0})` : '#2c2540';
  drawDisc(nd.x, y + 0.01, nd.z, 0.82, inner, 28);
  drawDisc(nd.x - 0.12, y + 0.02, nd.z + 0.12, 0.45, done ? 'rgba(220,255,200,.35)' : open ? 'rgba(255,240,190,.45)' : 'rgba(255,255,255,.04)', 18);
  if (!open) return;
  // Lichtsäule über einer offenen, noch nicht geschafften Ebene
  const b = wproj(nd.x, y, nd.z, {}), t = wproj(nd.x, y + 3.4, nd.z, {});
  if (b.ok && t.ok && !done) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, b.y, 0, t.y);
    g.addColorStop(0, `rgba(255,190,90,${0.28 + pulse * 0.1})`); g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(b.x - 0.75 * b.s, b.y); ctx.lineTo(b.x + 0.75 * b.s, b.y); ctx.lineTo(t.x + 0.3 * t.s, t.y); ctx.lineTo(t.x - 0.3 * t.s, t.y); ctx.fill();
    ctx.restore();
  }
  // Nummer schwebt über dem Knopf
  const q = wproj(nd.x, y + 2.0 + Math.sin(tick * 0.05 + i) * 0.08, nd.z, {});
  if (!q.ok) return;
  const r = 0.36 * q.s;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(q.x + r * 0.08, q.y + r * 0.12, r, 0, 7); ctx.fill();
  ctx.fillStyle = done ? '#7fc46a' : '#ffb547'; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = done ? '#c4f2b5' : '#ffe0a0'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.stroke();
  ctx.fillStyle = done ? '#102010' : '#22140a'; ctx.font = `700 ${r * 1.15 | 0}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(done ? '✓' : String(i + 1), q.x, q.y + r * 0.05);
}
function drawStone(st, prev) {
  const age = tick - st.born, k = st.born <= 0 ? 1 : age < 16 ? Math.sin(age / 16 * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1;
  if (k <= 0) return;
  const q = wproj(st.x, st.y, st.z, {});
  if (!q.ok) return;
  if (prev) {
    const a = wproj(prev.x, prev.y, prev.z, {});
    if (a.ok) { ctx.strokeStyle = 'rgba(40,28,22,.45)'; ctx.lineWidth = 0.42 * q.s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
  }
  const rx = st.r * q.s * k, ry = rx * flatness(st.x, st.y, st.z);
  ctx.fillStyle = 'rgba(255,200,110,.18)'; ctx.beginPath(); ctx.ellipse(q.x, q.y, rx * 2.2, ry * 2.2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8d29a'; ctx.beginPath(); ctx.ellipse(q.x, q.y, rx, ry, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff4cf'; ctx.beginPath(); ctx.ellipse(q.x - rx * 0.25, q.y - ry * 0.3, rx * 0.45, ry * 0.4, 0, 0, 7); ctx.fill();
}
function drawSpire(q, th, big) {
  // grosser Tropfstein
  const h = 1.6 * big * q.s, w = 0.32 * big * q.s;
  ctx.fillStyle = th.stone; ctx.beginPath(); ctx.moveTo(q.x - w, q.y); ctx.lineTo(q.x + w * 0.2, q.y - h); ctx.lineTo(q.x + w, q.y); ctx.fill();
  ctx.fillStyle = th.light; ctx.beginPath(); ctx.moveTo(q.x - w, q.y); ctx.lineTo(q.x + w * 0.2, q.y - h); ctx.lineTo(q.x - w * 0.15, q.y); ctx.fill();
  ctx.fillStyle = th.deep; ctx.beginPath(); ctx.ellipse(q.x, q.y, w, w * 0.25, 0, 0, Math.PI); ctx.fill();
}
function drawWorldLumi() {
  const q = wproj(WL.x, WL.y, WL.z, {});
  if (!q.ok) return;
  const f = flatness(WL.x, WL.y, WL.z);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(q.x, q.y, 0.42 * q.s, 0.42 * q.s * f, 0, 0, 7); ctx.fill();
  const bob = WL.walk ? Math.abs(Math.sin(WL.walk)) * 0.06 : 0;
  ctx.save(); ctx.translate(q.x, q.y - bob * q.s); const sc = q.s * 0.03; ctx.scale(sc, sc);
  drawLumi(ctx, 0, 0, {sx: 1, sy: 1, face: WL.face, walk: WL.walk, ground: true, dim: false});
  ctx.restore();
}
function drawWorldBG() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#04030a'); g.addColorStop(1, '#151027');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // hängende Tropfsteine ganz hinten
  ctx.fillStyle = '#0d0a1a';
  const off = -(WCAM.x * 9) % 1200;
  for (const k of [0, 1200]) for (let i = 0; i < 26; i++) {
    const x = i * 48 + hash(i, 77) * 30 + off + k, w = 18 + hash(77, i) * 30, h = 30 + hash(i, 78) * 70;
    if (x > VW + 60 || x < -60) continue;
    ctx.beginPath(); ctx.moveTo(x - w, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x, h); ctx.fill();
  }
}
function renderWorld() {
  ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = true;
  if (!W.built) buildWorld();
  wF = VH * 1.25; wSin = Math.sin(PITCH); wCos = Math.cos(PITCH);
  WCAM.x = WCAM.tx; WCAM.y = WCAM.ty + CAM_UP; WCAM.z = WCAM.tz - CAM_BACK;
  drawWorldBG();

  const zMin = Math.max(0, Math.floor(WCAM.z + 1)), zMax = Math.min(W.d - 1, Math.ceil(WCAM.z + 36));
  // Gitterpunkte projizieren
  const hw = W.hw, PX = renderWorld.px || (renderWorld.px = new Float32Array(hw * W.hd * 3));
  for (let iz = zMin; iz <= zMax + 1; iz++) {
    const span = (iz - WCAM.z) * 0.9 + 4, x0 = Math.max(0, Math.floor(WCAM.x - span)), x1 = Math.min(hw - 1, Math.ceil(WCAM.x + span));
    for (let ix = x0; ix <= x1; ix++) {
      const q = wproj(ix, W.hm[iz * hw + ix], iz), o = (iz * hw + ix) * 3;
      PX[o] = q.x; PX[o + 1] = q.y; PX[o + 2] = q.ok ? q.z : -1;
    }
  }
  // Was steht wo? Gegenstände nach Reihen sortieren, damit Näheres Entfernteres verdeckt
  const rows = [];
  const put = (z, fn, zs = z) => { const r = Math.floor(z); if (r < zMin || r > zMax) return; (rows[r] || (rows[r] = [])).push({zs, fn}); };
  W.nodes.forEach((nd, i) => put(nd.z - 1.25, () => drawPad(i), nd.z));
  W.paths.forEach((p, i) => {
    if (!save.done[i]) return;
    const show = reveal && reveal.path === i ? Math.floor(clamp(reveal.t, 0, 1) * p.stones.length) : p.stones.length;
    for (let k = 0; k < show; k++) { const st = p.stones[k], prev = k ? p.stones[k - 1] : null; put(st.z - 0.25, () => drawStone(st, prev), st.z); }
  });
  for (const d of W.decor) put(d.z, () => {
    const q = wproj(d.x, d.y, d.z, {});
    if (!q.ok) return;
    if (d.type === 'spire') return drawSpire(q, d.th, d.big * 0.5);
    const sc = q.s / 32 * d.big; ctx.save(); ctx.translate(q.x, q.y); ctx.scale(sc, sc); drawDecor(d.type, -16, 0, d.k, d.th); ctx.restore();
  });
  put(WL.z - 1.3, drawWorldLumi, WL.z - 1.31);   // Lumi nach dem Knopf zeichnen, auf dem sie steht
  for (const f of W.flies) {
    const x = f.x + Math.sin(tick * 0.008 + f.p) * 1.2, z = f.z + Math.cos(tick * 0.006 + f.p) * 0.8;
    const y = heightAt(x, z) + 0.9 + Math.sin(tick * 0.03 + f.p * 3) * 0.35;
    put(z, () => {
      const q = wproj(x, y, z, {}); if (!q.ok) return;
      const a = 0.45 + 0.4 * Math.sin(tick * 0.09 + f.p * 5), [r, g, b] = f.c;
      ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.25})`; ctx.beginPath(); ctx.arc(q.x, q.y, 0.18 * q.s, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.8, 0.05 * q.s), 0, 7); ctx.fill();
    }, z);
  }

  // Lichtquellen für die Geländefarben
  const [sr, sg, sb] = skin().rgb, lights = [];
  W.nodes.forEach((nd, i) => { if (nodeOpen(i)) lights.push([nd.x, nd.z, ...(save.done[i] ? [127, 196, 106] : [255, 181, 71])]); });
  for (let iz = zMax; iz >= zMin; iz--) {
    const span = (iz - WCAM.z) * 0.9 + 3, x0 = Math.max(0, Math.floor(WCAM.x - span)), x1 = Math.min(hw - 2, Math.ceil(WCAM.x + span));
    for (let ix = x0; ix <= x1; ix++) {
      const a = (iz * hw + ix) * 3, b = a + 3, c = ((iz + 1) * hw + ix + 1) * 3, d = c - 3;
      if (PX[a + 2] < 0 || PX[b + 2] < 0 || PX[c + 2] < 0 || PX[d + 2] < 0) continue;
      const o = (iz * (hw - 1) + ix) * 3, cx = ix + 0.5, cz = iz + 0.5;
      let r = W.quads[o], g = W.quads[o + 1], bl = W.quads[o + 2];
      const dl = (cx - WL.x) ** 2 + (cz - WL.z) ** 2;
      if (dl < 30) { const gl = (1 - Math.sqrt(dl) / 5.5) ** 2 * 0.5; if (gl > 0) { r += sr * gl; g += sg * gl; bl += sb * gl; } }
      for (const L2 of lights) {
        const dd = (cx - L2[0]) ** 2 + (cz - L2[1]) ** 2;
        if (dd < 16) { const gl = (1 - Math.sqrt(dd) / 4) ** 2 * 0.35; r += L2[2] * gl; g += L2[3] * gl; bl += L2[4] * gl; }
      }
      const fz = (PX[a + 2] + PX[c + 2]) / 2, fog = smooth(12, 30, fz);
      r = r * (1 - fog) + 14 * fog; g = g * (1 - fog) + 10 * fog; bl = bl * (1 - fog) + 28 * fog;
      const col = `rgb(${Math.min(255, r) | 0},${Math.min(255, g) | 0},${Math.min(255, bl) | 0})`;
      ctx.beginPath(); ctx.moveTo(PX[a], PX[a + 1]); ctx.lineTo(PX[b], PX[b + 1]); ctx.lineTo(PX[c], PX[c + 1]); ctx.lineTo(PX[d], PX[d + 1]); ctx.closePath();
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.fill(); ctx.stroke();
    }
    const list = rows[iz];
    if (list) { list.sort((p, q) => q.zs - p.zs); for (const it of list) it.fn(); }
  }

  // Leuchten um Lumi und dunkler Rand
  const q = wproj(WL.x, WL.y + 0.4, WL.z, {});
  if (q.ok) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 3 * q.s);
    gr.addColorStop(0, `rgba(${sr},${sg},${sb},.22)`); gr.addColorStop(1, `rgba(${sr},${sg},${sb},0)`);
    ctx.fillStyle = gr; ctx.fillRect(q.x - 3 * q.s, q.y - 3 * q.s, 6 * q.s, 6 * q.s); ctx.restore();
  }
  const vg = ctx.createRadialGradient(VW / 2, VH * 0.55, VH * 0.35, VW / 2, VH * 0.55, VW * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  drawWorldHud();
}
function drawWorldHud() {
  const g = ctx.createLinearGradient(0, 0, 0, 46); g.addColorStop(0, 'rgba(6,4,14,.85)'); g.addColorStop(1, 'rgba(6,4,14,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 46);
  small('Karte', 14, 18, 16, '#ffffff', 'left');
  let got = 0, all = 0;
  LEVELS.forEach((d, i) => { all += d.total; got += save.best[i] ? save.best[i].lan : 0; });
  drawLantern(null, ctx, VW - 150, 19, 0.6);
  small(`${got}/${all}`, VW - 140, 18, 16, '#ffe2a3', 'left');
  if (NET.room) small(`Gruppe ${NET.room} · ${Object.keys(NET.peers).length} dabei`, 14, 38, 13, '#cdaeff', 'left');
  if (menuOpen) return;
  const touchOn = !document.body.classList.contains('no-touch');
  const nd = W.nodes[WL.node], d = LEVELS[WL.node], best = save.best[WL.node];
  const onPad = !reveal && WL.mode === 'free' && Math.hypot(WL.x - nd.x, WL.z - nd.z) < WORLD.padR;
  if (onPad && nodeOpen(WL.node)) {
    ctx.fillStyle = 'rgba(8,5,16,.78)'; ctx.fillRect(VW / 2 - 175, 50, 350, 76);
    ctx.fillStyle = save.done[WL.node] ? '#7fc46a' : '#ffb547'; ctx.fillRect(VW / 2 - 175, 50, 350, 3);
    text(`${WL.node + 1} · ${d.name}`, VW / 2, 72, 22, save.done[WL.node] ? '#a8f597' : '#ffb547');
    small(best ? `Bestzeit ${fmt(best.time)} · Laternen ${best.lan}/${d.total}` : `${d.total} Laternen warten auf dich`, VW / 2, 95, 14, '#d6cbff');
    small(`${touchOn ? 'SPRUNG' : 'Leertaste'} zum Starten`, VW / 2, 114, 14, '#ffffff');
  } else if (!reveal && WL.mode === 'free' && !worldHint) {
    small(touchOn ? 'Mit dem Steuerkreuz läufst du über den Platz' : 'Mit den Pfeiltasten läufst du über den Platz', VW / 2, 66, 15, '#d6cbff');
  }
  if (!reveal && WL.mode === 'free' && !onPad && pathShown(WL.node) && worldHint)
    small('Lauf auf den Pfad, dann geht Lumi von selbst weiter', VW / 2, VH - 22, 14, 'rgba(236,229,247,.75)');
  if (toastT > 0) {
    ctx.globalAlpha = Math.min(1, toastT / 30);
    ctx.font = `500 17px ${BODY}`; const tw = Math.max(260, ctx.measureText(toastMsg).width + 36);
    ctx.fillStyle = 'rgba(8,5,16,.8)'; ctx.fillRect(VW / 2 - tw / 2, 134, tw, 34);
    small(toastMsg, VW / 2, 151, 17, '#cdaeff');
    ctx.globalAlpha = 1;
  }
}
