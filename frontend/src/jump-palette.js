function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function formatHsl(h, s, l) {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function formatHsla(h, s, l, a) {
  return `hsla(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${a.toFixed(3)})`;
}

function easeOutQuart(value) {
  const x = clamp(value, 0, 1);
  return 1 - (1 - x) ** 4;
}

function interpolateTriplet(anchors, value) {
  const t = clamp(value, 0, 1);
  if (t <= 0.5) {
    const local = t / 0.5;
    return {
      h: lerp(anchors[0].h, anchors[1].h, local),
      s: lerp(anchors[0].s, anchors[1].s, local),
      l: lerp(anchors[0].l, anchors[1].l, local)
    };
  }
  const local = (t - 0.5) / 0.5;
  return {
    h: lerp(anchors[1].h, anchors[2].h, local),
    s: lerp(anchors[1].s, anchors[2].s, local),
    l: lerp(anchors[1].l, anchors[2].l, local)
  };
}

export function buildJumpPalette({ direction, activeSteps, totalSteps }) {
  const steps = Math.max(1, Number(totalSteps) || 1);
  const level = clamp(Number(activeSteps) || 1, 1, steps);
  const intensity = level / steps;
  const premium = easeOutQuart(intensity);

  if (direction === "up") {
    const top = interpolateTriplet(
      [
        { h: 195, s: 74, l: 84 },
        { h: 162, s: 86, l: 80 },
        { h: 50, s: 90, l: 82 }
      ],
      premium
    );
    const mid = interpolateTriplet(
      [
        { h: 176, s: 70, l: 72 },
        { h: 142, s: 80, l: 68 },
        { h: 86, s: 86, l: 66 }
      ],
      premium
    );
    const accent = interpolateTriplet(
      [
        { h: 156, s: 72, l: 66 },
        { h: 112, s: 84, l: 62 },
        { h: 38, s: 90, l: 58 }
      ],
      premium
    );
    const bottom = interpolateTriplet(
      [
        { h: 146, s: 68, l: 58 },
        { h: 94, s: 82, l: 54 },
        { h: 28, s: 88, l: 50 }
      ],
      premium
    );
    const stairHueFrom = 192 - premium * 82;
    const stairHueTo = 160 - premium * 112;
    return {
      stairHueFrom: Math.round(stairHueFrom),
      stairHueTo: Math.round(stairHueTo),
      deltaColorTop: formatHsl(top.h, top.s, top.l),
      deltaColorMid: formatHsl(mid.h, mid.s, mid.l),
      deltaColorAccent: formatHsl(accent.h, accent.s, accent.l),
      deltaColorBottom: formatHsl(bottom.h, bottom.s, bottom.l),
      deltaGlow: formatHsla(top.h - 4, 90, 52, 0.15 + premium * 0.22),
      deltaOutline: formatHsla(top.h - 10, 92, 92, 0.08 + premium * 0.12),
      deltaGlint: formatHsla(top.h + 8, 86, 98, 0.1 + premium * 0.16)
    };
  }

  if (direction === "down") {
    const top = interpolateTriplet(
      [
        { h: 336, s: 72, l: 84 },
        { h: 358, s: 82, l: 80 },
        { h: 16, s: 88, l: 78 }
      ],
      premium
    );
    const mid = interpolateTriplet(
      [
        { h: 350, s: 70, l: 74 },
        { h: 10, s: 80, l: 68 },
        { h: 30, s: 84, l: 64 }
      ],
      premium
    );
    const accent = interpolateTriplet(
      [
        { h: 6, s: 74, l: 64 },
        { h: 24, s: 84, l: 58 },
        { h: 42, s: 90, l: 56 }
      ],
      premium
    );
    const bottom = interpolateTriplet(
      [
        { h: 18, s: 72, l: 56 },
        { h: 30, s: 80, l: 52 },
        { h: 46, s: 86, l: 48 }
      ],
      premium
    );
    const stairHueFrom = 336 + premium * 22;
    const stairHueTo = 8 + premium * 40;
    return {
      stairHueFrom: Math.round(stairHueFrom),
      stairHueTo: Math.round(stairHueTo),
      deltaColorTop: formatHsl(top.h, top.s, top.l),
      deltaColorMid: formatHsl(mid.h, mid.s, mid.l),
      deltaColorAccent: formatHsl(accent.h, accent.s, accent.l),
      deltaColorBottom: formatHsl(bottom.h, bottom.s, bottom.l),
      deltaGlow: formatHsla(top.h + 2, 86, 50, 0.13 + premium * 0.2),
      deltaOutline: formatHsla(top.h - 8, 88, 92, 0.08 + premium * 0.12),
      deltaGlint: formatHsla(top.h + 10, 82, 96, 0.1 + premium * 0.14)
    };
  }

  const top = interpolateTriplet(
    [
      { h: 210, s: 62, l: 84 },
      { h: 224, s: 70, l: 80 },
      { h: 248, s: 80, l: 78 }
    ],
    premium
  );
  const mid = interpolateTriplet(
    [
      { h: 220, s: 60, l: 76 },
      { h: 238, s: 68, l: 70 },
      { h: 264, s: 74, l: 66 }
    ],
    premium
  );
  const accent = interpolateTriplet(
    [
      { h: 230, s: 62, l: 66 },
      { h: 248, s: 70, l: 62 },
      { h: 274, s: 78, l: 58 }
    ],
    premium
  );
  const bottom = interpolateTriplet(
    [
      { h: 236, s: 60, l: 58 },
      { h: 256, s: 70, l: 54 },
      { h: 282, s: 76, l: 50 }
    ],
    premium
  );
  const stairHueFrom = 206 + premium * 28;
  const stairHueTo = 244 + premium * 36;
  return {
    stairHueFrom: Math.round(stairHueFrom),
    stairHueTo: Math.round(stairHueTo),
    deltaColorTop: formatHsl(top.h, top.s, top.l),
    deltaColorMid: formatHsl(mid.h, mid.s, mid.l),
    deltaColorAccent: formatHsl(accent.h, accent.s, accent.l),
    deltaColorBottom: formatHsl(bottom.h, bottom.s, bottom.l),
    deltaGlow: formatHsla(top.h + 8, 80, 54, 0.1 + premium * 0.18),
    deltaOutline: formatHsla(top.h - 4, 82, 92, 0.07 + premium * 0.1),
    deltaGlint: formatHsla(top.h + 12, 78, 98, 0.08 + premium * 0.12)
  };
}
