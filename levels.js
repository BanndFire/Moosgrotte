/* ============================================================
   levels.js – Die Ebenen: Farbwelten (THEMES), Bausteine (SEG) und die Liste aller Ebenen (LEVELS).
   Hier kannst du Ebenen ändern oder neue hinzufügen. Jede neue Ebene bekommt automatisch einen Knopf auf der 3D-Karte.
   ============================================================ */

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
  startSecret(b, x) {
    // Falltür gleich links vom Start, darunter ein Raum mit Sprungpilz zurück nach oben
    const g0 = G; b.ground(x, x+9, g0); b.fill(x, x+6, g0+2, g0+4, 'F'); b.fill(x, x+1, g0, g0+1, 'F');
    b.ent(x, g0+4, 'S'); b.ent(x+5, g0+4, 'O'); b.put(x+4, g0-1, 'P'); b.put(x+8, g0-1, 'o');
    return x+10;
  },
};

const LEVELS = [
  { name: 'Der Eingang', theme: 'moss', lan: 7, segs: [
    ['start'], ['flat',10,2], ['gap',2], ['flat',6,1], ['stairs'], ['spikeRun'], ['secretHill'], ['enemyRun'], ['check'],
    ['pillars'], ['planksZig'], ['gap',3], ['flat',8,2,true], ['crumbleBridge'], ['check'], ['wallClimb'], ['arch'],
    ['springUp'], ['gap',2], ['flat',8,2], ['door']] },
  { name: 'Wurzelgänge', theme: 'roots', lan: 8, segs: [
    ['start'], ['flat',8,2], ['movingCross'], ['check'], ['secretHill'], ['tunnel'], ['springUp'], ['gap',3], ['lift'], ['enemyRun'], ['check'],
    ['crumbleClimb'], ['shaft'], ['flat',8,2,true], ['spikeRun'], ['movingCross'], ['check'], ['planksZig'], ['dashGap'],
    ['arch'], ['door']] },
  { name: 'Kristallschlund', theme: 'crystal', lan: 8, segs: [
    ['start'], ['dashGap'], ['pillars',[1,3,5,3,1]], ['check'], ['secretCeil'], ['shaft'], ['crumbleBridge'], ['tunnel',18], ['lift'], ['check'],
    ['crumbleClimb'], ['movingCross'], ['enemyRun'], ['shaft'], ['check'], ['springUp'], ['crumbleBridge'],
    ['pillars',[2,4,2,4,6]], ['wallClimb'], ['spikeRun'], ['door']] },
  // Ab hier: Ebenen, die nach unten, nach oben oder beides führen
  { name: 'Pilzbrunnen', theme: 'fungus', lan: 8, h: 40, g0: 10, segs: [
    ['startSecret'], ['flat',8,2], ['descend',6], ['enemyRun'], ['secretHill'], ['descend',8], ['check'], ['crumbleBridge'],
    ['movingCross'], ['descend',6], ['tunnel'], ['secretCeil'], ['check'], ['pillars'], ['descend',4], ['springUp'],
    ['planksZig'], ['door']] },
  { name: 'Glutkamin', theme: 'ember', lan: 9, h: 40, g0: 34, segs: [
    ['start'], ['flat',6,1], ['climb',8], ['spikeRun'], ['secretHill'], ['climb',6], ['check'], ['crumbleClimb'], ['lift'],
    ['climb',6], ['enemyRun'], ['secretCeil'], ['check'], ['shaft'], ['wallClimb'], ['dashGap'], ['door']] },
  { name: 'Abgrundpfad', theme: 'abyss', lan: 10, h: 36, g0: 12, segs: [
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
  };
  let x = 0;
  for (const [name, ...args] of def.segs) x = SEG[name](b, x, ...args);
  const w = x, g = Array.from({length: LH}, () => Array(w).fill(' '));
  for (const [k, ch] of cells) { const r = Math.floor(k / 100000), c = k % 100000; if (c < w) g[r][c] = ch; }
  const L = { def, idx: i, theme: THEMES[def.theme], w, h: LH, tiles: g, lanterns: [], enemies: [], plats: [], springs: [], spikes: [],
    checks: [], crumbles: [], cmap: new Map(), fgroups: [], fmap: new Map(), occupied: new Set(), door: null, start: null };
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
