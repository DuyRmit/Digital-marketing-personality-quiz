/* =========================================================
   ADMIN (#admin) — static moderation grid, saved sessions, sample cards.
   Data lives on the Worker/D1 (see board-worker.js): works from any device.
   Needs: board.js (esc, noteHTML, boardHide, boardClearAll, boardToken)
   ========================================================= */
const ADM_PAGE = 300; /* cards drawn at a time */

let admPosts = [], admLastId = 0, admSessions = [];
let admView = 'live'; /* 'live' | 'sessions' */
let admOpen = null; /* an opened saved session {id,name,saved_at,posts} */
let admPersona = '', admQuery = '', admCount = ADM_PAGE, admPending = 0, admQTimer = null;

const $a = (id) => document.getElementById(id);
const admSay = (t) => { const m = $a('admMsg'); if (m) m.textContent = t || ''; };
const admSort = (a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0) || b.id - a.id;
const admUnsaved = () => admPosts.filter((p) => !p.sample && !p.session_id).length;

/* ---------- API ---------- */
function admAuth() {
  if (!BOARD.endpoint) return false;
  if (!boardToken) boardToken = window.prompt('Admin token') || null;
  return !!boardToken;
}
async function admApi(path, opts) {
  if (!admAuth()) throw new Error('Admin token needed. Reload the page and enter it.');
  let r;
  try {
    r = await fetch(BOARD.endpoint + path, {
      cache: 'no-store',
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + boardToken },
    });
  } catch (e) { throw new Error('Couldn’t reach the board. Check your connection.'); }
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { boardToken = null; throw new Error('Wrong admin token. Reload the page to try again.'); }
  if (r.status === 404 && !d.error) throw new Error('Not found.');
  if (!r.ok) throw new Error(d.error === 'Not found' ? 'The Worker is out of date. Deploy the new board-worker.js first.' : d.error || 'Request failed.');
  return d;
}
async function admLoadPosts() {
  admPosts = (await admApi('/admin/posts')).posts.filter((p) => PERSONAS[p.persona]);
  admLastId = admPosts.reduce((m, p) => Math.max(m, p.id), 0);
}
async function admLoadSessions() { admSessions = (await admApi('/admin/sessions')).sessions; }
async function admRefresh() {
  await Promise.all([admLoadPosts(), admLoadSessions()]);
  if (admOpen) return admStat();
  if (admView === 'live') admDraw(); else { admDrawSessions(); admStat(); }
}
async function admPoll() {
  if (document.hidden || admView !== 'live' || admOpen) return;
  try {
    const fresh = (await admApi('/admin/posts?after=' + admLastId)).posts.filter((p) => PERSONAS[p.persona]);
    if (!fresh.length) return;
    admLastId = fresh.reduce((m, p) => Math.max(m, p.id), admLastId);
    admPosts = fresh.concat(admPosts);
    admPending += fresh.length;
    const f = $a('admFresh');
    f.hidden = false;
    f.innerHTML = `<button type="button" class="btn ghost sm" data-a="refresh">+${admPending} new card${admPending > 1 ? 's' : ''} · show</button>`;
    admStat();
  } catch (e) { admSay(e.message); }
}

/* ---------- helpers ---------- */
function admShown() {
  const src = admOpen ? admOpen.posts : admPosts;
  const q = admQuery.trim().toLowerCase();
  return src
    .filter((p) => PERSONAS[p.persona])
    .filter((p) => !admPersona || p.persona === admPersona)
    .filter((p) => !q || ((p.name || '') + ' ' + p.text).toLowerCase().includes(q))
    .sort(admSort);
}
function admCSV(list) {
  const cell = (v) => {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; /* stop Excel running pasted formulas */
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const rows = [['id', 'posted_at', 'persona', 'rmit_value', 'nickname', 'card_text']];
  list.forEach((p) => rows.push([p.id, p.created_at ? new Date(Number(p.created_at)).toISOString() : '', PERSONAS[p.persona].name, PERSONAS[p.persona].value, p.name || '', p.text]));
  return '\ufeff' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
}
function admDownload(name, mime, content) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const admSlug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'session';
const admDate = (ms) => new Date(Number(ms)).toLocaleString('en-GB');
async function admFetchSession(id) {
  const d = await admApi('/admin/sessions/' + id);
  return { ...d.session, posts: d.posts.filter((p) => PERSONAS[p.persona]) };
}

/* ---------- drawing ---------- */
function admStat() {
  const el = $a('admStat');
  $a('admSesCount').textContent = admSessions.length;
  if (admOpen) { el.textContent = `“${admOpen.name}” · saved ${admDate(admOpen.saved_at)} · ${admOpen.posts.length} cards (read-only)`; return; }
  const s = admPosts.filter((p) => p.sample).length;
  el.textContent = `${admPosts.length - s} cards on the board · ${admUnsaved()} not saved yet${s ? ` · ${s} sample cards` : ''}`;
}
function admDrawChips() {
  const src = admOpen ? admOpen.posts : admPosts, n = {};
  src.forEach((p) => { n[p.persona] = (n[p.persona] || 0) + 1; });
  $a('admChips').innerHTML =
    `<button type="button" class="adm-chip${admPersona ? '' : ' on'}" data-p="" aria-pressed="${!admPersona}" aria-label="All personas, ${src.length} cards">All <b>${src.length}</b></button>` +
    Object.entries(PERSONAS).map(([k, p]) =>
      `<button type="button" class="adm-chip${admPersona === k ? ' on' : ''}" data-p="${k}" aria-pressed="${admPersona === k}" aria-label="${p.name}, ${n[k] || 0} cards" style="--c:${p.color};--ink:${p.ink}">${p.name} <b>${n[k] || 0}</b></button>`).join('');
}
function admDraw() {
  admPending = 0; $a('admFresh').hidden = true;
  $a('adm').classList.toggle('ro', !!admOpen);
  admDrawChips(); admStat();
  const list = admShown(), shown = list.slice(0, admCount);
  $a('admBoard').innerHTML = shown.length
    ? shown.map((p, i) => {
        let h = noteHTML(p, Math.min(i, 10), false, true);
        if (p.sample) h = h.replace('class="pnote', 'class="pnote sample').replace('<header>', '<header><span class="sr-only">Sample card. </span>');
        return h;
      }).join('')
    : '<p class="empty">No cards match.</p>';
  $a('admCountLive').textContent = `${list.length} card${list.length === 1 ? '' : 's'} shown`;
  const rest = list.length - shown.length;
  $a('admMore').innerHTML = rest > 0 ? `<button type="button" class="btn ghost" data-a="more">Show ${Math.min(rest, ADM_PAGE)} more (${rest} left)</button>` : '';
}
function admDrawSessions() {
  $a('admSessions').innerHTML = admSessions.length
    ? admSessions.map((s) => `<div class="adm-ses" data-id="${s.id}"><div><b>${esc(s.name)}</b><small>${admDate(s.saved_at)} · ${s.count} cards</small></div>
        <div class="adm-ses-btns"><button type="button" class="btn sm" data-a="ses-view" aria-label="View ${esc(s.name)}">View</button><button type="button" class="btn ghost sm" data-a="ses-csv" aria-label="Download CSV of ${esc(s.name)}">CSV</button><button type="button" class="btn ghost sm" data-a="ses-json" aria-label="Download JSON of ${esc(s.name)}">JSON</button><button type="button" class="btn ghost sm danger" data-a="ses-del" aria-label="Delete ${esc(s.name)}">Delete</button></div></div>`).join('')
    : '<p class="empty">No saved sessions yet. Use “Save session” at the end of each round.</p>';
}
function admSetView(v, session) {
  admView = v; admOpen = session || null; admPersona = ''; admQuery = ''; admCount = ADM_PAGE;
  $a('admQ').value = '';
  document.querySelectorAll('.adm-tab').forEach((t) => { t.classList.toggle('on', t.dataset.view === v); t.setAttribute('aria-pressed', String(t.dataset.view === v)); });
  const list = v === 'sessions' && !admOpen;
  $a('admTools').hidden = list; $a('admBoard').hidden = list; $a('admMore').hidden = list; $a('admSessions').hidden = !list;
  $a('admActions').innerHTML = admOpen
    ? `<button type="button" class="btn ghost" data-a="back">← Saved sessions</button><button type="button" class="btn" data-a="csv">Export CSV (shown)</button><button type="button" class="btn ghost" data-a="json">Export JSON</button>`
    : v === 'live'
      ? `<button type="button" class="btn ghost" data-a="samples">Add 20 sample cards</button><button type="button" class="btn" data-a="save">Save session…</button><button type="button" class="btn ghost" data-a="csv">Export CSV (shown)</button><button type="button" class="btn ghost danger" data-a="clear">Clear board</button>`
      : '';
  admSay('');
  if (list) { admDrawSessions(); admStat(); } else admDraw();
}

/* ---------- actions ---------- */
async function admAddSamples(btn) {
  btn.disabled = true;
  try {
    const r = await admApi('/admin/samples', { method: 'POST' });
    await admRefresh();
    admSay(r.added ? `Added ${r.added} sample cards.` : 'All 20 sample cards are already on the board.');
  } catch (e) { admSay(e.message); }
  btn.disabled = false;
}
async function admSaveSession() {
  const n = admUnsaved();
  if (!n) { admSay('There are no unsaved cards to save.'); return; }
  const d = new Date();
  const name = window.prompt(`Save ${n} cards as a session. Name it (e.g. Hanoi 15/11 morning):`, 'Session ' + d.toLocaleDateString('en-GB') + ' ' + d.toTimeString().slice(0, 5));
  if (!name || !name.trim()) return;
  const clear = window.confirm('Clear the board after saving, so the next session starts empty?\n\nOK = save and clear\nCancel = save only (cards stay on the board)');
  try {
    const r = await admApi('/admin/sessions', { method: 'POST', body: JSON.stringify({ name: name.trim(), clear }) });
    await admRefresh();
    admSay(`Saved “${r.session.name}” (${r.session.count} cards)${clear ? ' and cleared the board' : ''}.`);
  } catch (e) { admSay(e.message); }
}
async function admClear() {
  const n = admUnsaved();
  if (n) {
    if (window.confirm(`${n} cards have not been saved yet.\n\nOK = save them as a session first.\nCancel = choose whether to clear without saving.`)) return admSaveSession();
    if (!window.confirm('Clear the board WITHOUT saving? Unsaved cards will no longer show in this tool.')) return;
  } else if (!window.confirm('Clear the board for everyone?')) return;
  try {
    if (!admAuth()) return;
    await boardClearAll();
    await admRefresh();
    admSay('Board cleared.');
  } catch (e) { admSay(e.message); if (/token/i.test(e.message)) boardToken = null; }
}
async function admHide(id) {
  if (!admAuth()) return;
  try {
    await boardHide(id);
    admPosts = admPosts.filter((p) => String(p.id) !== String(id));
    admDraw();
  } catch (e) { alert(e.message); if (/token/i.test(e.message)) boardToken = null; }
}
const admExportCSV = (name, list) => admDownload(`superpower-${admSlug(name)}.csv`, 'text/csv;charset=utf-8', admCSV(list));
const admExportJSON = (s) => admDownload(`superpower-${admSlug(s.name)}.json`, 'application/json', JSON.stringify(s, null, 2));

/* ---------- init ---------- */
async function initAdmin() {
  $a('stage').innerHTML = `
  <div class="adm" id="adm">
    <h2>Admin · Board moderation</h2>
    <p class="lead" id="admStat"></p>
    <div class="adm-tabs" role="group" aria-label="Admin views">
      <button type="button" class="adm-tab on" data-view="live" aria-pressed="true">This session</button>
      <button type="button" class="adm-tab" data-view="sessions" aria-pressed="false">Saved sessions (<span id="admSesCount">0</span>)</button>
    </div>
    <div class="adm-tools" id="admTools"><div class="adm-chips" id="admChips" role="group" aria-label="Filter by persona"></div><input id="admQ" type="search" placeholder="Search text or nickname" aria-label="Search cards"></div>
    <div class="adm-actions" id="admActions"></div>
    <p class="note" id="admMsg" role="status"></p>
    <div class="adm-fresh" id="admFresh" hidden role="status"></div>
    <div class="board" id="admBoard" role="region" aria-label="Cards"></div>
    <p class="sr-only" id="admCountLive" role="status"></p>
    <div class="adm-more" id="admMore"></div>
    <div id="admSessions" hidden></div>
  </div>`;
  $a('admQ').oninput = (e) => { clearTimeout(admQTimer); admQTimer = setTimeout(() => { admQuery = e.target.value; admCount = ADM_PAGE; admDraw(); }, 150); };
  $a('adm').addEventListener('click', async (ev) => {
    const hide = ev.target.closest('.hide');
    if (hide && !admOpen) return admHide(hide.dataset.id);
    const chip = ev.target.closest('.adm-chip');
    if (chip) { admPersona = chip.dataset.p; admCount = ADM_PAGE; return admDraw(); }
    const tab = ev.target.closest('.adm-tab');
    if (tab) return admSetView(tab.dataset.view);
    const b = ev.target.closest('[data-a]');
    if (!b) return;
    const row = b.closest('.adm-ses'), id = row && row.dataset.id;
    try {
      switch (b.dataset.a) {
        case 'refresh': return admDraw();
        case 'more': admCount += ADM_PAGE; return admDraw();
        case 'samples': return admAddSamples(b);
        case 'save': return admSaveSession();
        case 'clear': return admClear();
        case 'back': return admSetView('sessions');
        case 'csv': return admExportCSV(admOpen ? admOpen.name : 'cards-' + Date.now(), admShown().filter((p) => !p.sample));
        case 'json': return admExportJSON(admOpen);
        case 'ses-view': return admSetView('sessions', await admFetchSession(id));
        case 'ses-csv': { const s = await admFetchSession(id); return admExportCSV(s.name, s.posts); }
        case 'ses-json': return admExportJSON(await admFetchSession(id));
        case 'ses-del': {
          const s = admSessions.find((x) => String(x.id) === id);
          if (s && window.confirm(`Permanently delete “${s.name}” and its ${s.count} cards from the database? Export it first if you still need it.`)) {
            await admApi('/admin/sessions/' + id, { method: 'DELETE' });
            await admRefresh();
          }
        }
      }
    } catch (e) { admSay(e.message); }
  });
  admSetView('live');
  if (!admAuth()) { admSay('Admin token needed. Reload the page and enter it.'); return; }
  try { await admRefresh(); } catch (e) { admSay(e.message); }
  setInterval(admPoll, BOARD.kioskPollMs);
}
