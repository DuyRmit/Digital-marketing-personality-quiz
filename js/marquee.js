/* marquee.js — băng chuyền card chạy ngang liên tục cho màn hình #board
 *
 * Dùng:
 *   const mq = Marquee.create(document.getElementById('mq'), {
 *     createCard: (post) => HTMLElement,   // hàm dựng card (dùng lại hàm của board.js)
 *   });
 *   mq.setPosts(posts);                    // gọi mỗi lần poll, posts = mới nhất trước
 */
window.Marquee = (function () {
  function create(root, userOpts) {
    const o = Object.assign({
      createCard: null,
      perCol: 5,          // tối đa card / cột
      visibleCols: 6,     // số cột nhìn thấy cùng lúc (quyết định độ rộng cột)
      speed: 36,          // px / giây
      releaseMs: 700,     // giãn cách giữa các card mới khi có nhiều bài cùng lúc
      enterMs: 600
    }, userOpts);

    root.classList.add('mq');
    const cols = [];            // theo thứ tự trái → phải
    const known = new Map();    // id -> { col, el }
    const queue = [];
    let openCol = null, drainTimer = null, last = performance.now(), first = true, raf = 0, dead = false;
    let vw = 0, colW = 0;

    function measure() {
      /* tự đặt chiều cao nếu khung đang bị 0 (ví dụ kiosk.js bản cũ chưa đặt) */
      if (root.clientHeight < 100)
        root.style.height = Math.max(240, window.innerHeight - root.getBoundingClientRect().top - 24) + 'px';
      vw = root.clientWidth;
      colW = Math.round(vw / o.visibleCols);
      root.style.setProperty('--mq-col-w', colW + 'px');
      root.style.setProperty('--mq-h', root.clientHeight + 'px');
      root.style.setProperty('--mq-n', o.perCol);
    }
    measure();

    /* ---------- cột ---------- */
    function makeCol(x) {
      const el = document.createElement('div');
      el.className = 'mq-col';
      root.appendChild(el);
      const col = { el, x, cards: [] };
      place(col);
      return col;
    }
    function place(c) { c.el.style.transform = 'translate3d(' + c.x + 'px,0,0)'; }

    function insertColAtEdge() {
      let k = cols.findIndex(c => c.x >= vw - 1);
      if (k === -1) k = cols.length;
      const prevEnd = k > 0 ? cols[k - 1].x + colW : 0;
      const col = makeCol(Math.max(vw, prevEnd));
      cols.splice(k, 0, col);
      let edge = col.x + colW;                       // đẩy các cột phía sau (ngoài màn hình) ra
      for (let j = k + 1; j < cols.length && cols[j].x < edge; j++) {
        cols[j].x = edge; edge += colW; place(cols[j]);
      }
      return col;
    }

    /* ---------- thêm / xoá card (FLIP để các card cũ giãn ra mượt) ---------- */
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
      let col = openCol;
      const usable = col && cols.includes(col) && col.cards.length < o.perCol && col.x > vw * 0.2;
      if (!usable) col = openCol = insertColAtEdge();
      const el = o.createCard(post);
      el.classList.add('mq-card', 'mq-enter');
      const item = { id: post.id, el, col };
      flipSiblings(col, () => { col.el.appendChild(el); col.cards.push(item); });
      known.set(post.id, item);
      void el.offsetHeight;
      requestAnimationFrame(() => {
        el.classList.remove('mq-enter');
        el.classList.add('mq-glow');                 // viền sáng vàng báo "bài mới"
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
        if (!col.cards.length) {
          col.el.remove();
          const i = cols.indexOf(col); if (i > -1) cols.splice(i, 1);
          if (openCol === col) openCol = null;
        }
      }, 350);
    }

    /* ---------- vòng lặp chuyển động ---------- */
    function tick(now) {
      const dt = Math.min(100, now - last); last = now;
      const dx = o.speed * dt / 1000;
      for (const c of cols) { c.x -= dx; place(c); }
      while (cols.length && cols[0].x < -colW) {      // ra khỏi trái → quay lại cuối hàng
        const c = cols.shift();
        const tail = cols.length ? cols[cols.length - 1].x + colW : 0;
        c.x = Math.max(vw, tail);
        cols.push(c); place(c);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function onResize() {
      measure();
      cols.forEach((c, i) => { c.x = cols[0].x + i * colW; place(c); });
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
        for (let i = 0; i < posts.length; i += o.perCol) {
          const col = makeCol((i / o.perCol) * colW);
          cols.push(col);
          posts.slice(i, i + o.perCol).forEach(p => {
            const el = o.createCard(p); el.classList.add('mq-card');
            const item = { id: p.id, el, col };
            col.el.appendChild(el); col.cards.push(item); known.set(p.id, item);
          });
        }
        return;
      }
      [...known.keys()].forEach(id => { if (!ids.has(id)) removeCard(id); });
      const queued = new Set(queue.map(p => p.id));
      posts.filter(p => !known.has(p.id) && !queued.has(p.id)).reverse().forEach(p => queue.push(p));
      drain();
    }

    function destroy() {
      dead = true; cancelAnimationFrame(raf); clearTimeout(drainTimer);
      ro.disconnect();
    }
    return { setPosts, destroy };
  }
  return { create };
})();
