/**
 * /demos — index of the three celestial design-language demos.
 * Deliberately neutral styling so it doesn't bias the comparison.
 */
import s from './index.module.css'

const demos = [
  {
    href: '/demos/a-engraved',
    title: 'A · Engraved Atlas',
    desc: 'Monochrome antique star chart — hairline white engraving on near-black, with topographic contour clouds as a corner vignette.',
    swatches: ['#0a0a0c', '#ffffff', '#8b93a3'],
  },
  {
    href: '/demos/b-woodcut',
    title: 'B · Woodcut Sky',
    desc: 'Sage linocut print in light mode — bold plum outlines, slipped sage registration, mustard stars in banked clouds under a big empty sky.',
    swatches: ['#f7f1e8', '#8faf9b', '#f0c04a', '#3a2a33'],
  },
  {
    href: '/demos/c-gilded',
    title: 'C · Gilded Reliquary',
    desc: 'Lapis and aged gold leaf — the hero framed in an ornate arched window, with the arch carried through every section.',
    swatches: ['#101c3d', '#1e3268', '#c9a227', '#ede6d6'],
  },
]

export default function DemosIndex() {
  return (
    <div className={s.page}>
      <div className={s.inner}>
        <span className={s.kicker}>Constellation · design direction</span>
        <h1 className={s.title}>Three skies, one language</h1>
        <p className={s.lede}>
          The same landing page — hero, three features, about, footer — rendered three ways.
          Shared DNA: a compass-rose starburst in concentric rings, constellation dividers,
          circular framing, texture over gloss, and slow orbital motion.
        </p>
        <div className={s.list}>
          {demos.map((d) => (
            <a className={s.card} key={d.href} href={d.href}>
              <span className={s.swatches}>
                {d.swatches.map((c) => (
                  <span className={s.swatch} key={c} style={{ background: c }} />
                ))}
              </span>
              <span>
                <h2 className={s.cardTitle}>{d.title}</h2>
                <p className={s.cardDesc}>{d.desc}</p>
                <span className={s.route}>{d.href}</span>
              </span>
            </a>
          ))}
        </div>
        <a className={s.back} href="/">
          ← back to the app
        </a>
      </div>
    </div>
  )
}
