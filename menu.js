/* ============================================================
   menu.js – Menü (Home, Einstellungen), Skin-Auswahl und Vorschau von Lumi
   ============================================================ */

/* ---------- Menü ---------- */
const menu = $('menu');
const TABS = {home: ['tabHome', 'viewHome'], online: ['tabOnline', 'viewOnline'], set: ['tabSet', 'viewSet']};
function setTab(t) {
  for (const k in TABS) { $(TABS[k][0]).setAttribute('aria-selected', k === t); $(TABS[k][1]).hidden = k !== t; }
  if (t === 'online') renderOnline();
  if (t === 'set') renderSettings();
}
function openMenu(t) {
  menuOpen = true; menu.hidden = false; $('resume').hidden = !(inLevel || state === 'world'); $('restart').hidden = !inLevel;
  $('resume').textContent = inLevel ? 'Weiterspielen' : 'Zur Karte';
  document.body.classList.add('menu-open'); if (typeof netPresence === 'function') netPresence(true); if (typeof padReset === 'function') padReset();
  for (const id of ['tJump', 'tDash']) $(id).classList.remove('on');
  $('gear').setAttribute('aria-label', inLevel ? 'Menü schließen' : 'Menü');
  for (const k in key) key[k] = false;
  setTab(t);
}
function closeMenu() {
  if (!inLevel && state !== 'world') return;
  menuOpen = false; menu.hidden = true; document.body.classList.remove('menu-open'); $('swatches').hidden = true; $('skinBtn').setAttribute('aria-expanded', 'false');
  $('gear').setAttribute('aria-label', 'Menü öffnen');
  if (state === 'pause') state = 'play';
  cv.focus({preventScroll: true});
}
$('tabHome').addEventListener('click', () => setTab('home'));
$('tabMap').addEventListener('click', () => { initAudio(); enterWorld(inLevel ? li : WL.node); });
$('tabOnline').addEventListener('click', () => setTab('online'));
$('tabSet').addEventListener('click', () => setTab('set'));
$('resume').addEventListener('click', closeMenu);
$('restart').addEventListener('click', () => { loadLevel(li); time = 0; deaths = 0; state = 'play'; closeMenu(); });
$('playBtn').addEventListener('click', () => { initAudio(); enterWorld(inLevel ? li : WL.node); });
$('gear').addEventListener('click', () => { initAudio(); if (menuOpen) closeMenu(); else openMenu('home'); });
const sw = $('swatches');
SKINS.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'swatch'; b.style.background = s.c; b.title = s.name;
  b.setAttribute('aria-label', s.name); b.setAttribute('aria-pressed', i === save.skin);
  b.addEventListener('click', () => { save.skin = i; persist(); sw.querySelectorAll('.swatch').forEach((x, j) => x.setAttribute('aria-pressed', j === i)); });
  sw.appendChild(b);
});
$('skinBtn').addEventListener('click', () => { sw.hidden = !sw.hidden; $('skinBtn').setAttribute('aria-expanded', String(!sw.hidden)); });

const pv = $('lumiPrev'), pctx = pv.getContext('2d');
function drawPreview() {
  if ($('viewHome').hidden || menu.hidden) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1), size = pv.clientWidth || 124;
  if (pv.width !== Math.round(size * dpr)) { pv.width = pv.height = Math.round(size * dpr); }
  const k = pv.width / 124;
  pctx.setTransform(k, 0, 0, k, 0, 0); pctx.clearRect(0, 0, 124, 124);
  const [r, g, b] = skin().rgb, gr = pctx.createRadialGradient(62, 66, 0, 62, 66, 60);
  gr.addColorStop(0, `rgba(${r},${g},${b},.35)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  pctx.fillStyle = gr; pctx.fillRect(0, 0, 124, 124);
  pctx.fillStyle = 'rgba(0,0,0,.35)'; pctx.beginPath(); pctx.ellipse(62, 104, 26, 5, 0, 0, 7); pctx.fill();
  pctx.save(); pctx.translate(62, 104); pctx.scale(3, 3);
  const bob = Math.abs(Math.sin(tick * 0.06)) * 2;
  drawLumi(pctx, 0, -bob, {sx: 1, sy: 1 + bob * 0.02, face: 1, walk: 0, ground: true, dim: false});
  pctx.restore();
}


/* ---------- Einstellungen ---------- */
const isTouchDev = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
let prefs = {touch: 'auto', size: 'm', sound: 'on'};
try { Object.assign(prefs, JSON.parse(localStorage.getItem('moosgrotte-prefs') || '{}')); } catch (e) {}
function savePrefs() { try { localStorage.setItem('moosgrotte-prefs', JSON.stringify(prefs)); } catch (e) {} }
function applyPrefs() {
  const on = prefs.touch === 'on' || (prefs.touch === 'auto' && isTouchDev);
  document.body.classList.toggle('no-touch', !on);
  if (!on) { padReset(); for (const k in key) key[k] = false; }
  scr.style.setProperty('--cs', {s: .8, m: 1, l: 1.2}[prefs.size] || 1);
  muted = prefs.sound === 'off';
}
function renderSettings() {
  for (const [id, k] of [['setTouch', 'touch'], ['setSize', 'size'], ['setSound', 'sound']])
    $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === (k === 'sound' ? (muted ? 'off' : 'on') : prefs[k])));
  $('setNameRow').hidden = !(NET.status === 'on' && NET.name);
  $('setNameCur').textContent = !NET.name ? '' : NET.anon ? NET.name + ' · noch ohne Passwort' : 'Angemeldet als ' + NET.name;
  $('setName').textContent = NET.anon ? 'Passwort festlegen' : 'Abmelden';
}
for (const [id, k] of [['setTouch', 'touch'], ['setSize', 'size'], ['setSound', 'sound']])
  $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; prefs[k] = b.dataset.v; savePrefs(); applyPrefs(); renderSettings(); });
applyPrefs();
