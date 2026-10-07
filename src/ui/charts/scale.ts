/** "Nice" axis ticks from 0 to ≥ max: whole-number steps of 1, 2, 2.5 or 5 × 10ⁿ. */
export function niceTicks(max: number, target = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  // Whole-number steps only: these axes count things (2.5 × 10ⁿ qualifies from 25 up).
  const s =
    [1, 2, 2.5, 5, 10].map((m) => m * pow).find((c) => c >= raw && Number.isInteger(c)) ??
    Math.max(1, Math.ceil(raw));
  const top = Math.ceil(max / s) * s;
  const ticks: number[] = [];
  for (let v = 0; v <= top + s / 2; v += s) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

/** SVG path for a bar with rounded top corners and a square base. */
export function topRoundedBar(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return [
    `M${x},${y + h}`,
    `V${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    `H${x + w - rr}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `V${y + h}`,
    'Z',
  ].join(' ');
}

/** CSS colour for categorical slot n (1–8). Slots never cycle: callers fold extras into "Other". */
export function slotColor(slot: number): string {
  const n = Math.min(8, Math.max(1, Math.round(slot)));
  return `var(--chart-${n})`;
}
