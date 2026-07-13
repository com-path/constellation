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
  /** Set when the user drags the star to a spot — their placement wins over the layout. */
  pinnedAngle?: boolean
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
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * One angular slot per star. Each context gets an arc proportional to how many
 * people it holds, and its members spread evenly across that arc — so a sky
 * where everyone came from two contexts still fills the whole circle instead
 * of bunching into two knots. Slots are stable (sorted by id) across reloads.
 */
function computeSlotAngles(nodes: GraphInput['nodes']): Map<string, number> {
  const groups = new Map<string, string[]>()
  for (const n of [...nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    const c = n.contexts[0] ?? 'Elsewhere'
    if (!groups.has(c)) groups.set(c, [])
    groups.get(c)!.push(n.id)
  }
  const contexts = [...groups.keys()].sort()
  const total = Math.max(1, nodes.length)
  const map = new Map<string, number>()
  let cursor = -Math.PI / 2
  for (const c of contexts) {
    const members = groups.get(c)!
    const arc = (members.length / total) * Math.PI * 2
    members.forEach((id, i) => {
      map.set(id, cursor + ((i + 0.5) / members.length) * arc)
    })
    cursor += arc
  }
  return map
}

export function createConstellationSim(input: GraphInput, R: number): ConstellationSim {
  let slotAngles = computeSlotAngles(input.nodes)
  let currentR = R

  const makeNode = (n: GraphInput['nodes'][number]): SimNode => {
    const angle =
      (slotAngles.get(n.id) ?? 0) + ((hashString(n.id) % 100) / 100 - 0.5) * 0.12
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
      n.vx = (n.vx ?? 0) + (tx - (n.x ?? 0)) * 0.02 * alpha
      n.vy = (n.vy ?? 0) + (ty - (n.y ?? 0)) * 0.02 * alpha
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
    setRadius(newR: number) {
      currentR = newR
      link.distance(currentR * 0.16)
      charge.distanceMax(currentR * 0.5)
      sim.alpha(0.4).restart()
    },
    update(newInput: GraphInput, newR: number) {
      currentR = newR
      slotAngles = computeSlotAngles(newInput.nodes)
      const existing = new Map(nodes.map((n) => [n.id, n]))
      nodes = newInput.nodes.map((n) => {
        const prev = existing.get(n.id)
        if (prev) {
          prev.ring = n.ring
          prev.mass = n.mass
          prev.contexts = n.contexts
          prev.name = n.name
          // A hand-placed star stays where the user put it.
          if (!prev.pinnedAngle) {
            prev.contextAngle =
              (slotAngles.get(n.id) ?? 0) +
              ((hashString(n.id) % 100) / 100 - 0.5) * 0.12
          }
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
