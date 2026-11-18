/* ============================================================
   spiel.js – Spielablauf: Speicherstand, Zustand, Tastatur, Ton und Physik (laufen, springen, dashen, Gegner …)
   ============================================================ */

/* ---------- Speicherstand ----------
   Gespeichert wird pro Ebenen-ID (siehe levels.js). So bleibt der Fortschritt erhalten,
   auch wenn neue Ebenen dazukommen. Ältere Speicherstände werden übernommen. */
const N = LEVELS.length;
const idIndex = id => LEVELS.findIndex(d => d.id === String(id));
let save = {done: Array(N).fill(false), best: Array(N).fill(null), skin: 2, at: 0};
try {
  const s4 = JSON.parse(localStorage.getItem('moosgrotte-v4') || 'null');
  if (s4) {
    for (const id in s4.lv || {}) { const i = idIndex(id); if (i >= 0) { save.done[i] = !!s4.lv[id].done; save.best[i] = s4.lv[id].best || null; } }
    save.skin = s4.skin ?? 2; save.at = Math.max(0, idIndex(s4.at));
  } else {
    // alte Stände hatten nur die 6 Höhlen, gezählt ab 0
    const s3 = JSON.parse(localStorage.getItem('moosgrotte-v3') || 'null'), s2 = JSON.parse(localStorage.getItem('moosgrotte-v2') || 'null'), o = s3 || s2;
    if (o) {
      (o.done || []).forEach((d, k) => { const i = idIndex(k); if (i >= 0) save.done[i] = !!d; });
      if (s3) (s3.best || []).forEach((b, k) => { const i = idIndex(k); if (i >= 0) save.best[i] = b || null; });
      save.skin = o.skin ?? 2;
    }
  }
} catch (e) {}
function persist() {
  const lv = {};
  LEVELS.forEach((d, i) => { if (save.done[i] || save.best[i]) lv[d.id] = {done: save.done[i], best: save.best[i]}; });
  try { localStorage.setItem('moosgrotte-v4', JSON.stringify({lv, skin: save.skin, at: (LEVELS[save.at] || LEVELS[0]).id})); } catch (e) {}
}
const skin = () => SKINS[save.skin] || SKINS[2];

/* ---------- Zustand ---------- */
let L, li = 0, state = 'idle', inLevel = false, menuOpen = true, time = 0, deaths = 0, deadT = 0, clearT = 0, tick = 0, muted = false;
const P = {x:0,y:0,w:18,h:24,vx:0,vy:0,ground:false,coy:0,jb:0,face:1,ride:null,sx:1,sy:1,walk:0,canDash:true,dashT:0,dvx:0,dvy:0,wallDir:0};
const trail = [], parts = [];
let respawn = {x: 0, y: 0};
const cam = {x: 0, y: 0};

function loadLevel(i) {
  li = i; L = makeLevel(i); respawn = {...L.start}; placePlayer(); updateCam(true);
}
function placePlayer() {
  Object.assign(P, {x: respawn.x, y: respawn.y, vx: 0, vy: 0, ground: false, coy: 0, jb: 0, ride: null, sx: 1, sy: 1, canDash: true, dashT: 0, wallDir: 0});
  trail.length = 0;
  for (const e of L.enemies) Object.assign(e, {x: e.sx, y: e.sy, vx: 0, vy: 0, dir: -1, alive: true});
  for (const g of L.crumbles) Object.assign(g, {solid: true, timer: 0, gone: 0, touched: false});
  if (L.boss) resetBoss();
}
function startLevel(i) {
  loadLevel(i); time = 0; deaths = 0; state = 'play'; inLevel = true; closeMenu(); cv.focus({preventScroll: true});
  document.body.classList.remove('in-world');
  if (typeof netPresence === 'function') netPresence(true);
}
const lanternsNow = () => L.lanterns.filter(s => s.got).length;
const lanternHidden = s => s.grp && !s.grp.found;
let toastT = 0, toastMsg = '';
function toast(msg) { toastMsg = msg; toastT = 150; }

/* ---------- Eingabe ---------- */
const key = {left:false,right:false,up:false,down:false,jump:false,dash:false}, pressed = {jump:false,dash:false};
const KEYMAP = {ArrowLeft:['left'],KeyA:['left'],ArrowRight:['right'],KeyD:['right'],ArrowUp:['up','jump'],KeyW:['up','jump'],
  ArrowDown:['down'],KeyS:['down'],Space:['jump'],Enter:['jump'],NumpadEnter:['jump'],KeyC:['dash'],ShiftLeft:['dash'],ShiftRight:['dash']};
function press(k, down) { if (down && !key[k]) pressed[k] = true; key[k] = down; if (down) initAudio(); }
addEventListener('keydown', e => {
  if (e.code === 'Escape') { if (inLevel || state === 'world') { menuOpen ? closeMenu() : openMenu('home'); } return; }
  if (menuOpen) return;
  const ks = KEYMAP[e.code];
  if (ks) { e.preventDefault(); if (!e.repeat) ks.forEach(k => press(k, true)); return; }
  if (e.code === 'KeyR' && (state === 'play' || state === 'dead')) { loadLevel(li); time = 0; state = 'play'; }
  else if (e.code === 'KeyP' && (state === 'play' || state === 'pause')) state = state === 'play' ? 'pause' : 'play';
  else if (e.code === 'KeyM') { muted = !muted; prefs.sound = muted ? 'off' : 'on'; savePrefs(); }
});
addEventListener('keyup', e => { const ks = KEYMAP[e.code]; if (ks) { if (!menuOpen) e.preventDefault(); ks.forEach(k => key[k] = false); } });
addEventListener('blur', () => { for (const k in key) key[k] = false; if (state === 'play' && !menuOpen) state = 'pause'; });
cv.addEventListener('pointerdown', () => { cv.focus(); initAudio(); if (state === 'pause') state = 'play'; });
function bindTouch(id, k) {
  const el = $(id);
  const on = e => { e.preventDefault(); if (menuOpen) return; try { el.setPointerCapture(e.pointerId); } catch (_) {}
    el.classList.add('on'); press(k, true); if (state === 'pause') state = 'play'; };
  const off = e => { e.preventDefault(); el.classList.remove('on'); key[k] = false; };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
[['tJump','jump'],['tDash','dash']].forEach(a => bindTouch(...a));

/* ---------- Ton ---------- */
let ac = null;
function initAudio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
}
function tone(type, f1, f2, dur, vol, delay = 0) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const sfx = {
  jump(){ tone('square', 300, 620, .12, .05); },
  lantern(){ tone('triangle', 700, 1050, .1, .08); tone('triangle', 1050, 1580, .12, .06, .07); },
  stomp(){ tone('square', 220, 70, .15, .07); },
  spring(){ tone('sine', 180, 900, .25, .12); },
  dash(){ tone('sawtooth', 900, 260, .16, .045); tone('sine', 1200, 600, .12, .05); },
  crumble(){ tone('sawtooth', 140, 50, .25, .05); },
  die(){ tone('sawtooth', 320, 50, .45, .06); },
  check(){ tone('triangle', 520, 780, .15, .07); tone('triangle', 780, 1040, .15, .06, .1); },
  win(){ [523,659,784,1046].forEach((f,i) => tone('triangle', f, f*1.01, .2, .08, i*.1)); },
  secret(){ [660,880,1320,1760].forEach((f,i) => tone('sine', f, f*1.02, .18, .06, i*.08)); },
};

/* ---------- Physik ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function tileAt(c, r) { return (r < 0 || r >= LH || c < 0 || c >= L.w) ? ' ' : L.tiles[r][c]; }
function solid(c, r) {
  if (c < 0 || c >= L.w) return true; if (r < 0 || r >= LH) return false;
  const ch = L.tiles[r][c];
  return ch === '#' || (ch === 'X' && L.cmap.get(r * L.w + c).solid);
}
function oneway(c, r) { return tileAt(c, r) === '='; }
function overlap(a, x, y, w, h) { return a.x < x + w && a.x + a.w > x && a.y < y + h && a.y + a.h > y; }
function wallAt(o, side) {
  const c = Math.floor((side < 0 ? o.x - 2 : o.x + o.w + 2 - 0.01) / T);
  const r1 = Math.floor((o.y + 3) / T), r2 = Math.floor((o.y + o.h - 3 - 0.01) / T);
  for (let r = r1; r <= r2; r++) if (solid(c, r)) return true;
  return false;
}
function moveX(o) {
  o.x += o.vx; o.hitWall = false;
  const r1 = Math.floor(o.y / T), r2 = Math.floor((o.y + o.h - 0.01) / T);
  if (o.vx > 0) { const c = Math.floor((o.x + o.w - 0.01) / T); for (let r = r1; r <= r2; r++) if (solid(c, r)) { o.x = c*T - o.w; o.vx = 0; o.hitWall = true; break; } }
  else if (o.vx < 0) { const c = Math.floor(o.x / T); for (let r = r1; r <= r2; r++) if (solid(c, r)) { o.x = (c+1)*T; o.vx = 0; o.hitWall = true; break; } }
}
function moveY(o) {
  const prevB = o.y + o.h; o.y += o.vy; o.ground = false;
  const c1 = Math.floor(o.x / T), c2 = Math.floor((o.x + o.w - 0.01) / T);
  if (o.vy > 0) { const r = Math.floor((o.y + o.h - 0.01) / T);
    for (let c = c1; c <= c2; c++) if (solid(c, r) || (oneway(c, r) && prevB <= r*T + 0.5)) { o.y = r*T - o.h; o.vy = 0; o.ground = true; break; } }
  else if (o.vy < 0) { const r = Math.floor(o.y / T);
    for (let c = c1; c <= c2; c++) if (solid(c, r)) { o.y = (r+1)*T; o.vy = 0; break; } }
}
function burst(x, y, n, col, spd = 3, life = 30) {
  for (let i = 0; i < n; i++) { const a = Math.random()*Math.PI*2, s = Math.random()*spd;
    parts.push({x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1, life, max: life, col}); }
}
function die() {
  if (state !== 'play') return;
  state = 'dead'; deadT = 55; deaths++; sfx.die();
  burst(P.x + P.w/2, P.y + P.h/2, 26, skin().c, 4, 40);
}
function updatePlats() {
  for (const pl of L.plats) {
    pl.t++; const k = (1 - Math.cos(pl.t * 0.02)) / 2 * pl.range;
    const nx = pl.axis === 'm' ? pl.ox + k : pl.ox, ny = pl.axis === 'v' ? pl.oy - k : pl.oy;
    pl.dx = nx - pl.x; pl.dy = ny - pl.y; pl.x = nx; pl.y = ny;
  }
}
function touchCrumble(c, r) { if (tileAt(c, r) === 'X') { const g = L.cmap.get(r * L.w + c); if (g.solid) g.touched = true; } }
function updateCrumbles() {
  for (const g of L.crumbles) {
    if (g.flash > 0) g.flash--;
    if (g.solid) {
      if (g.touched && ++g.timer >= 40) {
        g.solid = false; g.gone = 0; g.timer = 0; sfx.crumble();
        for (let i = 0; i < g.w; i += 8) burst(g.x + i + 4, g.y + 10, 2, L.theme.light, 2, 30);
      }
    } else if (++g.gone >= 220 && !overlap(P, g.x, g.y, g.w, T)) { g.solid = true; g.flash = 14; }
    g.touched = false;
  }
}

/* ---------- Boss ----------
   Auf den Boss springen = Treffer. Ihn sonst berühren = verloren.
   Zwischenboss: 3 Treffer. Endboss: 5 Treffer, springt, wird nach jedem Treffer wütend und schneller. */
let shake = 0, fadeT = 0;
function resetBoss() {
  Object.assign(L.boss, {x: L.boss.sx, y: L.boss.sy, vx: 0, vy: 0, dir: -1, hp: L.boss.max, inv: 0, rage: 0, jt: 90, wait: 70, dying: 0, ground: false, hitWall: false});
}
function enterArena() {
  const a = L.arena;
  L.inArena = true; fadeT = 26;
  respawn = {x: a.x0 + 24, y: a.y1 - P.h};
  placePlayer(); P.face = 1; updateCam(true);
  tone('sawtooth', 140, 60, 0.5, 0.06);
}
function updateBoss() {
  const b = L.boss, p = P, big = b.kind === 'big';
  if (b.dying > 0) {
    if (b.dying % 9 === 0) burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 10, big ? '#c4b3ff' : '#9a8de0', 3, 30);
    if (--b.dying === 0) { state = 'clear'; clearT = 160; sfx.win(); burst(b.x + b.w / 2, b.y + b.h / 2, 40, '#ffd36b', 4, 50); }
    return;
  }
  if (b.wait > 0) { b.wait--; if (b.wait === 30) { shake = 10; tone('sawtooth', 90, 50, 0.4, 0.07); } }
  else {
    const dmg = b.max - b.hp;
    let sp = (big ? 1.5 : 1.1) + dmg * (big ? 0.4 : 0.45);
    if (b.rage > 0) { b.rage--; sp *= 1.8; }
    b.vx = b.dir * sp; moveX(b); if (b.hitWall) b.dir *= -1;
    if (b.ground && --b.jt <= 0) {
      b.vy = big ? -11.5 : -7.5; b.jt = (big ? 110 : 170) - dmg * 14;
      if (big) b.dir = p.x + p.w / 2 > b.x + b.w / 2 ? 1 : -1;   // Endboss springt auf dich zu
    }
  }
  const air = !b.ground;
  b.vy = Math.min(b.vy + GRAV, 12); moveY(b);
  if (air && b.ground && big && b.wait <= 0) { shake = 12; burst(b.x + b.w / 2, b.y + b.h, 14, '#8b7fae', 2.5, 24); tone('square', 90, 40, 0.2, 0.06); }
  if (b.inv > 0) b.inv--;
  if (overlap(p, b.x + 5, b.y + 6, b.w - 10, b.h - 6)) {
    const fromAbove = p.vy > 0 && p.y + p.h - b.y < 24;
    if (fromAbove) {
      p.vy = key.jump ? -12 : -9.5; p.dashT = 0; p.canDash = true; p.ground = false; p.ride = null;
      if (b.inv <= 0) {
        b.hp--; b.inv = 60; shake = 8; sfx.stomp(); tone('square', 600, 200, 0.2, 0.06);
        burst(b.x + b.w / 2, b.y + 8, 18, '#ffd36b', 3, 28);
        b.dir = p.x + p.w / 2 > b.x + b.w / 2 ? -1 : 1;        // flieht kurz
        if (big) b.rage = 100;
        if (b.hp <= 0) { b.dying = 110; toast(`${b.name} ist besiegt!`); }
      }
    } else die();
  }
}

function updatePlay() {
  const p = P, wasG = p.ground, fallV = p.vy;
  updatePlats();
  const dir = (key.right ? 1 : 0) - (key.left ? 1 : 0);
  if (dir) p.face = dir;
  if (p.ground && p.dashT <= 0) p.canDash = true;
  if (pressed.dash && p.canDash && p.dashT <= 0) {
    let dx = dir, dy = (key.down ? 1 : 0) - (key.up ? 1 : 0);
    if (!dx && !dy) dx = p.face;
    const len = Math.hypot(dx, dy);
    p.dvx = dx / len * 9; p.dvy = dy / len * 9; p.dashT = 11; p.canDash = false;
    p.ride = null; p.ground = false; p.sx = dx ? 1.3 : 0.75; p.sy = dx ? 0.8 : 1.3; sfx.dash();
  }
  if (p.dashT > 0) {
    p.vx = p.dvx; p.vy = p.dvy; p.dashT--;
    trail.push({x: p.x + p.w/2, y: p.y + p.h - 13, life: 24, max: 24});
    if (p.dashT === 0) { p.vx = p.dvx * 0.45; p.vy = p.dvy * 0.35; }
  } else {
    if (dir) { const tgt = dir * 3.6, acc = p.ground ? 0.7 : 0.45; p.vx += Math.sign(tgt - p.vx) * Math.min(acc, Math.abs(tgt - p.vx)); }
    else { const f = p.ground ? 0.6 : 0.2; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
  }
  if (pressed.jump) p.jb = 7; else if (p.jb > 0) p.jb--;
  if (p.ground) p.coy = 6; else if (p.coy > 0) p.coy--;
  p.wallDir = wallAt(p, -1) ? -1 : wallAt(p, 1) ? 1 : 0;
  if (p.jb > 0 && p.coy > 0) {
    p.vy = -10.8; p.jb = 0; p.coy = 0; p.dashT = 0; p.ground = false; p.ride = null; p.sx = 0.75; p.sy = 1.3; sfx.jump();
    burst(p.x + p.w/2, p.y + p.h, 6, '#8b7fae', 1.5, 18);
  } else if (p.jb > 0 && p.wallDir !== 0) {
    // Wandsprung: kräftig nach oben, nur kurz von der Wand weg, damit man schnell zurück an die Wand kommt
    p.vy = -560 / 60; p.vx = -p.wallDir * 3.4; p.face = -p.wallDir;
    p.jb = 0; p.dashT = 0; p.sx = 0.75; p.sy = 1.3; sfx.jump();
    burst(p.wallDir > 0 ? p.x + p.w : p.x, p.y + p.h/2, 8, '#8b7fae', 1.8, 18);
  }
  if (p.dashT <= 0) {
    p.vy += (p.vy < 0 && !key.jump) ? GRAV * 2.2 : GRAV;
    if (p.vy > 11) p.vy = 11;
    if (!p.ground && p.vy > 2.2 && dir !== 0 && dir === p.wallDir) {
      p.vy = 2.2;
      if (tick % 5 === 0) burst(dir > 0 ? p.x + p.w : p.x, p.y + p.h - 4, 1, '#8b7fae', 0.6, 14);
    }
  }
  if (p.ride) { p.x += p.ride.dx; p.y += p.ride.dy; }
  moveX(p);
  if (L.inArena) {   // im Bossraum: nicht aus dem Bild laufen
    if (p.x < L.arena.x0) { p.x = L.arena.x0; p.vx = 0; }
    if (p.x + p.w > L.arena.x1) { p.x = L.arena.x1 - p.w; p.vx = 0; }
  }
  const prevB = p.y + p.h;
  moveY(p);
  p.ride = null;
  if (p.vy >= 0) for (const pl of L.plats) {
    if (p.x + p.w > pl.x + 2 && p.x < pl.x + pl.w - 2 && prevB <= pl.y + 4 && p.y + p.h >= pl.y) {
      p.y = pl.y - p.h; p.vy = 0; p.ground = true; p.ride = pl;
    }
  }
  if (!wasG && p.ground && fallV > 4) { p.sx = 1.3; p.sy = 0.72; burst(p.x + p.w/2, p.y + p.h, 5, '#8b7fae', 1.2, 14); }
  p.sx += (1 - p.sx) * 0.2; p.sy += (1 - p.sy) * 0.2;
  p.walk = p.ground && Math.abs(p.vx) > 0.3 ? p.walk + Math.abs(p.vx) * 0.12 : 0;

  // Bröckelplatten: Stehen oder Wandkontakt zählt als Berührung
  const c1 = Math.floor(p.x / T), c2 = Math.floor((p.x + p.w - 0.01) / T);
  if (p.ground) { const fr = Math.floor((p.y + p.h + 1) / T); for (let c = c1; c <= c2; c++) touchCrumble(c, fr); }
  for (const side of [-1, 1]) {
    const c = Math.floor((side < 0 ? p.x - 2 : p.x + p.w + 2 - 0.01) / T);
    for (let r = Math.floor((p.y + 3) / T); r <= Math.floor((p.y + p.h - 3.01) / T); r++) touchCrumble(c, r);
  }
  updateCrumbles();

  // Geheimräume: betritt Lumi Scheinfels, wird der Raum sichtbar
  for (const fg of L.fgroups) fg.inside = false;
  for (let r = Math.floor(p.y / T); r <= Math.floor((p.y + p.h - 0.01) / T); r++)
    for (let c = c1; c <= c2; c++) if (tileAt(c, r) === 'F') {
      const fg = L.fmap.get(r * L.w + c); fg.inside = true;
      if (!fg.found) { fg.found = true; sfx.secret(); toast('Geheimgang gefunden!'); }
    }
  for (const fg of L.fgroups) fg.alpha += ((fg.inside ? 0.12 : fg.found ? 0.5 : 1) - fg.alpha) * 0.15;

  if (p.y > LH * T + 40) { die(); return; }
  for (const s of L.spikes) if (s.down ? overlap(p, s.x + 5, s.y, 22, 16) : overlap(p, s.x + 5, s.y + 16, 22, 16)) { die(); return; }
  for (const s of L.springs) {
    s.sq = Math.max(0, s.sq - 1);
    if (p.vy >= 0 && overlap(p, s.x + 4, s.y + 18, 24, 14) && p.y + p.h <= s.y + 33) {
      p.y = s.y + 18 - p.h; p.vy = -16.5; p.dashT = 0; p.canDash = true; p.ground = false; p.ride = null; s.sq = 12; p.sx = 0.7; p.sy = 1.4; sfx.spring();
    }
  }
  for (const e of L.enemies) {
    if (!e.alive) continue;
    e.vx = e.dir * 0.9; moveX(e); if (e.hitWall) e.dir *= -1;
    e.vy = Math.min(e.vy + GRAV, 11); moveY(e);
    if (e.ground) {
      const ax = e.dir > 0 ? e.x + e.w + 1 : e.x - 1, c = Math.floor(ax / T), r = Math.floor((e.y + e.h + 1) / T);
      if (!solid(c, r) && !oneway(c, r)) e.dir *= -1;
    }
    if (e.y > LH * T + 40) { e.alive = false; continue; }
    if (overlap(p, e.x, e.y, e.w, e.h)) {
      if (p.vy > 0 && p.y + p.h - e.y < 14) {
        e.alive = false; p.vy = key.jump ? -11 : -7.5; p.dashT = 0; p.canDash = true; p.ground = false; p.ride = null; sfx.stomp();
        burst(e.x + e.w/2, e.y + e.h/2, 14, '#9a8de0', 3, 26);
      } else { die(); return; }
    }
  }
  if (L.bossDoor && !L.inArena && overlap(p, L.bossDoor.x - 6, L.bossDoor.y - T + 4, 12, 2 * T - 4)) { enterArena(); return; }
  if (L.boss && L.inArena) { updateBoss(); if (state !== 'play') return; }
  for (const s of L.lanterns) if (!s.got && Math.abs(p.x + p.w/2 - s.x) < 18 && Math.abs(p.y + p.h/2 - s.y) < 22) {
    s.got = true; sfx.lantern(); burst(s.x, s.y, 12, '#ffd27a', 2.2, 24);
  }
  for (const c of L.checks) if (!c.on && overlap(p, c.x + 6, c.y - 16, 20, 48)) {
    c.on = true; respawn = {x: c.x + 7, y: c.y + T - 24}; sfx.check(); burst(c.x + 16, c.y + 10, 14, '#6fe3c8', 2.5, 30);
  }
  if (L.door && overlap(p, L.door.x + 6, L.door.y - T + 6, 20, 58)) {
    state = 'clear'; clearT = 120; sfx.win(); burst(L.door.x + 16, L.door.y, 30, '#9cf08a', 3.5, 45);
    if (NET.status === 'on' && NET.name) toast(lanternsNow() >= L.lanterns.length ? 'Alle Laternen! Deine Zeit zählt für die Rangliste' : 'Für die Rangliste brauchst du alle Laternen');
  }
  time++;
}
function updateCam(snap) {
  let tx, ty, k = snap ? 1 : 0.1;
  if (L.inArena) {
    // Bossraum: Kamera bleibt stehen
    const a = L.arena;
    tx = (a.x0 + a.x1) / 2 - VW / 2; ty = clamp((a.y0 + a.y1 + T) / 2 - VH / 2, 0, LH * T - VH); k = snap ? 1 : 0.2;
  } else {
    tx = clamp(P.x + P.w/2 - VW/2 + P.face * 40, 0, L.w*T - VW);
    ty = clamp(P.y + P.h/2 - VH/2 + 20, 0, LH*T - VH);
  }
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  if (shake > 0) { shake--; cam.x += (Math.random() - 0.5) * shake; cam.y += (Math.random() - 0.5) * shake; }
}
function finishLevel() {
  const lan = lanternsNow(), b = save.best[li];
  if (!b || lan > b.lan || (lan === b.lan && time < b.time)) save.best[li] = {lan, time, deaths};
  const first = !save.done[li];
  save.done[li] = true;
  persist(); netScore(li, time, lan, L.lanterns.length);
  enterWorld(li, first ? li : -1);   // beim ersten Mal erscheint der Pfad zur nächsten Ebene
  if (first && li === LEVELS.length - 1) toast('Alle Höhlen geschafft!');
  netPresence(true);
}
function update() {
  tick++;
  if (menuOpen) return;
  if (state === 'play') { updatePlay(); updateCam(); }
  else if (state === 'dead') { updatePlats(); updateCrumbles(); if (--deadT <= 0) { placePlayer(); state = 'play'; } }
  else if (state === 'clear') { updatePlats(); if (--clearT <= 0) finishLevel(); }
  else if (state === 'world') updateWorld();
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.x += q.vx; q.y += q.vy; q.vy += 0.12; q.vx *= 0.97; if (--q.life <= 0) parts.splice(i, 1); }
  for (let i = trail.length - 1; i >= 0; i--) if (--trail[i].life <= 0) trail.splice(i, 1);
  if (toastT > 0) toastT--;
  if (fadeT > 0) fadeT--;
  pressed.jump = false; pressed.dash = false;
}
