/**
 * Demo A — "Engraved Atlas"
 * Route: /demos/a-engraved
 *
 * Palette tokens (scoped in engraved.module.css):
 *   --ea-ground  #0A0A0C   near-black paper ground
 *   --ea-ink     #FFFFFF   pure white line work
 *   --ea-grey    #8B93A3   one cool grey for de-emphasis
 *
 * The one design decision that makes it distinct: clouds are drawn as NESTED
 * TOPOGRAPHIC CONTOUR LINES, fixed to the four viewport corners as a vignette
 * that pushes the eye to the centred compass rose. Everything else is hairline
 * (0.5–1px) engraving over near-black, monochrome only.
 */
import React from 'react'
import s from './engraved.module.css'
import { brand, nav, hero, features, about, footer } from './content'

/* deterministic pseudo-random so the star field never reshuffles */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/* closed Catmull-Rom → cubic bézier path through points */
function smoothClosed(pts: Array<[number, number]>): string {
  const n = pts.length
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d + ' Z'
}

/* one wobbly closed contour, shrunk by k towards its centre */
function contour(cx: number, cy: number, rx: number, ry: number, seed: number, k: number): string {
  const pts: Array<[number, number]> = []
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

const CONTOUR_LEVELS = [1, 0.84, 0.68, 0.53, 0.38, 0.24]

function ContourCloud({ cx, cy, rx, ry, seed }: { cx: number; cy: number; rx: number; ry: number; seed: number }) {
  return (
    <g fill="none" stroke="var(--ea-grey)" strokeWidth={0.75} opacity={0.55}>
      {CONTOUR_LEVELS.map((k, i) => (
        <path key={i} d={contour(cx, cy, rx, ry, seed + i * 0.35, k)} />
      ))}
    </g>
  )
}

/* four fixed corner clouds — the topographic vignette */
function Vignette() {
  const corners = [
    { style: { top: 0, left: 0 }, cx: 40, cy: 20, seed: 1.3 },
    { style: { top: 0, right: 0 }, cx: 360, cy: 10, seed: 4.1 },
    { style: { bottom: 0, left: 0 }, cx: 30, cy: 290, seed: 7.7 },
    { style: { bottom: 0, right: 0 }, cx: 370, cy: 300, seed: 2.9 },
  ] as const
  return (
    <>
      {corners.map((c, i) => (
        <svg
          key={i}
          className={s.vignette}
          style={{ inset: 'auto', ...c.style, width: 'min(44vw, 460px)', height: 'auto' }}
          viewBox="0 0 400 310"
          aria-hidden="true"
        >
          <ContourCloud cx={c.cx} cy={c.cy} rx={300} ry={200} seed={c.seed} />
        </svg>
      ))}
    </>
  )
}

function Grain() {
  return (
    <svg className={s.grain} aria-hidden="true">
      <filter id="eaGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#eaGrain)" />
    </svg>
  )
}

/* the hero mark: 16-point compass rose in concentric rings over a star field */
function CompassRose() {
  const C = 300
  const stars = Array.from({ length: 90 }, (_, i) => ({
    x: rnd(i, 1) * 600,
    y: rnd(i, 2) * 600,
    r: 0.5 + rnd(i, 3) * 0.9,
    hi: 0.25 + rnd(i, 4) * 0.65,
    dur: 3.5 + rnd(i, 5) * 4,
    delay: rnd(i, 6) * 6,
  }))

  /* one compass point = a filled half and an outlined half (engraved style) */
  const point = (angleDeg: number, rOut: number) => {
    const a = ((angleDeg - 90) * Math.PI) / 180
    const half = Math.PI / 16
    const rIn = 34
    const tip = [C + rOut * Math.cos(a), C + rOut * Math.sin(a)]
    const left = [C + rIn * Math.cos(a - half), C + rIn * Math.sin(a - half)]
    const right = [C + rIn * Math.cos(a + half), C + rIn * Math.sin(a + half)]
    const f = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`
    return (
      <g key={angleDeg}>
        <path d={`M ${C} ${C} L ${f(left)} L ${f(tip)} Z`} fill="var(--ea-ink)" stroke="none" />
        <path d={`M ${C} ${C} L ${f(right)} L ${f(tip)} Z`} fill="none" stroke="var(--ea-ink)" strokeWidth={0.75} />
      </g>
    )
  }

  const longPoints = [0, 45, 90, 135, 180, 225, 270, 315]
  const shortPoints = longPoints.map((a) => a + 22.5)
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5)

  return (
    <svg className={s.mark} viewBox="0 0 600 600" aria-hidden="true">
      {/* star field */}
      <g fill="var(--ea-ink)">
        {stars.map((st, i) => (
          <circle
            key={i}
            className={s.twinkle}
            cx={st.x.toFixed(1)}
            cy={st.y.toFixed(1)}
            r={st.r.toFixed(2)}
            style={
              {
                '--tw-hi': st.hi,
                '--tw-lo': st.hi * 0.25,
                opacity: st.hi,
                animationDuration: `${st.dur.toFixed(1)}s`,
                animationDelay: `${st.delay.toFixed(1)}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </g>

      {/* outer graduated ring — rotates almost imperceptibly */}
      <g className={s.rotateSlow} fill="none" stroke="var(--ea-ink)">
        <circle cx={C} cy={C} r={292} strokeWidth={0.75} />
        <circle cx={C} cy={C} r={282} strokeWidth={0.5} opacity={0.6} />
        {ticks.map((deg) => {
          const a = (deg * Math.PI) / 180
          const r1 = deg % 45 === 0 ? 270 : 278
          const [x1, y1] = [C + r1 * Math.cos(a), C + r1 * Math.sin(a)]
          const [x2, y2] = [C + 292 * Math.cos(a), C + 292 * Math.sin(a)]
          return (
            <line
              key={deg}
              x1={x1.toFixed(1)}
              y1={y1.toFixed(1)}
              x2={x2.toFixed(1)}
              y2={y2.toFixed(1)}
              strokeWidth={deg % 45 === 0 ? 1 : 0.5}
            />
          )
        })}
      </g>

      {/* static concentric rings */}
      <g fill="none" stroke="var(--ea-ink)">
        <circle cx={C} cy={C} r={252} strokeWidth={0.5} opacity={0.7} />
        <circle cx={C} cy={C} r={236} strokeWidth={0.5} strokeDasharray="2 6" opacity={0.8} />
        <circle cx={C} cy={C} r={218} strokeWidth={0.75} />
      </g>

      {/* the sixteen points */}
      <g>{shortPoints.map((a) => point(a, 148))}</g>
      <g>{longPoints.map((a) => point(a, 208))}</g>
      <circle cx={C} cy={C} r={12} fill="var(--ea-ground)" stroke="var(--ea-ink)" strokeWidth={0.75} />
      <circle cx={C} cy={C} r={3} fill="var(--ea-ink)" />

      {/* cardinal annotations */}
      <g
        fill="var(--ea-grey)"
        fontFamily="var(--ea-sans)"
        fontSize="13"
        letterSpacing="2"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        <text x={C} y={22}>N</text>
        <text x={578} y={C + 1}>E</text>
        <text x={C} y={582}>S</text>
        <text x={22} y={C + 1}>W</text>
      </g>
    </svg>
  )
}

/* constellation section divider: dots joined by hairline strokes */
function Divider() {
  const pts: Array<[number, number, number]> = [
    [12, 40, 2],
    [78, 20, 3],
    [148, 46, 2],
    [210, 14, 3.5],
    [272, 42, 2],
    [340, 24, 3],
    [408, 44, 2],
  ]
  return (
    <svg className={s.divider} viewBox="0 0 420 60" aria-hidden="true">
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="var(--ea-hairline)"
        strokeWidth={0.75}
      />
      {pts.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="var(--ea-ink)" />
          {r >= 3 && <circle cx={x} cy={y} r={r + 4} fill="none" stroke="var(--ea-hairline)" strokeWidth={0.5} />}
        </g>
      ))}
    </svg>
  )
}

/* engraved medallion icons for the three features */
function Medallion({ kind }: { kind: 0 | 1 | 2 }) {
  return (
    <svg className={s.medallion} viewBox="0 0 96 96" aria-hidden="true">
      <circle cx={48} cy={48} r={46} fill="none" stroke="var(--ea-ink)" strokeWidth={0.75} />
      <circle cx={48} cy={48} r={39} fill="none" stroke="var(--ea-hairline)" strokeWidth={0.5} strokeDasharray="2 5" />
      {kind === 0 && (
        <g fill="none" stroke="var(--ea-ink)" strokeWidth={0.75}>
          <circle cx={48} cy={48} r={9} />
          <circle cx={48} cy={48} r={18} />
          <circle cx={48} cy={48} r={27} />
          <circle cx={48} cy={48} r={1.8} fill="var(--ea-ink)" stroke="none" />
          <circle cx={61} cy={36} r={2.4} fill="var(--ea-ink)" stroke="none" />
          <circle cx={33} cy={61} r={1.8} fill="var(--ea-ink)" stroke="none" />
        </g>
      )}
      {kind === 1 && (
        <g stroke="var(--ea-ink)" strokeWidth={0.75}>
          <line x1={62} y1={32} x2={32} y2={62} />
          <line x1={62} y1={32} x2={54} y2={34} opacity={0.6} />
          <line x1={62} y1={32} x2={60} y2={40} opacity={0.6} />
          <circle cx={62} cy={32} r={3} fill="var(--ea-ink)" stroke="none" />
          <circle cx={32} cy={62} r={1.5} fill="var(--ea-ink)" stroke="none" />
          <circle cx={44} cy={44} r={1.2} fill="var(--ea-ink)" stroke="none" />
        </g>
      )}
      {kind === 2 && (
        <g stroke="var(--ea-ink)" strokeWidth={0.75}>
          <circle cx={30} cy={58} r={3} fill="var(--ea-ink)" stroke="none" />
          <circle cx={66} cy={58} r={3} fill="var(--ea-ink)" stroke="none" />
          <path d="M 30 58 Q 48 26 66 58" fill="none" strokeDasharray="1 4" />
          <g strokeWidth={0.75}>
            <line x1={48} y1={33} x2={48} y2={49} />
            <line x1={40} y1={41} x2={56} y2={41} />
            <line x1={43} y1={36} x2={53} y2={46} opacity={0.5} />
            <line x1={53} y1={36} x2={43} y2={46} opacity={0.5} />
          </g>
        </g>
      )}
    </svg>
  )
}

export default function EngravedAtlas() {
  return (
    <div className={s.page}>
      <Vignette />
      <Grain />

      <div className={s.content}>
        <header className={s.header}>
          <a className={s.brand} href="/demos">
            {brand}
          </a>
          <nav className={s.navLinks}>
            {nav.map((n) => (
              <a key={n} href="#">
                {n}
              </a>
            ))}
          </nav>
          <span className={s.label}>Demo A · Engraved Atlas</span>
        </header>

        <section className={s.hero}>
          <div className={s.axisY} aria-hidden="true" />
          <div className={s.markWrap}>
            <div className={s.axisX} aria-hidden="true" />
            <CompassRose />
          </div>
          <span className={s.kicker}>{hero.kicker}</span>
          <h1 className={s.headline}>{hero.headline}</h1>
          <p className={s.subhead}>{hero.subhead}</p>
          <div className={s.ctaRow}>
            <a className={s.ctaPrimary} href="#">
              {hero.cta}
            </a>
            <a className={s.ctaSecondary} href="#">
              {hero.ctaSecondary}
            </a>
          </div>
        </section>

        <Divider />

        <section className={s.features}>
          <span className={s.sectionLabel}>Plate I · Features</span>
          <div className={s.featureGrid}>
            {features.map((f, i) => (
              <article className={s.featureCard} key={f.title}>
                <Medallion kind={i as 0 | 1 | 2} />
                <h2 className={s.featureTitle}>{f.title}</h2>
                <p className={s.featureBody}>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <Divider />

        <section className={s.about}>
          <span className={s.label}>Plate II · Principles</span>
          <h2 className={s.aboutTitle}>{about.title}</h2>
          <p className={s.aboutBody}>{about.body}</p>
        </section>

        <footer className={s.footer}>
          <span className={s.footerLine}>
            {brand} — {footer.line}
          </span>
          <nav className={s.footerLinks}>
            {footer.links.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  )
}
