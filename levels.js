/* ============================================================
   levels.js – Die Ebenen: Farbwelten (THEMES), Bausteine (SEG) und die Liste aller Ebenen (LEVELS).
   Hier kannst du Ebenen ändern oder neue hinzufügen. Jede neue Ebene bekommt automatisch einen Knopf auf der 3D-Karte.
   ============================================================ */

/* ---------- Farbwelten ----------
   Jede Ebene wählt mit theme: eine dieser Welten. */
const THEMES = {
  /* --- Oberfläche: Himmel statt Höhlendecke (sky), keine Dunkelheit (dark: 0) --- */
  meadow: {sky: true, dark: 0, stone:'#8a5a3c', deep:'#4a2e1e', light:'#a87452', speck:'#6e4630', top:'#4fae3c', topHi:'#9be36f', blade:'#6fcf4f',
    hang:'#4f9a3a', plank:'#9a6b42', plankHi:'#c99460', mush:'#ff6f6f', bg:['#5fb4ff','#d6f1ff'], lay:['#a6dc8f','#7cc46a'], spore:[255,255,255],
    sun:'#fff3b0', decor:['tuft','flower','tuft','pebble','flower','mush']},
  autumn: {sky: true, dark: 0, stone:'#7a4f36', deep:'#3f2618', light:'#9a6a4a', speck:'#5e3a26', top:'#c98b2e', topHi:'#ffd26b', blade:'#e0a040',
    hang:'#b06a2a', plank:'#7a4a2a', plankHi:'#b4784a', mush:'#ff8a5a', bg:['#ff9f5e','#ffe3bd'], lay:['#e8a96a','#c98650'], spore:[255,220,160],
    sun:'#fff0c8', decor:['tuft','mush','pebble','flower','root','tuft']},
  /* --- Burgen: Ziegel (brick) und Türme im Hintergrund (towers) --- */
  castle: {sky: true, dark: 0, brick: true, towers: true, stone:'#7d7a8c', deep:'#4a4858', light:'#a19eb2', speck:'#5f5c6e', top:'#8c8a9c', topHi:'#c9c7d8',
    blade:'#6fbf5c', hang:'#5f8a4a', plank:'#6b4a32', plankHi:'#8c6443', mush:'#ff7ab8', bg:['#6fb8ff','#e0f3ff'], lay:['#a3a8c0','#878ca6'],
    spore:[255,255,255], sun:'#fff3b0', roof:'#b04a4a', decor:['torch','banner','tuft','pebble']},
  fortress: {sky: true, dark: 0.3, brick: true, towers: true, stone:'#4f4a60', deep:'#2a2638', light:'#6e6884', speck:'#3a3550', top:'#5a5570', topHi:'#9a94b4',
    blade:'#8a6fd0', hang:'#6a5aa0', plank:'#3e3352', plankHi:'#7a6aa0', mush:'#cdaeff', bg:['#2a1f4a','#e2735a'], lay:['#3e3058','#2a2040'],
    spore:[255,170,120], sun:'#ffb08a', roof:'#5a3a8a', decor:['torch','banner','pebble','torch']},
  /* --- Höhlen --- */
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


/* ---------- Ebenen-Bausteine ----------
   Jeder Abschnitt beginnt und endet auf Bodenhöhe G, damit sie sich frei kombinieren lassen. */
const SEG = {
  start(b, x) { b.ground(x, x+7); b.put(x+2, G-1, 'P'); b.put(x+6, G-1, 'o'); return x+8; },
  door(b, x) { b.ground(x, x+9); b.put(x+3, G-2, 'o'); b.put(x+6, G-1, 'D'); return x+10; },
  check(b, x) { b.ground(x, x+5); b.put(x+2, G-1, 'C'); return x+6; },
  flat(b, x, n = 8, lan = 2, enemy = false) {
    b.ground(x, x+n-1);
    for (let i = 1; i <= lan; i++) b.put(x + Math.round(i*n/(lan+1)), i % 2 ? G-1 : G-3, 'o');
    if (enemy) b.put(x+n-3, G-1, 'e');
    return x+n;
  },
  gap(b, x, n = 2) { b.put(x + Math.floor((n-1)/2), G-3, 'o'); return x+n; },
  stairs(b, x) {
    b.ground(x, x+2); b.ground(x+3, x+5, G-2); b.ground(x+6, x+10, G-4); b.put(x+8, G-6, 'o');
    b.ground(x+11, x+13, G-2); b.put(x+12, G-3, 'o'); b.ground(x+14, x+15); return x+16;
  },
  spikeRun(b, x) {
    b.ground(x, x+11); b.fill(x+3, x+8, G-1, G-1, '^'); b.fill(x+2, x+9, G-2, G-2, '=');
    b.put(x+4, G-3, 'o'); b.put(x+7, G-5, 'o'); return x+12;
  },
  pillars(b, x, tops = [1, 3, 2, 4, 2]) {
    let c = x; b.ground(c, c+1); c += 2;
    tops.forEach((t, i) => { c += 2; b.ground(c, c+1, G-t); if (i % 2) b.put(c, G-t-2, 'o'); c += 2; });
    c += 2; b.ground(c, c+2); return c+3;
  },
  tunnel(b, x, n = 14) {
    b.ground(x, x+n-1); b.fill(x+2, x+n-3, 0, G-4, '#');
    for (let c = x+4; c < x+n-4; c += 4) { b.put(c, G-3, 'w'); b.put(c+1, G-3, 'w'); }
    b.put(x+3, G-1, 'o'); b.put(x+n-4, G-1, 'o'); b.put(x+Math.floor(n/2)-1, G-1, 'e'); return x+n;
  },
  shaft(b, x) {
    b.ground(x, x+5); b.fill(x+3, x+3, 0, G-3, '#'); b.ground(x+6, x+12, G-7);
    b.put(x+4, G-4, 'o'); b.put(x+5, G-7, 'o'); b.put(x+9, G-9, 'o');
    b.ground(x+13, x+14, G-5); b.ground(x+15, x+16, G-3); b.ground(x+17, x+18); return x+19;
  },
  wallClimb(b, x) {
    b.ground(x, x+2); b.ground(x+3, x+8, G-5); b.put(x+2, G-4, 'o'); b.put(x+5, G-7, 'o'); b.put(x+7, G-7, 'o');
    b.ground(x+9, x+10, G-3); b.ground(x+11, x+13); return x+14;
  },
  crumbleBridge(b, x) {
    b.ground(x, x+1); for (const o of [2, 5, 8]) b.fill(x+o, x+o+1, G, G, 'X');
    b.put(x+4, G-2, 'o'); b.put(x+7, G-2, 'o'); b.put(x+10, G-2, 'o'); b.ground(x+11, x+13); return x+14;
  },
  crumbleClimb(b, x) {
    b.ground(x, x+2); b.ground(x+3, x+12); b.fill(x+3, x+12, G-1, G-1, '^');
    b.fill(x+4, x+5, G-2, G-2, 'X'); b.fill(x+7, x+8, G-4, G-4, 'X'); b.fill(x+10, x+11, G-6, G-6, 'X');
    b.put(x+6, G-4, 'o'); b.put(x+9, G-6, 'o');
    b.ground(x+13, x+16, G-6); b.put(x+15, G-8, 'o');
    b.ground(x+17, x+18, G-4); b.ground(x+19, x+20, G-2); b.ground(x+21, x+22); return x+23;
  },
  movingCross(b, x) {
    b.ground(x, x+1); b.put(x+3, G-1, 'm'); b.put(x+5, G-3, 'o'); b.put(x+9, G-2, 'M'); b.put(x+11, G-4, 'o');
    b.put(x+14, G-3, 'o'); b.ground(x+16, x+18); return x+19;
  },
  lift(b, x) {
    b.ground(x, x+3); b.put(x+5, G-1, 'v'); b.put(x+6, G-5, 'o'); b.ground(x+8, x+13, G-6);
    b.put(x+10, G-8, 'o'); b.put(x+12, G-8, 'o');
    b.ground(x+14, x+15, G-4); b.ground(x+16, x+17, G-2); b.ground(x+18, x+19); return x+20;
  },
  springUp(b, x) {
    b.ground(x, x+12); b.put(x+3, G-1, 'S'); b.fill(x+4, x+10, G-7, G-7, '=');
    b.put(x+5, G-8, 'o'); b.put(x+7, G-8, 'o'); b.put(x+9, G-8, 'o'); b.put(x+9, G-1, 'e'); return x+13;
  },
  enemyRun(b, x) {
    b.ground(x, x+13); b.ground(x+6, x+7, G-2); b.put(x+3, G-1, 'e'); b.put(x+11, G-1, 'e'); b.put(x+9, G-1, '^');
    b.put(x+6, G-4, 'o'); b.put(x+2, G-2, 'o'); b.put(x+12, G-3, 'o'); return x+14;
  },
  planksZig(b, x) {
    b.ground(x, x+13); b.fill(x+2, x+4, G-2, G-2, '='); b.fill(x+6, x+8, G-4, G-4, '=');
    b.fill(x+2, x+4, G-6, G-6, '='); b.fill(x+6, x+9, G-8, G-8, '=');
    b.put(x+3, G-3, 'o'); b.put(x+3, G-7, 'o'); b.put(x+7, G-9, 'o'); b.put(x+9, G-9, 'o'); return x+14;
  },
  arch(b, x) {
    b.ground(x, x+11); b.fill(x, x+11, 0, G-7, '#'); b.fill(x+1, x+2, G-6, G-6, '#'); b.fill(x+9, x+10, G-6, G-6, '#');
    b.ground(x+5, x+6, G-1); b.put(x+4, G-3, 'o'); b.put(x+7, G-3, 'o'); return x+12;
  },
  dashGap(b, x) { b.ground(x, x+1); b.put(x+3, G-3, 'o'); b.put(x+6, G-3, 'o'); b.ground(x+8, x+10); return x+11; },

  /* --- Richtungswechsel: nach unten und nach oben --- */
  descend(b, x, d = 8) {
    // Fallschacht: hohe Wand rechts zwingt nach unten, unten geht es durch eine Öffnung weiter
    const g0 = G; b.ground(x, x+3, g0);
    b.fill(x+8, x+9, g0-5, g0+d-3, '#');
    b.ground(x+4, x+15, g0+d);
    for (let k = 3, s = 0; k <= d-3; k += 3, s ^= 1) b.put(s ? x+7 : x+4, g0+k, '#');
    b.put(x+6, g0+2, 'o'); b.put(x+12, g0+d-2, 'o');
    G = g0 + d; return x+16;
  },
  climb(b, x, h = 8) {
    // Kamin: Vorsprünge im Wechsel links und rechts, oben geht es auf höherem Boden weiter
    const g0 = G, top = g0 - h;
    b.ground(x, x+6, g0); b.fill(x+3, x+3, top-6, g0-3, '#'); b.ground(x+7, x+14, top);
    for (let k = 2, s = 0; g0-k > top+1; k += 2, s ^= 1) b.put(s ? x+4 : x+6, g0-k, '#');
    b.put(x+5, g0 - Math.floor(h/2) - 1, 'o'); b.put(x+11, top-2, 'o');
    G = top; return x+15;
  },

  /* --- Geheimnisse: F sieht aus wie Fels, ist aber begehbar --- */
  secretHill(b, x) {
    // Hügel mit verstecktem Raum: von der Stufe aus einfach gegen die Wand laufen
    const g0 = G; b.ground(x, x+13, g0); b.ground(x+1, x+2, g0-2); b.ground(x+3, x+12, g0-4);
    b.fill(x+3, x+10, g0-3, g0-1, 'F'); b.ent(x+9, g0-1, 'O');
    b.put(x+7, g0-6, 'o'); return x+14;
  },
  secretCeil(b, x) {
    // Gang mit dicker Decke, darüber ein Raum: nur mit Sprung und Dash nach oben erreichbar
    const g0 = G; b.ground(x, x+13, g0); b.fill(x, x+13, Math.max(0, g0-12), g0-4, '#');
    b.fill(x+4, x+10, g0-8, g0-6, 'F'); b.fill(x+6, x+7, g0-5, g0-4, 'F');
    b.ent(x+9, g0-6, 'O'); b.put(x+3, g0-1, 'o'); b.put(x+11, g0-1, 'o');
    return x+14;
  },
  /* --- Burg: dicke Mauer mit Tür, dahinter der Bossraum (dort bleibt die Kamera stehen) --- */
  boss(b, x, kind = 'mini') {
    const g = G;
    b.ground(x, x + 4);                        // Vorplatz vor der Mauer
    b.fill(x + 5, x + 8, 0, g - 1, '#');       // dicke Burgmauer …
    b.ground(x + 5, x + 8);
    b.ent(x + 5, g - 1, 'B');                  // … mit einer Tür, in die man hineinläuft
    const a0 = x + 9, a1 = a0 + 14, top = Math.max(0, g - 11);
    b.ground(a0, a1); b.fill(a0, a1, 0, top, '#');   // Boden und Decke des Bossraums (15 Felder breit)
    b.fill(a1 + 1, a1 + 8, 0, LH - 1, '#');    // rechte Mauer
    b.ent(a1 - 3, g - 1, kind === 'big' ? 'Q' : 'K');
    b.meta.arena = {c0: a0, c1: a1, top: top + 1, floor: g};
    return a1 + 9;
  },
  startSecret(b, x) {
    // Falltür gleich links vom Start, darunter ein Raum mit Sprungpilz zurück nach oben
    const g0 = G; b.ground(x, x+9, g0); b.fill(x, x+6, g0+2, g0+4, 'F'); b.fill(x, x+1, g0, g0+1, 'F');
    b.ent(x, g0+4, 'S'); b.ent(x+5, g0+4, 'O'); b.put(x+4, g0-1, 'P'); b.put(x+8, g0-1, 'o');
    return x+10;
  },
};

const LEVELS = [
  /* ===== Oberfläche (Ebene 1–12) =====
     id: fester Name für Speicherstand und Rangliste (nie ändern, sonst gehen Bestzeiten verloren).
     boss: 'mini' = Zwischenboss, 'big' = Endboss. lan = Anzahl Laternen. h/g0 = Höhe der Ebene und Start-Bodenreihe. */
  { id: 's1', name: 'Sonnenwiese', theme: 'meadow', lan: 6, segs: [
    ['start'], ['flat',10,2], ['gap',2], ['flat',6,1], ['stairs'], ['enemyRun'], ['check'], ['pillars',[1,2,3,2,1]], ['gap',2],
    ['flat',8,2,true], ['secretHill'], ['springUp'], ['flat',6,1], ['door']] },
  { id: 's2', name: 'Blumenhügel', theme: 'meadow', lan: 7, segs: [
    ['start'], ['stairs'], ['gap',3], ['planksZig'], ['check'], ['enemyRun'], ['pillars'], ['secretHill'], ['crumbleBridge'], ['check'],
    ['wallClimb'], ['flat',8,2,true], ['dashGap'], ['flat',6,1], ['door']] },
  { id: 's3', name: 'Bachufer', theme: 'meadow', lan: 7, segs: [
    ['start'], ['flat',8,2], ['movingCross'], ['gap',2], ['spikeRun'], ['check'], ['lift'], ['crumbleBridge'], ['secretCeil'], ['enemyRun'],
    ['check'], ['movingCross'], ['springUp'], ['flat',6,1], ['door']] },
  { id: 's4', name: 'Pilzwäldchen', theme: 'meadow', lan: 8, h: 30, g0: 22, segs: [
    ['start'], ['flat',6,1], ['climb',6], ['enemyRun'], ['secretHill'], ['dashGap'], ['check'], ['tunnel'], ['crumbleClimb'], ['check'],
    ['descend',6], ['pillars',[2,4,2,4,2]], ['planksZig'], ['door']] },
  { id: 's5', name: 'Windige Klippen', theme: 'meadow', lan: 8, segs: [
    ['start'], ['dashGap'], ['pillars',[1,3,5,3,1]], ['check'], ['crumbleBridge'], ['wallClimb'], ['shaft'], ['check'], ['movingCross'],
    ['spikeRun'], ['secretHill'], ['lift'], ['enemyRun'], ['door']] },
  { id: 's6', name: 'Burg Knorrstein', theme: 'castle', lan: 6, boss: 'mini', segs: [
    ['start'], ['flat',6,1], ['stairs'], ['enemyRun'], ['check'], ['spikeRun'], ['pillars',[2,4,2,4,2]], ['crumbleBridge'], ['check'],
    ['secretHill'], ['flat',6,1], ['check'], ['boss','mini']] },
  /* ab hier etwas schwieriger */
  { id: 's7', name: 'Herbsthain', theme: 'autumn', lan: 8, segs: [
    ['start'], ['spikeRun'], ['gap',3], ['enemyRun'], ['check'], ['crumbleClimb'], ['dashGap'], ['secretHill'], ['movingCross'], ['check'],
    ['wallClimb'], ['spikeRun'], ['pillars',[1,4,2,5,3]], ['door']] },
  { id: 's8', name: 'Dornenpfad', theme: 'autumn', lan: 8, segs: [
    ['start'], ['flat',6,1], ['spikeRun'], ['spikeRun'], ['check'], ['planksZig'], ['crumbleBridge'], ['enemyRun'], ['check'],
    ['secretCeil'], ['shaft'], ['dashGap'], ['spikeRun'], ['door']] },
  { id: 's9', name: 'Bröckelschlucht', theme: 'autumn', lan: 9, h: 36, g0: 10, segs: [
    ['start'], ['crumbleBridge'], ['descend',8], ['crumbleClimb'], ['check'], ['crumbleBridge'], ['secretHill'], ['descend',6],
    ['movingCross'], ['check'], ['crumbleClimb'], ['dashGap'], ['enemyRun'], ['door']] },
  { id: 's10', name: 'Wolkenstufen', theme: 'meadow', lan: 9, h: 40, g0: 34, segs: [
    ['start'], ['climb',8], ['lift'], ['springUp'], ['check'], ['climb',6], ['movingCross'], ['secretCeil'], ['pillars',[2,4,6,4,2]],
    ['check'], ['climb',6], ['crumbleClimb'], ['dashGap'], ['door']] },
  { id: 's11', name: 'Sturmgrat', theme: 'autumn', lan: 10, segs: [
    ['start'], ['dashGap'], ['pillars',[2,4,2,4,6]], ['crumbleBridge'], ['check'], ['spikeRun'], ['wallClimb'], ['enemyRun'], ['shaft'],
    ['check'], ['movingCross'], ['secretHill'], ['crumbleClimb'], ['dashGap'], ['spikeRun'], ['door']] },
  { id: 's12', name: 'Schattenfeste', theme: 'fortress', lan: 8, boss: 'big', segs: [
    ['start'], ['spikeRun'], ['crumbleBridge'], ['check'], ['enemyRun'], ['wallClimb'], ['pillars',[2,4,6,4,2]], ['check'], ['shaft'],
    ['spikeRun'], ['dashGap'], ['secretHill'], ['check'], ['boss','big']] },

  /* ===== Höhlen (Ebene 13–18) ===== */
  { id: '0', name: 'Der Eingang', theme: 'moss', lan: 7, segs: [
    ['start'], ['flat',10,2], ['gap',2], ['flat',6,1], ['stairs'], ['spikeRun'], ['secretHill'], ['enemyRun'], ['check'],
    ['pillars'], ['planksZig'], ['gap',3], ['flat',8,2,true], ['crumbleBridge'], ['check'], ['wallClimb'], ['arch'],
    ['springUp'], ['gap',2], ['flat',8,2], ['door']] },
  { id: '1', name: 'Wurzelgänge', theme: 'roots', lan: 8, segs: [
    ['start'], ['flat',8,2], ['movingCross'], ['check'], ['secretHill'], ['tunnel'], ['springUp'], ['gap',3], ['lift'], ['enemyRun'], ['check'],
    ['crumbleClimb'], ['shaft'], ['flat',8,2,true], ['spikeRun'], ['movingCross'], ['check'], ['planksZig'], ['dashGap'],
    ['arch'], ['door']] },
  { id: '2', name: 'Kristallschlund', theme: 'crystal', lan: 8, segs: [
    ['start'], ['dashGap'], ['pillars',[1,3,5,3,1]], ['check'], ['secretCeil'], ['shaft'], ['crumbleBridge'], ['tunnel',18], ['lift'], ['check'],
    ['crumbleClimb'], ['movingCross'], ['enemyRun'], ['shaft'], ['check'], ['springUp'], ['crumbleBridge'],
    ['pillars',[2,4,2,4,6]], ['wallClimb'], ['spikeRun'], ['door']] },
  // Ab hier: Ebenen, die nach unten, nach oben oder beides führen
  { id: '3', name: 'Pilzbrunnen', theme: 'fungus', lan: 8, h: 40, g0: 10, segs: [
    ['startSecret'], ['flat',8,2], ['descend',6], ['enemyRun'], ['secretHill'], ['descend',8], ['check'], ['crumbleBridge'],
    ['movingCross'], ['descend',6], ['tunnel'], ['secretCeil'], ['check'], ['pillars'], ['descend',4], ['springUp'],
    ['planksZig'], ['door']] },
  { id: '4', name: 'Glutkamin', theme: 'ember', lan: 9, h: 40, g0: 34, segs: [
    ['start'], ['flat',6,1], ['climb',8], ['spikeRun'], ['secretHill'], ['climb',6], ['check'], ['crumbleClimb'], ['lift'],
    ['climb',6], ['enemyRun'], ['secretCeil'], ['check'], ['shaft'], ['wallClimb'], ['dashGap'], ['door']] },
  { id: '5', name: 'Abgrundpfad', theme: 'abyss', lan: 10, h: 36, g0: 12, segs: [
    ['startSecret'], ['dashGap'], ['descend',8], ['crumbleBridge'], ['secretHill'], ['climb',6], ['tunnel',18], ['check'],
    ['descend',10], ['movingCross'], ['enemyRun'], ['climb',8], ['check'], ['secretCeil'], ['pillars',[2,4,2,4,6]],
    ['descend',6], ['crumbleClimb'], ['shaft'], ['door']] },
];

function makeLevel(i) {
  const def = LEVELS[i], cells = new Map(), ents = [];
  LH = def.h || 18; G = def.g0 || 14;
  const b = {
    fill(c1, c2, r1, r2, ch) { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (r >= 0 && r < LH) cells.set(r * 100000 + c, ch); },
    put(c, r, ch) { b.fill(c, c, r, r, ch); },
    ent(c, r, ch) { ents.push([c, r, ch]); },  // Objekt, das die Kachel darunter (z. B. Scheinfels) nicht ersetzt
    ground(c1, c2, top = G) { b.fill(c1, c2, top, LH - 1, '#'); },
    meta: {},
  };
  let x = 0;
  for (const [name, ...args] of def.segs) x = SEG[name](b, x, ...args);
  const w = x, g = Array.from({length: LH}, () => Array(w).fill(' '));
  for (const [k, ch] of cells) { const r = Math.floor(k / 100000), c = k % 100000; if (c < w) g[r][c] = ch; }
  const L = { def, idx: i, theme: THEMES[def.theme], w, h: LH, tiles: g, lanterns: [], enemies: [], plats: [], springs: [], spikes: [],
    checks: [], crumbles: [], cmap: new Map(), fgroups: [], fmap: new Map(), occupied: new Set(), door: null, start: null,
    bossDoor: null, boss: null, arena: null, inArena: false };
  if (b.meta.arena) { const a = b.meta.arena; L.arena = {x0: a.c0 * T, x1: (a.c1 + 1) * T, y0: a.top * T, y1: a.floor * T}; }
  const add = (ch, c, r) => {
    const px = c * T, py = r * T;
    L.occupied.add(r * w + c);
    if (ch === 'P') L.start = {x: px + 7, y: py + T - 24};
    else if (ch === 'o' || ch === 'O') L.lanterns.push({x: px + 16, y: py + 16, got: false, ph: (c * 7 + r * 3) % 6, secret: ch === 'O'});
    else if (ch === 'e') L.enemies.push({sx: px + 5, sy: py + T - 16, x: px + 5, y: py + T - 16, w: 22, h: 16, vx: 0, vy: 0, dir: -1, alive: true});
    else if ('mMv'.includes(ch)) L.plats.push({ox: px, oy: py, x: px, y: py, w: 64, h: 12, axis: ch === 'v' ? 'v' : 'm', range: 96, t: ch === 'M' ? 157 : 0, dx: 0, dy: 0});
    else if (ch === 'S') L.springs.push({x: px, y: py, sq: 0});
    else if (ch === '^') L.spikes.push({x: px, y: py, down: false});
    else if (ch === 'w') L.spikes.push({x: px, y: py, down: true});
    else if (ch === 'C') L.checks.push({x: px, y: py, on: false});
    else if (ch === 'D') L.door = {x: px, y: py};
    else if (ch === 'B') L.bossDoor = {x: px, y: py};
    else if (ch === 'K' || ch === 'Q') {
      const big = ch === 'Q', w = big ? 76 : 58, h = big ? 58 : 44;
      L.boss = {kind: big ? 'big' : 'mini', name: big ? 'Steinkönig Grumm' : 'Panzerkäfer Krax', w, h, sx: px + T - w, sy: py + T - h, max: big ? 5 : 3};
    }
  };
  for (let r = 0; r < LH; r++) for (let c = 0; c < w; c++) {
    const ch = g[r][c];
    if ('#= XF'.includes(ch)) continue;
    g[r][c] = ' '; add(ch, c, r);
  }
  for (const [c, r, ch] of ents) if (c < w && r < LH) add(ch, c, r);
  // Bröckelplatten: zusammenhängende X in einer Reihe bilden eine Gruppe
  for (let r = 0; r < LH; r++) for (let c = 0; c < w; c++) {
    if (g[r][c] !== 'X' || L.cmap.has(r * w + c)) continue;
    let c2 = c; while (c2 + 1 < w && g[r][c2 + 1] === 'X') c2++;
    const grp = {x: c * T, y: r * T, w: (c2 - c + 1) * T, solid: true, timer: 0, gone: 0, touched: false, flash: 0};
    L.crumbles.push(grp);
    for (let k = c; k <= c2; k++) L.cmap.set(r * w + k, grp);
  }
  // Scheinfels: zusammenhängende F-Kacheln bilden einen Geheimraum
  for (let r = 0; r < LH; r++) for (let c = 0; c < w; c++) {
    if (g[r][c] !== 'F' || L.fmap.has(r * w + c)) continue;
    const grp = {alpha: 1, found: false, inside: false}, stack = [[c, r]];
    L.fgroups.push(grp); L.fmap.set(r * w + c, grp);
    while (stack.length) {
      const [cc, rr] = stack.pop();
      for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nc = cc + dc, nr = rr + dr;
        if (nr >= 0 && nr < LH && nc >= 0 && nc < w && g[nr][nc] === 'F' && !L.fmap.has(nr * w + nc)) { L.fmap.set(nr * w + nc, grp); stack.push([nc, nr]); }
      }
    }
  }
  // Laternen: geheime bleiben immer, die übrigen werden gleichmäßig über die Ebene ausgedünnt
  for (const s of L.lanterns) s.grp = L.fmap.get(Math.floor(s.y / T) * w + Math.floor(s.x / T)) || null;
  const sec = L.lanterns.filter(s => s.secret), norm = L.lanterns.filter(s => !s.secret).sort((a, b) => a.x - b.x);
  const keep = Math.max(0, Math.min(norm.length, (def.lan || 8) - sec.length)), pick = [];
  for (let k = 0; k < keep; k++) pick.push(norm[Math.floor((k + 0.5) * norm.length / keep)]);
  L.lanterns = [...pick, ...sec];
  return L;
}
LEVELS.forEach((d, i) => { d.total = makeLevel(i).lanterns.length; });
