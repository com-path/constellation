import { useEffect, useMemo, useRef, useState } from 'react'
import { ACTION_TYPE_META, ACTION_TYPE_ORDER, type ActionLog } from '../types'
import { useStore } from '../store/store'
import { Modal } from './ui'

// The effort mirror (§5.2), celestial mechanic chosen: a monthly meteor shower.
// Every act of outreach is a streak of light across that month's sky; the month
// closes as a keepsake image. It is a record of your generosity — a mirror on
// the self, never a scoreboard on others. Deliberately no streaks, no targets,
// no comparison to last month (§5.2: care is not a KPI).

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const TYPE_LENGTH: Record<string, number> = {
  everyday: 40,
  sweetness: 55,
  shared_experience: 70,
  bridging: 70,
  depth: 90,
}

export function EffortMirror({ onClose }: { onClose: () => void }) {
  const { state } = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [monthOffset, setMonthOffset] = useState(0)

  const { monthActions, monthLabel } = useMemo(() => {
    const nowD = new Date()
    const target = new Date(nowD.getFullYear(), nowD.getMonth() + monthOffset, 1)
    const start = target.getTime()
    const end = new Date(target.getFullYear(), target.getMonth() + 1, 1).getTime()
    return {
      monthActions: state.actions.filter((a) => a.timestamp >= start && a.timestamp < end),
      monthLabel: target.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    }
  }, [state.actions, monthOffset])

  const peopleTouched = useMemo(
    () => new Set(monthActions.flatMap((a) => a.participants)).size,
    [monthActions],
  )

  const counts = useMemo(() => {
    const c = new Map<string, number>()
    for (const a of monthActions) c.set(a.type, (c.get(a.type) ?? 0) + 1)
    return c
  }, [monthActions])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawSky(canvas, monthActions, monthLabel)
  }, [monthActions, monthLabel])

  const saveKeepsake = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `constellation-${monthLabel.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  return (
    <Modal title="The effort mirror" onClose={onClose} wide>
      <div className="mirror-nav">
        <button className="btn small ghost" onClick={() => setMonthOffset((m) => m - 1)}>
          ← earlier
        </button>
        <strong>{monthLabel}</strong>
        <button
          className="btn small ghost"
          onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
          disabled={monthOffset === 0}
        >
          later →
        </button>
      </div>

      <canvas ref={canvasRef} className="mirror-canvas" width={720} height={360} />

      <p className="mirror-summary">
        {monthActions.length === 0
          ? 'A quiet sky this month. Quiet months happen; the constellation keeps.'
          : `${monthActions.length} act${monthActions.length === 1 ? '' : 's'} of reaching out, touching ${peopleTouched} ${peopleTouched === 1 ? 'person' : 'people'}. This is what you put into the world.`}
      </p>

      <div className="mirror-legend" role="list">
        {ACTION_TYPE_ORDER.map((t) => (
          <span key={t} className="legend-item" role="listitem">
            <span className="type-dot" style={{ background: ACTION_TYPE_META[t].color }} />
            {ACTION_TYPE_META[t].name} · {counts.get(t) ?? 0}
          </span>
        ))}
      </div>

      <div className="modal-footer">
        <button className="btn ghost" onClick={saveKeepsake} disabled={monthActions.length === 0}>
          Save this sky
        </button>
      </div>
    </Modal>
  )
}

function drawSky(canvas: HTMLCanvasElement, actions: ActionLog[], label: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0a0f24')
  bg.addColorStop(1, '#05070f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Faint fixed stars for atmosphere.
  for (let i = 0; i < 90; i++) {
    const x = (hash(`bg${i}`) % 1000) / 1000
    const y = (hash(`bgy${i}`) % 1000) / 1000
    ctx.fillStyle = `rgba(190, 205, 235, ${0.1 + (hash(`a${i}`) % 20) / 100})`
    ctx.beginPath()
    ctx.arc(x * W, y * H, ((hash(`r${i}`) % 10) / 10) * 0.9 + 0.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Each act of outreach is a meteor. Position is stable per action (seeded by id),
  // drifting left→right through the month by date; length reflects the kind of moment.
  const sorted = actions.slice().sort((a, b) => a.timestamp - b.timestamp)
  sorted.forEach((a) => {
    const d = new Date(a.timestamp)
    const dayFrac = (d.getDate() - 1) / 30
    const x = 30 + dayFrac * (W - 120) + ((hash(a.id) % 40) - 20)
    const y = 30 + ((hash(a.id + 'y') % 1000) / 1000) * (H - 90)
    const len = TYPE_LENGTH[a.type] ?? 50
    const angle = Math.PI / 5 + ((hash(a.id + 'ang') % 100) / 100 - 0.5) * 0.15
    const dx = Math.cos(angle) * len
    const dy = Math.sin(angle) * len
    const color = ACTION_TYPE_META[a.type].color

    const grad = ctx.createLinearGradient(x, y, x + dx, y + dy)
    grad.addColorStop(0, color + '00')
    grad.addColorStop(0.85, color)
    grad.addColorStop(1, '#ffffff')
    ctx.strokeStyle = grad
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + dx, y + dy)
    ctx.stroke()

    // Bright head with a soft halo in the act's colour.
    const halo = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, 7)
    halo.addColorStop(0, '#ffffff')
    halo.addColorStop(0.4, color)
    halo.addColorStop(1, color + '00')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x + dx, y + dy, 7, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.font = 'italic 15px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(222, 228, 245, 0.75)'
  ctx.fillText(label, W / 2, H - 18)
}
