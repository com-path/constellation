/**
 * Demo C — "Gilded Reliquary"
 * Route: /demos/c-gilded
 *
 * Palette tokens (scoped in gilded.module.css):
 *   --cg-lapis-deep  #101C3D   lapis ground (gradient start)
 *   --cg-lapis       #1E3268   lapis ground (gradient end)
 *   --cg-black       #070A16   deep black bands
 *   --cg-gold        #C9A227   aged gold — the sole metallic accent
 *   --cg-cream       #EDE6D6   body text
 *
 * The one design decision that makes it distinct: ARCHITECTURE. The hero
 * lives inside an arched reliquary window with an ornate double border and
 * filigree corners, and the arch is carried into section headers, feature
 * cards and even the buttons. Gold is aged (feTurbulence leaf speckle +
 * a slow travelling shimmer), never a shiny metallic gradient.
 */
import React from 'react'
import s from './gilded.module.css'
import { brand, nav, hero, features, about, footer } from './content'

/* deterministic pseudo-random so the arch sky never reshuffles */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

function starPts(cx: number, cy: number, n: number, rOut: number, rIn: number, rotDeg = -90): string {
  let out = ''
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn
    const a = ((rotDeg + (i * 180) / n) * Math.PI) / 180
    out += `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)} `
  }
  return out.trim()
}

/* gold-leaf texture: dark speckle multiplied into the gold, not a gradient */
function LeafFilterDefs() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="cgLeaf" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" stitchTiles="stitch" result="noise" />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.6 0.6 0 0 -0.35"
          result="speckle"
        />
        <feComposite in="speckle" in2="SourceGraphic" operator="in" result="spots" />
        <feBlend in="SourceGraphic" in2="spots" mode="multiply" />
      </filter>
    </svg>
  )
}

/* the logo mark: a jewelled 8-point star inside concentric rings */
function JewelStar({ simple = false }: { simple?: boolean }) {
  const C = 100
  return (
    <g>
      {!simple && (
        <g fill="none" stroke="var(--cg-gold)">
          <circle cx={C} cy={C} r={94} strokeWidth={1} opacity={0.8} />
          <circle cx={C} cy={C} r={84} strokeWidth={0.75} strokeDasharray="2 7" opacity={0.7} />
        </g>
      )}
      <polygon
        points={starPts(C, C, 8, 70, 27)}
        fill="var(--cg-gold)"
        filter="url(#cgLeaf)"
        stroke="var(--cg-gold)"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {/* engraved facet lines on the points */}
      <g stroke="var(--cg-black)" strokeWidth={0.75} opacity={0.4}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const a = ((deg - 90) * Math.PI) / 180
          return (
            <line
              key={deg}
              x1={C}
              y1={C}
              x2={(C + 68 * Math.cos(a)).toFixed(1)}
              y2={(C + 68 * Math.sin(a)).toFixed(1)}
            />
          )
        })}
      </g>
      {/* the gem centre */}
      <circle cx={C} cy={C} r={16} fill="var(--cg-lapis-deep)" stroke="var(--cg-gold)" strokeWidth={1.5} />
      <g fill="none" stroke="var(--cg-gold)" strokeWidth={0.6} opacity={0.85}>
        <polygon points={starPts(C, C, 6, 15.5, 15.5, -90)} />
        <polygon points={starPts(C, C, 6, 8, 8, -60)} />
        <line x1={C - 13} y1={C - 8} x2={C - 4} y2={C - 4} />
        <line x1={C + 13} y1={C - 8} x2={C + 4} y2={C - 4} />
        <line x1={C} y1={C + 15} x2={C} y2={C + 7} />
      </g>
    </g>
  )
}

function JewelMark() {
  return (
    <svg className={s.jewelMark} viewBox="0 0 200 200" aria-hidden="true">
      <JewelStar />
    </svg>
  )
}

function BrandMark() {
  return (
    <svg className={s.brandMark} viewBox="0 0 200 200" aria-hidden="true">
      <JewelStar simple />
    </svg>
  )
}

/* the sky painted inside the arch: gold stars, constellation lines, sun & moon */
function ArchSky() {
  const stars = Array.from({ length: 56 }, (_, i) => ({
    x: rnd(i, 11) * 760,
    y: rnd(i, 12) * 300,
    r: 0.8 + rnd(i, 13) * 1.4,
    hi: 0.3 + rnd(i, 14) * 0.6,
    dur: 4 + rnd(i, 15) * 4,
    delay: rnd(i, 16) * 6,
  }))
  const constellation: Array<[number, number]> = [
    [150, 168],
    [215, 96],
    [292, 132],
    [380, 66],
    [468, 124],
    [545, 88],
    [612, 156],
  ]
  return (
    <div className={s.archSky} aria-hidden="true">
      <svg viewBox="0 0 760 320" preserveAspectRatio="xMidYMin meet">
        <g fill="var(--cg-gold)">
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
        <polyline
          points={constellation.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke="var(--cg-gold)"
          strokeWidth={0.75}
          opacity={0.65}
        />
        {constellation.map(([x, y], i) => (
          <polygon key={i} points={starPts(x, y, 4, i % 2 ? 5 : 7, 2)} fill="var(--cg-gold)" />
        ))}

        {/* sun disc */}
        <g transform="translate(92 216)" filter="url(#cgLeaf)">
          <circle r={24} fill="var(--cg-gold)" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 * Math.PI) / 180
            return (
              <polygon
                key={i}
                points={`${(30 * Math.cos(a - 0.09)).toFixed(1)},${(30 * Math.sin(a - 0.09)).toFixed(1)} ${(
                  42 * Math.cos(a)
                ).toFixed(1)},${(42 * Math.sin(a)).toFixed(1)} ${(30 * Math.cos(a + 0.09)).toFixed(1)},${(
                  30 * Math.sin(a + 0.09)
                ).toFixed(1)}`}
                fill="var(--cg-gold)"
              />
            )
          })}
        </g>
        <g transform="translate(92 216)" fill="none" stroke="var(--cg-lapis-deep)" strokeWidth={0.75} opacity={0.5}>
          <circle r={17} />
          <circle r={9} />
        </g>

        {/* moon crescent */}
        <g transform="translate(664 216)" filter="url(#cgLeaf)">
          <path d="M 0 -26 A 26 26 0 1 0 0 26 A 29 29 0 0 1 0 -26 Z" fill="var(--cg-gold)" />
        </g>
        <g transform="translate(664 216)" fill="none" stroke="var(--cg-lapis-deep)" strokeWidth={0.75} opacity={0.5}>
          <circle cx={-14} cy={-6} r={3.5} />
          <circle cx={-10} cy={9} r={2.4} />
          <circle cx={-18} cy={13} r={1.8} />
        </g>
      </svg>
    </div>
  )
}

/* filigree corner ornament for the arch frame */
function Filigree({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      className={side === 'left' ? s.filigreeLeft : s.filigreeRight}
      viewBox="0 0 88 88"
      aria-hidden="true"
    >
      <g fill="none" stroke="var(--cg-gold)" strokeWidth={1.1} strokeLinecap="round" opacity={0.85}>
        <path d="M 2 86 Q 4 46 26 28 Q 44 14 78 12" />
        <path d="M 4 86 Q 10 58 30 42 q 14 -10 10 -20 q -3 -8 -12 -5 q -8 3 -4 11 q 3 6 10 4" />
        <path d="M 14 86 q 2 -20 18 -28 q 14 -7 26 -4 q 10 3 8 11 q -2 8 -10 6 q -7 -2 -5 -9" />
        <circle cx={78} cy={12} r={2.2} fill="var(--cg-gold)" stroke="none" />
        <circle cx={40} cy={58} r={1.8} fill="var(--cg-gold)" stroke="none" />
      </g>
    </svg>
  )
}

/* a small arch carried into every section header */
function SectionArch() {
  return (
    <svg className={s.sectionArch} viewBox="0 0 88 56" aria-hidden="true">
      <g fill="none" stroke="var(--cg-gold)" strokeWidth={1.2}>
        <path d="M 6 54 L 6 36 Q 6 8 44 8 Q 82 8 82 36 L 82 54" />
        <path d="M 13 54 L 13 37 Q 13 15 44 15 Q 75 15 75 37 L 75 54" opacity={0.5} strokeWidth={0.8} />
      </g>
      <polygon points={starPts(44, 8, 4, 7, 2.6)} fill="var(--cg-gold)" />
      <g stroke="var(--cg-gold)" strokeWidth={1.2}>
        <line x1={0} y1={54} x2={20} y2={54} />
        <line x1={68} y1={54} x2={88} y2={54} />
      </g>
    </svg>
  )
}

/* constellation divider in gold */
function Divider() {
  const pts: Array<[number, number]> = [
    [14, 40],
    [82, 22],
    [152, 44],
    [212, 16],
    [274, 42],
    [342, 24],
    [406, 42],
  ]
  return (
    <svg className={s.divider} viewBox="0 0 420 60" aria-hidden="true">
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="var(--cg-gold)"
        strokeWidth={0.75}
        opacity={0.6}
      />
      {pts.map(([x, y], i) => (
        <polygon key={i} points={starPts(x, y, 4, i % 2 ? 4.5 : 6.5, 2)} fill="var(--cg-gold)" />
      ))}
    </svg>
  )
}

/* gold line icons for the three features */
function FeatureIcon({ kind }: { kind: 0 | 1 | 2 }) {
  return (
    <svg className={s.featureIcon} viewBox="0 0 76 76" aria-hidden="true">
      <circle cx={38} cy={38} r={36} fill="none" stroke="var(--cg-gold-faint)" strokeWidth={1} />
      {kind === 0 && (
        <g fill="none" stroke="var(--cg-gold)" strokeWidth={1}>
          <circle cx={38} cy={38} r={8} />
          <circle cx={38} cy={38} r={16} strokeDasharray="2 5" />
          <circle cx={38} cy={38} r={24} />
          <circle cx={38} cy={38} r={2} fill="var(--cg-gold)" stroke="none" />
          <polygon points={starPts(50, 27, 4, 5, 2)} fill="var(--cg-gold)" stroke="none" />
          <circle cx={27} cy={49} r={1.8} fill="var(--cg-gold)" stroke="none" />
        </g>
      )}
      {kind === 1 && (
        <g stroke="var(--cg-gold)" strokeWidth={1}>
          <path d="M 50 24 Q 38 38 26 52" fill="none" />
          <path d="M 48 31 Q 40 40 33 49" fill="none" opacity={0.5} />
          <polygon points={starPts(50, 24, 4, 7, 2.6)} fill="var(--cg-gold)" stroke="none" />
          <circle cx={26} cy={52} r={2} fill="var(--cg-gold)" stroke="none" />
        </g>
      )}
      {kind === 2 && (
        <g stroke="var(--cg-gold)" strokeWidth={1}>
          <path d="M 22 50 Q 38 26 54 50" fill="none" strokeDasharray="1.5 4.5" />
          <circle cx={22} cy={50} r={2.6} fill="var(--cg-gold)" stroke="none" />
          <circle cx={54} cy={50} r={2.6} fill="var(--cg-gold)" stroke="none" />
          <polygon points={starPts(38, 33, 4, 7.5, 2.8)} fill="var(--cg-gold)" stroke="none" />
        </g>
      )}
    </svg>
  )
}

export default function GildedReliquary() {
  return (
    <div className={s.page}>
      <LeafFilterDefs />

      <header className={s.header}>
        <a className={s.brand} href="/demos">
          <BrandMark />
          {brand}
        </a>
        <nav className={s.navLinks}>
          {nav.map((n) => (
            <a key={n} href="#">
              {n}
            </a>
          ))}
        </nav>
        <span className={s.label}>Demo C · Gilded Reliquary</span>
      </header>

      <section className={s.hero}>
        <div className={s.arch}>
          <ArchSky />
          <Filigree side="left" />
          <Filigree side="right" />
          <JewelMark />
          <span className={s.kicker}>{hero.kicker}</span>
          <h1 className={`${s.headline} ${s.goldText}`}>{hero.headline}</h1>
          <p className={s.subhead}>{hero.subhead}</p>
          <div className={s.ctaRow}>
            <a className={s.ctaPrimary} href="#">
              {hero.cta}
            </a>
            <a className={s.ctaSecondary} href="#">
              {hero.ctaSecondary}
            </a>
          </div>
        </div>
      </section>

      <Divider />

      <section className={s.features}>
        <div className={s.sectionHead}>
          <SectionArch />
          <h2 className={`${s.sectionTitle} ${s.goldText}`}>Features</h2>
        </div>
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

      <div className={s.aboutBand}>
        <section className={s.about}>
          <div className={s.sectionHead}>
            <SectionArch />
            <h2 className={`${s.sectionTitle} ${s.goldText}`}>{about.title}</h2>
          </div>
          <p className={s.aboutBody}>{about.body}</p>
        </section>
      </div>

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
  )
}
