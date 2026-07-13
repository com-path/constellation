/**
 * /demos — index of the design-language demos.
 * Deliberately neutral styling so it doesn't bias the comparison.
 */
import s from './index.module.css'

const round2 = [
  {
    href: '/demos/a-plate',
    title: 'A · The Plate',
    desc: 'Strict monochrome engraving on near-black — hierarchy from line weight alone, with the red hand layer as the only fast, interactive ink.',
    swatches: ['#0f1220', '#f2f0ea', '#c0392b', '#c9a227'],
  },
  {
    href: '/demos/b-nouveau',
    title: 'B · Nouveau',
    desc: 'Warm oatmeal and wine — a mirrored whiplash damask over the hero, circular medallion cards, copperplate script, rose-pompadour annotations.',
    swatches: ['#ede4dc', '#722d37', '#6e7a4f', '#d87b93'],
  },
  {
    href: '/demos/c-index',
    title: 'C · The Index',
    desc: 'Museum catalogue in cream and one red — a cropped Didone masthead and an accordion index; opening an entry is answered by a drawn tick and arrow.',
    swatches: ['#efebe4', '#1a1a1a', '#c8442f', '#8c8c8c'],
  },
]

const round1 = [
  { href: '/demos/a-engraved', label: 'a-engraved' },
  { href: '/demos/b-woodcut', label: 'b-woodcut' },
  { href: '/demos/c-gilded', label: 'c-gilded' },
]

export default function DemosIndex() {
  return (
    <div className={s.page}>
      <div className={s.inner}>
        <span className={s.kicker}>Constellation · the annotated plate</span>
        <h1 className={s.title}>One plate, three impressions</h1>
        <p className={s.lede}>
          The same landing page rendered three ways under one governing idea: a printed
          engraving (Layer 1, fixed and formal) that someone has written on (Layer 2, the
          hand — every interaction is an annotation in the second ink).
        </p>
        <div className={s.list}>
          {round2.map((d) => (
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
        <p className={s.lede} style={{ margin: '40px 0 10px' }}>
          Round one (celestial design language, superseded):{' '}
          {round1.map((d, i) => (
            <span key={d.href}>
              {i > 0 && ' · '}
              <a href={d.href} style={{ color: 'inherit' }}>
                {d.label}
              </a>
            </span>
          ))}
        </p>
        <a className={s.back} href="/">
          ← back to the app
        </a>
      </div>
    </div>
  )
}
