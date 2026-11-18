/* ============================================================
   basis.js – Grundlagen: Spielfläche, Bildschirmgrösse, Farben und Lumi-Farben (Skins)
   ============================================================ */

const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
let VW = 640, VH = 360; const T = 32, GRAV = 0.55;
let G = 14, LH = 18;  // aktuelle Bodenreihe beim Bauen und Höhe der geladenen Ebene
const lc = document.createElement('canvas'), lx = lc.getContext('2d');
const FONT = '"Pixelify Sans", ui-monospace, monospace';
const BODY = '"Rubik", system-ui, "Segoe UI", sans-serif';
let S = 2;
const scr = $('screen');
function fit() {
  // Sichtbreite passt sich dem Bildschirm an, damit das Spiel den ganzen Querformat-Bildschirm füllt
  const sw = scr.clientWidth || 640, sh = scr.clientHeight || 360;
  VH = Math.round(Math.max(360, Math.min(470, sh / 1.7)));
  VW = Math.round(Math.max(480, Math.min(900, VH * sw / sh)));
  const k = Math.min(sw / VW, sh / VH), cw = VW * k, ch = VH * k;
  Object.assign(cv.style, {width: cw + 'px', height: ch + 'px', left: (sw - cw) / 2 + 'px', top: (sh - ch) / 2 + 'px'});
  S = Math.max(1, Math.min(3, cw * (window.devicePixelRatio || 1) / VW));
  cv.width = lc.width = Math.round(VW * S); cv.height = lc.height = Math.round(VH * S);
  try { if (L) updateCam(true); } catch (_) {}
}
fit(); addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 250));
if (window.ResizeObserver) new ResizeObserver(fit).observe(scr);

/* ---------- Farben ---------- */
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const SKINS = [
  ['Rot', '#ff5d5d'], ['Orange', '#ff9a3c'], ['Gelb', '#ffcf6b'], ['Grün', '#6fdc7a'],
  ['Blau', '#55b8ff'], ['Indigo', '#7d7cff'], ['Violett', '#c77dff'],
].map(([name, c]) => ({name, c, dim: mix(c, '#000000', 0.3), hi: mix(c, '#ffffff', 0.65), feet: mix(c, '#000000', 0.45), rgb: hex2rgb(c)}));

