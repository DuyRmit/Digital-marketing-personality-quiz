/* =========================================================
   SAVE PERSONA AS IMAGE (drawn on a canvas, no libraries)
   ========================================================= */
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lh;
  }
  return y;
}
function loadImg(src) {
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

async function buildCard(key) {
  const p = PERSONAS[key],
    W = 1080,
    H = 1350;
  try {
    await Promise.all([
      document.fonts.load('900 60px Lato'),
      document.fonts.load('700 40px Lato'),
    ]);
  } catch (e) {}
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const F = 'Lato, system-ui, Arial, sans-serif';

  ctx.fillStyle = '#000054';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.roundRect(60, 60, W - 120, H - 120, 56);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = p.ink;
  ctx.font = `700 38px ${F}`;
  ctx.fillText('My digital marketing persona is…', W / 2, 150);

  // icon panel (rounded square, image shown whole, never cropped)
  const cx = W / 2,
    cy = 430,
    r = 200,
    pad = 18;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(cx - r, cy - r, r * 2, r * 2, 56);
  ctx.fill();
  let drawn = false;
  if (p.image) {
    const im = await loadImg(p.image);
    if (im) {
      const box = (r - pad) * 2;
      const sc = Math.min(box / im.width, box / im.height);
      const dw = im.width * sc,
        dh = im.height * sc;
      ctx.drawImage(im, cx - dw / 2, cy - dh / 2, dw, dh);
      drawn = true;
    }
  }
  if (!drawn) {
    ctx.font = `220px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(p.emoji, cx, cy + 14);
    ctx.textBaseline = 'alphabetic';
  }

  ctx.fillStyle = p.ink;
  ctx.font = `900 108px ${F}`;
  let nameSize = 108;
  while (ctx.measureText(p.name).width > W - 220 && nameSize > 60) {
    nameSize -= 4;
    ctx.font = `900 ${nameSize}px ${F}`;
  }
  ctx.fillText(p.name, W / 2, 760);

  // value pill
  ctx.font = `900 40px ${F}`;
  const label = 'RMIT Value: ' + p.value,
    tw = ctx.measureText(label).width + 70;
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - tw / 2, 800, tw, 70, 35);
  ctx.fill();
  ctx.fillStyle = '#000054';
  ctx.fillText(label, W / 2, 849);

  ctx.fillStyle = p.ink;
  ctx.font = `700 52px ${F}`;
  wrapText(ctx, p.power, W / 2, 980, W - 260, 66);

  ctx.font = `700 32px ${F}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText('What’s your digital marketing superpower?', W / 2, H - 130);
  ctx.globalAlpha = 1;
  return c;
}

async function savePersona() {
  const msg = document.getElementById('saveMsg'),
    btn = document.getElementById('save');
  btn.disabled = true;
  msg.textContent = 'Getting your persona ready…';
  try {
    const canvas = await buildCard(state.winner);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    const fname = `my-digital-marketing-superpower-${state.winner}.png`;
    const file = new File([blob], fname, { type: 'image/png' });
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My digital marketing superpower' });
        msg.textContent = 'Shared! You can also save it to your photos.';
      } catch (e) {
        msg.textContent =
          e && e.name === 'AbortError' ? '' : 'Could not open sharing. Try again.';
      }
    } else {
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      msg.textContent = 'Saved! Check your downloads.';
    }
  } catch (e) {
    msg.textContent = 'Sorry, saving didn’t work. Try a screenshot instead.';
  }
  btn.disabled = false;
}
