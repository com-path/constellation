import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import type { Ring } from '../types'

// The hard part (§10.3): a force-directed layout constrained by concentric rings.
// Radial constraint (distance from centre = ring) fights force-directed clustering
// (linked people pull together). The balance below: a firm radial force pins each
// star to its orbit, weak link forces pull connected people together *around* the
// ring, and a gentle per-context angular anchor keeps clusters coherent.

export interface SimNode extends SimulationNodeDatum {
  id: string
  name: string
  ring: Ring
  mass: number // bond strength — drives star size (§2.5)
  contexts: string[]
  contextAngle: number
  twinklePhase: number
}

export interface SimLink extends SimulationLinkDatum<SimNode> {
  context: string
  introducedByUser: boolean
}

/** Ring radius as a fraction of the available radius. */
const RING_FRACTION: Record<string, number> = {
  1: 0.2,
  2: 0.38,
  3: 0.56,
  4: 0.74,
  outer: 0.92,
}

export function ringRadius(ring: Ring, R: number): number {
  return RING_FRACTION[String(ring)] * R
}

export function starRadius(mass: number): number {
  return 2.5 + mass * 0.85
}

export interface GraphInput {
  nodes: Array<{ id: string; name: string; ring: Ring; mass: number; contexts: string[] }>
  links: Array<{ source: string; target: string; context: string; introducedByUser: boolean }>
}

export interface ConstellationSim {
  sim: Simulation<SimNode, SimLink>
  nodes: SimNode[]
  links: SimLink[]
  /** Re-pin forces after the canvas resizes. */
  setRadius(R: number): void
  /** Merge new data, preserving positions of existing stars. */
  update(input: GraphInput, R: number): void
  contextAngles: Map<string, number>
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Stable angle per context so clusters occupy consistent sectors of the sky. */
function computeContextAngles(nodes: GraphInput['nodes']): Map<string, number> {
  const contexts = [...new Set(nodes.flatMap((n) => n.contexts))].sort()
  const map = new Map<string, number>()
  contexts.forEach((c, i) => {
    map.set(c, (i / Math.max(1, contexts.length)) * Math.PI * 2 - Math.PI / 2)
  })
  return map
}

export function createConstellationSim(input: GraphInput, R: number): ConstellationSim {
  let contextAngles = computeContextAngles(input.nodes)
  let currentR = R

  const makeNode = (n: GraphInput['nodes'][number]): SimNode => {
    const angle =
      (contextAngles.get(n.contexts[0]) ?? 0) +
      ((hashString(n.id) % 100) / 100 - 0.5) * 0.9
    const r = ringRadius(n.ring, currentR)
    return {
      ...n,
      contextAngle: angle,
      twinklePhase: (hashString(n.id) % 628) / 100,
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    }
  }

  let nodes: SimNode[] = input.nodes.map(makeNode)
  let links: SimLink[] = input.links.map((l) => ({ ...l }))

  const radial = forceRadial<SimNode>((d) => ringRadius(d.ring, currentR), 0, 0).strength(0.55)
  const link = forceLink<SimNode, SimLink>(links)
    .id((d) => d.id)
    .distance(currentR * 0.16)
    .strength(0.06)
  const charge = forceManyBody<SimNode>().strength(-38).distanceMax(currentR * 0.5)
  const collide = forceCollide<SimNode>((d) => starRadius(d.mass) + 7).strength(0.8)

  // Gentle angular anchor: pulls each star toward its context's sector so
  // clusters stay coherent without overpowering the link forces.
  function anchorForce(alpha: number) {
    for (const n of nodes) {
      const r = ringRadius(n.ring, currentR)
      const tx = Math.cos(n.contextAngle) * r
      const ty = Math.sin(n.contextAngle) * r
      n.vx = (n.vx ?? 0) + (tx - (n.x ?? 0)) * 0.012 * alpha
      n.vy = (n.vy ?? 0) + (ty - (n.y ?? 0)) * 0.012 * alpha
    }
  }

  const sim = forceSimulation<SimNode>(nodes)
    .force('radial', radial)
    .force('link', link)
    .force('charge', charge)
    .force('collide', collide)
    .force('anchor', anchorForce as never)
    .alpha(1)
    // Never fully asleep — the constellation should feel alive, settling but breathing.
    .alphaMin(0.0005)
    .alphaTarget(0.008)
    .velocityDecay(0.35)

  const api: ConstellationSim = {
    sim,
    get nodes() {
      return nodes
    },
    get links() {
      return links
    },
    contextAngles,
    setRadius(newR: number) {
      currentR = newR
      link.distance(currentR * 0.16)
      charge.distanceMax(currentR * 0.5)
      sim.alpha(0.4).restart()
    },
    update(newInput: GraphInput, newR: number) {
      currentR = newR
      contextAngles = computeContextAngles(newInput.nodes)
      api.contextAngles = contextAngles
      const existing = new Map(nodes.map((n) => [n.id, n]))
      nodes = newInput.nodes.map((n) => {
        const prev = existing.get(n.id)
        if (prev) {
          prev.ring = n.ring
          prev.mass = n.mass
          prev.contexts = n.contexts
          prev.name = n.name
          prev.contextAngle =
            (contextAngles.get(n.contexts[0]) ?? 0) +
            ((hashString(n.id) % 100) / 100 - 0.5) * 0.9
          return prev
        }
        return makeNode(n)
      })
      links = newInput.links.map((l) => ({ ...l }))
      sim.nodes(nodes)
      link.links(links)
      // Recreate collide so radius accessors re-read updated masses.
      sim.force('collide', forceCollide<SimNode>((d) => starRadius(d.mass) + 7).strength(0.8))
      sim.alpha(0.5).restart()
    },
  }
  return api
}
