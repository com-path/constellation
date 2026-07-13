/**
 * LAYER 1 · contour cloud — volume described as nested elevation lines.
 * `wear` breaks the strokes with tiny irregular gaps (plate wear: perfection
 * reads as digital). viewBox 0 0 400 310; position and scale outside.
 */
import React from 'react'
import { contourLoop } from './helpers'

const LEVELS = [1, 0.84, 0.68, 0.53, 0.38, 0.24]

export function ContourCloud({
  className,
  style,
  cx = 200,
  cy = 155,
  rx = 300,
  ry = 200,
  seed = 1.3,
  strokeWidth = 0.75,
  wear = true,
}: {
  className?: string
  style?: React.CSSProperties
  cx?: number
  cy?: number
  rx?: number
  ry?: number
  seed?: number
  strokeWidth?: number
  wear?: boolean
}) {
  return (
    <svg className={className} style={style} viewBox="0 0 400 310" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
        {LEVELS.map((k, i) => (
          <path
            key={i}
            d={contourLoop(cx, cy, rx, ry, seed + i * 0.35, k)}
            strokeDasharray={wear ? `${34 + i * 7} 2.5 ${21 + i * 5} 2 ${47 + i * 3} 3` : undefined}
          />
        ))}
      </g>
    </svg>
  )
}
