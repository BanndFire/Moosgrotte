/* ============================================================
   start.js – startet das Spiel und die Spielschleife (60 Bilder pro Sekunde)
   ============================================================ */

/* ---------- Schleife ---------- */
loadLevel(0); enterWorld(save.at || 0, -1, true); openMenu('home');
let acc = 0, last = performance.now();
function frame(t) {
  acc += Math.min(100, t - last); last = t;
  while (acc >= 1000 / 60) { if (!portrait() && (state !== 'pause' || menuOpen)) update(); netTick(); acc -= 1000 / 60; }
  render(); drawPreview();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
