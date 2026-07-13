/**
 * The shared mark vocabulary for the "annotated plate" system.
 *
 * LAYER 1 (the plate): Grain, TerminalMark, Whiplash, ContourCloud,
 *   Starburst, ConstellationDivider — engraved, structural, ink-on-paper.
 * LAYER 2 (the hand): HandCircle, HandArrow, HandUnderline, HandTick —
 *   annotation in the second ink; all interactivity is expressed here.
 *
 * Every mark inherits currentColor, so demos tint them purely with CSS.
 */
export { Grain } from './Grain'
export { TerminalMark } from './TerminalMark'
export { Whiplash } from './Whiplash'
export { ContourCloud } from './ContourCloud'
export { Starburst } from './Starburst'
export { ConstellationDivider } from './ConstellationDivider'
export { HandCircle, HandArrow, HandUnderline, HandTick } from './hand'
export { rnd, smoothClosed, smoothOpen, contourLoop, whiplashPath } from './helpers'
