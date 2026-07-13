/**
 * Shared copy for the three celestial design demos.
 *
 * Every demo renders EXACTLY this content — same headline, same features,
 * same about text, same footer — so the only variable between
 * /demos/a-engraved, /demos/b-woodcut and /demos/c-gilded is the design
 * language. Edit copy here once and all three update together.
 */

export const brand = 'Constellation'

export const nav = ['Sky', 'Features', 'About'] as const

export const hero = {
  kicker: 'A relationship-tending app',
  headline: 'The people you love, drawn as a sky.',
  subhead:
    'Constellation maps who you know, how close you are, and how everyone ' +
    'connects — then gently suggests what you might do next to tend those bonds.',
  cta: 'Open your sky',
  ctaSecondary: 'See how it works',
}

export const features = [
  {
    title: 'Rings of closeness',
    body:
      'People drift and return. Concentric rings show who is near right now, ' +
      'while connection threads record how everyone met — that part is history, ' +
      'and it never fades.',
  },
  {
    title: 'Feather-light logging',
    body:
      'A moment takes seconds: who, what kind, one optional line. Quick notes ' +
      'are sorted into suggestions you approve — nothing lands in your sky ' +
      'without you.',
  },
  {
    title: 'Sparks',
    body:
      'Two friends who have never met but obviously should. When the ' +
      'introduction lands, a new gold thread appears in your sky — drawn by you.',
  },
] as const

export const about = {
  title: 'Not a CRM',
  body:
    'Constellation never scores, rates, ranks or grades people. It quantifies ' +
    'the action, never the person. Everything lives in your browser and is ' +
    'encrypted before it ever syncs — no telemetry, no feed, no streaks. ' +
    'The app notices; you decide.',
}

export const footer = {
  line: 'Local-first · end-to-end encrypted · no streaks, no guilt',
  links: [
    { label: 'All demos', href: '/demos' },
    { label: 'Engraved Atlas', href: '/demos/a-engraved' },
    { label: 'Woodcut Sky', href: '/demos/b-woodcut' },
    { label: 'Gilded Reliquary', href: '/demos/c-gilded' },
  ],
} as const
