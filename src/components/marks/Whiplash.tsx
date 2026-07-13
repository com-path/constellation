/**
 * LAYER 1 · whiplash curve — the signature stroke. A long asymmetric line
 * that accelerates and coils into a tight spiral at its terminal. The stroke
 * swells through its belly (a second, wider pass) and the ink pools into a
 * small dot at the spiral's end. viewBox 0 0 400 170; scale/mirror outside.
 *
 * `gradientStops` runs a thermal gradient ALONG the stroke (never a fill).
 */
import React from 'react'
import { whiplashPath } from './helpers'

const GEO = whiplashPath()
let uid = 0

export function Whiplash({
  className,
  strokeWidth = 1.6,
  gradientStops,
}: {
  className?: string
  strokeWidth?: number
  gradientStops?: string[]
}) {
  const id = React.useMemo(() => `whip-${uid++}`, [])
  const stroke = gradientStops ? `url(#${id})` : 'currentColor'
  return (
    <svg className={className} viewBox="0 0 400 170" aria-hidden="true" style={{ overflow: 'visible' }}>
      {gradientStops && (
        <defs>
          <linearGradient id={id} x1="0" y1="152" x2="330" y2="70" gradientUnits="userSpaceOnUse">
            {gradientStops.map((c, i) => (
              <stop key={i} offset={i / (gradientStops.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
      )}
      <g fill="none" stroke={stroke} strokeLinecap="round">
        <path d={GEO.full} strokeWidth={strokeWidth} />
        {/* the ink swells through the belly of the stroke */}
        <path d={GEO.belly} strokeWidth={strokeWidth * 2.1} />
      </g>
      {/* ink pools at the terminal */}
      <circle cx={GEO.end[0].toFixed(1)} cy={GEO.end[1].toFixed(1)} r={2.4} fill={gradientStops ? gradientStops[gradientStops.length - 1] : 'currentColor'} />
    </svg>
  )
}
