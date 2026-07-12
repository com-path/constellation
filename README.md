# Constellation

*A personal constellation of the people in your life — showing not just who you know, but how close they are, how they're connected to each other, and what you might do next to tend those bonds.*

Constellation is a relationship-tending app built on a celestial network metaphor. It is explicitly **not** a personal CRM: it never scores, rates, ranks, or grades people. The load-bearing principle, applied to every feature: **quantify the action, never the person.**

## Running it

```bash
npm install
npm run dev      # development server
npm run build    # type-check + production build
npm run preview  # serve the production build
```

The app opens with a demo sky (~28 fictional people) so the visualisation is alive immediately. Use **start fresh** in the footer to begin with an empty sky, or **demo sky** to restore the demo.

### Accounts & sync (optional)

Out of the box the app is pure local-first. To host it as a website with sign-in and
end-to-end-encrypted sync across devices, follow **[SETUP.md](SETUP.md)** (free Supabase +
Vercel accounts, ~15 minutes). The sky is encrypted in the browser with a
passphrase-derived key before upload — the server only ever stores ciphertext.

## What's here

- **The constellation** — a force-directed celestial graph (D3 force simulation + canvas) with the two-layer system: concentric **rings of closeness** (dynamic — people move) and **connection threads** (fixed — how people know each other is history). You sit at the centre. Star **brightness/warmth** encodes closeness; star **size** encodes bond strength (never popularity); a soft **nebula tint** hangs behind each context cluster. Transitional rings (2 & 4) shimmer; stable rings (1 & 3) are anchored. Recent ring movement leaves a fading comet trail.
- **Five lenses over one graph** (stars never move between views; emphasis does): Closeness (default), Network ("how we all know each other"), Events, Attention, Sparks.
- **The person page** — tap a star: details, shared history as a story (not a last-contacted timestamp), rituals, things they love, things for next time, in-jokes, green flags, important dates (including the hard anniversaries), dreams & things in motion, their people, gift-idea and repair-note scratchpads, and a small sparkline of their journey through your rings.
- **Feather-light logging** — a moment takes seconds: who, what kind (shared experience / everyday simplicity / sweetness / growth & depth / bridging), how, one optional line. Group moments touch many people at once.
- **Quick notes** — type (or dictate, where the browser supports it) the walk-home note; a transparent local extractor sorts it into structured suggestions and *you approve every item before it lands*. Extraction, not conversation — no chat interface, by design.
- **The effort mirror** — each month is a sky; every act of outreach is a meteor across it, coloured by the kind of moment. The month closes as a savable keepsake. It is a record of your generosity, not a productivity streak: no streaks, no targets, no comparison to last month.
- **Ring movement (hybrid)** — the app notices ("Sofia has drifted toward your inner circle…"), the user decides. One gentle proposal at a time; "leave as is" quiets it for a month.
- **Experiential thresholds** — the closeness model is expressed as observation, never as a quest: *"you've shared plenty of group time, but rarely one-to-one, and you've never really talked about anything hard."*
- **Attention & the Monday kickoff** — three people you might reach out to this week, each with a reason (a hard anniversary approaching, something in motion to ask about, a quiet drift) — never just recency.
- **Events** — both directions: "I have a thing — who'd love it?" (fit + timing + context + combination, each candidate with legible reasons) and "I have people — what's the thing?". Event kinds are distinguished (one-to-one deepens; small gatherings weave; large events keep in touch).
- **Sparks** — the app spots two people who don't know each other but obviously should, says exactly why, and when the introduction lands, a new gold thread appears in your sky — drawn by you.

## Decisions taken on the spec's open questions

| # | Question | Decision |
|---|----------|----------|
| 1 | Ring movement | **Hybrid (c)** — the app proposes with a reason; the user confirms. |
| 2 | Outward drift | **Transitional rings 2 & 4 only.** Rings 1 & 3 never decay — a lifelong friendship survives a busy quarter. Copy is a noticing, never a rebuke. |
| 3 | Finite ring capacity | **Soft, Dunbar-informed** (5 / 10 / 35). Over capacity shows a gentle observation, never a block. |
| 4 | Effort-mirror mechanic | **Monthly meteor shower** closing as a savable seasonal-sky keepsake. |
| 5 | Action taxonomy | The five types from §5.3, mapped to the friendship literature: shared experience, everyday simplicity (co-presence), sweetness, growth/depth (self-disclosure per social penetration theory), bridging (weak-tie brokerage). |
| 6 | Threshold prescriptiveness | **Observation-only.** One italic reflection on the person page; nothing unlockable, no checklists. |
| 7 | Import vs hand-placement | **Hand-placement.** The "new star" flow takes under a minute; sparseness is a feature. |
| 8 | Person↔person edge strength | **Existence only** for now; introduced-by-you is tracked (it's the Sparks payoff). |
| 9 | Overdue weighting per ring | **Cadence-relative**: expected rhythm of ~18/24/50/35 days for rings 1–4 (ring 4 tighter than 3 because transitional momentum matters); outer field has none. Overdue = days since ÷ cadence. |
| 10 | Platform | Web, desktop-first for the big canvas; layout degrades to small screens. Logging flows are tap-sized for mobile use. |

Closeness-model numbers are provisional pending the §9 research synthesis; they live in one file (`src/lib/closeness.ts`) and are trivially tunable.

## Architecture

The five layers from §10.2, in code:

| Layer | Where |
|-------|-------|
| Graph (source of truth) | `src/types.ts`, `src/store/store.tsx` (people, edges, rings) |
| Memory | person `details` + action notes; `src/lib/noteParser.ts` feeds it |
| Signal (computed, always explainable) | `src/lib/closeness.ts` — bond strength, drift proposals, cadence, thresholds |
| Prompt | `src/lib/sparks.ts`, `src/lib/events.ts`, weekly suggestions in `closeness.ts` |
| Render | `src/graph/simulation.ts` + `src/graph/ConstellationCanvas.tsx` |

**The graph** combines a firm radial constraint (distance from centre = ring) with weak link forces (connected people pull together *around* their orbits) and a gentle per-context angular anchor so clusters occupy coherent sectors. Canvas 2D rendering: glow gradients, twinkle, wobble on transitional rings, comet trails, nebulae.

**Privacy is non-negotiable (§10.3).** The app is local-first: all state lives in `localStorage` in the browser; there is no backend, no network call, no telemetry. Grief anniversaries and repair notes never leave the device.

**AI posture (§8.2):** daily capture uses a transparent local extractor with user confirmation. If an LLM is added later it slots behind the same `parseNote` interface (extraction only) and behind the weekly/monthly prompts — the two places the spec allows reasoning. Nothing conversational.

## Principles held (from the spec's appendix)

1. Quantify the action, never the person.
2. The app notices; the user decides.
3. Rings are dynamic. Threads are history.
4. Bond strength, not popularity.
5. No streaks. No guilt. Care is not a KPI.
6. Sparseness is a feature.
7. AI reasons weekly; humans act daily.
8. If it makes a friend feel measured rather than thought about — redesign it.
