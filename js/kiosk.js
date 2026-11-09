/* big-screen mode: use the fewest columns (biggest cards) that still show every post.
   Cards keep their natural height, so we try 4, 5, 6 ... columns until nothing spills over.
   If even the smallest readable size is not enough, the oldest cards are left off the screen
   (they stay on the board for students and in the database). */
function layoutKioskBoard() {
  if (!document.body.classList.contains('kiosk')) return;
  const b = document.getElementById('board');
  if (!b) return;
  b.classList.add('measuring');
  try {
    fitKioskCards(b);
  } finally {
    b.classList.remove('measuring');
  }
}
function fitKioskCards(b) {
  const cards = [...b.querySelectorAll('.pnote')];
  cards.forEach((c) => (c.style.display = ''));
  if (!cards.length) {
    b.style.columnCount = 1; // empty message
    return;
  }
  const cs = getComputedStyle(b);
  const W = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (W <= 0) return;
  const gap = Math.max(8, Math.round(W * 0.007));
  b.style.setProperty('--gap', gap + 'px');
  // nothing spilled sideways into extra columns, or down past the bottom edge
  const fits = () =>
    b.scrollWidth <= b.clientWidth + 2 && b.scrollHeight <= b.clientHeight + 2;
  const setCols = (c) => {
    b.style.columnCount = c;
    b.style.setProperty('--cw', ((W - gap * (c - 1)) / c).toFixed(1) + 'px');
  };
  for (let c = 4; c <= BOARD.kioskMaxCols; c++) {
    setCols(c);
    if (fits()) return;
  }
  // still too many: show only the newest cards that fit (binary search on how many)
  const show = (k) => cards.forEach((card, i) => (card.style.display = i < k ? '' : 'none'));
  let lo = 1,
    hi = cards.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    show(mid);
    if (fits()) lo = mid;
    else hi = mid - 1;
  }
  show(lo);
}

/* Slow flight through a starfield tunnel. Stars sit on a cylinder around the flight path;
   each one drifts toward the camera, grows, glows brighter, leaves the screen, and is
   reborn far away, so the loop never has a visible seam. */
function startStarfield(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // no canvas support: the plain black background stays
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // one soft white glow sprite, reused for every star
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const sg = sprite.getContext('2d');
  const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.12, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.3, 'rgba(225,232,255,0.34)');
  grad.addColorStop(1, 'rgba(200,215,255,0)');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 64, 64);

  let W = 0,
    H = 0,
    focal = 1,
    stars = [];

  function spawn(anywhere) {
    return {
      a: Math.random() * Math.PI * 2, // angle around the tunnel
      r: 0.04 + Math.sqrt(Math.random()) * 1.15, // distance from the flight path
      z: anywhere ? 0.04 + Math.random() * 0.96 : 1, // 1 = far away, 0 = at the camera
      size: 0.003 + Math.random() * 0.005,
      tw: 0.6 + Math.random() * 1.8, // twinkle speed
      ph: Math.random() * 6.28,
    };
  }

  function resize() {
    // draw at no more than ~1080p; the glow is soft so it still looks sharp on a 4K TV
    const scale = Math.min(1, 1920 / window.innerWidth);
    W = canvas.width = Math.round(window.innerWidth * scale);
    H = canvas.height = Math.round(window.innerHeight * scale);
    focal = Math.max(W, H) * 0.55;
    const n = Math.round(Math.min(2200, Math.max(700, (W * H) / 1200)) * STARFIELD.density);
    stars = Array.from({ length: n }, () => spawn(true));
  }

  function draw(t, dt) {
    const cx = W / 2 + Math.sin(t * 0.07) * W * 0.02; // gentle camera sway
    const cy = H / 2 + Math.cos(t * 0.05) * H * 0.02;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    // faint glow at the far end of the tunnel
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.5);
    g.addColorStop(0, 'rgba(210,220,255,0.07)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.z -= STARFIELD.speed * dt;
      s.a += STARFIELD.rotation * dt;
      const sx = cx + ((s.r * Math.cos(s.a)) / s.z) * focal;
      const sy = cy + ((s.r * Math.sin(s.a)) / s.z) * focal;
      if (s.z < 0.03 || sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) {
        stars[i] = spawn(false);
        continue;
      }
      const d = Math.min(46, Math.max(2.5, (s.size * focal) / s.z)); // glow diameter in px
      let alpha = Math.min(1, (1 - s.z) / 0.12); // fade in from the distance
      alpha *= 0.75 + 0.25 * Math.sin(t * s.tw + s.ph); // twinkle
      if (alpha <= 0.02) continue;
      if (d > 14) {
        // short trail on the closest stars gives a feeling of motion
        const z2 = s.z + STARFIELD.speed * 1.2;
        const px = cx + ((s.r * Math.cos(s.a)) / z2) * focal;
        const py = cy + ((s.r * Math.sin(s.a)) / z2) * focal;
        ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.35).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1, d * 0.07);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, sx - d / 2, sy - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
  }

  resize();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      if (reduce) draw(0, 0);
    }, 200);
  });

  if (reduce) {
    draw(0, 0); // still image for people who prefer reduced motion
    return;
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(now / 1000, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* big-screen mode: the board fills the rest of the screen (no scrolling), newest cards first */
function fitBoard() {
  if (!document.body.classList.contains('kiosk')) return;
  const b = document.getElementById('board') || document.getElementById('mqboard');
  if (!b) return;
  const shell = document.querySelector('.shell');
  const pad = parseFloat(getComputedStyle(shell).paddingBottom) || 0;
  b.style.height =
    Math.max(240, window.innerHeight - b.getBoundingClientRect().top - pad) + 'px';
  layoutKioskBoard(); // no-op for #mqboard (looks for #board)
}
function initKiosk() {
  const bg = document.createElement('div');
  bg.className = 'kbg';
  bg.setAttribute('aria-hidden', 'true');
  const cv = document.createElement('canvas');
  bg.appendChild(cv);
  document.body.prepend(bg);
  try {
    startStarfield(cv);
  } catch (e) {
    /* the board still works on a plain black background */
  }
  window.addEventListener('resize', fitBoard);
  /* full screen (hides the browser's tab bar): button, F key, or double-click */
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      document.documentElement.requestFullscreen();
  };
  const fsBtn = document.createElement('button');
  fsBtn.type = 'button';
  fsBtn.className = 'kfs';
  fsBtn.textContent = 'Full screen';
  fsBtn.hidden = !document.documentElement.requestFullscreen;
  fsBtn.onclick = toggleFullscreen;
  document.body.appendChild(fsBtn);
  /* admin only: red "Clear board" button (bottom left) */
  if (boardIsAdmin) {
    const clr = document.createElement('button');
    clr.type = 'button';
    clr.className = 'kclear';
    clr.textContent = 'Clear board';
    clr.onclick = async () => {
      const n = document.querySelectorAll('#board .pnote, #mqboard .pnote').length;
      if (
        !window.confirm(
          'Hide ALL posts from the board' +
            (n ? ' (' + n + ' showing now)' : '') +
            '?\n\nThey stay in the database but disappear from every screen.',
        )
      )
        return;
      if (!BOARD.endpoint || boardToken === null)
        boardToken = BOARD.endpoint ? window.prompt('Admin token') || null : 'demo';
      if (!boardToken) return;
      try {
        await boardClearAll();
        boardSig = '';
        seenIds.clear();
        refreshBoard(false);
      } catch (e) {
        alert(e.message);
        boardToken = null;
      }
    };
    document.body.appendChild(clr);
  }
  document.addEventListener('fullscreenchange', () => {
    fsBtn.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });
  document.addEventListener('dblclick', (e) => {
    if (!e.target.closest('.hide, .kclear')) toggleFullscreen();
  });
  /* hide the mouse pointer after 3 seconds (not in admin mode) */
  if (!boardIsAdmin) {
    let t;
    const wake = () => {
      document.body.classList.remove('idle');
      clearTimeout(t);
      t = setTimeout(() => document.body.classList.add('idle'), 3000);
    };
    document.addEventListener('mousemove', wake);
    wake();
  }
  /* keep the TV awake where the browser allows it */
  const keepAwake = () => {
    try {
      if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {});
    } catch (e) {}
  };
  keepAwake();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) keepAwake();
  });
}
