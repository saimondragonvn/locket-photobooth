/**
 * Locket Photobooth v2.4.0 — Extended High-Craft Frame Pack & Foreground Decor Engine
 *
 * Includes:
 * - 5 Trendy frames inspired by user reference designs:
 *   1. BIFU Hè (`bifu-summer`) — Pastel mint/lemon/sky doodle diary & stickers
 *   2. Tiệc Đêm (`celebrate-party`) — Royal midnight purple, masks, balloons & gold calligraphy
 *   3. Caro Bướm Xanh (`blue-gingham`) — Baby-blue gingham plaid, stitched frames, watercolor butterflies & bow
 *   4. Len Xanh (`knit-denim`) — Cozy sky-blue Nordic knit weave, stitched stars, denim hearts & smileys
 *   5. Y2K Hồng (`y2k-pink`) — Pastel sakura pink, chrome silver stars, kitty bow & glossy hearts
 * - 8 Original custom-designed frames:
 *   6. Cuộn Phim 35mm (`film-35mm`)
 *   7. Neon Đêm (`cyber-neon`)
 *   8. Matcha Sữa (`matcha-cafe`)
 *   9. Cực Quang (`aurora-dream`)
 *  10. Tạp Chí (`magazine-vogue`)
 *  11. Nơ Anh Đào (`sakura-bow`)
 *  12. Biển Xanh (`ocean-shell`)
 *  13. Vàng Hoàng Gia (`gold-luxe`)
 */

export const EXTRA_BOOTH_GROUPS = [
  { id: 'trendy', name: 'Hot Trend' },
  { id: 'custom', name: 'Sáng tạo' },
];

export const EXTRA_BOOTH_FRAMES = [
  // --- Group: Hot Trend (User Ref #1–#5) ---
  {
    id: 'bifu-summer',
    name: 'BIFU Hè',
    group: 'trendy',
    free: true,
    bg: '#daf7f0',
    fg: '#335c9c',
    art: { kind: 'bifuSummer' },
    decor: 'bifuSummer',
    greeting: 'Summer ends · Back to school',
  },
  {
    id: 'celebrate-party',
    name: 'Tiệc Đêm',
    group: 'trendy',
    free: true,
    bg: '#14083c',
    fg: '#ffd666',
    art: { kind: 'celebrateParty' },
    decor: 'celebrateParty',
    greeting: 'Enjoy The Party!',
  },
  {
    id: 'blue-gingham',
    name: 'Caro Bướm',
    group: 'trendy',
    free: true,
    bg: '#ffffff',
    fg: '#3c6ea8',
    art: { kind: 'blueGingham' },
    decor: 'blueGingham',
    greeting: 'Blue Daydream',
  },
  {
    id: 'knit-denim',
    name: 'Len Xanh',
    group: 'trendy',
    free: true,
    bg: '#eef7fc',
    fg: '#436e98',
    art: { kind: 'knitDenim' },
    decor: 'knitDenim',
    greeting: 'PHOTOBOX',
  },
  {
    id: 'y2k-pink',
    name: 'Y2K Hồng',
    group: 'trendy',
    free: true,
    bg: '#ffe0ef',
    fg: '#d84388',
    art: { kind: 'y2kPink' },
    decor: 'y2kPink',
    greeting: 'Photogenic · First Love',
  },

  // --- Group: Sáng tạo (Original Custom Designs) ---
  {
    id: 'film-35mm',
    name: 'Phim 35mm',
    group: 'custom',
    free: true,
    bg: '#131210',
    fg: '#f3a447',
    art: { kind: 'film35mm' },
    decor: 'film35mm',
    greeting: 'KODAK PORTRA 400',
  },
  {
    id: 'cyber-neon',
    name: 'Neon Đêm',
    group: 'custom',
    free: true,
    bg: '#09071a',
    fg: '#4df6ff',
    art: { kind: 'cyberNeon' },
    decor: 'cyberNeon',
    greeting: 'NIGHT PULSE // 2099',
  },
  {
    id: 'matcha-cafe',
    name: 'Matcha Sữa',
    group: 'custom',
    free: true,
    bg: '#f6f3e7',
    fg: '#4b6b3e',
    art: { kind: 'matchaCafe' },
    decor: 'matchaCafe',
    greeting: 'Matcha & Good Vibes',
  },
  {
    id: 'aurora-dream',
    name: 'Cực Quang',
    group: 'custom',
    free: true,
    bg: '#0c1230',
    fg: '#d8f8ff',
    art: { kind: 'auroraDream' },
    decor: 'auroraDream',
    greeting: 'Under The Stars',
  },
  {
    id: 'magazine-vogue',
    name: 'Tạp Chí',
    group: 'custom',
    free: true,
    bg: '#f7f4ee',
    fg: '#1a1918',
    art: { kind: 'magazineVogue' },
    decor: 'magazineVogue',
    greeting: 'SPECIAL EDITION',
  },
  {
    id: 'sakura-bow',
    name: 'Nơ Anh Đào',
    group: 'custom',
    free: true,
    bg: '#ffe9f1',
    fg: '#b83c6b',
    art: { kind: 'sakuraBow' },
    decor: 'sakuraBow',
    greeting: 'Sweet Blossom',
  },
  {
    id: 'ocean-shell',
    name: 'Biển Xanh',
    group: 'custom',
    free: true,
    bg: '#d9f6f9',
    fg: '#1b6d85',
    art: { kind: 'oceanShell' },
    decor: 'oceanShell',
    greeting: 'Ocean Breeze',
  },
  {
    id: 'gold-luxe',
    name: 'Vàng Luxe',
    group: 'custom',
    free: true,
    bg: '#100e0b',
    fg: '#e7c675',
    art: { kind: 'goldLuxe' },
    decor: 'goldLuxe',
    greeting: 'GOLDEN MOMENT',
  },
];

// --- Vector Drawing Helpers ---

function drawFourPointStar(ctx, x, y, r, fill, stroke, lineWidth = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  const inner = r * 0.28;
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const ang = (i * Math.PI) / 4;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

function drawFivePointStar(ctx, x, y, r, rot, fill, stroke, lineWidth = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.44;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

function drawHeart(ctx, x, y, r, rot, fill, stroke, lineWidth = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.35);
  ctx.bezierCurveTo(-r * 0.1, -r * 0.35, -r * 1.15, -r * 0.25, -r * 1.0, r * 0.35);
  ctx.bezierCurveTo(-r * 0.9, r * 0.85, -r * 0.25, r * 1.15, 0, r * 1.35);
  ctx.bezierCurveTo(r * 0.25, r * 1.15, r * 0.9, r * 0.85, r * 1.0, r * 0.35);
  ctx.bezierCurveTo(r * 1.15, -r * 0.25, r * 0.1, -r * 0.35, 0, r * 0.35);
  ctx.closePath();
  ctx.translate(0, -r * 0.55);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawButterfly(ctx, x, y, r, rot, wingColor = '#93c2ef', accent = '#5d93cf') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // White sticker halo
  ctx.shadowColor = 'rgba(255,255,255,0.95)';
  ctx.shadowBlur = r * 0.22;

  const drawWings = (scaleMul, color) => {
    ctx.fillStyle = color;
    // Upper left & right wings
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.52, -r * 0.28, r * 0.54 * scaleMul, r * 0.38 * scaleMul, s * -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * r * 0.38, r * 0.32, r * 0.38 * scaleMul, r * 0.3 * scaleMul, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  drawWings(1.14, '#ffffff');
  ctx.shadowBlur = 0;
  drawWings(1.0, wingColor);
  drawWings(0.62, accent);

  // Subtle translucent inner highlight
  ctx.globalAlpha = 0.55;
  drawWings(0.35, '#e8f4ff');
  ctx.globalAlpha = 1;

  // Body & antennae
  ctx.fillStyle = '#243a59';
  ctx.beginPath();
  ctx.ellipse(0, 0.05 * r, r * 0.085, r * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#243a59';
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.beginPath();
  ctx.moveTo(-r * 0.03, -r * 0.36);
  ctx.quadraticCurveTo(-r * 0.22, -r * 0.72, -r * 0.34, -r * 0.68);
  ctx.moveTo(r * 0.03, -r * 0.36);
  ctx.quadraticCurveTo(r * 0.22, -r * 0.72, r * 0.34, -r * 0.68);
  ctx.stroke();
  ctx.restore();
}

function drawRibbonBow(ctx, x, y, r, rot, mainColor = '#6fa4dc', highlight = '#d3e9ff', outline = '#325a89') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // White sticker outline
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Trailing ribbons
  ctx.fillStyle = mainColor;
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1, r * 0.06);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, r * 0.05);
    ctx.lineTo(s * r * 0.56, r * 0.92);
    ctx.lineTo(s * r * 0.24, r * 0.86);
    ctx.lineTo(s * r * 0.08, r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Loops
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * r * 0.32, -r * 0.62, s * r * 1.05, -r * 0.42, s * r * 0.86, r * 0.14);
    ctx.bezierCurveTo(s * r * 0.72, r * 0.48, s * r * 0.24, r * 0.22, 0, r * 0.06);
    ctx.closePath();
    ctx.fillStyle = mainColor;
    ctx.fill();
    ctx.stroke();

    // Satin sheen
    ctx.beginPath();
    ctx.ellipse(s * r * 0.46, -r * 0.1, r * 0.22, r * 0.09, s * -0.25, 0, Math.PI * 2);
    ctx.fillStyle = highlight;
    ctx.globalAlpha = 0.65;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Center knot
  ctx.beginPath();
  ctx.ellipse(0, 0.02 * r, r * 0.18, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = highlight;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFlower(ctx, x, y, r, petalColor = '#7bb0e8', centerColor = '#ffe27a', whiteHalo = true) {
  ctx.save();
  ctx.translate(x, y);
  if (whiteHalo) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      const ang = (i * Math.PI * 2) / 5 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * r * 0.46, Math.sin(ang) * r * 0.46, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = petalColor;
  for (let i = 0; i < 5; i++) {
    const ang = (i * Math.PI * 2) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(ang) * r * 0.46, Math.sin(ang) * r * 0.46, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = centerColor;
  ctx.fill();
  ctx.restore();
}

function drawCarnivalMask(ctx, x, y, r, rot, colorA = '#ff5b7f', colorB = '#ffd15c') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  const grad = ctx.createLinearGradient(-r, -r * 0.5, r, r * 0.5);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);

  ctx.beginPath();
  ctx.moveTo(0, -r * 0.22);
  ctx.bezierCurveTo(-r * 0.42, -r * 0.62, -r * 1.15, -r * 0.38, -r * 1.02, r * 0.14);
  ctx.bezierCurveTo(-r * 0.82, r * 0.56, -r * 0.25, r * 0.44, 0, r * 0.24);
  ctx.bezierCurveTo(r * 0.25, r * 0.44, r * 0.82, r * 0.56, r * 1.02, r * 0.14);
  ctx.bezierCurveTo(r * 1.15, -r * 0.38, r * 0.42, -r * 0.62, 0, -r * 0.22);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#ffdf7e';
  ctx.lineWidth = Math.max(1.2, r * 0.08);
  ctx.stroke();

  // Eye cutouts
  ctx.fillStyle = '#14083c';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * r * 0.42, 0, r * 0.24, r * 0.13, s * -0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  // Crown gem
  drawFourPointStar(ctx, 0, -r * 0.05, r * 0.18, '#fff7cc');
  ctx.restore();
}

function drawBalloon(ctx, x, y, r, rot, color = '#ff6b6b') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.78, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Gloss highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.26, -r * 0.3, r * 0.18, r * 0.34, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.fill();

  // Knot
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, r * 0.98);
  ctx.lineTo(r * 0.12, r * 0.98);
  ctx.lineTo(0, r * 1.16);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // String
  ctx.strokeStyle = 'rgba(255,220,130,0.65)';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(0, r * 1.15);
  ctx.quadraticCurveTo(r * 0.24, r * 1.55, -r * 0.08, r * 1.9);
  ctx.stroke();
  ctx.restore();
}

function drawSmileyBadge(ctx, x, y, r, bg = '#6d94ba') {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.08, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  // Eyes & smile
  ctx.fillStyle = '#eef7ff';
  ctx.beginPath();
  ctx.ellipse(-r * 0.26, -r * 0.18, r * 0.09, r * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.26, -r * 0.18, r * 0.09, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#eef7ff';
  ctx.lineWidth = Math.max(1, r * 0.11);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.02, r * 0.42, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawKittyBadge(ctx, x, y, r, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // Ears
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#c4749d';
  ctx.lineWidth = Math.max(1, r * 0.09);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.22, -r * 0.45);
    ctx.lineTo(s * r * 0.78, -r * 0.92);
    ctx.lineTo(s * r * 0.82, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Head oval
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.95, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Pink bow on right ear
  ctx.fillStyle = '#ff7eb8';
  ctx.beginPath();
  ctx.ellipse(r * 0.44, -r * 0.52, r * 0.22, r * 0.15, 0.35, 0, Math.PI * 2);
  ctx.ellipse(r * 0.74, -r * 0.35, r * 0.2, r * 0.14, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.58, -r * 0.44, r * 0.11, 0, Math.PI * 2);
  ctx.fillStyle = '#ff4d97';
  ctx.fill();
  // Eyes & yellow nose
  ctx.fillStyle = '#3d2835';
  ctx.beginPath();
  ctx.arc(-r * 0.35, 0.04 * r, r * 0.08, 0, Math.PI * 2);
  ctx.arc(r * 0.35, 0.04 * r, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd15c';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.16, r * 0.11, r * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPaperPlane(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#335c9c';
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r * 0.85, -r * 0.56);
  ctx.lineTo(-r * 0.42, 0.05 * r);
  ctx.lineTo(-r * 0.85, r * 0.56);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r * 0.42, 0.05 * r);
  ctx.stroke();
  ctx.restore();
}

function drawPlanet(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#8de0e8';
  ctx.strokeStyle = '#335c9c';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#ff98c4';
  ctx.lineWidth = Math.max(1.2, r * 0.13);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.08, r * 0.28, -0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawWashiTape(ctx, x, y, w, h, rot, color = 'rgba(167, 201, 140, 0.72)') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(1, h * 0.12);
  ctx.setLineDash([h * 0.45, h * 0.35]);
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, 0);
  ctx.lineTo(w / 2 - 2, 0);
  ctx.stroke();
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// --- Background Art Renderers (merged into UploadStudio.js `oe` map) ---

export const EXTRA_FRAME_ART_RENDERERS = {
  bifuSummer(ctx, { size, m, rand, swatch }) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#fff7c4');
    grad.addColorStop(0.36, '#d9f8ee');
    grad.addColorStop(0.7, '#d8f1ff');
    grad.addColorStop(1, '#ffe4f2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle pastel notebook grid
    const step = Math.max(8, size * (swatch ? 0.16 : 0.036));
    ctx.strokeStyle = 'rgba(72, 134, 198, 0.11)';
    ctx.lineWidth = Math.max(0.7, size * 0.0014);
    ctx.beginPath();
    for (let x = step; x < size; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
    }
    for (let y = step; y < size; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
    }
    ctx.stroke();

    // Soft pastel clouds/dots
    const count = swatch ? 5 : 22;
    for (let i = 0; i < count; i++) {
      const px = rand() * size;
      const py = rand() * size;
      const rr = (swatch ? 0.08 : 0.018 + rand() * 0.022) * size;
      drawFourPointStar(
        ctx,
        px,
        py,
        rr,
        i % 3 === 0 ? '#ffe066' : i % 3 === 1 ? '#ff9ec7' : '#85d6ff',
        '#335c9c',
        Math.max(0.7, m * 0.0012)
      );
    }
    if (swatch) {
      drawPaperPlane(ctx, size * 0.72, size * 0.28, size * 0.17, -0.35);
      drawPlanet(ctx, size * 0.3, size * 0.72, size * 0.16, -0.2);
    }
  },

  celebrateParty(ctx, { size, rand, swatch }) {
    const grad = ctx.createRadialGradient(size * 0.5, size * 0.45, size * 0.08, size * 0.5, size * 0.5, size * 0.78);
    grad.addColorStop(0, '#2a1170');
    grad.addColorStop(0.55, '#170846');
    grad.addColorStop(1, '#0d042b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle starburst rays in corners
    ctx.save();
    ctx.strokeStyle = 'rgba(130, 88, 255, 0.24)';
    ctx.lineWidth = Math.max(1, size * 0.004);
    const bursts = swatch
      ? [[0.18, 0.22], [0.85, 0.82]]
      : [[0.06, 0.12], [0.94, 0.18], [0.05, 0.84], [0.95, 0.76]];
    for (const [bx, by] of bursts) {
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI * 2) / 10;
        ctx.beginPath();
        ctx.moveTo(bx * size + Math.cos(a) * size * 0.015, by * size + Math.sin(a) * size * 0.015);
        ctx.lineTo(bx * size + Math.cos(a) * size * (swatch ? 0.16 : 0.075), by * size + Math.sin(a) * size * (swatch ? 0.16 : 0.075));
        ctx.stroke();
      }
    }
    ctx.restore();

    // Golden sparkles
    const nStars = swatch ? 7 : 42;
    for (let i = 0; i < nStars; i++) {
      const px = rand() * size;
      const py = rand() * size;
      const rr = (swatch ? 0.055 : 0.008 + rand() * 0.013) * size;
      drawFourPointStar(ctx, px, py, rr, i % 3 === 0 ? '#ffd666' : i % 3 === 1 ? '#ff769b' : '#ffffff');
    }

    if (swatch) {
      drawCarnivalMask(ctx, size * 0.5, size * 0.54, size * 0.34, -0.1, '#ff5b7f', '#ffd15c');
      drawBalloon(ctx, size * 0.22, size * 0.24, size * 0.14, -0.25, '#ff7373');
    }
  },

  blueGingham(ctx, { size, swatch }) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    const step = Math.max(6, size * (swatch ? 0.18 : 0.052));
    ctx.fillStyle = 'rgba(154, 194, 236, 0.34)';
    for (let x = 0; x < size; x += step * 2) {
      ctx.fillRect(x, 0, step, size);
    }
    for (let y = 0; y < size; y += step * 2) {
      ctx.fillRect(0, y, size, step);
    }
    if (swatch) {
      drawButterfly(ctx, size * 0.5, size * 0.48, size * 0.28, -0.22);
      drawRibbonBow(ctx, size * 0.76, size * 0.76, size * 0.16, 0.18);
    }
  },

  knitDenim(ctx, { size, swatch }) {
    ctx.fillStyle = '#f2f8fc';
    ctx.fillRect(0, 0, size, size);

    // Nordic knit chevron stitch pattern
    const cell = Math.max(7, size * (swatch ? 0.14 : 0.032));
    ctx.strokeStyle = 'rgba(116, 165, 206, 0.48)';
    ctx.lineWidth = Math.max(1.2, cell * 0.18);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let y = -cell; y < size + cell; y += cell * 0.9) {
      ctx.beginPath();
      for (let x = -cell; x < size + cell * 2; x += cell) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + cell * 0.5, y + cell * 0.48);
        ctx.lineTo(x + cell, y);
      }
      ctx.stroke();
    }

    // Secondary soft cream knit stitches
    ctx.strokeStyle = 'rgba(155, 198, 232, 0.36)';
    ctx.lineWidth = Math.max(0.8, cell * 0.1);
    for (let y = -cell * 0.45; y < size + cell; y += cell * 0.9) {
      ctx.beginPath();
      for (let x = -cell * 0.5; x < size + cell * 2; x += cell) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + cell * 0.5, y + cell * 0.48);
        ctx.lineTo(x + cell, y);
      }
      ctx.stroke();
    }

    if (swatch) {
      drawFivePointStar(ctx, size * 0.3, size * 0.32, size * 0.18, -0.2, '#7da8d1', '#ffffff', 2);
      drawSmileyBadge(ctx, size * 0.68, size * 0.68, size * 0.19, '#6a93bc');
    }
  },

  y2kPink(ctx, { size, rand, swatch }) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#ffd4e9');
    grad.addColorStop(0.5, '#ffeaf5');
    grad.addColorStop(1, '#ffcbe5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Soft glowing hearts in backdrop
    ctx.save();
    ctx.globalAlpha = 0.25;
    const heartCount = swatch ? 3 : 10;
    for (let i = 0; i < heartCount; i++) {
      drawHeart(ctx, rand() * size, rand() * size, (swatch ? 0.18 : 0.08 + rand() * 0.06) * size, (rand() - 0.5) * 0.6, '#ff8ec6');
    }
    ctx.restore();

    // Twinkling white Y2K glints
    const stars = swatch ? 5 : 28;
    for (let i = 0; i < stars; i++) {
      drawFourPointStar(ctx, rand() * size, rand() * size, (swatch ? 0.07 : 0.012 + rand() * 0.015) * size, '#ffffff');
    }
    if (swatch) {
      drawKittyBadge(ctx, size * 0.52, size * 0.52, size * 0.28, -0.08);
      drawFivePointStar(ctx, size * 0.22, size * 0.26, size * 0.13, 0.2, '#ffffff', '#b8b8c4', 2);
    }
  },

  film35mm(ctx, { size, swatch }) {
    ctx.fillStyle = '#141311';
    ctx.fillRect(0, 0, size, size);
    // Subtle analog film emulsion sheen
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, 'rgba(255, 195, 110, 0.06)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(255, 115, 70, 0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Sprocket holes left & right
    const holeW = size * (swatch ? 0.11 : 0.022);
    const holeH = size * (swatch ? 0.14 : 0.032);
    const gap = size * (swatch ? 0.22 : 0.056);
    ctx.fillStyle = '#ece7df';
    for (let y = gap * 0.45; y < size - holeH; y += gap) {
      roundRectPath(ctx, size * (swatch ? 0.07 : 0.009), y, holeW, holeH, holeW * 0.28);
      ctx.fill();
      roundRectPath(ctx, size - size * (swatch ? 0.07 : 0.009) - holeW, y, holeW, holeH, holeW * 0.28);
      ctx.fill();
    }
    if (swatch) {
      ctx.fillStyle = '#f3a447';
      ctx.font = `800 ${Math.round(size * 0.2)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('35mm', size * 0.5, size * 0.52);
    }
  },

  cyberNeon(ctx, { size, swatch }) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#070618');
    grad.addColorStop(0.5, '#13092e');
    grad.addColorStop(1, '#071324');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Cyber grid
    const step = Math.max(8, size * (swatch ? 0.2 : 0.055));
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = Math.max(0.7, size * 0.0014);
    ctx.beginPath();
    for (let x = 0; x < size; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
    }
    for (let y = 0; y < size; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
    }
    ctx.stroke();

    // Neon corner ambient glow
    const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.65);
    g1.addColorStop(0, 'rgba(0, 245, 255, 0.24)');
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, size, size);

    const g2 = ctx.createRadialGradient(size, size, 0, size, size, size * 0.65);
    g2.addColorStop(0, 'rgba(255, 43, 214, 0.24)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, size, size);

    if (swatch) {
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = Math.max(2, size * 0.04);
      ctx.strokeRect(size * 0.18, size * 0.18, size * 0.64, size * 0.64);
      ctx.strokeStyle = '#ff2bd6';
      ctx.lineWidth = Math.max(1.5, size * 0.025);
      ctx.strokeRect(size * 0.26, size * 0.26, size * 0.48, size * 0.48);
    }
  },

  matchaCafe(ctx, { size, swatch }) {
    ctx.fillStyle = '#f8f4e8';
    ctx.fillRect(0, 0, size, size);
    const step = Math.max(8, size * (swatch ? 0.22 : 0.068));
    ctx.fillStyle = 'rgba(154, 189, 130, 0.26)';
    for (let x = 0; x < size; x += step * 2) ctx.fillRect(x, 0, step, size);
    for (let y = 0; y < size; y += step * 2) ctx.fillRect(0, y, size, step);

    // Subtle cream pin-stripe
    ctx.strokeStyle = 'rgba(92, 128, 74, 0.18)';
    ctx.lineWidth = Math.max(0.8, size * 0.0018);
    for (let x = step * 0.5; x < size; x += step * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    if (swatch) {
      drawWashiTape(ctx, size * 0.5, size * 0.5, size * 0.64, size * 0.22, -0.35, 'rgba(116, 158, 92, 0.78)');
      drawFlower(ctx, size * 0.72, size * 0.72, size * 0.16, '#fffdf5', '#7ea463', false);
    }
  },

  auroraDream(ctx, { size, rand, swatch }) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#070b24');
    grad.addColorStop(0.35, '#12395b');
    grad.addColorStop(0.68, '#2d266b');
    grad.addColorStop(1, '#091126');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Aurora ribbons
    const ribbon = ctx.createRadialGradient(size * 0.2, size * 0.25, 0, size * 0.3, size * 0.3, size * 0.75);
    ribbon.addColorStop(0, 'rgba(65, 255, 212, 0.32)');
    ribbon.addColorStop(0.5, 'rgba(148, 102, 255, 0.18)');
    ribbon.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ribbon;
    ctx.fillRect(0, 0, size, size);

    // Twinkling stars
    const count = swatch ? 9 : 60;
    for (let i = 0; i < count; i++) {
      const px = rand() * size;
      const py = rand() * size;
      const r = (swatch ? 0.045 : 0.004 + rand() * 0.01) * size;
      drawFourPointStar(ctx, px, py, r, i % 4 === 0 ? '#9efcff' : '#ffffff');
    }
    if (swatch) {
      // Crescent moon
      ctx.fillStyle = '#fff3b8';
      ctx.beginPath();
      ctx.arc(size * 0.52, size * 0.5, size * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#142f52';
      ctx.beginPath();
      ctx.arc(size * 0.62, size * 0.44, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  magazineVogue(ctx, { size, swatch }) {
    ctx.fillStyle = '#f7f4ee';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#1a1918';
    ctx.lineWidth = Math.max(1, size * (swatch ? 0.025 : 0.003));
    const inset = size * (swatch ? 0.1 : 0.016);
    ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);
    if (swatch) {
      ctx.fillStyle = '#1a1918';
      ctx.font = `italic 700 ${Math.round(size * 0.23)}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VOGUE', size * 0.5, size * 0.52);
    }
  },

  sakuraBow(ctx, { size, rand, swatch }) {
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#fff1f6');
    grad.addColorStop(1, '#ffd9e8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Floating sakura petals
    const petals = swatch ? 6 : 26;
    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.translate(rand() * size, rand() * size);
      ctx.rotate(rand() * Math.PI * 2);
      const pr = (swatch ? 0.08 : 0.016 + rand() * 0.014) * size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 152, 190, 0.58)' : 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.ellipse(0, 0, pr, pr * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (swatch) {
      drawRibbonBow(ctx, size * 0.5, size * 0.52, size * 0.28, -0.1, '#ff8eb8', '#ffe4ef', '#b83c6b');
    }
  },

  oceanShell(ctx, { size, rand, swatch }) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#e5fcff');
    grad.addColorStop(0.5, '#c2eff7');
    grad.addColorStop(1, '#9be0ef');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Soft ocean waves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.lineWidth = Math.max(1.2, size * (swatch ? 0.035 : 0.005));
    const rows = swatch ? 3 : 9;
    for (let r = 0; r < rows; r++) {
      const y = ((r + 0.5) / rows) * size;
      ctx.beginPath();
      for (let x = 0; x <= size; x += size / 12) {
        const wy = y + Math.sin((x / size) * Math.PI * 4 + r) * size * 0.018;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    // Pearls
    const nPearls = swatch ? 4 : 24;
    for (let i = 0; i < nPearls; i++) {
      const px = rand() * size;
      const py = rand() * size;
      const pr = (swatch ? 0.065 : 0.009 + rand() * 0.008) * size;
      const pg = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 0, px, py, pr);
      pg.addColorStop(0, '#ffffff');
      pg.addColorStop(1, '#bfe7f2');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    if (swatch) {
      drawFivePointStar(ctx, size * 0.5, size * 0.52, size * 0.25, 0.15, '#ff9c8a', '#ffffff', 2);
    }
  },

  goldLuxe(ctx, { size, swatch }) {
    const grad = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.05, size * 0.5, size * 0.5, size * 0.72);
    grad.addColorStop(0, '#1e1912');
    grad.addColorStop(1, '#0a0907');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#e7c675';
    ctx.lineWidth = Math.max(1, size * (swatch ? 0.025 : 0.0032));
    const p1 = size * (swatch ? 0.1 : 0.014);
    const p2 = size * (swatch ? 0.18 : 0.024);
    ctx.strokeRect(p1, p1, size - p1 * 2, size - p1 * 2);
    ctx.globalAlpha = 0.55;
    ctx.strokeRect(p2, p2, size - p2 * 2, size - p2 * 2);
    ctx.globalAlpha = 1;
    if (swatch) {
      drawFourPointStar(ctx, size * 0.5, size * 0.5, size * 0.24, '#f3d88b');
    }
  },
};

// --- Foreground Decor Renderer (drawn over/around photo cells in `Rt`) ---

export function drawFrameForegroundDecor(ctx, frame, layout, size) {
  const kind = frame?.decor;
  if (!kind || !layout) return;

  const cells = layout.cells || [];
  const rad = (layout.radius || 0.012) * size;
  const pad = (layout.pad || 0.04) * size;

  ctx.save();
  try {
    if (kind === 'bifuSummer') {
      // Comic crisp navy + pastel outlines around each photo cell
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const x = c.x * size;
        const y = c.y * size;
        const w = c.w * size;
        const h = c.h * size;
        ctx.save();
        roundRectPath(ctx, x, y, w, h, rad);
        ctx.strokeStyle = i % 2 === 0 ? '#3b6db5' : '#ff7fb0';
        ctx.lineWidth = Math.max(1.5, size * 0.0042);
        ctx.stroke();
        ctx.restore();
      }
      // Cute BIFU-style corner doodles
      drawPaperPlane(ctx, size * 0.88, size * 0.07, size * 0.042, -0.35);
      drawPlanet(ctx, size * 0.06, size * 0.5, size * 0.036, -0.25);
      drawFlower(ctx, size * 0.06, size * 0.06, size * 0.032, '#ffd0e6', '#ffe47a');
      drawFlower(ctx, size * 0.94, size * 0.52, size * 0.032, '#a7e8ff', '#ffe47a');
      drawFourPointStar(ctx, size * 0.92, size * 0.92, size * 0.032, '#ffe066', '#335c9c', Math.max(1, size * 0.002));
      drawHeart(ctx, size * 0.07, size * 0.92, size * 0.026, -0.2, '#ff86b8', '#335c9c', Math.max(1, size * 0.002));
    } else if (kind === 'celebrateParty') {
      // Crisp white inner photo border like Reference #2
      for (const c of cells) {
        const x = c.x * size;
        const y = c.y * size;
        const w = c.w * size;
        const h = c.h * size;
        ctx.save();
        roundRectPath(ctx, x - size * 0.004, y - size * 0.004, w + size * 0.008, h + size * 0.008, rad * 0.6);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.8, size * 0.008);
        ctx.stroke();
        ctx.restore();
      }
      // Carnival masks, balloons, party hat & golden stars
      drawCarnivalMask(ctx, size * 0.085, size * 0.44, size * 0.06, 0.22, '#ff5b7f', '#ffd15c');
      drawCarnivalMask(ctx, size * 0.915, size * 0.26, size * 0.06, -0.2, '#b967ff', '#ffd15c');
      drawBalloon(ctx, size * 0.08, size * 0.18, size * 0.038, -0.25, '#ff7373');
      drawBalloon(ctx, size * 0.92, size * 0.86, size * 0.038, 0.2, '#ffd15c');
      drawBalloon(ctx, size * 0.93, size * 0.54, size * 0.034, 0.12, '#ff6495');
      drawFourPointStar(ctx, size * 0.1, size * 0.92, size * 0.026, '#ffd666');
      drawFourPointStar(ctx, size * 0.5, size * 0.022, size * 0.02, '#ffd666');
    } else if (kind === 'blueGingham') {
      // Stitched polaroid cell outline like Reference #3
      for (const c of cells) {
        const x = c.x * size;
        const y = c.y * size;
        const w = c.w * size;
        const h = c.h * size;
        ctx.save();
        roundRectPath(ctx, x - size * 0.003, y - size * 0.003, w + size * 0.006, h + size * 0.006, rad * 0.4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, size * 0.01);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(72, 114, 166, 0.55)';
        ctx.lineWidth = Math.max(1, size * 0.0022);
        ctx.stroke();
        ctx.restore();
      }
      // Watercolor blue butterflies, flowers, bow & heart
      drawButterfly(ctx, size * 0.075, size * 0.34, size * 0.058, -0.28);
      drawButterfly(ctx, size * 0.92, size * 0.64, size * 0.058, 0.25);
      drawFlower(ctx, size * 0.91, size * 0.08, size * 0.048, '#7eb4ec', '#ffe888', true);
      drawFlower(ctx, size * 0.07, size * 0.64, size * 0.034, '#8ec0f2', '#ffe888', true);
      drawRibbonBow(ctx, size * 0.09, size * 0.92, size * 0.046, -0.18);
      drawHeart(ctx, size * 0.92, size * 0.92, size * 0.03, 0.16, '#96bce6', '#ffffff', Math.max(1.5, size * 0.004));
    } else if (kind === 'knitDenim') {
      // Soft crisp cream cell frames
      for (const c of cells) {
        const x = c.x * size;
        const y = c.y * size;
        const w = c.w * size;
        const h = c.h * size;
        ctx.save();
        roundRectPath(ctx, x, y, w, h, rad * 0.5);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, size * 0.005);
        ctx.stroke();
        ctx.restore();
      }
      // Stitched denim stars, knit hearts, flower & blue smiley badges like Reference #4
      drawFivePointStar(ctx, size * 0.06, size * 0.36, size * 0.042, -0.18, '#7ca7cf', '#ffffff', Math.max(1.5, size * 0.004));
      drawFivePointStar(ctx, size * 0.5, size * 0.44, size * 0.036, 0.22, '#86b2d8', '#ffffff', Math.max(1.5, size * 0.004));
      drawHeart(ctx, size * 0.93, size * 0.65, size * 0.034, 0.12, '#96c0e4', '#ffffff', Math.max(1.5, size * 0.004));
      drawFlower(ctx, size * 0.92, size * 0.08, size * 0.036, '#88b2d8', '#d7ebf9', true);
      drawSmileyBadge(ctx, size * 0.075, size * 0.91, size * 0.038, '#668fb8');
      drawSmileyBadge(ctx, size * 0.925, size * 0.91, size * 0.034, '#668fb8');
    } else if (kind === 'y2kPink') {
      // Soft pearlescent pink borders
      for (const c of cells) {
        const x = c.x * size;
        const y = c.y * size;
        const w = c.w * size;
        const h = c.h * size;
        ctx.save();
        roundRectPath(ctx, x, y, w, h, rad);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.6, size * 0.006);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(244, 128, 186, 0.55)';
        ctx.lineWidth = Math.max(1, size * 0.002);
        ctx.stroke();
        ctx.restore();
      }
      // Y2K chrome stars, kitty badges & glossy hearts like Reference #5
      drawKittyBadge(ctx, size * 0.91, size * 0.075, size * 0.046, 0.14);
      drawKittyBadge(ctx, size * 0.09, size * 0.92, size * 0.04, -0.14);
      drawFivePointStar(ctx, size * 0.065, size * 0.075, size * 0.038, -0.2, '#ffffff', '#b7b9c9', Math.max(1.4, size * 0.004));
      drawFivePointStar(ctx, size * 0.93, size * 0.91, size * 0.04, 0.25, '#ffffff', '#b7b9c9', Math.max(1.4, size * 0.004));
      drawHeart(ctx, size * 0.5, size * 0.48, size * 0.028, 0, '#ff78b8', '#ffffff', Math.max(1.5, size * 0.004));
      drawFourPointStar(ctx, size * 0.93, size * 0.48, size * 0.028, '#ffffff', '#ff86c4', Math.max(0.8, size * 0.002));
      drawFourPointStar(ctx, size * 0.07, size * 0.48, size * 0.025, '#ffffff', '#ff86c4', Math.max(0.8, size * 0.002));
    } else if (kind === 'film35mm') {
      // Subtle film frame numbers near each cell
      ctx.fillStyle = 'rgba(243, 164, 71, 0.85)';
      ctx.font = `700 ${Math.max(8, Math.round(size * 0.015))}px "Courier New", monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      cells.forEach((c, idx) => {
        ctx.fillText(`${24 + idx}A`, c.x * size + size * 0.006, c.y * size - size * 0.004);
      });
    } else if (kind === 'cyberNeon') {
      // Glowing cyan/magenta corner brackets around each cell
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const x = c.x * size;
        const y = c.y * size;
        const w = c.w * size;
        const h = c.h * size;
        const br = Math.min(w, h) * 0.14;
        ctx.save();
        ctx.strokeStyle = i % 2 === 0 ? '#00f5ff' : '#ff2bd6';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = size * 0.012;
        ctx.lineWidth = Math.max(1.5, size * 0.0042);
        ctx.beginPath();
        // Top-left
        ctx.moveTo(x, y + br); ctx.lineTo(x, y); ctx.lineTo(x + br, y);
        // Top-right
        ctx.moveTo(x + w - br, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + br);
        // Bottom-right
        ctx.moveTo(x + w, y + h - br); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - br, y + h);
        // Bottom-left
        ctx.moveTo(x + br, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - br);
        ctx.stroke();
        ctx.restore();
      }
    } else if (kind === 'matchaCafe') {
      // Translucent matcha washi tape on top corners of cells
      cells.forEach((c, idx) => {
        const x = c.x * size;
        const y = c.y * size;
        const w = c.w * size;
        const tw = Math.max(14, size * 0.085);
        const th = Math.max(5, size * 0.022);
        if (idx % 2 === 0) {
          drawWashiTape(ctx, x + w * 0.12, y + size * 0.004, tw, th, -0.45, 'rgba(138, 178, 112, 0.72)');
        } else {
          drawWashiTape(ctx, x + w * 0.88, y + size * 0.004, tw, th, 0.45, 'rgba(214, 198, 152, 0.78)');
        }
      });
      drawFlower(ctx, size * 0.93, size * 0.92, size * 0.028, '#ffffff', '#7ba162', false);
      drawFlower(ctx, size * 0.07, size * 0.92, size * 0.026, '#ffffff', '#7ba162', false);
    } else if (kind === 'auroraDream') {
      // Delicate glowing silver hairline borders + corner crescent & stars
      for (const c of cells) {
        roundRectPath(ctx, c.x * size, c.y * size, c.w * size, c.h * size, rad);
        ctx.strokeStyle = 'rgba(175, 245, 255, 0.5)';
        ctx.lineWidth = Math.max(1, size * 0.0025);
        ctx.stroke();
      }
      drawFourPointStar(ctx, size * 0.07, size * 0.07, size * 0.032, '#c8ffff');
      drawFourPointStar(ctx, size * 0.93, size * 0.92, size * 0.032, '#fff2b0');
      drawFourPointStar(ctx, size * 0.93, size * 0.08, size * 0.022, '#ffffff');
    } else if (kind === 'magazineVogue') {
      // Fine charcoal border around every cell + top masthead line
      for (const c of cells) {
        ctx.strokeStyle = 'rgba(26, 25, 24, 0.85)';
        ctx.lineWidth = Math.max(1, size * 0.002);
        ctx.strokeRect(c.x * size, c.y * size, c.w * size, c.h * size);
      }
      // Mini barcode on bottom-right
      const bx = size * 0.84;
      const by = size * 0.945;
      const bh = size * 0.03;
      ctx.fillStyle = '#1a1918';
      const bars = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2];
      let cx = bx;
      for (let i = 0; i < bars.length; i++) {
        const bw = bars[i] * size * 0.0025;
        if (i % 2 === 0) ctx.fillRect(cx, by, bw, bh);
        cx += bw + size * 0.002;
      }
    } else if (kind === 'sakuraBow') {
      drawRibbonBow(ctx, size * 0.08, size * 0.075, size * 0.044, -0.25, '#ff90bc', '#ffe6f0', '#b83c6b');
      drawRibbonBow(ctx, size * 0.92, size * 0.92, size * 0.044, 0.22, '#ff90bc', '#ffe6f0', '#b83c6b');
      drawFlower(ctx, size * 0.92, size * 0.08, size * 0.03, '#ffb3cf', '#fff0a6', true);
      drawFlower(ctx, size * 0.08, size * 0.92, size * 0.03, '#ffb3cf', '#fff0a6', true);
    } else if (kind === 'oceanShell') {
      for (const c of cells) {
        roundRectPath(ctx, c.x * size, c.y * size, c.w * size, c.h * size, rad);
        ctx.strokeStyle = 'rgba(255,255,255,0.88)';
        ctx.lineWidth = Math.max(1.5, size * 0.0045);
        ctx.stroke();
      }
      drawFivePointStar(ctx, size * 0.075, size * 0.92, size * 0.036, -0.2, '#ff9b87', '#ffffff', Math.max(1.2, size * 0.003));
      drawFivePointStar(ctx, size * 0.925, size * 0.08, size * 0.032, 0.25, '#ffc478', '#ffffff', Math.max(1.2, size * 0.003));
    } else if (kind === 'goldLuxe') {
      // Art Deco champagne gold borders around cells & corner diamonds
      for (const c of cells) {
        ctx.strokeStyle = '#e7c675';
        ctx.lineWidth = Math.max(1, size * 0.0026);
        ctx.strokeRect(c.x * size - size * 0.003, c.y * size - size * 0.003, c.w * size + size * 0.006, c.h * size + size * 0.006);
      }
      const corners = [
        [pad * 0.55, pad * 0.55],
        [size - pad * 0.55, pad * 0.55],
        [pad * 0.55, size - pad * 0.55],
        [size - pad * 0.55, size - pad * 0.55],
      ];
      for (const [cx, cy] of corners) {
        drawFourPointStar(ctx, cx, cy, size * 0.022, '#f3d88b');
      }
    }
  } catch {
    // Never break photobooth render on decor failure
  }
  ctx.restore();
}
