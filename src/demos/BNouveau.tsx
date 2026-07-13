/**
 * Demo B — "Nouveau"
 * Route: /demos/b-nouveau
 *
 * Tokens (scoped in nouveau.module.css):
 *   --nv-paper #EDE4DC   warm oatmeal
 *   --nv-wine  #722D37   the dominant ink
 *   --nv-jet   #463E4A   text and outline — not black
 *   --nv-rose  #B98589   muted mid-tone
 *   --nv-pomp  #D87B93   the loud accent / second ink, heavily rationed
 *   --nv-olive #6E7A4F   stems and whiplash curves
 *
 * The one decision that makes it distinct: the WHIPLASH is the architecture.
 * A bilaterally mirrored pair of whiplash strokes forms a damask crest over
 * the hero (its rose-pompadour pass mis-registered 2px, inks multiplying
 * where they overlap, one stroke carrying the thermal gradient along its
 * length), and content lives in circular medallion cards hung at uneven
 * heights. Script voice: copperplate register, committed.
 */
import s from './nouveau.module.css'
import { brand, nav, hero, features, about, footer } from './content'
import {
  Grain,
  Whiplash,
  Starburst,
  ConstellationDivider,
  TerminalMark,
  HandCircle,
  HandUnderline,
} from '../components/marks'

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

export default function BNouveau() {
  return (
    <div className={s.page}>
      <Grain opacity={0.05} />

      <div className={s.content}>
        <header className={s.header}>
          <a className={s.logotype} href="/demos">
            {brand}
          </a>
          <nav className={s.navLinks}>
            {nav.map((n) => (
              <a key={n} className={`${s.navItem} ${s.annotated}`} href="#">
                {n}
                <HandUnderline className={`${s.hand} ${s.handDraw} ${s.underMark}`} />
              </a>
            ))}
          </nav>
          <span className={s.plateVoice}>pl. B — nouveau</span>
        </header>
        <hr className={s.rule} />

        <section className={s.hero}>
          <div className={s.damask}>
            {/* the slipped rose registration pass, printed first */}
            <Whiplash className={`${s.damaskL} ${s.damaskGhost}`} />
            <Whiplash className={`${s.damaskR} ${s.damaskGhost}`} />
            {/* the olive key line; the right stroke runs the thermal gradient */}
            <Whiplash className={s.damaskL} />
            <Whiplash className={s.damaskR} gradientStops={['#6E7A4F', '#D87B93', '#B98589']} />
            <Starburst
              className={`${s.heroBurst} ${s.spinSlow}`}
              spikes={28}
              rLong={96}
              rShort={56}
              rings={[112, 124]}
              orbitRing={132}
            />
          </div>
          <span className={s.kicker}>{hero.kicker}</span>
          <h1 className={s.headline}>{hero.headline}</h1>
          <p className={s.subhead}>{hero.subhead}</p>
          <div className={s.ctaRow}>
            <a className={`${s.ctaPrimary} ${s.annotated}`} href="#" style={{ position: 'relative' }}>
              {hero.cta}
              <HandCircle className={`${s.hand} ${s.ctaCircle}`} />
            </a>
            <a className={`${s.ctaSecondary} ${s.annotated}`} href="#" style={{ position: 'relative' }}>
              {hero.ctaSecondary}
              <HandUnderline className={`${s.hand} ${s.handDraw} ${s.underMark}`} />
            </a>
          </div>
        </section>

        <ConstellationDivider className={s.divider} />

        <section className={s.features}>
          <SectionHead no="fig. 02" label="features" />
          <div className={s.medallionRow}>
            {features.map((f, i) => (
              <article className={s.medallion} key={f.title}>
                <span className={s.medNo}>
                  <TerminalMark size={18} />
                  no. 0{i + 1}
                </span>
                <span className={s.annotated} style={{ position: 'relative', display: 'inline-block' }}>
                  <h2 className={s.medTitle}>{f.title}</h2>
                  <HandUnderline className={`${s.hand} ${s.handDraw} ${s.underMark}`} />
                </span>
                <p className={s.medBody}>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <hr className={s.rule} />
        <section className={s.about}>
          <div>
            <h2 className={s.aboutTitle}>{about.title}</h2>
            <p className={s.aboutBody}>{about.body}</p>
          </div>
          <div className={s.aboutSpare} aria-hidden="true">
            <Whiplash className={s.aboutWhip} />
            <span className={`${s.script} ${s.aboutNote}`}>tend, don't track</span>
          </div>
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
