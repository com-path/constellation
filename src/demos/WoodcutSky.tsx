/**
 * Demo B — "Woodcut Sky"
 * Route: /demos/b-woodcut
 *
 * Palette tokens (scoped in woodcut.module.css):
 *   --wc-cream    #F7F1E8   paper ground (the only light-mode direction)
 *   --wc-sage     #8FAF9B   sage green ink
 *   --wc-mustard  #F0C04A   mustard yellow ink
 *   --wc-plum     #3A2A33   dark plum-brown key plate (outlines)
 *
 * The one design decision that makes it distinct: DELIBERATE PRINT
 * IMPERFECTION — every major shape is printed twice, a flat sage "slipped
 * registration" pass offset a few pixels beneath the plum key plate, with
 * bold 2–3px outlines, interior swirl hatching, and slightly rotated cards.
 * Clouds bank bottom-left / bottom-right, leaving the headline alone in a
 * big empty sky.
 */
import React from 'react'
import s from './woodcut.module.css'
import { brand, nav, hero, features, about, footer } from './content'

/* chunky star polygon points */
function starPts(cx: number, cy: number, n: number, rOut: number, rIn: number, rotDeg = -90): string {
  let out = ''
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn
    const a = ((rotDeg + (i * 180) / n) * Math.PI) / 180
    out += `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)} `
  }
  return out.trim()
}

function WoodcutStar({ cx, cy, points, r }: { cx: number; cy: number; points: 4 | 5; r: number }) {
  return (
    <polygon
      points={starPts(cx, cy, points, r, points === 4 ? r * 0.36 : r * 0.44)}
      fill="var(--wc-mustard)"
      stroke="var(--wc-plum)"
      strokeWidth={2.5}
      strokeLinejoin="round"
    />
  )
}

/* the hero mark: a 12-ray woodcut sun inside two rough concentric rings */
function SunShapes() {
  const C = 160
  const ray = (angleDeg: number, rOut: number, fill: string) => {
    const a = ((angleDeg - 90) * Math.PI) / 180
    const half = Math.PI / 12
    const rIn = 58
    const f = (r: number, da: number) => `${(C + r * Math.cos(a + da)).toFixed(1)} ${(C + r * Math.sin(a + da)).toFixed(1)}`
    return (
      <path
        key={angleDeg}
        d={`M ${f(rIn, -half)} L ${f(rOut, 0)} L ${f(rIn, half)} Z`}
        fill={fill}
        stroke="var(--wc-plum)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    )
  }
  return (
    <>
      <circle cx={C} cy={C} r={150} fill="none" stroke="var(--wc-plum)" strokeWidth={3} />
      <circle cx={C} cy={C} r={134} fill="none" stroke="var(--wc-plum)" strokeWidth={2.5} strokeDasharray="16 11" />
      {[0, 60, 120, 180, 240, 300].map((a) => ray(a, 122, 'var(--wc-mustard)'))}
      {[30, 90, 150, 210, 270, 330].map((a) => ray(a, 100, 'var(--wc-sage)'))}
      <circle cx={C} cy={C} r={56} fill="var(--wc-mustard)" stroke="var(--wc-plum)" strokeWidth={3} />
      <circle cx={C} cy={C} r={42} fill="none" stroke="var(--wc-plum)" strokeWidth={2} strokeDasharray="3 8" />
      {/* interior swirl, cut into the disc */}
      <path
        d="M 148 168 q 8 -22 30 -18 q 18 4 14 20 q -4 14 -18 10 q -10 -3 -6 -13"
        fill="none"
        stroke="var(--wc-plum)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </>
  )
}

function SunMark() {
  return (
    <svg className={s.sunMark} viewBox="0 0 320 320" aria-hidden="true">
      <g className={s.regGhost} transform="translate(6 7)">
        <SunShapes />
      </g>
      <SunShapes />
    </svg>
  )
}

/* one cloud bank — bold scalloped silhouette, swirl hatching, mustard stars */
function CloudShapes() {
  const silhouette =
    'M 0 250 L 0 120 Q 26 82 62 92 Q 74 46 122 52 Q 148 14 198 34 ' +
    'Q 246 8 288 42 Q 336 24 356 66 Q 412 56 432 104 Q 492 96 506 146 ' +
    'Q 552 148 556 196 L 560 250 Z'
  const hatching = [
    'M 30 130 q 22 -16 48 -8',
    'M 96 88 q 22 -14 44 -4',
    'M 170 60 q 24 -12 46 -2',
    'M 250 52 q 22 -8 42 4',
    'M 330 78 q 20 -6 36 8',
    'M 400 118 q 18 -2 32 12',
    'M 470 158 q 16 0 28 12',
    'M 40 214 q 30 -6 62 0',
    'M 150 222 q 34 -8 66 0',
    'M 270 216 q 30 -6 60 0',
    'M 390 224 q 28 -6 56 0',
    'M 486 214 q 22 -4 44 0',
  ]
  const swirls = [
    'M 120 160 q 26 -24 52 -4 q 18 16 -2 30 q -16 10 -26 -4 q -6 -10 6 -16',
    'M 300 140 q 30 -22 54 0 q 16 16 -4 28 q -16 8 -24 -6 q -4 -10 8 -14',
    'M 420 180 q 24 -18 44 -2 q 12 12 -4 22 q -13 7 -20 -5',
  ]
  return (
    <>
      <path d={silhouette} fill="var(--wc-cream)" stroke="var(--wc-plum)" strokeWidth={3} strokeLinejoin="round" />
      <g fill="none" stroke="var(--wc-plum)" strokeWidth={2} strokeLinecap="round" opacity={0.85}>
        {hatching.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g fill="none" stroke="var(--wc-plum)" strokeWidth={2.5} strokeLinecap="round">
        {swirls.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <WoodcutStar cx={152} cy={104} points={5} r={20} />
      <WoodcutStar cx={252} cy={84} points={4} r={15} />
      <WoodcutStar cx={362} cy={106} points={5} r={14} />
      <WoodcutStar cx={62} cy={158} points={4} r={12} />
      <WoodcutStar cx={462} cy={140} points={5} r={17} />
      <WoodcutStar cx={524} cy={184} points={4} r={11} />
    </>
  )
}

const CloudBank = React.forwardRef<SVGSVGElement, { side: 'left' | 'right' }>(function CloudBank({ side }, ref) {
  return (
    <svg
      ref={ref}
      className={side === 'left' ? s.cloudLeft : s.cloudRight}
      viewBox="0 0 560 250"
      aria-hidden="true"
    >
      {/* mirror the right bank inside the viewBox so the parallax transform on
          the <svg> itself stays free for translateY */}
      <g transform={side === 'right' ? 'scale(-1 1) translate(-560 0)' : undefined}>
        <g className={s.regGhost} transform="translate(5 6)">
          <CloudShapes />
        </g>
        <CloudShapes />
      </g>
    </svg>
  )
})

/* gentle parallax drift on the cloud banks; off under reduced motion */
function useCloudParallax(
  left: React.RefObject<SVGSVGElement>,
  right: React.RefObject<SVGSVGElement>,
) {
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        if (left.current) left.current.style.transform = `translateY(${(y * 0.08).toFixed(1)}px)`
        if (right.current) right.current.style.transform = `translateY(${(y * 0.14).toFixed(1)}px)`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [left, right])
}

/* constellation divider, woodcut weight: plum strokes, chunky star nodes */
function Divider() {
  const pts: Array<[number, number]> = [
    [20, 42],
    [96, 24],
    [172, 46],
    [244, 18],
    [316, 44],
    [392, 26],
    [428, 40],
  ]
  return (
    <svg className={s.divider} viewBox="0 0 448 64" aria-hidden="true">
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="var(--wc-plum)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {pts.map(([x, y], i) =>
        i % 2 === 1 ? (
          <polygon
            key={i}
            points={starPts(x, y, 4, 11, 4)}
            fill="var(--wc-mustard)"
            stroke="var(--wc-plum)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ) : (
          <circle key={i} cx={x} cy={y} r={4.5} fill="var(--wc-plum)" />
        ),
      )}
    </svg>
  )
}

/* woodcut feature icons */
function FeatureIcon({ kind }: { kind: 0 | 1 | 2 }) {
  return (
    <svg className={s.featureIcon} viewBox="0 0 84 84" aria-hidden="true">
      {kind === 0 && (
        <g fill="none" stroke="var(--wc-plum)" strokeWidth={2.5}>
          <circle cx={42} cy={42} r={36} />
          <circle cx={42} cy={42} r={24} strokeDasharray="6 7" />
          <circle cx={42} cy={42} r={12} />
          <circle cx={42} cy={42} r={4} fill="var(--wc-mustard)" />
          <circle cx={58} cy={28} r={5} fill="var(--wc-sage)" />
          <circle cx={26} cy={56} r={4} fill="var(--wc-mustard)" />
        </g>
      )}
      {kind === 1 && (
        <g>
          <g fill="none" stroke="var(--wc-plum)" strokeWidth={2.5} strokeLinecap="round">
            <path d="M 60 22 Q 40 38 24 62" />
            <path d="M 56 30 Q 42 42 32 58" opacity={0.6} />
          </g>
          <polygon
            points={starPts(60, 22, 5, 14, 6)}
            fill="var(--wc-mustard)"
            stroke="var(--wc-plum)"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <circle cx={24} cy={62} r={4} fill="var(--wc-sage)" stroke="var(--wc-plum)" strokeWidth={2} />
        </g>
      )}
      {kind === 2 && (
        <g>
          <path d="M 20 58 Q 42 26 64 58" fill="none" stroke="var(--wc-plum)" strokeWidth={2.5} strokeDasharray="2 7" strokeLinecap="round" />
          <circle cx={20} cy={58} r={6} fill="var(--wc-sage)" stroke="var(--wc-plum)" strokeWidth={2.5} />
          <circle cx={64} cy={58} r={6} fill="var(--wc-sage)" stroke="var(--wc-plum)" strokeWidth={2.5} />
          <polygon
            points={starPts(42, 34, 4, 13, 5)}
            fill="var(--wc-mustard)"
            stroke="var(--wc-plum)"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  )
}

function Grain() {
  return (
    <svg className={s.grain} aria-hidden="true">
      <filter id="wcGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#wcGrain)" />
    </svg>
  )
}

export default function WoodcutSky() {
  const leftCloud = React.useRef<SVGSVGElement>(null)
  const rightCloud = React.useRef<SVGSVGElement>(null)
  useCloudParallax(leftCloud, rightCloud)

  return (
    <div className={s.page}>
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
          <span className={s.demoTag}>Demo B · Woodcut Sky</span>
        </header>

        <section className={s.hero}>
          <SunMark />
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
          <div className={s.cloudRow}>
            <CloudBank side="left" ref={leftCloud} />
            <CloudBank side="right" ref={rightCloud} />
          </div>
        </section>

        <Divider />

        <section className={s.features}>
          <h2 className={s.sectionTitle}>Features</h2>
          <div className={s.featureGrid}>
            {features.map((f, i) => (
              <article className={s.featureCard} key={f.title}>
                <FeatureIcon kind={i as 0 | 1 | 2} />
                <h2 className={s.featureTitle}>{f.title}</h2>
                <p className={s.featureBody}>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <Divider />

        <section className={s.about}>
          <h2 className={s.sectionTitle}>{about.title}</h2>
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
