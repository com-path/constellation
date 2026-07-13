/**
 * Demo A — "The Plate"
 * Route: /demos/a-plate
 *
 * Tokens (scoped in plate.module.css):
 *   --pl-ground #0F1220   near-black with a blue cast
 *   --pl-ink    #F2F0EA   warm white — the printed line
 *   --pl-mute   #6E7185   de-emphasis
 *   --pl-hand   #C0392B   THE SECOND INK — every interaction and annotation
 *   --pl-gold   #C9A227   hand-applied flecks on the hero burst only
 *
 * The one decision that makes it distinct: the plate is strictly monochrome
 * engraving — hierarchy comes from line weight and density alone — so the
 * red hand layer is the ONLY thing that ever moves fast or answers the
 * cursor. Hovering the nav circles it; the CTA arrives pre-annotated
 * ("start here"), and the about section carries a circled phrase with a
 * marginal note. Gold appears once, as mis-registered flecks on the burst.
 */
import React from 'react'
import s from './plate.module.css'
import { brand, nav, hero, features, about, footer } from './content'
import {
  Grain,
  Starburst,
  ContourCloud,
  ConstellationDivider,
  TerminalMark,
  HandCircle,
  HandArrow,
  HandUnderline,
  rnd,
} from '../components/marks'

/* hairline star field behind the hero — layer 1, slow twinkle */
function Starfield() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    x: rnd(i, 21) * 1000,
    y: rnd(i, 22) * 640,
    r: 0.5 + rnd(i, 23) * 0.9,
    hi: 0.2 + rnd(i, 24) * 0.6,
    dur: 4 + rnd(i, 25) * 4,
    delay: rnd(i, 26) * 7,
  }))
  return (
    <svg className={s.starfield} viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {stars.map((st, i) => (
        <circle
          key={i}
          className={s.twinkle}
          cx={st.x.toFixed(1)}
          cy={st.y.toFixed(1)}
          r={st.r.toFixed(2)}
          fill="currentColor"
          style={
            {
              '--tw-hi': st.hi,
              '--tw-lo': st.hi * 0.2,
              opacity: st.hi,
              animationDuration: `${st.dur.toFixed(1)}s`,
              animationDelay: `${st.delay.toFixed(1)}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  )
}

/* gold applied by hand: irregular flecks, offset 1.5px from the ink (a
 * registration error), never an even coat */
function GoldFlecks() {
  const flecks = Array.from({ length: 30 }, (_, i) => {
    const a = rnd(i, 31) * Math.PI * 2
    const r = 6 + rnd(i, 32) * 52
    return {
      x: 150 + r * Math.cos(a),
      y: 150 + r * Math.sin(a),
      size: 1 + rnd(i, 33) * 2.6,
      o: 0.45 + rnd(i, 34) * 0.5,
      rot: rnd(i, 35) * 360,
    }
  })
  return (
    <svg className={s.heroLayer} viewBox="0 0 300 300" aria-hidden="true">
      <g transform="translate(1.6 1.1)">
        {flecks.map((fl, i) => (
          <rect
            key={i}
            x={(fl.x - fl.size / 2).toFixed(1)}
            y={(fl.y - fl.size / 2).toFixed(1)}
            width={fl.size.toFixed(1)}
            height={(fl.size * (0.5 + rnd(i, 36) * 0.8)).toFixed(1)}
            fill="var(--pl-gold)"
            opacity={fl.o.toFixed(2)}
            transform={`rotate(${fl.rot.toFixed(0)} ${fl.x.toFixed(1)} ${fl.y.toFixed(1)})`}
          />
        ))}
      </g>
    </svg>
  )
}

/* the kicker set on a circular path between the rings — one curved-text moment */
function CurvedKicker() {
  return (
    <svg className={`${s.heroLayer} ${s.spinSlower}`} viewBox="0 0 300 300" aria-hidden="true">
      <defs>
        <path id="plKickerPath" d="M 150 33 A 117 117 0 1 1 149.9 33" fill="none" />
      </defs>
      <text
        fontFamily="var(--pl-plate)"
        fontSize="10.5"
        letterSpacing="3.5"
        fill="var(--pl-mute)"
        style={{ textTransform: 'uppercase' }}
      >
        <textPath href="#plKickerPath" textLength={725} lengthAdjust="spacingAndGlyphs">
          {hero.kicker} · est. MMXXVI · fig. 1 — the sky ·
        </textPath>
      </text>
    </svg>
  )
}

function SectionHead({ no, label }: { no: string; label: string }) {
  return (
    <>
      <hr className={s.rule} />
      <div className={s.sectionHead}>
        <span className={s.plateVoice}>
          {no} — {label}
        </span>
        <span className={s.plateVoice}>constellation, MMXXVI</span>
      </div>
    </>
  )
}

export default function APlate() {
  const [pre, post] = about.body.split('never the person')
  return (
    <div className={s.page}>
      <Grain blend="screen" opacity={0.045} />

      {/* four fixed corner clouds — the vignette that lights the plate's centre */}
      {(
        [
          [{ top: 0, left: 0 }, 40, 20, 1.3],
          [{ top: 0, right: 0 }, 360, 10, 4.1],
          [{ bottom: 0, left: 0 }, 30, 290, 7.7],
          [{ bottom: 0, right: 0 }, 370, 300, 2.9],
        ] as const
      ).map(([pos, cx, cy, seed], i) => (
        <ContourCloud key={i} className={s.vignette} style={pos} cx={cx} cy={cy} seed={seed} />
      ))}

      <div className={s.content}>
        <header className={s.header}>
          <a className={s.brand} href="/demos">
            {brand}
          </a>
          <nav className={s.navLinks}>
            {nav.map((n) => (
              <a key={n} className={`${s.navItem} ${s.annotated}`} href="#">
                {n}
                <HandCircle className={`${s.hand} ${s.handDraw} ${s.navCircle}`} />
              </a>
            ))}
          </nav>
          <span className={s.plateVoice}>pl. A — the plate</span>
        </header>
        <hr className={s.rule} />

        <section className={s.hero}>
          <Starfield />
          <div className={s.heroMark}>
            <Starburst className={s.spinSlow} />
            <GoldFlecks />
            <CurvedKicker />
          </div>
          <h1 className={s.headline}>{hero.headline}</h1>
          <p className={s.subhead}>{hero.subhead}</p>
          <div className={s.ctaRow}>
            <a className={`${s.ctaPrimary} ${s.annotated}`} href="#" style={{ position: 'relative' }}>
              {hero.cta}
              {/* the hand has already circled the way in */}
              <HandCircle className={`${s.hand} ${s.ctaCircle}`} />
              <span className={`${s.script} ${s.ctaNote}`} aria-hidden="true">
                start here
              </span>
              <HandArrow className={`${s.hand} ${s.ctaArrow}`} />
            </a>
            <a className={`${s.ctaSecondary} ${s.annotated}`} href="#" style={{ position: 'relative' }}>
              {hero.ctaSecondary}
              <HandUnderline className={`${s.hand} ${s.handDraw} ${s.underMark}`} />
            </a>
          </div>
        </section>

        <ConstellationDivider className={s.divider} />

        <div style={{ height: 72 }} />
        <SectionHead no="fig. 02" label="features" />
        <section className={s.features}>
          <div className={s.featureGrid}>
            {features.map((f, i) => (
              <article className={s.featureCol} key={f.title}>
                <span className={`${s.plateVoice} ${s.featureNo}`}>
                  <TerminalMark />
                  no. 0{i + 1}
                </span>
                <span className={s.annotated} style={{ position: 'relative', display: 'inline-block' }}>
                  <h2 className={s.featureTitle}>{f.title}</h2>
                  <HandUnderline className={`${s.hand} ${s.handDraw} ${s.underMark}`} />
                </span>
                <p className={s.featureBody}>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <SectionHead no="fig. 03" label="principles" />
        <section className={s.about}>
          <h2 className={s.aboutTitle}>{about.title}</h2>
          <p className={s.aboutBody}>
            {pre}
            <span className={s.circled}>
              never the person
              <HandCircle className={`${s.hand} ${s.circledMark}`} strokeWidth={1.6} />
            </span>
            {post}
          </p>
          <span className={`${s.script} ${s.marginNote}`} aria-hidden="true">
            the whole point!
          </span>
          <HandArrow className={`${s.hand} ${s.marginArrow}`} />
        </section>

        <hr className={s.rule} />
        <footer className={s.footer}>
          <span className={s.footerLine}>
            {brand} — {footer.line}
          </span>
          <nav className={s.footerLinks}>
            {footer.links.map((l) => (
              <a key={l.href} className={s.footerLink} href={l.href}>
                <TerminalMark size={18} />
                {l.label}
              </a>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  )
}
