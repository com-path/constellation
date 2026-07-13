/**
 * LAYER 1 · terminal mark — the legend-key detail (⊢○) that ends a
 * significant line. Used as list bullets, link markers and rule punctuation.
 * Inherits currentColor so each demo's ink applies.
 */
export function TerminalMark({
  className,
  size = 22,
}: {
  className?: string
  size?: number
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size * (12 / 26)}
      viewBox="0 0 26 12"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <g stroke="currentColor" strokeWidth={1} fill="none">
        <line x1={0} y1={6} x2={13} y2={6} />
        <line x1={13} y1={2} x2={13} y2={10} />
        <circle cx={20.5} cy={6} r={3.2} />
      </g>
    </svg>
  )
}
