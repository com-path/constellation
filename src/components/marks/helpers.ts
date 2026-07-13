/* Geometry helpers shared by the mark primitives. Deterministic only —
 * a mark must never reshuffle between renders. */

/** seeded pseudo-random in [0,1) */
export const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export type Pt = [number, number]

const f = (n: number) => n.toFixed(1)

/** closed Catmull-Rom → cubic bézier path through points */
export function smoothClosed(pts: Pt[]): string {
  const n = pts.length
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    d += ` C ${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)}, ${f(
      p2[0] - (p3[0] - p1[0]) / 6,
    )} ${f(p2[1] - (p3[1] - p1[1]) / 6)}, ${f(p2[0])} ${f(p2[1])}`
  }
  return d + ' Z'
}

/** open Catmull-Rom → cubic bézier path through points */
export function smoothOpen(pts: Pt[]): string {
  const n = pts.length
  if (n < 2) return ''
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(n - 1, i + 2)]
    d += ` C ${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)}, ${f(
      p2[0] - (p3[0] - p1[0]) / 6,
    )} ${f(p2[1] - (p3[1] - p1[1]) / 6)}, ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}

/** one wobbly closed contour loop, shrunk by k towards its centre */
export function contourLoop(cx: number, cy: number, rx: number, ry: number, seed: number, k: number): string {
  const pts: Pt[] = []
  const N = 40
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2
    const w =
      1 +
      0.16 * Math.sin(3 * t + seed) +
      0.1 * Math.sin(5 * t + seed * 2.3) +
      0.06 * Math.sin(8 * t + seed * 4.1)
    pts.push([cx + rx * k * w * Math.cos(t), cy + ry * k * w * Math.sin(t)])
  }
  return smoothClosed(pts)
}

/**
 * The whiplash stroke: a sinuous lead-in that accelerates and coils into a
 * tight logarithmic spiral. Returns the full path plus a "belly" sub-path
 * (the middle of the stroke, drawn wider so the ink appears to swell) and
 * the terminal point (where the ink pools into a dot).
 */
export function whiplashPath(): { full: string; belly: string; end: Pt } {
  const lead: Pt[] = [
    [0, 152],
    [58, 143],
    [112, 112],
    [162, 70],
    [212, 46],
    [258, 50],
    [288, 72],
  ]
  const C: Pt = [324, 82]
  const theta0 = Math.PI * 0.85
  const spiral: Pt[] = []
  const TURNS = 2.15
  const STEPS = 64
  for (let i = 0; i <= STEPS; i++) {
    const th = theta0 + (i / STEPS) * TURNS * Math.PI * 2
    const r = 30 * Math.exp(-0.19 * (th - theta0))
    spiral.push([C[0] + r * Math.cos(th), C[1] + r * Math.sin(th)])
  }
  const pts = [...lead, ...spiral]
  const belly = pts.slice(Math.floor(pts.length * 0.12), Math.ceil(pts.length * 0.4))
  return { full: smoothOpen(pts), belly: smoothOpen(belly), end: pts[pts.length - 1] }
}
