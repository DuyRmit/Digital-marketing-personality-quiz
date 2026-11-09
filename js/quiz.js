/* =========================================================
   RENDER
   ========================================================= */
function setAccent(key) {
  const r = document.documentElement.style;
  if (key) {
    r.setProperty('--accent', PERSONAS[key].color);
    r.setProperty('--accent-ink', PERSONAS[key].ink);
  } else {
    r.removeProperty('--accent');
    r.removeProperty('--accent-ink');
  }
}

function renderProgress() {
  const n = typeof state.screen === 'number' ? state.screen : null;
  if (n === null) {
    progress.hidden = true;
    return;
  }
  progress.hidden = false;
  progress.setAttribute('aria-label', `Question ${n + 1} of ${QUESTIONS.length}`);
  /* answered questions (and the current one) can be revisited by tapping their bar */
  progress.innerHTML = QUESTIONS.map((_, i) => {
    const cls = 'pstep ' + (i < n ? 'done' : i === n ? 'now' : '');
    const clickable = i !== n && state.answers[i] !== null;
    return clickable
      ? `<button type="button" class="${cls}" data-i="${i}" aria-label="Go back to question ${i + 1}"><i></i></button>`
      : `<span class="${cls}" ${i === n ? 'aria-current="step"' : ''}><i></i></span>`;
  }).join('');
  progress.querySelectorAll('button').forEach((b) => {
    b.onclick = () => go(Number(b.dataset.i));
  });
}

function iconHTML(key) {
  const p = PERSONAS[key];
  return p.image
    ? `<img src="${p.image}" alt="">`
    : `<span aria-hidden="true">${p.emoji}</span>`;
}

function render() {
  clearInterval(boardTimer);
  setAccent(null);
  renderProgress();
  const s = state.screen;
  if (s === 'welcome') renderWelcome();
  else if (typeof s === 'number') renderQuestion(s);
  else if (s === 'calc') renderCalc();
  else if (s === 'tie') renderTie();
  else if (s === 'result') renderResult();
  else if (s === 'finish') renderFinish();
  else if (s === 'board') renderBoard();
  animateIn();
}

function focusHeading() {
  const h = stage.querySelector('[data-focus]');
  if (h) {
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
}

function renderWelcome() {
  stage.innerHTML = `
    <div class="welcome">
<div class="w-intro">
  <h1 data-focus>What’s your digital marketing superpower?</h1>
  <p class="lead">Discover your digital marketing strengths through six quick questions and reveal your persona.</p>
</div>
<div class="pwrap">
<ul class="pgrid" tabindex="0" aria-label="The six digital marketing personas">
  ${Object.keys(PERSONAS)
    .map((k, n) => {
      const p = PERSONAS[k];
      return `
    <li class="pcard${n === 0 ? ' is-active' : ''}" style="--c:${p.color};--ink:${p.ink}">
      <div class="pic">${iconHTML(k)}</div>
      <h3>${p.name}</h3>
      <p>${p.blurb}</p>
    </li>`;
    })
    .join('')}
</ul>
<div class="pdots" aria-hidden="true">${Object.keys(PERSONAS)
  .map((_, n) => `<span class="${n === 0 ? 'on' : ''}"></span>`)
  .join('')}</div>
<p class="swipe-hint" aria-hidden="true">Swipe to meet the six personas</p>
</div>
<div class="w-go">
  <p class="note">This is a fun discovery game, not a psychological or personality assessment. There are no right or wrong answers.</p>
  <div class="actions"><button class="btn" id="start">Discover my superpower →</button></div>
</div>
    </div>`;
  document.getElementById('start').onclick = () => go(0);
  initGallery();
  focusHeading();
}

/* highlights the card in view and syncs the dots while swiping */
function initGallery() {
  const g = stage.querySelector('.pgrid');
  if (!g) return;
  const cards = [...g.children],
    dots = [...stage.querySelectorAll('.pdots span')];
  let raf;
  const update = () => {
    if (getComputedStyle(g).display !== 'flex') return;
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    let i = Math.round(g.scrollLeft / step);
    if (g.scrollLeft + g.clientWidth >= g.scrollWidth - 4) i = cards.length - 1;
    i = Math.max(0, Math.min(cards.length - 1, i));
    cards.forEach((c, n) => c.classList.toggle('is-active', n === i));
    dots.forEach((d, n) => d.classList.toggle('on', n === i));
  };
  g.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

/* staggered entrance for whatever the current screen contains */
const ANIM_SEL =
  '.w-intro h1,.w-intro .lead,.pcard,.pdots,.swipe-hint,.w-go .note,.w-go .actions,.kicker,h2,.scenario,.opt,.lead,.actions,.hero,.action-box,.invite,.spinner,.big';
function animateIn() {
  const all = [...stage.querySelectorAll(ANIM_SEL)];
  const els = all.filter((e) => !all.some((o) => o !== e && o.contains(e)));
  /* answer options count as one step, so they all appear together instead of one by one */
  let step = 0,
    optStep = null;
  els.forEach((e) => {
    let i;
    if (e.classList.contains('opt')) {
      if (optStep === null) optStep = step++;
      i = optStep;
    } else i = step++;
    e.style.setProperty('--i', Math.min(i, 10));
    e.classList.add('in');
  });
}

function renderQuestion(i) {
  const q = QUESTIONS[i],
    picked = state.answers[i];
  const last = i === QUESTIONS.length - 1;
  stage.innerHTML = `
    <span class="kicker">Question ${i + 1} of ${QUESTIONS.length}</span>
    <h2 data-focus>${q.title}</h2>
    <p class="scenario">${q.text}</p>
    <fieldset>
<legend>${q.text}</legend>
<div class="opts">
  ${q.options
    .map(
      (o, idx) => `
    <div class="opt">
      <input type="radio" name="q${i}" id="q${i}o${idx}" value="${idx}" ${picked === idx ? 'checked' : ''}>
      <label for="q${i}o${idx}"><span class="letter" aria-hidden="true">${LETTERS[idx]}</span><span>${o[0]}</span></label>
    </div>`,
    )
    .join('')}
</div>
    </fieldset>
    <div class="actions">
<button class="btn ghost" id="back">← Back</button>
<button class="btn grow" id="next" ${picked === null ? 'disabled' : ''}>${last ? 'See my superpower →' : 'Next →'}</button>
    </div>`;
  const next = document.getElementById('next');
  stage.querySelectorAll('input[type=radio]').forEach((inp) => {
    inp.onchange = () => {
      state.answers[i] = Number(inp.value);
      next.disabled = false;
    };
  });
  document.getElementById('back').onclick = () => go(i === 0 ? 'welcome' : i - 1);
  next.onclick = () => {
    if (state.answers[i] === null) return;
    last ? finishQuiz() : go(i + 1);
  };
  focusHeading();
}

function finishQuiz() {
  state.tieChoice = null;
  go('calc');
}

function renderCalc() {
  stage.innerHTML = `
    <div class="calc">
<div class="spinner" aria-hidden="true"></div>
<h2 data-focus>Almost there!</h2>
<p class="lead" style="margin-inline:auto">Your superpower is being revealed…</p>
    </div>`;
  focusHeading();
  calcTimer = setTimeout(
    () => {
      const top = topPersonas();
      if (top.length > 1) {
        state.tied = top;
        go('tie');
      } else {
        state.winner = top[0];
        go('result');
      }
    },
    reduceMotion ? 400 : 1600,
  );
}

function renderTie() {
  stage.innerHTML = `
    <div class="tie">
<h2 data-focus>You’ve got more than one superpower!</h2>
<p class="lead">Your answers show a tie. Which of these strengths feels more like you?</p>
<fieldset>
  <legend>Choose one of the leading personas</legend>
  <div class="opts">
    ${state.tied
      .map(
        (k) => `
      <div class="opt">
        <input type="radio" name="tie" id="tie-${k}" value="${k}" ${state.tieChoice === k ? 'checked' : ''}>
        <label for="tie-${k}"><span class="letter" aria-hidden="true">${iconHTML(k)}</span><span>${PERSONAS[k].name}<br><small style="font-weight:400">${PERSONAS[k].power}</small></span></label>
      </div>`,
      )
      .join('')}
  </div>
</fieldset>
<div class="actions">
  <button class="btn ghost" id="back">← Back</button>
  <button class="btn grow" id="reveal" ${state.tieChoice ? '' : 'disabled'}>Reveal my superpower →</button>
</div>
    </div>`;
  const btn = document.getElementById('reveal');
  stage.querySelectorAll('input[name=tie]').forEach((inp) => {
    inp.onchange = () => {
      state.tieChoice = inp.value;
      btn.disabled = false;
    };
  });
  document.getElementById('back').onclick = () => go(QUESTIONS.length - 1);
  btn.onclick = () => {
    if (!state.tieChoice) return;
    state.winner = state.tieChoice;
    go('result');
  };
  focusHeading();
}

function renderResult() {
  const k = state.winner,
    p = PERSONAS[k];
  setAccent(k);
  stage.innerHTML = `
    <div class="reveal">
<div class="hero">
  <div class="badge">${iconHTML(k)}</div>
  <div>
    <p style="font-weight:700">Your digital marketing persona is…</p>
    <h2 data-focus>${p.name}</h2>
    <span class="value">RMIT Value: ${p.value}</span>
    <p class="power" style="margin-top:14px">${p.power}</p>
  </div>
</div>

<div class="action-box">
  <h3>${p.head}</h3>
  <p>${p.desc}</p>
  <p class="ask">${p.ask}</p>
  <div class="save-row actions">
    <button class="btn gold" id="save">Save my persona</button>
  </div>
  <p class="note" id="saveMsg" role="status"></p>
</div>

<div class="invite" style="grid-column:1 / -1">
  <h3>Your superpower doesn’t stop here!</h3>
  <p>Save your persona and share your superpower with your friends!</p>
  <p style="margin-top:12px"><strong>Put your superpower into action.</strong> What is one thing you can do to put your marketing superpower and RMIT Value into practice in your studies, everyday life or future career? Write down one action you can take.</p>
  ${postBlockHTML()}
</div>
    </div>`;
  document.getElementById('save').onclick = savePersona;
  wirePost();
  focusHeading();
}

function renderFinish() {
  stage.innerHTML = `
    <div class="finish">
<div class="big" aria-hidden="true">${iconHTML(state.winner)}</div>
<h2 data-focus>Thanks for playing!</h2>
<p class="lead">Keep exploring, creating and making an impact with your superpower and RMIT Value!</p>
<div class="actions"><button class="btn" id="again">Play again ↻</button><button class="btn ghost" id="seeBoard">See the board</button></div>
    </div>`;
  document.getElementById('seeBoard').onclick = () => openBoard('finish');
  document.getElementById('again').onclick = () => {
    resetGame();
    render();
    window.scrollTo({ top: 0 });
  };
  focusHeading();
}
