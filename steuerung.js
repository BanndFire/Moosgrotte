/* ============================================================
   steuerung.js – Touch-Steuerung (Steuerkreuz), Vollbild und Querformat
   ============================================================ */

/* Steuerkreuz mit 8 Richtungen: Fingerposition relativ zur Mitte wählt einen von acht Sektoren */
const DIRS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];  // rechts, rechts-unten, unten, ...
const dpad = $('dpad');
{
  const NS = 'http://www.w3.org/2000/svg', pt = (r, a) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  let s = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="base" cx="50" cy="50" r="49"/><circle class="ring" cx="50" cy="50" r="30"/>`;
  s += `<circle class="knob" cx="50" cy="50" r="19"/><circle class="knobHi" cx="50" cy="50" r="19"/></svg>`;
  dpad.innerHTML = s;
}
const knobs = [...dpad.querySelectorAll('.knob,.knobHi')];
const moveKnob = (x, y) => knobs.forEach(k => { k.setAttribute('cx', x); k.setAttribute('cy', y); });
let padId = null, padSec = -1;
function setSector(i) {
  if (i === padSec) return;
  padSec = i;
  const [dx, dy] = i < 0 ? [0, 0] : DIRS[i];
  press('left', dx < 0); press('right', dx > 0); press('up', dy < 0); press('down', dy > 0);
}
function padMove(e) {
  const r = dpad.getBoundingClientRect(), R = r.width / 2;
  let x = e.clientX - r.left - R, y = e.clientY - r.top - R;
  const d = Math.hypot(x, y);
  const m = R * .62; if (d > m) { x *= m / d; y *= m / d; }
  moveKnob(50 + x / R * 50, 50 + y / R * 50);
  if (d < R * .16) { setSector(-1); return; }
  setSector(((Math.round(Math.atan2(y, x) / (Math.PI / 4)) % 8) + 8) % 8);
}
function padReset() {
  padId = null; setSector(-1); dpad.classList.remove('active');
  moveKnob(50, 50);
}
dpad.addEventListener('pointerdown', e => {
  e.preventDefault(); if (menuOpen || padId !== null) return;
  padId = e.pointerId; try { dpad.setPointerCapture(e.pointerId); } catch (_) {}
  dpad.classList.add('active'); initAudio(); if (state === 'pause') state = 'play'; padMove(e);
});
dpad.addEventListener('pointermove', e => { if (e.pointerId === padId) { e.preventDefault(); padMove(e); } });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(ev, e => { if (e.pointerId === padId) padReset(); });
dpad.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('contextmenu', e => { if (!e.target.closest('input,select')) e.preventDefault(); });

/* ---------- Vollbild und Querformat ---------- */
const docEl = document.documentElement;
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
let noteT = 0;
function note(msg) { const n = $('note'); n.textContent = msg; n.classList.add('show'); clearTimeout(noteT); noteT = setTimeout(() => n.classList.remove('show'), 4200); }
async function toggleFs() {
  initAudio();
  try {
    if (isFs()) { const ex = document.exitFullscreen || document.webkitExitFullscreen; const r = ex && ex.call(document); if (r && r.then) await r; return; }
    const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
    if (!req) throw new Error('kein Vollbild');
    const r = req.call(docEl, {navigationUI: 'hide'}); if (r && r.then) await r;
    try { await screen.orientation.lock('landscape'); } catch (_) {}
  } catch (e) {
    note('Vollbild ist hier nicht möglich. Öffne das Spiel direkt im Browser. Auf dem iPhone: Teilen → „Zum Home-Bildschirm“, dann startet es ohne Browserleiste.');
  }
}
$('fsBtn').addEventListener('click', toggleFs);
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => { document.body.classList.toggle('is-fs', isFs()); setTimeout(fit, 60); });
const portraitMQ = matchMedia('(orientation: portrait) and (pointer: coarse)');
const portrait = () => portraitMQ.matches;
function onOrient() { if (portrait()) { for (const k in key) key[k] = false; padReset(); if (state === 'play' && !menuOpen) state = 'pause'; } setTimeout(fit, 60); }
portraitMQ.addEventListener ? portraitMQ.addEventListener('change', onOrient) : portraitMQ.addListener(onOrient);
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !menuOpen) state = 'pause'; });
