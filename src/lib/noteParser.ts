// Feather-light note capture (§8.2a): parse a quick note — typed or dictated —
// into structured suggestions for a person's page. Extraction, not conversation:
// no chat, no follow-up questions. The app proposes; the user confirms each item.
//
// This is deliberately a transparent local heuristic. If an LLM is wired in later
// it slots in behind the same interface (parseNote → suggestions), still
// extraction-only per the spec.

export interface ExtractedDetail {
  field: 'loves' | 'dreams' | 'toDiscuss' | 'theirPeople' | 'giftIdeas'
  fieldLabel: string
  text: string
}

const FIELD_LABELS: Record<ExtractedDetail['field'], string> = {
  loves: 'Things they love',
  dreams: 'In motion',
  toDiscuss: 'For next time',
  theirPeople: 'Their people',
  giftIdeas: 'Gift ideas',
}

function detail(field: ExtractedDetail['field'], text: string): ExtractedDetail {
  return { field, fieldLabel: FIELD_LABELS[field], text: text.trim() }
}

export function parseNote(note: string): ExtractedDetail[] {
  const out: ExtractedDetail[] = []
  const segments = note
    .split(/[,;.]|\band\b(?=\s+(?:he|she|they|his|her|their|remember|ask|follow)\b)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)

  for (const seg of segments) {
    const lower = seg.toLowerCase()

    if (/\b(stressed|worried|anxious|nervous) about\b/.test(lower)) {
      out.push(detail('dreams', seg))
      out.push(detail('toDiscuss', `Check in: ${seg}`))
      continue
    }
    if (/\b(ask|remember to|follow up|next time)\b/.test(lower)) {
      out.push(detail('toDiscuss', seg))
      continue
    }
    if (/\b(hoping|hopes|dream(s|ing)? of|working (on|toward)|applying|interview|training for)\b/.test(lower)) {
      out.push(detail('dreams', seg))
      continue
    }
    if (/\b(loves?|into|obsessed with|big fan of|favourite|favorite)\b/.test(lower)) {
      out.push(detail('loves', seg.replace(/^.*?\b(loves?|into|obsessed with|big fan of)\b/i, '').trim() || seg))
      continue
    }
    if (/\b(sister|brother|mum|mom|dad|father|mother|partner|wife|husband|daughter|son|kids?|baby)\b/.test(lower)) {
      out.push(detail('theirPeople', seg))
      if (/\b(visiting|coming|arriv)/.test(lower)) out.push(detail('toDiscuss', `Ask about: ${seg}`))
      continue
    }
    if (/\b(wants?|mentioned wanting|would love)\b/.test(lower)) {
      out.push(detail('giftIdeas', seg))
      continue
    }
  }

  // Nothing matched a pattern — offer the whole note as a "for next time".
  if (out.length === 0 && note.trim().length > 0) {
    out.push(detail('toDiscuss', note.trim()))
  }
  // Dedupe by field+text
  const seen = new Set<string>()
  return out.filter((d) => {
    const k = `${d.field}:${d.text.toLowerCase()}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
