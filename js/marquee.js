/* marquee.js — băng chuyền card chạy ngang liên tục cho màn hình #board
 *
 * Mỗi cột xếp tối đa perCol card (mặc định 3) nằm dưới nhau, cách nhau gap px (mặc định 16).
 * Chiều rộng card cố định; chiều cao mỗi card theo lượng chữ. Cột nào xếp thêm card mà
 * vượt chiều cao băng chuyền thì card đó sang cột mới, nên cột có thể chỉ có 2 card nếu bài dài.
 * Chiều rộng card (và cỡ chữ) được tính để 3 card cỡ trung bình vừa chiều cao băng chuyền.
 *
 * Vòng lặp: các cột nối liền nhau thành một vòng. Cột ra khỏi mép trái được nối lại vào cuối vòng,
 * không có khoảng trống. Nếu số bài ít hơn độ rộng màn hình, vòng được lấp bằng bản sao
 * của chính những cột đang có, nên không bao giờ có khoảng đen.
 *
 *   const mq = Marquee.create(el, { createCard: (post) => HTMLElement });
 *   mq.setPosts(posts);   // gọi mỗi lần poll (mới nhất trước)
 */
window.Marquee = (function () {
  function create(root, userOpts) {
    const o = Object.assign({
      createCard: null,
      perCol: 3,        // số hàng: tối đa card / cột
      gap: 16,          // khoảng cách giữa các card (px)
      cardEm: 11.6,     // chiều cao card trung bình, tính bằng em (tăng nếu card hay bị tràn cột)
      widthEm: 14,      // chiều rộng card = widthEm × cỡ chữ (giảm = card hẹp hơn, chữ to hơn)
      speed: 36,        // px / giây
      releaseMs: 700,   // giãn cách khi có nhiều bài mới cùng lúc
      enterMs: 600
    }, userOpts);

    root.classList.add('mq');
    const cols = [];            // thứ tự trong vòng: { el, x, off, cards[], clone, src }
    const known = new Map();    // id -> { id, el, col }
    const queue = [];
    let openCol = null, drainTimer = null, last = performance.now();
    let first = true, raf = 0, dead = false, rr = 0;
    let vw = 0, H = 0, gap = 16, colW = 0, cardW = 0;

    function measure() {
      if (root.clientHeight < 100)
        root.style.height = Math.max(240, window.innerHeight - root.getBoundingClientRect().top - 24) + 'px';
      vw = root.clientWidth; H = root.clientHeight;
      gap = o.gap;
      const font = (H - (o.perCol + 1) * gap) / (o.perCol * o.cardEm);   // px
      cardW = Math.floor(font * o.widthEm);
      colW = cardW + gap;
      const st = root.style;
      st.setProperty('--gap', gap + 'px');
      st.setProperty('--mq-col-w', colW + 'px');
      st.setProperty('--mq-card-w', cardW + 'px');
      st.setProperty('--mq-font', font.toFixed(2) + 'px');
    }
    measure();

    /* ---------- cột ---------- */
    function place(c) { c.el.style.transform = 'translate3d(' + (c.x + c.off) + 'px,0,0)'; }
    function makeColEl() {
      const el = document.createElement('div');
      el.className = 'mq-col';
      root.appendChild(el);
      return el;
    }
    function fillClone(c) {              // bản sao = nội dung hiện tại của cột gốc
      c.el.textContent = '';
      c.src.cards.forEach(card => {
        const n = card.el.cloneNode(true);
        n.classList.remove('mq-enter', 'mq-glow', 'mq-leave');
        n.style.transition = ''; n.style.transform = '';
        c.el.appendChild(n);
      });
    }
    function refreshClonesOf(col) {
      cols.forEach(c => { if (c.src === col) fillClone(c); });
    }
    function removeColAt(j) {            // bỏ một cột, các cột sau trượt lại cho liền
      cols[j].el.remove(); cols.splice(j, 1);
      for (let i = j; i < cols.length; i++) { cols[i].x -= colW; cols[i].off += colW; }
    }
    function removeRealCol(col) {
      const idx = [];
      cols.forEach((c, i) => { if (c === col || c.src === col) idx.push(i); });
      idx.reverse().forEach(removeColAt);
      if (openCol === col) openCol = null;
      fill();
    }

    /* giữ vòng đủ dài (>= độ rộng màn hình + 1 cột), lấp bằng bản sao nếu thiếu */
    function fill() {
      const real = cols.filter(c => !c.clone);
      if (!real.length) { while (cols.length) removeColAt(cols.length - 1); return; }
      while (cols.length * colW < vw + colW) {
        const src = real[rr++ % real.length];
        const c = { el: makeColEl(), x: cols[cols.length - 1].x + colW, off: 0, cards: [], clone: true, src };
        c.el.setAttribute('aria-hidden', 'true');
        fillClone(c); cols.push(c); place(c);
      }
      while (cols.length > 1) {          // bớt bản sao thừa ngoài màn hình bên phải
        const l = cols[cols.length - 1];
        if (l.clone && l.x >= vw && (cols.length - 1) * colW >= vw + colW) { l.el.remove(); cols.pop(); }
        else break;
      }
    }

    function insertColAtEdge() {         // cột mới chen vào ngay mép phải màn hình
      let k = cols.findIndex(c => c.x >= vw - 1);
      if (k === -1) k = cols.length;
      const col = { el: makeColEl(), x: k > 0 ? cols[k - 1].x + colW : 0, off: 0, cards: [], clone: false, src: null };
      cols.splice(k, 0, col);
      for (let i = k + 1; i < cols.length; i++) { cols[i].x += colW; cols[i].off -= colW; }
      place(col);
      fill();
      return col;
    }

    /* card thêm vào cột này có còn vừa chiều cao băng chuyền không? (đo chiều cao thật) */
    function wouldFit(col, el) {
      col.el.appendChild(el);
      let h = 0;
      col.cards.forEach(c => { h += c.el.offsetHeight; });
      h += el.offsetHeight + col.cards.length * gap;
      el.remove();
      return h <= H * 0.97;
    }

    /* ---------- thêm / xoá card (FLIP để card cũ trượt mượt khi cột đổi) ---------- */
    function flipSiblings(col, mutate) {
      const before = new Map(col.cards.map(c => [c, c.el.getBoundingClientRect().top]));
      mutate();
      col.cards.forEach(c => {
        if (!before.has(c)) return;
        const dy = before.get(c) - c.el.getBoundingClientRect().top;
        if (!dy) return;
        c.el.style.transition = 'none';
        c.el.style.transform = 'translateY(' + dy + 'px)';
      });
      void col.el.offsetHeight;
      col.cards.forEach(c => {
        if (!before.has(c)) return;
        c.el.style.transition = 'transform ' + o.enterMs + 'ms cubic-bezier(.2,.8,.2,1)';
        c.el.style.transform = '';
      });
    }

    function addCard(post) {
      if (known.has(post.id)) return;
      const el = o.createCard(post);
      el.classList.add('mq-enter');
      let col = openCol;
      const usable = col && cols.includes(col) && col.cards.length < o.perCol &&
                     col.x > vw * 0.2 && wouldFit(col, el);
      if (!usable) col = openCol = insertColAtEdge();
      const item = { id: post.id, el, col };
      flipSiblings(col, () => { col.el.appendChild(el); col.cards.push(item); });
      known.set(post.id, item);
      refreshClonesOf(col);
      void el.offsetHeight;
      requestAnimationFrame(() => {
        el.classList.remove('mq-enter');
        el.classList.add('mq-glow');
        setTimeout(() => el.classList.remove('mq-glow'), 2400);
      });
    }

    function removeCard(id) {
      const item = known.get(id); if (!item) return;
      known.delete(id);
      item.el.classList.add('mq-leave');
      setTimeout(() => {
        const col = item.col;
        flipSiblings(col, () => {
          col.cards.splice(col.cards.indexOf(item), 1);
          item.el.remove();
        });
        if (!col.cards.length) removeRealCol(col);
        else refreshClonesOf(col);
      }, 350);
    }

    /* ---------- chuyển động ---------- */
    function tick(now) {
      const dt = Math.min(100, now - last); last = now;
      const dx = o.speed * dt / 1000, k = 1 - Math.exp(-dt / 180);
      for (const c of cols) {
        c.x -= dx;
        if (c.off) { c.off -= c.off * k; if (Math.abs(c.off) < 0.5) c.off = 0; }
        place(c);
      }
      while (cols.length > 1 && cols[0].x < -colW) {   // ra khỏi mép trái → nối vào cuối vòng
        const c = cols.shift();
        c.x = cols[cols.length - 1].x + colW; c.off = 0;
        cols.push(c); place(c);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function onResize() {
      measure();
      if (!cols.length) return;
      const x0 = cols[0].x;
      cols.forEach((c, i) => { c.x = x0 + i * colW; c.off = 0; place(c); });
      fill();
    }
    const ro = new ResizeObserver(() => { if (root.clientWidth) onResize(); });
    ro.observe(root);

    /* ---------- nhận dữ liệu ---------- */
    function drain() {
      if (dead || drainTimer || !queue.length) return;
      addCard(queue.shift());
      drainTimer = setTimeout(() => { drainTimer = null; drain(); }, o.releaseMs);
    }

    function setPosts(posts) {            // posts: mới nhất trước
      const ids = new Set(posts.map(p => p.id));
      if (first) {
        first = false;
        let col = null;
        posts.forEach(p => {
          const el = o.createCard(p);
          if (!col || col.cards.length >= o.perCol || !wouldFit(col, el)) {
            col = { el: makeColEl(), x: cols.length * colW, off: 0, cards: [], clone: false, src: null };
            cols.push(col); place(col);
          }
          const item = { id: p.id, el, col };
          col.el.appendChild(el); col.cards.push(item); known.set(p.id, item);
        });
        fill();
        return;
      }
      [...known.keys()].forEach(id => { if (!ids.has(id)) removeCard(id); });
      const queued = new Set(queue.map(p => p.id));
      posts.filter(p => !known.has(p.id) && !queued.has(p.id)).reverse().forEach(p => queue.push(p));
      drain();
    }

    function destroy() {
      dead = true; cancelAnimationFrame(raf); clearTimeout(drainTimer); ro.disconnect();
    }
    return { setPosts, destroy };
  }
  return { create };
})();
