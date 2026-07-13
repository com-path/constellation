/**
 * LAYER 1 · constellation link — small filled dots (the one permitted filled
 * shape) joined by hairlines, terminating at each end in the legend-key
 * tick-and-dot. Used as a section divider. viewBox 0 0 440 60.
 */
export function ConstellationDivider({
  className,
  strokeWidth = 0.75,
}: {
  className?: string
  strokeWidth?: number
}) {
  const pts: Array<[number, number, number]> = [
    [36, 40, 2],
    [102, 22, 3],
    [170, 44, 2],
    [232, 16, 3.5],
    [294, 42, 2],
    [352, 24, 3],
    [404, 40, 2],
  ]
  return (
    <svg className={className} viewBox="0 0 440 60" aria-hidden="true">
      <g stroke="currentColor" strokeWidth={strokeWidth} fill="none">
        {/* terminal marks at either end of the run */}
        <line x1={4} y1={40} x2={30} y2={40} />
        <line x1={10} y1={36} x2={10} y2={44} />
        <line x1={410} y1={40} x2={430} y2={40} />
        <circle cx={434} cy={40} r={2.8} />
        <polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} />
      </g>
      {pts.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="currentColor" />
          {r >= 3 && <circle cx={x} cy={y} r={r + 4} fill="none" stroke="currentColor" strokeWidth={0.5} opacity={0.6} />}
        </g>
      ))}
    </svg>
  )
}
