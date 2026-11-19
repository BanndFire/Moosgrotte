/* ============================================================
   online.js – Online mit Firebase: Konto (Username + Passwort), Rangliste und Gruppen mit Geistern
   ============================================================ */

/* ---------- Online (Firebase) ---------- */
const NET = {status: 'off', uid: null, name: null, db: null, room: null, peers: {}, connected: false, lbLvl: 0};
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const NAME_RE = /^[A-Za-z0-9_-]{3,16}$/;
const ghosts = {};
function loadScript(src) {
  return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('Laden fehlgeschlagen: ' + src)); document.head.appendChild(s); });
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, bad) => setTimeout(() => bad(new Error('Zeitüberschreitung')), ms))]);
const emailFor = n => n.toLowerCase() + '@' + ((window.MOOS_FIREBASE && window.MOOS_FIREBASE.authDomain) || 'moosgrotte.app');
async function freshAnon() {
  const auth = firebase.auth();
  if (auth.currentUser && !auth.currentUser.isAnonymous) await auth.signOut();
  const u = auth.currentUser || (await withTimeout(auth.signInAnonymously(), 12000)).user;
  NET.uid = u.uid; NET.anon = true; NET.name = null;
  return u;
}
async function netInit() {
  const cfg = window.MOOS_FIREBASE;
  if (!cfg || !cfg.apiKey || !cfg.databaseURL) { NET.status = 'off'; renderOnline(); return; }
  NET.status = 'connecting'; renderOnline();
  try {
    if (!window.firebase) { await loadScript(FB + 'firebase-app-compat.js'); await loadScript(FB + 'firebase-auth-compat.js'); await loadScript(FB + 'firebase-database-compat.js'); }
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    const auth = firebase.auth();
    let u = await new Promise(ok => { const off = auth.onAuthStateChanged(x => { off(); ok(x); }); });
    if (!u) u = (await withTimeout(auth.signInAnonymously(), 12000)).user;
    NET.uid = u.uid; NET.anon = u.isAnonymous; NET.db = firebase.database();
    NET.db.ref('.info/connected').on('value', s => { NET.connected = !!s.val(); renderNetState(); });
    const snap = await withTimeout(NET.db.ref('users/' + NET.uid + '/name').get(), 12000);
    NET.name = snap.val(); NET.status = 'on';
    if (!NET.name) { if (!u.isAnonymous) await freshAnon(); showGate('new'); }
    else if (NET.anon) showGate('secure');  // altes Konto ohne Passwort: Passwort festlegen
    renderOnline();
  } catch (e) {
    console.warn('Online nicht verfügbar', e);
    NET.status = 'error'; renderOnline();
  }
}
function renderNetState() {
  const t = {off: 'Nicht eingerichtet', connecting: 'Verbinde …', error: 'Keine Verbindung', on: NET.connected ? 'Online' + (NET.name ? ' als ' + NET.name : '') : 'Verbindung unterbrochen'}[NET.status];
  $('netState').innerHTML = `<span class="netdot${NET.status === 'on' && NET.connected ? ' on' : ''}"></span>`;
  $('netState').append(t);
}
function renderOnline() {
  renderNetState();
  const on = NET.status === 'on' && !!NET.name;
  $('onlineOn').hidden = !on; $('onlineOff').hidden = on;
  if (!on) {
    $('offText').textContent = NET.status === 'off' ? 'Die Online-Funktionen sind noch nicht eingerichtet. Wie das geht, steht in der Anleitung ANLEITUNG-ONLINE.txt. Offline kannst du ganz normal spielen.'
      : NET.status === 'connecting' ? 'Verbinde mit dem Server …'
      : NET.status === 'on' ? 'Melde dich zuerst an.'
      : NET.status === 'skipped' ? 'Du spielst gerade offline. Melde dich an, um in der Rangliste zu erscheinen und mit Freunden zu spielen.'
      : 'Der Server ist gerade nicht erreichbar. Prüfe die Internetverbindung und lade die Seite neu. Offline kannst du weiterspielen.';
    $('offLogin').hidden = NET.status !== 'skipped';
    if (NET.status === 'on' && !NET.name && $('gate').hidden) showGate('new');
    return;
  }
  renderGroup(); renderBoard();
}

/* Konto: Username und Passwort */
// Firebase braucht intern eine E-Mail-Adresse. Wir bilden sie aus dem Username, es wird nie eine Mail verschickt.
let gateMode = 'new', gateTimer = 0, gateSeq = 0, nameFree = false;
const GATE_TEXT = {
  new: 'Wähle einen Username und ein Passwort. Damit kannst du dich auf jedem Gerät anmelden.',
  login: 'Melde dich mit deinem Username und Passwort an.',
  secure: 'Lege ein Passwort fest. Dann kannst du dich auf jedem Gerät mit deinem Namen anmelden und verlierst ihn nie.',
};
function setGateMode(m) {
  gateMode = m;
  $('gateTabs').hidden = m === 'secure';
  $('gateTabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m));
  $('gateTitle').textContent = m === 'secure' ? 'PASSWORT FESTLEGEN' : m === 'login' ? 'ANMELDEN' : 'WILLKOMMEN';
  $('gateText').textContent = GATE_TEXT[m];
  $('gateName').readOnly = m === 'secure';
  $('gatePw').setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
  $('gateOk').textContent = m === 'login' ? 'Anmelden' : m === 'secure' ? 'Speichern' : "Los geht's";
  $('gateSkip').textContent = m === 'secure' ? 'Später' : 'Offline spielen';
  $('gateHint').textContent = m === 'login' ? 'Passwort vergessen? Frag den Spiel-Admin.' : m === 'new' ? 'Schreib dir dein Passwort gut auf.' : '';
  gateMsg(''); gateCheck();
}
function showGate(mode) {
  $('gate').hidden = false;
  $('gateName').value = mode === 'secure' ? NET.name || '' : '';
  $('gatePw').value = '';
  setGateMode(mode);
  setTimeout(() => { try { $(mode === 'secure' ? 'gatePw' : 'gateName').focus({preventScroll: true}); } catch (e) {} }, 50);
}
function gateMsg(t, cls = '') { const m = $('gateMsg'); m.textContent = t; m.className = 'msg ' + cls; }
function nameMsg(t, cls = '') { const m = $('gateNameMsg'); m.textContent = t; m.className = 'msg ' + cls; }
function gateReady() {
  const v = $('gateName').value.trim(), pw = $('gatePw').value;
  const ok = NAME_RE.test(v) && pw.length >= 6 && (gateMode !== 'new' || nameFree);
  $('gateOk').disabled = !ok;
}
function gateCheck() {
  const v = $('gateName').value.trim(), seq = ++gateSeq;
  clearTimeout(gateTimer); nameFree = false;
  if (gateMode === 'secure') { nameMsg(''); return gateReady(); }
  if (!v) { nameMsg('3 bis 16 Zeichen: Buchstaben, Zahlen, _ und -'); return gateReady(); }
  if (!NAME_RE.test(v)) { nameMsg(v.length < 3 ? 'Mindestens 3 Zeichen' : 'Nur Buchstaben ohne Umlaute, Zahlen, _ und -', 'bad'); return gateReady(); }
  if (gateMode === 'login') { nameMsg(''); return gateReady(); }
  nameMsg('Prüfe …'); gateReady();
  gateTimer = setTimeout(async () => {
    try {
      const s = await withTimeout(NET.db.ref('names/' + v.toLowerCase()).get(), 10000);
      if (seq !== gateSeq) return;
      nameFree = !(s.exists() && s.val() !== NET.uid);
      nameFree ? nameMsg('Der Name ist frei', 'ok') : nameMsg('Dieser Name ist schon vergeben. Ist es deiner? Dann tippe auf „Anmelden“.', 'bad');
    } catch (e) { if (seq === gateSeq) nameMsg('Server nicht erreichbar, versuch es nochmal', 'bad'); }
    gateReady();
  }, 350);
}
function authError(e) {
  const c = (e && e.code) || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-login|invalid-email/.test(c)) return 'Username oder Passwort stimmt nicht';
  if (/too-many-requests/.test(c)) return 'Zu viele Versuche. Warte kurz und versuch es nochmal.';
  if (/weak-password/.test(c)) return 'Das Passwort ist zu kurz (mindestens 6 Zeichen)';
  if (/operation-not-allowed/.test(c)) return 'Anmeldung mit Passwort ist in Firebase noch nicht eingeschaltet (siehe Anleitung).';
  if (/network|Zeitüberschreitung/.test(c + (e && e.message))) return 'Keine Verbindung zum Server';
  if (e && e.message === 'vergeben') return 'Dieser Name wurde gerade vergeben';
  return 'Das hat nicht geklappt, versuch es nochmal';
}
async function register(name, pw) {
  const auth = firebase.auth(), key = name.toLowerCase();
  const u = auth.currentUser && auth.currentUser.isAnonymous ? auth.currentUser : await freshAnon();
  NET.uid = u.uid;
  const r = await NET.db.ref('names/' + key).transaction(cur => (cur === null || cur === u.uid) ? u.uid : undefined);
  if (!r.committed) throw new Error('vergeben');
  try { await u.linkWithCredential(firebase.auth.EmailAuthProvider.credential(emailFor(name), pw)); }
  catch (e) { await NET.db.ref('names/' + key).remove().catch(() => {}); throw e; }
  await NET.db.ref('users/' + u.uid).set({name});
  NET.name = name; NET.anon = false;
}
async function login(name, pw) {
  const res = await firebase.auth().signInWithEmailAndPassword(emailFor(name), pw);
  NET.uid = res.user.uid; NET.anon = false;
  const s = await NET.db.ref('users/' + NET.uid + '/name').get();
  NET.name = s.val() || name;
}
async function secure(pw) {
  const u = firebase.auth().currentUser;
  await u.linkWithCredential(firebase.auth.EmailAuthProvider.credential(emailFor(NET.name), pw));
  NET.anon = false;
}
$('gateName').addEventListener('input', gateCheck);
$('gatePw').addEventListener('input', () => { gateMsg(''); gateReady(); });
$('gateEye').addEventListener('click', () => {
  const show = $('gatePw').type === 'password';
  $('gatePw').type = show ? 'text' : 'password'; $('gateEye').textContent = show ? 'Verbergen' : 'Zeigen';
});
$('gateTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setGateMode(b.dataset.m); });
$('gateForm').addEventListener('submit', async e => {
  e.preventDefault();
  if ($('gateOk').disabled) return;
  const name = $('gateName').value.trim(), pw = $('gatePw').value, mode = gateMode;
  $('gateOk').disabled = true; gateMsg(mode === 'login' ? 'Melde an …' : 'Speichere …');
  try {
    if (mode === 'new') await withTimeout(register(name, pw), 15000);
    else if (mode === 'login') { leaveRoom(true); await withTimeout(login(name, pw), 15000); }
    else await withTimeout(secure(pw), 15000);
    $('gate').hidden = true; $('gatePw').value = '';
    NET.status = 'on'; renderOnline(); renderSettings(); netPresence(true);
    if (mode !== 'secure') toast('Hallo ' + NET.name + '!');
  } catch (err) {
    console.warn(err); gateMsg(authError(err), 'bad'); gateReady();
  }
});
$('gateSkip').addEventListener('click', () => { $('gate').hidden = true; if (gateMode !== 'secure') NET.status = 'skipped'; renderOnline(); renderSettings(); });
$('offLogin').addEventListener('click', () => { NET.status = 'on'; showGate('login'); });
$('setName').addEventListener('click', async () => {
  if (NET.anon) return showGate('secure');
  leaveRoom(false);
  try { await firebase.auth().signOut(); await freshAnon(); } catch (e) {}
  renderOnline(); renderSettings(); showGate('login');
});

/* Rangliste: zählt jede geschaffte Runde, die schnellste Zeit gewinnt */
const scoreKey = i => LEVELS[i].id + '_7';   // neue Rangliste ab dieser Version
let lbSeq = 0;
function renderBoard() {
  const chips = $('lbLvl');
  if (!chips.children.length) LEVELS.forEach((d, i) => {
    const b = document.createElement('button'); b.textContent = i + 1; b.title = d.name; b.setAttribute('aria-label', 'Ebene ' + (i + 1) + ', ' + d.name);
    b.addEventListener('click', () => { NET.lbLvl = i; renderBoard(); }); chips.appendChild(b);
  });
  [...chips.children].forEach((b, i) => b.setAttribute('aria-pressed', i === NET.lbLvl));
  loadBoard();
}
async function loadBoard() {
  const seq = ++lbSeq, lvl = NET.lbLvl, mode = 'f', body = $('lbBody');
  body.innerHTML = '<tr><td></td><td class="muted">Lade …</td><td></td></tr>';
  $('lbMe').textContent = '';
  try {
    const [snap, mine] = await withTimeout(Promise.all([
      NET.db.ref('scores/' + scoreKey(lvl)).orderByChild(mode).startAt(1).limitToFirst(60).get(),
      NET.db.ref(`scores/${scoreKey(lvl)}/${NET.uid}`).get()]), 10000);
    if (seq !== lbSeq) return;
    const rows = [];
    snap.forEach(c => { const v = c.val(); if (v) rows.push({uid: c.key, ...v}); });
    rows.sort((a, b) => a[mode] - b[mode]); rows.length = Math.min(rows.length, 10);
    body.innerHTML = '';
    if (!rows.length) body.innerHTML = '<tr><td></td><td class="muted">Noch keine Zeiten. Sei die oder der Erste!</td><td></td></tr>';
    rows.forEach((r, i) => {
      const tr = document.createElement('tr'); if (r.uid === NET.uid) tr.className = 'me';
      const cells = [i + 1, r.name || '?', fmt(r[mode])];
      cells.forEach((c, j) => { const td = document.createElement('td'); td.textContent = c; if (j > 1) td.className = 'num'; tr.appendChild(td); });
      body.appendChild(tr);
    });
    const m = mine.val();
    $('lbMe').textContent = m && m.f ? `Deine Bestzeit: ${fmt(m.f)}` : 'Du hast diese Ebene noch nicht geschafft.';
  } catch (e) {
    if (seq === lbSeq) body.innerHTML = '<tr><td></td><td class="muted">Rangliste konnte nicht geladen werden.</td><td></td></tr>';
  }
}
async function netScore(lvl, t, lan, total) {
  if (NET.status !== 'on' || !NET.name) return;
  try {
    const ref = NET.db.ref(`scores/${scoreKey(lvl)}/${NET.uid}`), old = (await ref.get()).val(), cur = old || {};
    const best = cur.f ? Math.min(cur.f, t) : t;
    if (best !== cur.f || cur.name !== NET.name || cur.total !== total)
      await ref.set({name: NET.name, total, lan: Math.min(lan, total), t: best, f: best});
  } catch (e) { console.warn('Zeit nicht gespeichert', e); }
}

/* Gruppe mit Live-Geistern */
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let myRef = null, peersRef = null, startRef = null, lastStart = null, lastSent = '', sendT = 0;
function grpMsg(t) { $('grpMsg').textContent = t; }
async function joinRoom(code, create) {
  code = code.toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) return grpMsg('Der Code hat 4 Zeichen.');
  try {
    if (!create) {
      const s = await withTimeout(NET.db.ref(`rooms/${code}/players`).get(), 10000);
      if (!s.exists()) return grpMsg('Keine Gruppe mit diesem Code gefunden.');
    }
    leaveRoom(true);
    NET.room = code; NET.peers = {}; lastStart = undefined;
    myRef = NET.db.ref(`rooms/${code}/players/${NET.uid}`);
    myRef.onDisconnect().remove();
    peersRef = NET.db.ref(`rooms/${code}/players`);
    peersRef.on('value', s => {
      const all = s.val() || {}; NET.peers = all;
      const now = performance.now();
      for (const id in all) {
        if (id === NET.uid) continue;
        const p = all[id], g = ghosts[id] || (ghosts[id] = {x: p.x, y: p.y, px: p.x, py: p.y, tx: p.x, ty: p.y, at: now});
        g.px = g.x; g.py = g.y; g.tx = p.x; g.ty = p.y; g.at = now; g.p = p;
        if (Math.abs(g.tx - g.x) > 300 || Math.abs(g.ty - g.y) > 300) { g.x = g.px = g.tx; g.y = g.py = g.ty; }
      }
      for (const id in ghosts) if (!all[id]) delete ghosts[id];
      if (!menu.hidden && !$('viewOnline').hidden) renderGroup();
    });
    startRef = NET.db.ref(`rooms/${code}/start`);
    startRef.on('value', s => {
      const v = s.val();
      if (lastStart === undefined) { lastStart = v ? v.id : null; return; }  // alter Start beim Beitreten ignorieren
      if (!v || v.id === lastStart) return;
      lastStart = v.id;
      if (v.lvl >= 0 && v.lvl < LEVELS.length) { startLevel(v.lvl); toast(`${v.by || 'Jemand'} startet ${LEVELS[v.lvl].name}`); sfx.check(); }
    });
    try { localStorage.setItem('moosgrotte-room', code); } catch (e) {}
    netPresence(true); renderGroup(); grpMsg('');
  } catch (e) { grpMsg('Das hat nicht geklappt. Versuch es nochmal.'); }
}
function leaveRoom(quiet) {
  if (!NET.room) return;
  try { myRef.onDisconnect().cancel(); myRef.remove(); peersRef.off(); startRef.off(); } catch (e) {}
  NET.room = null; NET.peers = {}; myRef = peersRef = startRef = null; lastSent = '';
  for (const id in ghosts) delete ghosts[id];
  if (!quiet) { try { localStorage.removeItem('moosgrotte-room'); } catch (e) {} renderGroup(); }
}
function myPresence() {
  const vis = inLevel && state !== 'dead' && !menuOpen;
  return {n: NET.name, s: save.skin, l: inLevel ? li : -1, x: Math.round(P.x), y: Math.round(P.y), f: P.face, v: vis ? 1 : 0, d: P.canDash || P.dashT > 0 ? 1 : 0};
}
function netPresence(force) {
  if (!myRef || !NET.name) return;
  const p = myPresence(), k = JSON.stringify(p);
  if (!force && k === lastSent) return;
  lastSent = k; myRef.set(p).catch(() => {});
}
function netTick() {
  if (!NET.room) return;
  if (++sendT >= 6) { sendT = 0; netPresence(false); }  // 10-mal pro Sekunde
  for (const id in ghosts) {
    const g = ghosts[id], k = Math.min(1, (performance.now() - g.at) / 100);
    g.x = g.px + (g.tx - g.px) * k; g.y = g.py + (g.ty - g.py) * k;
  }
}
function renderGroup() {
  if (NET.status !== 'on') return;
  $('grpOut').hidden = !!NET.room; $('grpIn').hidden = !NET.room;
  if (!NET.room) return;
  $('grpShow').textContent = NET.room;
  const ul = $('grpList'); ul.innerHTML = '';
  const ids = Object.keys(NET.peers).sort((a, b) => (a === NET.uid ? -1 : b === NET.uid ? 1 : 0));
  if (!ids.length) ids.push(NET.uid);
  for (const id of ids) {
    const p = id === NET.uid ? myPresence() : NET.peers[id], li2 = document.createElement('li');
    const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = (SKINS[p.s] || SKINS[2]).c;
    const nm = document.createElement('span'); nm.textContent = (p.n || '?') + (id === NET.uid ? ' (du)' : '');
    const wh = document.createElement('span'); wh.className = 'where'; wh.textContent = p.l >= 0 ? 'Ebene ' + (p.l + 1) : 'auf der Karte';
    li2.append(dot, nm, wh); ul.appendChild(li2);
  }
  const sel = $('grpLvl'), keep = sel.value;
  if (sel.options.length !== LEVELS.length) { sel.innerHTML = ''; LEVELS.forEach((d, i) => sel.add(new Option(`Ebene ${i + 1}: ${d.name}`, i))); }
  const open = save.done.findIndex(d => !d);
  sel.value = keep !== '' ? keep : String(open < 0 ? 0 : open);
}
$('grpNew').addEventListener('click', () => { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CH[Math.floor(Math.random() * CODE_CH.length)]; joinRoom(c, true); });
$('grpJoin').addEventListener('click', () => joinRoom($('grpCode').value.trim(), false));
$('grpCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('grpCode').value.trim(), false); });
$('grpLeave').addEventListener('click', () => leaveRoom(false));
$('grpStart').addEventListener('click', () => {
  if (!startRef) return;
  const lvl = +$('grpLvl').value;
  startRef.set({lvl, by: NET.name, id: NET.uid + '-' + Date.now()}).catch(() => grpMsg('Start hat nicht geklappt.'));
});
function drawGhosts() {
  if (!NET.room || !inLevel) return;
  for (const id in ghosts) {
    const g = ghosts[id], p = g.p;
    if (!p || p.l !== li || !p.v) continue;
    if (Math.abs(g.x - cam.x - VW / 2) > VW) continue;
    const sk = SKINS[p.s] || SKINS[2];
    ctx.save(); ctx.globalAlpha = 0.5;
    drawLumi(ctx, g.x + P.w / 2, g.y + P.h, {sx: 1, sy: 1, face: p.f || 1, walk: 0, ground: false, dim: !p.d, skin: sk});
    ctx.globalAlpha = 0.9;
    ctx.font = `500 11px ${BODY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(p.n || '?').width + 10;
    ctx.fillStyle = 'rgba(8,5,16,.7)'; ctx.fillRect(g.x + P.w / 2 - w / 2, g.y - 26, w, 15);
    ctx.fillStyle = sk.hi; ctx.fillText(p.n || '?', g.x + P.w / 2, g.y - 18.5);
    ctx.restore();
  }
}
setTimeout(async () => {
  await netInit();
  if (NET.status === 'on' && NET.name) {
    let r = null; try { r = localStorage.getItem('moosgrotte-room'); } catch (e) {}
    if (r) joinRoom(r, false).then(() => { if (!NET.room) try { localStorage.removeItem('moosgrotte-room'); } catch (e) {} });
  }
}, 0);
