/**
 * LAYER 2 · the hand — annotation marks applied over the plate, always in
 * the demo's second ink (set via CSS `color` on a wrapper). Every path has
 * pathLength={100}, so a demo can draw it at handwriting speed with:
 *
 *   .mark path { stroke-dasharray: 1; stroke-dashoffset: 1; }
 *   .target:hover .mark path { stroke-dashoffset: 0;
 *     transition: stroke-dashoffset 420ms cubic-bezier(0.4, 0.1, 0.3, 1); }
 *
 * The geometry is deliberately imperfect: circles don't quite close, arrows
 * wobble, underlines overshoot. Never used for Layer 1 structure.
 */

type HandProps = {
  className?: string
  strokeWidth?: number
}

/** a circled word — the loop misses its own start and overshoots inward */
export function HandCircle({ className, strokeWidth = 1.8 }: HandProps) {
  return (
    <svg className={className} viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true" style={{ overflow: 'visible' }}>
      <path
        d="M 8 26 C 12 10, 38 3, 62 5 C 84 7, 96 16, 94 28 C 92 40, 64 46, 38 44 C 16 42, 4 34, 9 22 C 11 16, 18 11, 27 9"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pathLength={100}
      />
    </svg>
  )
}

/** a marginal arrow — wobbly shaft, open head, drawn in one gesture */
export function HandArrow({ className, strokeWidth = 1.8 }: HandProps) {
  return (
    <svg className={className} viewBox="0 0 90 40" aria-hidden="true" style={{ overflow: 'visible' }}>
      <path
        d="M 4 33 C 24 27, 44 31, 68 15 M 58 11 L 71 13 L 64 25"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
      />
    </svg>
  )
}

/** an underline that overshoots its word */
export function HandUnderline({ className, strokeWidth = 1.8 }: HandProps) {
  return (
    <svg className={className} viewBox="0 0 130 12" preserveAspectRatio="none" aria-hidden="true" style={{ overflow: 'visible' }}>
      <path
        d="M 3 8 C 30 4, 62 10, 92 6 C 106 4, 118 8, 128 5"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pathLength={100}
      />
    </svg>
  )
}

/** a marginal tick */
export function HandTick({ className, strokeWidth = 1.8 }: HandProps) {
  return (
    <svg className={className} viewBox="0 0 26 24" aria-hidden="true" style={{ overflow: 'visible' }}>
      <path
        d="M 3 13 L 10 20 C 12 15, 18 7, 24 3"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
      />
    </svg>
  )
}
