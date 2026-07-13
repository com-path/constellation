/**
 * LAYER 1 · radiating burst — long thin spikes of alternating length from a
 * centre, sat inside solid hairline rings, with one dashed ring reserved for
 * an orbital path (solid = object; dashed = the path it travels). Spike tips
 * carry small terminal dots on the long rays. Plate wear: every few spikes
 * are broken short. viewBox 0 0 300 300, centre (150,150).
 */
import { rnd } from './helpers'

export function Starburst({
  className,
  spikes = 36,
  rInner = 14,
  rLong = 104,
  rShort = 64,
  rings = [126, 142],
  orbitRing = 134,
  strokeWidth = 0.75,
}: {
  className?: string
  spikes?: number
  rInner?: number
  rLong?: number
  rShort?: number
  rings?: number[]
  orbitRing?: number | null
  strokeWidth?: number
}) {
  const C = 150
  return (
    <svg className={className} viewBox="0 0 300 300" aria-hidden="true">
      <g stroke="currentColor" strokeWidth={strokeWidth} fill="none">
        {Array.from({ length: spikes }, (_, i) => {
          const a = (i / spikes) * Math.PI * 2 - Math.PI / 2
          const long = i % 2 === 0
          /* plate wear: some spikes print short or broken */
          const worn = rnd(i, 9) > 0.82
          const rOut = (long ? rLong : rShort) * (worn ? 0.55 + rnd(i, 5) * 0.2 : 1)
          const x1 = C + rInner * Math.cos(a)
          const y1 = C + rInner * Math.sin(a)
          const x2 = C + rOut * Math.cos(a)
          const y2 = C + rOut * Math.sin(a)
          return (
            <g key={i}>
              <line x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} />
              {long && !worn && i % 6 === 0 && (
                <circle cx={x2.toFixed(1)} cy={y2.toFixed(1)} r={1.6} fill="currentColor" stroke="none" />
              )}
            </g>
          )
        })}
        {rings.map((r) => (
          <circle key={r} cx={C} cy={C} r={r} />
        ))}
        {orbitRing != null && (
          <g>
            <circle cx={C} cy={C} r={orbitRing} strokeDasharray="2 6" strokeWidth={strokeWidth * 0.8} />
            {/* the object travelling the dashed path */}
            <circle cx={C + orbitRing} cy={C} r={2.2} fill="currentColor" stroke="none" />
          </g>
        )}
        <circle cx={C} cy={C} r={3} fill="currentColor" stroke="none" />
        <circle cx={C} cy={C} r={rInner - 5} />
      </g>
    </svg>
  )
}
