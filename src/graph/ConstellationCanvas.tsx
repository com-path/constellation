import { useEffect, useRef } from 'react'
import type { Person, Ring, ViewMode } from '../types'
import { RING_NAMES, TRANSITIONAL_RINGS } from '../types'
import {
  createConstellationSim,
  ringRadius,
  starRadius,
  type ConstellationSim,
  type GraphInput,
  type SimNode,
} from './simulation'

// The render layer (§10.2): where the product lives or dies.
// One underlying graph; view modes are lenses — stars never move between views,
// only what's emphasised changes (§2.6).

const RING_ORDER: Ring[] = [1, 2, 3, 4, 'outer']

const RING_GLOW: Record<string, string> = {
  // Inner stars burn warm gold; outer ones are faint, cool, distant (§2.5).
  1: '#ffd9a0',
  2: '#ffe8c8',
  3: '#cfdfff',
  4: '#a7bade',
  outer: '#76869f',
}

const RING_CORE: Record<string, string> = {
  1: '#fff4e0',
  2: '#fdf2e2',
  3: '#eaf1ff',
  4: '#ccd8ee',
  outer: '#9aa7bd',
}

// Nebula tints per context — soft haze behind clusters, not node colouring (§2.5).
const NEBULA_COLORS = ['#c08428', '#3d7fd4', '#c74e6e', '#8763d6', '#1f9a6e', '#a06a3a', '#4f8f9f', '#7a6fb8']

interface Emphasis {
  ringAlpha: number
  edgeAlpha: number
  nebulaAlpha: number
  labelAlpha: number
}

const EMPHASIS: Record<ViewMode, Emphasis> = {
  closeness: { ringAlpha: 0.55, edgeAlpha: 0.1, nebulaAlpha: 0.05, labelAlpha: 0.45 },
  network: { ringAlpha: 0.14, edgeAlpha: 0.55, nebulaAlpha: 0.16, labelAlpha: 0.55 },
  events: { ringAlpha: 0.3, edgeAlpha: 0.12, nebulaAlpha: 0.04, labelAlpha: 0.5 },
  attention: { ringAlpha: 0.35, edgeAlpha: 0.08, nebulaAlpha: 0.04, labelAlpha: 0.5 },
  sparks: { ringAlpha: 0.2, edgeAlpha: 0.22, nebulaAlpha: 0.06, labelAlpha: 0.5 },
}

interface Props {
  input: GraphInput
  people: Person[]
  viewMode: ViewMode
  selectedId: string | null
  /** When set, stars outside this set recede (events/attention/sparks lenses). */
  highlightIds: Set<string> | null
  /** Potential introductions to draw as shimmering dashed threads (sparks lens). */
  sparkPairs: Array<[string, string]>
  onSelect: (id: string | null) => void
}

interface BgStar {
  x: number
  y: number
  r: number
  phase: number
}

const DAY = 24 * 60 * 60 * 1000

export function ConstellationCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<ConstellationSim | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const hoverRef = useRef<string | null>(null)
  const emRef = useRef<Emphasis>({ ...EMPHASIS.closeness })
  const bgStarsRef = useRef<BgStar[]>([])
  const sizeRef = useRef({ w: 0, h: 0, R: 0 })

  // Keep the simulation in sync with data without recreating it (positions persist).
  const inputKey = JSON.stringify({
    n: props.input.nodes.map((n) => [n.id, n.ring, Math.round(n.mass * 10), n.contexts]),
    l: props.input.links.map((l) => [l.source, l.target, l.introducedByUser]),
  })
  useEffect(() => {
    if (simRef.current && sizeRef.current.R > 0) {
      simRef.current.update(propsRef.current.input, sizeRef.current.R)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (bgStarsRef.current.length === 0) {
      bgStarsRef.current = Array.from({ length: 220 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.1 + 0.2,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    function resize() {
      const c = canvasRef.current
      if (!c) return
      const rect = c.parentElement!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      c.width = rect.width * dpr
      c.height = rect.height * dpr
      c.style.width = `${rect.width}px`
      c.style.height = `${rect.height}px`
      const R = Math.min(rect.width, rect.height) / 2 - 30
      sizeRef.current = { w: rect.width, h: rect.height, R }
      if (!simRef.current) {
        simRef.current = createConstellationSim(propsRef.current.input, R)
      } else {
        simRef.current.setRadius(R)
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)

    function toCentered(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      return {
        x: e.clientX - rect.left - sizeRef.current.w / 2,
        y: e.clientY - rect.top - sizeRef.current.h / 2,
      }
    }
    function nodeAt(x: number, y: number): SimNode | null {
      const s = simRef.current
      if (!s) return null
      let best: SimNode | null = null
      let bestDist = Infinity
      for (const n of s.nodes) {
        const d = Math.hypot((n.x ?? 0) - x, (n.y ?? 0) - y)
        const hit = Math.max(12, starRadius(n.mass) + 5)
        if (d < hit && d < bestDist) {
          best = n
          bestDist = d
        }
      }
      return best
    }
    function onMove(e: MouseEvent) {
      const { x, y } = toCentered(e)
      const n = nodeAt(x, y)
      hoverRef.current = n?.id ?? null
      canvas!.style.cursor = n ? 'pointer' : 'default'
    }
    function onClick(e: MouseEvent) {
      const { x, y } = toCentered(e)
      const n = nodeAt(x, y)
      propsRef.current.onSelect(n?.id ?? null)
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('click', onClick)

    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const s = simRef.current
      const { w, h, R } = sizeRef.current
      if (!s || w === 0) return
      const dpr = window.devicePixelRatio || 1
      const t = performance.now() / 1000
      const p = propsRef.current
      const now = Date.now()

      // Ease emphasis toward the active lens for smooth crossfades.
      const target = EMPHASIS[p.viewMode]
      const em = emRef.current
      for (const k of Object.keys(em) as Array<keyof Emphasis>) {
        em[k] += (target[k] - em[k]) * 0.08
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      // Deep-space backdrop with a faint centre warmth.
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.4)
      bg.addColorStop(0, '#0b1026')
      bg.addColorStop(1, '#05070f')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Distant starfield, twinkling.
      for (const st of bgStarsRef.current) {
        const a = 0.18 + 0.16 * Math.sin(t * 0.6 + st.phase)
        ctx.fillStyle = `rgba(200, 214, 240, ${a})`
        ctx.beginPath()
        ctx.arc(st.x * w, st.y * h, st.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.translate(w / 2, h / 2)

      // Nebula haze behind each context cluster.
      const byContext = new Map<string, SimNode[]>()
      for (const n of s.nodes) {
        const c = n.contexts[0]
        if (!c) continue
        if (!byContext.has(c)) byContext.set(c, [])
        byContext.get(c)!.push(n)
      }
      const contexts = [...byContext.keys()].sort()
      contexts.forEach((c, i) => {
        const members = byContext.get(c)!
        if (members.length < 2) return
        const cx = members.reduce((acc, n) => acc + (n.x ?? 0), 0) / members.length
        const cy = members.reduce((acc, n) => acc + (n.y ?? 0), 0) / members.length
        const spread =
          members.reduce((acc, n) => acc + Math.hypot((n.x ?? 0) - cx, (n.y ?? 0) - cy), 0) /
            members.length +
          40
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread * 1.6)
        const col = NEBULA_COLORS[i % NEBULA_COLORS.length]
        grad.addColorStop(0, hexA(col, em.nebulaAlpha))
        grad.addColorStop(1, hexA(col, 0))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, spread * 1.6, 0, Math.PI * 2)
        ctx.fill()
      })

      // Ring guides. Transitional rings (2 & 4) shimmer — slowly rotating dashes;
      // stable rings (1 & 3) are anchored, solid (§2.4 design note).
      for (const ring of RING_ORDER) {
        const r = ringRadius(ring, R)
        const transitional = TRANSITIONAL_RINGS.includes(ring)
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        if (transitional) {
          ctx.setLineDash([3, 9])
          ctx.lineDashOffset = t * 4
          ctx.strokeStyle = `rgba(140, 160, 205, ${em.ringAlpha * (0.5 + 0.12 * Math.sin(t * 1.3))})`
        } else {
          ctx.setLineDash([])
          ctx.strokeStyle = `rgba(140, 160, 205, ${em.ringAlpha * 0.55})`
        }
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
        // Ring label, tucked along the top of its orbit.
        ctx.font = 'italic 10px Georgia, serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = `rgba(150, 168, 210, ${em.ringAlpha * 0.85})`
        ctx.fillText(RING_NAMES[String(ring)], 0, -r - 5)
      }

      const byId = new Map(s.nodes.map((n) => [n.id, n]))
      const dimmed = (id: string) => (p.highlightIds ? !p.highlightIds.has(id) : false)

      // Threads between stars — fixed history (§2.3).
      for (const l of s.links) {
        const a = l.source as SimNode
        const b = l.target as SimNode
        if (typeof a !== 'object' || typeof b !== 'object') continue
        const involved =
          p.selectedId != null && (a.id === p.selectedId || b.id === p.selectedId)
        const dim = dimmed(a.id) || dimmed(b.id)
        let alpha = em.edgeAlpha * (dim ? 0.25 : 1)
        if (involved) alpha = Math.max(alpha, 0.55)
        // Threads you drew yourself glow faintly warmer — the Sparks payoff (§6.3).
        ctx.strokeStyle = l.introducedByUser
          ? `rgba(230, 195, 130, ${alpha})`
          : `rgba(155, 175, 220, ${alpha})`
        ctx.lineWidth = l.introducedByUser ? 1.4 : 1
        ctx.beginPath()
        ctx.moveTo(a.x ?? 0, a.y ?? 0)
        ctx.lineTo(b.x ?? 0, b.y ?? 0)
        ctx.stroke()
      }

      // Spark threads: introductions that could exist — dashed, breathing.
      for (const [aId, bId] of p.sparkPairs) {
        const a = byId.get(aId)
        const b = byId.get(bId)
        if (!a || !b) continue
        ctx.setLineDash([2, 6])
        ctx.lineDashOffset = -t * 8
        ctx.strokeStyle = `rgba(126, 220, 180, ${0.35 + 0.15 * Math.sin(t * 2)})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(a.x ?? 0, a.y ?? 0)
        ctx.lineTo(b.x ?? 0, b.y ?? 0)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Comet trails: recent movement between rings leaves a fading light-path (§2.5).
      for (const person of p.people) {
        const hist = person.ringHistory
        if (hist.length < 2) continue
        const last = hist[hist.length - 1]
        const ageDays = (now - last.at) / DAY
        if (ageDays > 14) continue
        const node = byId.get(person.id)
        if (!node) continue
        const prevR = ringRadius(hist[hist.length - 2].ring, R)
        const nx = node.x ?? 0
        const ny = node.y ?? 0
        const angle = Math.atan2(ny, nx)
        const fade = 1 - ageDays / 14
        const grad = ctx.createLinearGradient(
          Math.cos(angle) * prevR,
          Math.sin(angle) * prevR,
          nx,
          ny,
        )
        grad.addColorStop(0, 'rgba(255, 226, 170, 0)')
        grad.addColorStop(1, `rgba(255, 226, 170, ${0.4 * fade})`)
        ctx.strokeStyle = grad
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(angle) * prevR, Math.sin(angle) * prevR)
        ctx.lineTo(nx, ny)
        ctx.stroke()
      }

      // You, at the centre.
      const sun = ctx.createRadialGradient(0, 0, 0, 0, 0, 26)
      sun.addColorStop(0, 'rgba(255, 244, 214, 0.9)')
      sun.addColorStop(0.3, 'rgba(255, 224, 160, 0.35)')
      sun.addColorStop(1, 'rgba(255, 224, 160, 0)')
      ctx.fillStyle = sun
      ctx.beginPath()
      ctx.arc(0, 0, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff6e3'
      ctx.beginPath()
      ctx.arc(0, 0, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = 'italic 11px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(230, 220, 200, 0.6)'
      ctx.fillText('you', 0, 22)

      // The stars themselves.
      for (const n of s.nodes) {
        const transitional = TRANSITIONAL_RINGS.includes(n.ring)
        // Transitional stars have a subtle unsettledness — render-only wobble.
        const wx = transitional ? Math.sin(t * 0.9 + n.twinklePhase) * 1.6 : 0
        const wy = transitional ? Math.cos(t * 0.7 + n.twinklePhase * 1.3) * 1.6 : 0
        const x = (n.x ?? 0) + wx
        const y = (n.y ?? 0) + wy
        const r = starRadius(n.mass)
        const twinkle = 0.86 + 0.14 * Math.sin(t * 1.1 + n.twinklePhase)
        const dim = dimmed(n.id) ? 0.22 : 1
        const isSel = n.id === p.selectedId
        const isHover = n.id === hoverRef.current

        const glowR = r * (isSel ? 4.6 : 3.6)
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR)
        const gc = RING_GLOW[String(n.ring)]
        glow.addColorStop(0, hexA(gc, 0.5 * twinkle * dim))
        glow.addColorStop(1, hexA(gc, 0))
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, glowR, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = hexA(RING_CORE[String(n.ring)], (0.75 + 0.25 * twinkle) * dim)
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()

        if (isSel) {
          ctx.strokeStyle = 'rgba(255, 240, 210, 0.8)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(x, y, r + 5 + Math.sin(t * 2) * 1.2, 0, Math.PI * 2)
          ctx.stroke()
        }

        const labelAlpha = isSel || isHover ? 0.95 : em.labelAlpha * dim
        ctx.font = isSel || isHover ? '11px system-ui, sans-serif' : '10px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = `rgba(214, 224, 245, ${labelAlpha})`
        ctx.fillText(n.name, x, y + r + 13)
      }
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('click', onClick)
      simRef.current?.sim.stop()
      simRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={canvasRef} className="constellation-canvas" />
}

function hexA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}
