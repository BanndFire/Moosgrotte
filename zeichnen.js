/* ============================================================
   zeichnen.js – Zeichnet eine Ebene: Hintergrund, Felsen, Deko, Lumi, Gegner, Licht und Anzeige oben
   ============================================================ */

/* ---------- Zeichnen ---------- */
function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
const BG = [0.15, 0.4].map((f, n) => {
  const items = []; let x = 0, i = 0;
  while (x < 1600) { const w = 30 + hash(i, n) * 70, h = 40 + hash(n, i) * (n ? 120 : 160);
    items.push({x, w, h, up: hash(i * 3, n + 9) > 0.45}); x += w * (0.6 + hash(i + 50, n) * 0.9); i++; }
  return {f, items};
});
const SPORES = Array.from({length: 60}, (_, i) => ({x: hash(i, 1) * 1301, y: hash(1, i) * 997, s: 0.2 + hash(i, 7) * 0.5, p: hash(i, 3) * 6}));

function drawBG() {
  const th = L.theme, g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  BG.forEach((layer, n) => {
    ctx.fillStyle = th.lay[n];
    const off = -((cam.x * layer.f) % 1600), oy = -cam.y * layer.f * 0.3;
    for (const k of [0, 1600]) for (const it of layer.items) {
      const x = it.x + off + k; if (x > VW || x + it.w < 0) continue;
      ctx.beginPath();
      if (it.up) { ctx.moveTo(x, oy - 40); ctx.lineTo(x + it.w, oy - 40); ctx.lineTo(x + it.w * 0.5, oy + it.h); }
      else { ctx.moveTo(x, VH); ctx.lineTo(x + it.w, VH); ctx.lineTo(x + it.w * 0.5, VH - it.h * 0.8); }
      ctx.fill();
    }
  });
  const [sr, sg, sb] = th.spore;
  for (const s of SPORES) {
    const x = ((s.x - cam.x * s.s) % VW + VW) % VW, y = ((s.y - tick * s.s * 0.4) % VH + VH) % VH;
    ctx.fillStyle = `rgba(${sr},${sg},${sb},${0.25 + 0.25 * Math.sin(tick * 0.05 + s.p)})`;
    ctx.fillRect(x, y, 2, 2);
  }
}

const isRock = (c, r) => { const ch = tileAt(c, r); return ch === '#' || ch === 'F'; };  // Scheinfels sieht aus wie Fels
function drawFake(back) {
  const c1 = Math.max(0, Math.floor(cam.x / T) - 1), c2 = Math.min(L.w - 1, Math.floor((cam.x + VW) / T) + 1);
  const r1 = Math.max(0, Math.floor(cam.y / T) - 1), r2 = Math.min(LH - 1, Math.floor((cam.y + VH) / T) + 1);
  const room = mix(L.theme.deep, '#000000', .4);
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
    if (L.tiles[r][c] !== 'F') continue;
    if (back) { ctx.fillStyle = room; ctx.fillRect(c * T, r * T, T, T); continue; }
    const a = L.fmap.get(r * L.w + c).alpha;
    if (a < 0.02) continue;
    ctx.globalAlpha = a; drawRock(c, r, c * T, r * T); ctx.globalAlpha = 1;
  }
}
const solidish = (c, r) => c < 0 || c >= L.w || isRock(c, r) || tileAt(c, r) === 'X';
function depth(c, r) { let d = 0; while (d < 3 && isRock(c, r - d - 1)) d++; return d; }

function drawDecor(type, x, y, k, th = L.theme) {
  if (type === 'tuft') {
    ctx.fillStyle = th.blade; ctx.fillRect(x + 12, y - 9, 2, 9); ctx.fillRect(x + 15, y - 12, 2, 12); ctx.fillRect(x + 18, y - 8, 2, 8);
    ctx.fillStyle = th.topHi; ctx.fillRect(x + 15, y - 12, 2, 3);
  } else if (type === 'mush') {
    ctx.fillStyle = '#e8dcc8'; ctx.fillRect(x + 14, y - 7, 3, 7);
    ctx.fillStyle = th.mush; ctx.beginPath(); ctx.ellipse(x + 15.5, y - 7, 6, 4.5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff3'; ctx.fillRect(x + 12, y - 10, 2, 2); ctx.fillRect(x + 17, y - 9, 2, 2);
    ctx.fillStyle = '#e8dcc8'; ctx.fillRect(x + 23, y - 4, 2, 4);
    ctx.fillStyle = th.mush; ctx.beginPath(); ctx.ellipse(x + 24, y - 4, 3.5, 2.5, 0, Math.PI, 0); ctx.fill();
  } else if (type === 'pebble') {
    ctx.fillStyle = th.light; ctx.beginPath(); ctx.ellipse(x + 10 + k * 10, y - 2, 5, 3, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 18 + k * 6, y - 1.5, 3, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = mix(th.light, '#ffffff', .25); ctx.fillRect(x + 8 + k * 10, y - 4, 2, 1);
  } else if (type === 'flower') {
    ctx.fillStyle = th.blade; ctx.fillRect(x + 20, y - 9, 1.5, 9);
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(x + 18, y - 12, 6, 3); ctx.fillRect(x + 19.5, y - 13.5, 3, 6);
    ctx.fillStyle = '#ff9a3c'; ctx.fillRect(x + 20, y - 11.5, 2, 2);
  } else if (type === 'root') {
    ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(x + 3, y + 1); ctx.quadraticCurveTo(x + 12, y - 10, x + 22, y + 1); ctx.stroke();
    ctx.strokeStyle = '#7a5232'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(x + 14, y + 1); ctx.quadraticCurveTo(x + 22, y - 6, x + 29, y + 1); ctx.stroke();
  } else if (type === 'crystal') {
    for (let i = 0; i < 3; i++) {
      const bx = x + 8 + i * 6, h = 8 + ((k * 10 + i * 5) % 9);
      ctx.fillStyle = th.topHi; ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + 3, y - h); ctx.lineTo(bx + 6, y); ctx.fill();
      ctx.fillStyle = th.blade; ctx.beginPath(); ctx.moveTo(bx + 3, y - h); ctx.lineTo(bx + 6, y); ctx.lineTo(bx + 3, y); ctx.fill();
    }
  } else if (type === 'bigmush') {
    ctx.fillStyle = '#e8dcc8'; ctx.fillRect(x + 13, y - 15, 5, 15);
    ctx.fillStyle = th.mush; ctx.beginPath(); ctx.ellipse(x + 15.5, y - 15, 12, 8, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = mix(th.mush, '#000000', .35); ctx.fillRect(x + 4, y - 15, 23, 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x + 9, y - 20, 3, 3); ctx.fillRect(x + 17, y - 22, 3, 3); ctx.fillRect(x + 22, y - 18, 2, 2);
  } else if (type === 'ember') {
    const glow = 0.6 + 0.4 * Math.sin(tick * 0.08 + k * 9);
    ctx.fillStyle = '#2a1512'; ctx.beginPath(); ctx.ellipse(x + 16, y - 3, 9, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,${120 + glow * 60 | 0},50,${glow})`;
    ctx.fillRect(x + 11, y - 4, 4, 1.5); ctx.fillRect(x + 15, y - 6, 1.5, 3); ctx.fillRect(x + 17, y - 3, 5, 1.5);
  }
}
function drawRock(c, r, x, y) {
  const th = L.theme, d = depth(c, r), h1 = hash(c, r), h2 = hash(r + 31, c), h3 = hash(c + 17, r * 3);
  ctx.fillStyle = th.shades[d]; ctx.fillRect(x, y, T, T);
  if (d > 0) { ctx.fillStyle = th.speck; ctx.fillRect(x, y + 6 + (h1 * 20 | 0), T, 1); }
  ctx.fillStyle = d < 2 ? th.light : th.speck;
  ctx.beginPath(); ctx.ellipse(x + 6 + h2 * 20, y + 9 + h3 * 15, 2.5 + h1 * 3.5, 2 + h2 * 2, 0, 0, 7); ctx.fill();
  if (h3 > 0.55) { ctx.fillStyle = th.speck; ctx.beginPath(); ctx.ellipse(x + 4 + h3 * 22, y + 4 + h1 * 22, 2 + h3 * 2, 1.5 + h1 * 1.5, 0, 0, 7); ctx.fill(); }
  if (h1 > 0.78) {
    ctx.strokeStyle = th.speck; ctx.lineWidth = 1; ctx.beginPath();
    const cx = x + 6 + h2 * 20; ctx.moveTo(cx, y + 3); ctx.lineTo(cx + 4, y + 12); ctx.lineTo(cx - 2, y + 22); ctx.stroke();
  }
  if (d > 0 && h2 > 0.82) {
    if (th.id === 'crystal') { ctx.fillStyle = '#5f8fd6'; ctx.beginPath(); ctx.moveTo(x + 10, y + 24); ctx.lineTo(x + 14, y + 12); ctx.lineTo(x + 18, y + 24); ctx.fill(); }
    else if (th.id === 'roots') { ctx.strokeStyle = '#4a2e1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.quadraticCurveTo(x + 16, y + 6, x + T, y + 18); ctx.stroke(); }
    else { ctx.strokeStyle = th.light; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x + 16, y + 16, 5, 0, 4.5); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 16, y + 16, 2.2, 0, 4.5); ctx.stroke(); }
  }
  if (!solidish(c - 1, r)) { ctx.fillStyle = th.light; ctx.fillRect(x, y, 2, T); }
  if (!solidish(c + 1, r)) { ctx.fillStyle = th.deep; ctx.fillRect(x + T - 2, y, 2, T); }
  if (r + 1 < LH && !solidish(c, r + 1)) {
    ctx.fillStyle = th.deep; ctx.fillRect(x, y + T - 3, T, 3);
    const hv = hash(c + 5, r + 9);
    if (hv > 0.45) {
      const rx = x + 4 + (hash(r, c + 2) * 22 | 0), len = 6 + (hv * 26 | 0);
      if (th.id === 'crystal') { ctx.fillStyle = th.hang; ctx.beginPath(); ctx.moveTo(rx - 3, y + T); ctx.lineTo(rx + 1, y + T + len * 0.6); ctx.lineTo(rx + 5, y + T); ctx.fill(); }
      else { ctx.fillStyle = th.hang; ctx.fillRect(rx, y + T, 2, len); ctx.fillRect(rx - 2, y + T + len * 0.4, 2, 2); ctx.fillRect(rx + 2, y + T + len * 0.75, 2, 2); }
    }
    if (hash(c * 3, r + 1) > 0.6) { ctx.fillStyle = th.deep; ctx.beginPath(); const sx = x + 20; ctx.moveTo(sx - 4, y + T); ctx.lineTo(sx, y + T + 7); ctx.lineTo(sx + 4, y + T); ctx.fill(); }
  }
  if (d === 0) {
    ctx.fillStyle = th.top; ctx.fillRect(x, y, T, 7);
    for (let i = 0; i < 4; i++) { const hh = hash(c * 4 + i, r); ctx.fillRect(x + i * 8 + (hh * 3 | 0), y + 7, 5, 1 + (hh * 4 | 0)); }
    ctx.fillStyle = th.topHi; ctx.fillRect(x, y, T, 2);
    ctx.fillStyle = th.blade;
    for (let i = 0; i < 6; i++) { const hh = hash(c * 6 + i, r + 5); const bh = 2 + (hh * 5 | 0); ctx.fillRect(x + 1 + i * 5 + (hh * 3 | 0), y - bh, 2, bh); }
    if (r >= 2 && !solidish(c, r - 1) && !L.occupied.has((r - 1) * L.w + c)) {
      const k = hash(c * 7 + 1, r * 3 + 2);
      if (k > 0.6) drawDecor(th.decor[(hash(c, r * 5) * th.decor.length) | 0], x, y, k);
    }
  }
}
function drawPlank(c, r, x, y) {
  const th = L.theme;
  if (th.id === 'crystal') {
    ctx.fillStyle = 'rgba(120,190,255,.55)'; ctx.fillRect(x, y, T, 8);
    ctx.fillStyle = th.plankHi; ctx.fillRect(x, y, T, 2);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + (hash(c, r) * 22 | 0), y + 3, 6, 1);
  } else {
    ctx.fillStyle = th.plank; ctx.fillRect(x, y, T, 8);
    ctx.fillStyle = th.plankHi; ctx.fillRect(x, y, T, 2);
    ctx.fillStyle = mix(th.plank, '#000000', .3); ctx.fillRect(x + (hash(c, r) * 24 | 0), y + 3, 4, 3); ctx.fillRect(x + T - 1, y + 2, 1, 6);
    if (hash(r, c) > 0.5) { ctx.fillStyle = th.hang; ctx.fillRect(x + 12, y + 8, 2, 7); ctx.fillRect(x + 10, y + 12, 2, 2); }
  }
}
function drawTiles() {
  const c1 = Math.max(0, Math.floor(cam.x / T) - 1), c2 = Math.min(L.w - 1, Math.floor((cam.x + VW) / T) + 1);
  const r1 = Math.max(0, Math.floor(cam.y / T) - 1), r2 = Math.min(LH - 1, Math.floor((cam.y + VH) / T) + 1);
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
    const ch = L.tiles[r][c];
    if (ch === '#') drawRock(c, r, c * T, r * T);
    else if (ch === '=') drawPlank(c, r, c * T, r * T);
  }
}
function drawCrumble(g) {
  if (g.x > cam.x + VW || g.x + g.w < cam.x) return;
  if (!g.solid) {
    // Geisterlinie, solange die Platte weg ist
    const soon = g.gone > 180 ? 0.35 + 0.3 * Math.sin(tick * 0.4) : 0.3;
    ctx.save(); ctx.setLineDash([5, 4]); ctx.lineDashOffset = -tick * 0.3;
    ctx.strokeStyle = `rgba(230,220,255,${soon})`; ctx.lineWidth = 1.5;
    ctx.strokeRect(g.x + 1.5, g.y + 1.5, g.w - 3, T - 3); ctx.restore();
    return;
  }
  const th = L.theme, k = g.timer / 40, sx = g.timer ? (Math.random() - .5) * 3 * k : 0, sy = g.timer ? (Math.random() - .5) * 2 * k : 0;
  const base = mix(th.light, '#d8c8a8', .25);
  for (let x = g.x; x < g.x + g.w; x += T) {
    const c = x / T, X = x + sx, Y = g.y + sy;
    ctx.fillStyle = base; ctx.fillRect(X + 1, Y + 1, T - 2, T - 2);
    ctx.fillStyle = mix(base, '#000000', .35); ctx.fillRect(X + 1, Y + T - 6, T - 2, 5);
    ctx.fillStyle = mix(base, '#ffffff', .25); ctx.fillRect(X + 1, Y + 1, T - 2, 3);
    ctx.strokeStyle = mix(base, '#000000', .5); ctx.lineWidth = 1.2; ctx.beginPath();
    const h = hash(c, g.y);
    ctx.moveTo(X + 6 + h * 8, Y + 4); ctx.lineTo(X + 12 + h * 6, Y + 14); ctx.lineTo(X + 8 + h * 10, Y + 24);
    ctx.moveTo(X + 12 + h * 6, Y + 14); ctx.lineTo(X + 24, Y + 18);
    ctx.stroke();
    ctx.fillStyle = mix(base, '#000000', .5); ctx.fillRect(X + 1, Y + 1, 1, T - 2); ctx.fillRect(X + T - 2, Y + 1, 1, T - 2);
  }
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${g.flash / 30})`; ctx.fillRect(g.x, g.y, g.w, T); }
}
function drawSpike(s) {
  ctx.save();
  if (s.down) { ctx.translate(s.x + T / 2, s.y + T / 2); ctx.scale(1, -1); ctx.translate(-s.x - T / 2, -s.y - T / 2); }
  for (let i = 0; i < 3; i++) {
    const bx = s.x + 2 + i * 10, h = i === 1 ? 20 : 14;
    ctx.fillStyle = '#c4b3ff'; ctx.beginPath(); ctx.moveTo(bx, s.y + T); ctx.lineTo(bx + 5, s.y + T - h); ctx.lineTo(bx + 10, s.y + T); ctx.fill();
    ctx.fillStyle = '#7d68d6'; ctx.beginPath(); ctx.moveTo(bx + 5, s.y + T - h); ctx.lineTo(bx + 10, s.y + T); ctx.lineTo(bx + 5, s.y + T); ctx.fill();
  }
  ctx.restore();
}
function drawSpring(s) {
  const sq = s.sq > 6 ? (12 - s.sq) / 6 : s.sq / 6, capY = s.y + 14 + sq * 5;
  ctx.fillStyle = '#d8cbb2'; ctx.fillRect(s.x + 12, capY + 6, 8, s.y + T - capY - 6);
  ctx.fillStyle = '#c4407a'; ctx.beginPath(); ctx.ellipse(s.x + 16, capY + 6, 14 + sq * 2, 9 - sq * 2, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#ffd6e6'; ctx.fillRect(s.x + 8, capY + 1, 3, 3); ctx.fillRect(s.x + 19, capY - 1, 3, 3);
}
function drawCheck(c) {
  // Runenstein als Rücksetzpunkt
  const x = c.x, y = c.y + T;
  if (c.on) { ctx.fillStyle = 'rgba(111,227,200,.18)'; ctx.beginPath(); ctx.arc(x + 16, y - 16, 22, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#4a4262'; ctx.beginPath(); ctx.moveTo(x + 7, y); ctx.lineTo(x + 8, y - 24); ctx.quadraticCurveTo(x + 16, y - 36, x + 24, y - 24); ctx.lineTo(x + 25, y); ctx.fill();
  ctx.fillStyle = '#5b5278'; ctx.fillRect(x + 9, y - 24, 3, 22);
  ctx.strokeStyle = c.on ? '#7ff5d6' : '#2c2640'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x + 16, y - 26); ctx.lineTo(x + 16, y - 6); ctx.moveTo(x + 12, y - 20); ctx.lineTo(x + 16, y - 16); ctx.lineTo(x + 20, y - 20);
  ctx.moveTo(x + 12, y - 11); ctx.lineTo(x + 20, y - 11); ctx.stroke();
}
function drawDoor(d) {
  const x = d.x, y = d.y - T;
  ctx.fillStyle = '#3d3358'; ctx.fillRect(x - 2, y - 4, T + 4, 2 * T + 4);
  ctx.fillStyle = '#0d2a14'; ctx.beginPath(); ctx.moveTo(x + 4, y + 2 * T); ctx.lineTo(x + 4, y + 12); ctx.arc(x + 16, y + 12, 12, Math.PI, 0); ctx.lineTo(x + 28, y + 2 * T); ctx.fill();
  ctx.fillStyle = `rgba(156,240,138,${0.5 + 0.3 * Math.sin(tick * 0.08)})`; ctx.fillRect(x + 8, y + 16, 16, 44);
  ctx.fillStyle = L.theme.top; ctx.fillRect(x - 2, y - 4, T + 4, 3);
}
function drawPlat(pl) {
  const th = L.theme;
  ctx.fillStyle = th.light; ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = th.topHi; ctx.fillRect(pl.x, pl.y, pl.w, 3);
  ctx.fillStyle = th.deep; ctx.fillRect(pl.x + 4, pl.y + pl.h - 3, pl.w - 8, 3);
  ctx.fillStyle = th.hang; ctx.fillRect(pl.x + 10, pl.y + pl.h, 2, 5); ctx.fillRect(pl.x + 44, pl.y + pl.h, 2, 3);
  ctx.fillStyle = th.speck; ctx.fillRect(pl.x + 20, pl.y + 5, 3, 3); ctx.fillRect(pl.x + 40, pl.y + 6, 4, 2);
}
function drawLantern(s, g = ctx, x = s.x, y = s.y, scale = 1) {
  // hängende Laterne als Sammelobjekt
  const sw = Math.sin(tick * 0.05 + (s ? s.ph : 0)) * 0.15, pulse = 0.5 + 0.5 * Math.sin(tick * 0.1 + (s ? s.ph : 0));
  g.save(); g.translate(x, y - 15 * scale); g.scale(scale, scale); g.rotate(sw);
  g.fillStyle = `rgba(255,190,90,${0.18 + 0.1 * pulse})`; g.beginPath(); g.arc(0, 15, 17, 0, 7); g.fill();
  g.strokeStyle = '#a89ac0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, 5); g.stroke();
  g.beginPath(); g.arc(0, -5, 2.5, 0, 7); g.stroke();
  g.fillStyle = '#3b2f4a'; g.fillRect(-7, 5, 14, 4); g.fillRect(-5, 3, 10, 2);
  g.fillStyle = '#ffcf6b'; g.fillRect(-6, 9, 12, 13);
  g.fillStyle = '#fff2c0'; g.fillRect(-2.5, 11 + pulse, 5, 8 - pulse);
  g.fillStyle = '#3b2f4a'; g.fillRect(-7, 9, 2, 13); g.fillRect(5, 9, 2, 13); g.fillRect(-1, 9, 2, 13);
  g.fillRect(-7, 22, 14, 3); g.fillRect(-3, 25, 6, 2);
  g.restore();
}
function drawEnemy(e) {
  const leg = Math.sin(tick * 0.3 + e.sx) > 0 ? 1 : 0;
  ctx.fillStyle = '#2a2240';
  for (let i = 0; i < 3; i++) ctx.fillRect(e.x + 4 + i * 6 + (i % 2 ? leg : -leg), e.y + e.h - 3, 2, 3);
  ctx.fillStyle = '#6b5fa8'; ctx.beginPath(); ctx.ellipse(e.x + e.w/2, e.y + 9, 11, 9, 0, Math.PI, 0); ctx.fill();
  ctx.fillRect(e.x, e.y + 8, e.w, 5);
  ctx.fillStyle = '#9a8de0'; ctx.fillRect(e.x + 6, e.y + 3, 6, 2);
  ctx.fillStyle = '#4a4080'; ctx.fillRect(e.x + e.w/2 - 1, e.y + 1, 2, 11);
  const ex = e.dir > 0 ? e.x + e.w - 6 : e.x + 2;
  ctx.fillStyle = '#fff'; ctx.fillRect(ex, e.y + 7, 4, 4);
  ctx.fillStyle = '#120d1e'; ctx.fillRect(ex + (e.dir > 0 ? 2 : 0), e.y + 8, 2, 2);
}
function drawLumi(g, cx, by, o) {
  const sk = o.skin || skin();
  g.save(); g.translate(cx, by); g.scale(o.sx, o.sy);
  const step = o.ground ? Math.sin(o.walk) * 3 : 0;
  g.fillStyle = sk.feet; g.fillRect(-7 + step, -4, 5, 4); g.fillRect(2 - step, -4, 5, 4);
  g.fillStyle = o.dim ? sk.dim : sk.c; g.beginPath(); g.ellipse(0, -13, 11, 11, 0, 0, 7); g.fill();
  g.fillStyle = sk.hi; g.beginPath(); g.ellipse(-4, -17, 3, 3, 0, 0, 7); g.fill();
  g.fillStyle = '#2a1a10'; const fx = o.face * 3;
  g.fillRect(fx - 4, -15, 3, 4); g.fillRect(fx + 2, -15, 3, 4);
  g.fillStyle = '#7fc46a'; g.fillRect(-1, -28, 2, 5); g.fillRect(o.face > 0 ? 1 : -5, -30, 4, 3);
  g.restore();
}

function hole(x, y, r) {
  if (r <= 0) return;
  const g = lx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  lx.fillStyle = g; lx.beginPath(); lx.arc(x, y, r, 0, 7); lx.fill();
}
function drawLight() {
  lx.setTransform(S, 0, 0, S, 0, 0);
  lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, VW, VH);
  lx.fillStyle = 'rgba(5,3,12,0.66)'; lx.fillRect(0, 0, VW, VH);
  lx.globalCompositeOperation = 'destination-out';
  const ox = -cam.x, oy = -cam.y, flick = Math.sin(tick * 0.13) * 4;
  if (state !== 'dead') hole(P.x + P.w/2 + ox, P.y + 10 + oy, 165 + flick);
  for (const s of L.lanterns) if (!s.got && !lanternHidden(s) && Math.abs(s.x - cam.x - VW/2) < VW) hole(s.x + ox, s.y + oy, 52);
  for (const c of L.checks) hole(c.x + 16 + ox, c.y + 14 + oy, c.on ? 110 : 34);
  if (L.door) hole(L.door.x + 16 + ox, L.door.y + oy, 90);
  for (const q of parts) hole(q.x + ox, q.y + oy, 14);
  for (const t of trail) hole(t.x + ox, t.y + oy, 40 * t.life / t.max);
  ctx.drawImage(lc, 0, 0, VW, VH);
  if (state !== 'dead') {
    const [r, g, b] = skin().rgb;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const x = P.x + P.w/2 + ox, y = P.y + 10 + oy, gr = ctx.createRadialGradient(x, y, 0, x, y, 110);
    gr.addColorStop(0, `rgba(${r},${g},${b},.2)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gr; ctx.fillRect(x - 110, y - 110, 220, 220); ctx.restore();
  }
}

function fmt(f) { const s = f / 60, m = Math.floor(s / 60); return `${m}:${(s % 60).toFixed(1).padStart(4, '0')}`; }
function text(str, x, y, size, col, align = 'center', weight = 700, fam = FONT) {
  ctx.font = `${weight} ${size}px ${fam}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(str, x + 1, y + 1.5);
  ctx.fillStyle = col; ctx.fillText(str, x, y);
}
const small = (str, x, y, size, col, align = 'center') => text(str, x, y, size, col, align, 500, BODY);
function drawHUD() {
  const g = ctx.createLinearGradient(0, 0, 0, 46); g.addColorStop(0, 'rgba(6,4,14,.85)'); g.addColorStop(1, 'rgba(6,4,14,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 46);
  small(`Ebene ${li + 1} · ${L.def.name}`, 14, 18, 16, '#ffffff', 'left');
  drawLantern(null, ctx, VW - 262, 19, 0.6);
  small(`${lanternsNow()}/${L.lanterns.length}`, VW - 252, 18, 16, '#ffe2a3', 'left');
  small(`Stürze ${deaths}`, VW - 196, 18, 16, '#d6cbff', 'left');
  small(fmt(time), VW - 56, 18, 16, '#ffffff', 'right');
  if (muted) small('Ton aus', VW - 56, 38, 13, '#c9c0dc', 'right');
  if (NET.room) small(`Gruppe ${NET.room} · ${Object.keys(NET.peers).length} dabei`, 14, 38, 13, '#cdaeff', 'left');
}
function panel(h) { ctx.fillStyle = 'rgba(8,5,16,.85)'; ctx.fillRect(0, VH/2 - h/2, VW, h); }

function render() {
  if (state === 'world') { renderWorld(); return; }
  ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = true;
  drawBG();
  ctx.save(); ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  drawTiles();
  drawFake(true);
  L.crumbles.forEach(drawCrumble);
  L.spikes.forEach(drawSpike); L.springs.forEach(drawSpring); L.checks.forEach(drawCheck);
  if (L.door) drawDoor(L.door);
  L.plats.forEach(drawPlat);
  for (const e of L.enemies) if (e.alive) drawEnemy(e);
  drawFake(false);
  for (const t of trail) {
    const k = t.life / t.max;
    ctx.fillStyle = `rgba(255,214,80,${0.15 * k})`; ctx.beginPath(); ctx.arc(t.x, t.y, 15 * k + 3, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,222,90,${0.75 * k})`; ctx.beginPath(); ctx.arc(t.x, t.y, 11 * k + 1, 0, 7); ctx.fill();
  }
  if (state !== 'dead') drawLumi(ctx, P.x + P.w/2, P.y + P.h, {sx: P.sx, sy: P.sy, face: P.face, walk: P.walk, ground: P.ground, dim: !(P.canDash || P.dashT > 0)});
  for (const q of parts) { ctx.globalAlpha = q.life / q.max; ctx.fillStyle = q.col; ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3); }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawLight();
  // Laternen leuchten selbst und liegen deshalb über der Dunkelheit
  ctx.save(); ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  for (const s of L.lanterns) if (!s.got && !lanternHidden(s) && Math.abs(s.x - cam.x - VW/2) < VW) drawLantern(s);
  drawGhosts();
  ctx.restore();
  if (state === 'idle') return;
  drawHUD();
  if (toastT > 0) {
    ctx.globalAlpha = Math.min(1, toastT / 30);
    ctx.font = `500 17px ${BODY}`; const tw = Math.max(260, ctx.measureText(toastMsg).width + 36);
    ctx.fillStyle = 'rgba(8,5,16,.75)'; ctx.fillRect(VW/2 - tw/2, 56, tw, 34);
    small(toastMsg, VW/2, 73, 17, '#cdaeff');
    ctx.globalAlpha = 1;
  }
  if (state === 'pause') { panel(100); text('PAUSE', VW/2, VH/2 - 14, 36, '#ffffff'); small('Tippen zum Weiterspielen', VW/2, VH/2 + 24, 16, '#d6cbff'); }
  if (state === 'clear') {
    panel(126);
    text('EBENE GESCHAFFT!', VW/2, VH/2 - 26, 36, '#a8f597');
    small(`Laternen ${lanternsNow()}/${L.lanterns.length}   ·   Zeit ${fmt(time)}   ·   Stürze ${deaths}`, VW/2, VH/2 + 14, 17, '#ffe2a3');
    small(`Geheimgänge ${L.fgroups.filter(f => f.found).length}/${L.fgroups.length}   ·   ` +
      (li + 1 < LEVELS.length ? 'Die nächste Höhle ist jetzt offen.' : 'Alle Höhlen geschafft!'), VW/2, VH/2 + 40, 15, '#d6cbff');
  }
}
