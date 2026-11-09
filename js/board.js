/* =========================================================
   SHARED BOARD
   Students post their "next step"; everyone sees the cards.
   Needs the small Cloudflare Worker (board-worker.js). Until BOARD.endpoint
   is set, the board runs in demo mode (posts only live on this device).
   Open the page with #board for a big-screen booth display,
   or #admin to get "Hide" buttons and a "Clear board" button for moderation.
   ========================================================= */
const demoPosts = [
  {
    id: 'd1',
    persona: 'creator',
    name: 'Mai',
    text: 'Film one short video this week about something I care about.',
  },
  {
    id: 'd2',
    persona: 'explorer',
    name: '',
    text: 'Try an AI tool I have never used and see what it can do.',
  },
  {
    id: 'd3',
    persona: 'trust',
    name: 'Khoa',
    text: 'Check that every claim in my next post is actually true.',
  },
  {
    id: 'd4',
    persona: 'inclusive',
    name: '',
    text: 'Ask my classmates what kind of content they want to see.',
  },
];
const boardIsAdmin = location.hash === '#admin';
let boardTimer = null,
  boardToken = null,
  boardSig = '';
const seenIds = new Set();
let kioskMq = null; /* băng chuyền card trên TV (marquee.js) */

function esc(t) {
  return String(t).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function textProblem(t) {
  const v = t.trim();
  if (!v) return 'Write one action first.';
  if (v.length > BOARD.maxLen) return `Keep it under ${BOARD.maxLen} characters.`;
  if (/(https?:\/\/|www\.|\S+@\S+\.\S+|(\d[\s.\-]?){8,})/i.test(v))
    return 'Please leave out links, emails and phone numbers.';
  return '';
}

function nameProblem(n) {
  const v = n.trim();
  if (!v) return '';
  if (v.length > BOARD.maxName) return `Keep the name under ${BOARD.maxName} characters.`;
  if (/(https?:\/\/|www\.|\S+@\S+\.\S+|(\d[\s.\-]?){6,})/i.test(v))
    return 'Please use a nickname without links or contact details.';
  return '';
}

async function boardList() {
  if (!BOARD.endpoint) return demoPosts.slice();
  const r = await fetch(BOARD.endpoint + '/posts', { cache: 'no-store' });
  if (!r.ok) throw new Error('list failed');
  return (await r.json()).posts || [];
}
async function boardPost(persona, text, name) {
  if (!BOARD.endpoint) {
    const post = { id: 'local' + Date.now(), persona, text, name };
    demoPosts.unshift(post);
    return post;
  }
  let r;
  try {
    r = await fetch(BOARD.endpoint + '/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona, text, name }),
    });
  } catch (e) {
    throw new Error('Couldn’t reach the board. Check your connection and try again.');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Couldn’t post. Please try again.');
  return data.post;
}
async function boardHide(id) {
  if (!BOARD.endpoint) {
    const i = demoPosts.findIndex((p) => String(p.id) === String(id));
    if (i > -1) demoPosts.splice(i, 1);
    return;
  }
  const r = await fetch(BOARD.endpoint + '/posts/' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + boardToken },
  });
  if (!r.ok)
    throw new Error(r.status === 401 ? 'Wrong admin token.' : 'Could not hide that post.');
}
/* admin: hide every post at once (rows stay in the database, just flagged hidden) */
async function boardClearAll() {
  if (!BOARD.endpoint) {
    demoPosts.length = 0;
    return;
  }
  const r = await fetch(BOARD.endpoint + '/posts', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + boardToken },
  });
  if (!r.ok)
    throw new Error(
      r.status === 401
        ? 'Wrong admin token.'
        : r.status === 404 || r.status === 405
          ? 'The Worker does not support “clear board” yet. Update board-worker.js first.'
          : 'Could not clear the board.',
    );
}

function postBlockHTML() {
  if (state.posted)
    return `
    <div class="posted"><p><strong>You’re on the board!</strong> “${esc(state.posted.text)}”${state.posted.name ? ' — ' + esc(state.posted.name) : ''}</p></div>
    <div class="actions"><button class="btn" id="seeboard">See the board →</button><button class="btn ghost" id="cont">Continue →</button></div>`;
  return `
    <label class="next-step" for="stepText">My next step is to…</label>
    <textarea id="stepText" rows="3" maxlength="${BOARD.maxLen}" placeholder="Write one small, realistic action" autocomplete="off"></textarea>
    <div class="count"><span id="cnt">0</span>/${BOARD.maxLen}</div>
    <label class="field-label" for="stepName">Name your card (optional)</label>
    <input id="stepName" type="text" maxlength="${BOARD.maxName}" placeholder="A nickname, e.g. Mai" autocomplete="off">
    <p class="note">Your card goes on a shared board that everyone at Experience Day can see. Please use a nickname instead of your full name, and leave out links and contact details. Prefer pen and paper? Write it on a card at the booth instead.</p>
    <p class="note err" id="postMsg" role="status"></p>
    <div class="actions"><button class="btn" id="post" disabled>Post to the board</button><button class="btn ghost" id="cont">Skip →</button></div>`;
}
function wirePost() {
  document.getElementById('cont').onclick = () => go('finish');
  const sb = document.getElementById('seeboard');
  if (sb) sb.onclick = () => openBoard('result');
  const ta = document.getElementById('stepText');
  if (!ta) return;
  const btn = document.getElementById('post'),
    cnt = document.getElementById('cnt'),
    msg = document.getElementById('postMsg');
  const nm = document.getElementById('stepName');
  nm.value = state.name;
  nm.oninput = () => {
    state.name = nm.value;
    msg.textContent = '';
  };
  ta.value = state.draft;
  cnt.textContent = ta.value.length;
  btn.disabled = !ta.value.trim();
  ta.oninput = () => {
    state.draft = ta.value;
    cnt.textContent = ta.value.length;
    btn.disabled = !ta.value.trim();
    msg.textContent = '';
  };
  btn.onclick = async () => {
    const problem = textProblem(ta.value) || nameProblem(nm.value);
    if (problem) {
      msg.textContent = problem;
      return;
    }
    btn.disabled = true;
    msg.textContent = 'Posting…';
    try {
      state.posted = await boardPost(state.winner, ta.value.trim(), nm.value.trim());
      openBoard('result');
    } catch (e) {
      msg.textContent = e.message;
      btn.disabled = false;
    }
  };
}

function openBoard(from) {
  state.boardFrom = from;
  go('board');
}

function noteHTML(post, idx, isNew, first) {
  if (!PERSONAS[post.persona]) return '';
  const p = PERSONAS[post.persona],
    nm = (post.name || '').trim();
  const mine = state.posted && String(state.posted.id) === String(post.id);
  const bob = (-Math.random() * 7).toFixed(1);
  return `<article class="pnote${mine ? ' mine' : ''}${isNew ? ' float' : ''}${isNew && !first ? ' fresh' : ''}" data-id="${esc(post.id)}" style="--c:${p.color};--ink:${p.ink};--i:${idx};--b:${bob}s">
    <header><span class="pn-ic">${iconHTML(post.persona)}</span><span class="pn-t"><b>${nm ? esc(nm) : p.name}</b>${nm ? `<small>${p.name}</small>` : ''}</span>${mine ? '<em>You</em>' : ''}</header>
    <p>${esc(post.text)}</p>
    <div class="pn-v"><span class="pn-vl">RMIT Value: </span>${p.value}</div>
    ${boardIsAdmin ? `<button type="button" class="hide" data-id="${esc(post.id)}">Hide</button>` : ''}
  </article>`;
}

function cardEl(post) {
  const t = document.createElement('template');
  t.innerHTML = noteHTML(post, 0, false, true).trim();
  return t.content.firstElementChild;
}

async function refreshBoard(first) {
  /* TV: băng chuyền chạy ngang, marquee.js tự lo vị trí và animation */
  if (kioskMq) {
    const m = document.getElementById('boardMsg');
    try {
      const posts = await boardList();
      if (!document.getElementById('mqboard')) return;
      kioskMq.setPosts(posts.filter((p) => PERSONAS[p.persona]));
      if (m) m.textContent = '';
    } catch (e) {
      if (m) m.textContent = 'Couldn’t load the board. Trying again…';
    }
    return;
  }
  let el = document.getElementById('board');
  if (!el) return;
  const msg = document.getElementById('boardMsg');
  try {
    const posts = await boardList();
    el = document.getElementById('board');
    if (!el) return;
    const sig = posts.map((p) => p.id).join(',');
    if (sig !== boardSig || first) {
      boardSig = sig;
      const before = new Map(
        [...el.querySelectorAll('.pnote')].map((n) => [
          n.dataset.id,
          n.getBoundingClientRect(),
        ]),
      );
      el.innerHTML = posts.length
        ? posts
            .map((p, i) =>
              noteHTML(p, Math.min(i, 10), first ? true : !seenIds.has(String(p.id)), first),
            )
            .join('')
        : '<p class="empty">No posts yet. Be the first to share a next step!</p>';
      posts.forEach((p) => seenIds.add(String(p.id)));
      layoutKioskBoard();
      /* cards that were already there glide to their new spot instead of jumping */
      if (!first && !reduceMotion) {
        el.querySelectorAll('.pnote:not(.float)').forEach((n) => {
          const o = before.get(n.dataset.id);
          if (!o) return;
          const r = n.getBoundingClientRect(),
            dx = o.left - r.left,
            dy = o.top - r.top;
          if (dx || dy)
            n.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], {
              duration: 800,
              easing: 'cubic-bezier(.2,.8,.2,1)',
            });
        });
      }
    }
    msg.textContent = '';
  } catch (e) {
    if (msg) msg.textContent = 'Couldn’t load the board. Trying again…';
  }
}

function renderBoard() {
  const kiosk = document.body.classList.contains('kiosk'),
    from = state.boardFrom;
  boardSig = '';
  seenIds.clear();
  if (kioskMq) { kioskMq.destroy(); kioskMq = null; }
  const joinUrl = (location.origin + location.pathname)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const head = kiosk
    ? `<div class="khead">
   <div><p class="kbrand">RMIT Digital Marketing · Experience Day · Designed by RMITVN Learning Design</p><h2 data-focus>My Digital Marketing Superpower: Powered by RMIT Values</h2><p class="lead">One small next step from everyone in the room.</p></div>
   <div class="kjoin"><div><b>${JOIN_QR ? 'Scan to play' : joinUrl}</b><span>${JOIN_QR ? 'Then add your own card to the board' : 'Play and add your card'}</span><p class="note" id="boardMsg" role="status"></p></div>${JOIN_QR ? `<img class="kqr" src="${JOIN_QR}" alt="QR code that opens the quiz">` : ''}</div>
 </div>`
    : `<h2 data-focus>My Digital Marketing Superpower: Powered by RMIT Values</h2><p class="lead">One small next step from everyone at Experience Day.</p>`;
  stage.innerHTML = `
    ${head}
    ${BOARD.endpoint ? '' : '<p class="note demo">Demo mode: posts are only visible on this device until the board is connected.</p>'}
    ${kiosk ? '<div class="mq" id="mqboard" aria-live="off"></div>' : '<div class="board" id="board" aria-live="polite"></div>'}
    ${kiosk ? '' : '<p class="note" id="boardMsg" role="status"></p>'}
    ${kiosk ? '' : `<div class="actions"><button class="btn ghost" id="bback">← Back</button>${from === 'result' ? '<button class="btn grow" id="bnext">Continue →</button>' : ''}</div>`}`;
  fitBoard(); /* TV: đặt chiều cao cho #mqboard */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBoard);
  if (kiosk) kioskMq = Marquee.create(document.getElementById('mqboard'), { createCard: cardEl });
  if (!kiosk) {
    document.getElementById('bback').onclick = () => go(from);
    const nx = document.getElementById('bnext');
    if (nx) nx.onclick = () => go('finish');
  }
  const boardEl = document.getElementById('board') || document.getElementById('mqboard');
  if (boardEl) boardEl.addEventListener('click', async (ev) => {
    const b = ev.target.closest('.hide');
    if (!b) return;
    if (!BOARD.endpoint || boardToken === null)
      boardToken = BOARD.endpoint ? window.prompt('Admin token') || null : 'demo';
    if (!boardToken) return;
    try {
      await boardHide(b.dataset.id);
      boardSig = '';
      refreshBoard(false);
    } catch (e) {
      alert(e.message);
      boardToken = null;
    }
  });
  refreshBoard(true);
  boardTimer = setInterval(
    () => {
      if (!document.hidden) refreshBoard(false);
    },
    kiosk ? BOARD.kioskPollMs : BOARD.pollMs,
  );
  focusHeading();
}
