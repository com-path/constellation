/**
 * LAYER 1 · substrate — the paper itself. A fixed feTurbulence grain sheet
 * over the whole viewport; it never scrolls independently of the page.
 * Default is multiply at 5% per the analogue mandate; dark grounds may pass
 * blend="screen" so the tooth stays visible against near-black.
 */
import React from 'react'

let uid = 0

export function Grain({
  opacity = 0.05,
  blend = 'multiply',
  baseFrequency = 0.8,
}: {
  opacity?: number
  blend?: React.CSSProperties['mixBlendMode']
  baseFrequency?: number
}) {
  const id = React.useMemo(() => `grain-${uid++}`, [])
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity,
        mixBlendMode: blend,
        zIndex: 40,
      }}
    >
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency={baseFrequency} numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  )
}
