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

const THEMES = {
  moss: {stone:'#2b2340', deep:'#191428', light:'#3d3359', speck:'#211a34', top:'#4f8a46', topHi:'#93d97e', blade:'#6fbf5c',
    hang:'#4f8a46', plank:'#6b4a32', plankHi:'#8c6443', mush:'#ff7ab8', bg:['#0a0814','#1b1231'], lay:['#151027','#1d1733'], spore:[150,230,140],
    decor:['tuft','mush','tuft','pebble','flower','tuft']},
  roots: {stone:'#35251f', deep:'#1f150f', light:'#4a3529', speck:'#271a13', top:'#7a5a2e', topHi:'#d3a15f', blade:'#a8823f',
    hang:'#6b4a2a', plank:'#5c3a22', plankHi:'#8a5c36', mush:'#ffb347', bg:['#120a08','#2a1a12'], lay:['#1c120d','#271911'], spore:[255,190,120],
    decor:['root','mush','pebble','root','tuft']},
  crystal: {stone:'#1d2140', deep:'#10132a', light:'#2e3664', speck:'#161a36', top:'#355a92', topHi:'#9be8ff', blade:'#6cc6ef',
    hang:'#6cc6ef', plank:'#3d4a7a', plankHi:'#8fb4ee', mush:'#7ef0ff', bg:['#060816','#141a3a'], lay:['#0e1230','#151b40'], spore:[140,210,255],
    decor:['crystal','pebble','crystal','tuft']},
  fungus: {stone:'#1e2b33', deep:'#101a20', light:'#2e424c', speck:'#17222a', top:'#2f7a6e', topHi:'#86f2d4', blade:'#4fb8a0',
    hang:'#4fb8a0', plank:'#4a3a5c', plankHi:'#8a70b4', mush:'#ff6fb1', bg:['#071014','#13262c'], lay:['#0c1a1f','#122328'], spore:[255,140,200],
    decor:['bigmush','mush','tuft','bigmush','mush']},
  ember: {stone:'#3a1f1c', deep:'#1f0e0c', light:'#53302a', speck:'#2a1512', top:'#8a3a1e', topHi:'#ffb06a', blade:'#d0662e',
    hang:'#a04a26', plank:'#4a2a1e', plankHi:'#9a5a32', mush:'#ffcf6b', bg:['#140605','#341410'], lay:['#1f0b09','#2a110d'], spore:[255,150,80],
    decor:['ember','pebble','ember','tuft']},
  abyss: {stone:'#1a1630', deep:'#0b091a', light:'#2b2549', speck:'#141126', top:'#4a3a8a', topHi:'#cdaeff', blade:'#8d6fe0',
    hang:'#8d6fe0', plank:'#2e2a50', plankHi:'#8a7fd0', mush:'#cdaeff', bg:['#04030a','#120f26'], lay:['#0a0818','#100d22'], spore:[200,170,255],
    decor:['crystal','pebble','tuft','crystal']},
};
for (const k in THEMES) { const t = THEMES[k]; t.id = k; t.shades = [t.stone, mix(t.stone, t.deep, .35), mix(t.stone, t.deep, .7), t.deep]; }
