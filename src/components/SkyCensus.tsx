import { useMemo, useState } from 'react'
import type { Person } from '../types'
import { uid } from '../types'
import { useStore } from '../store/store'
import { blankPerson } from '../lib/skyBuilder'
import {
  markCensusAnswered,
  remainingCensusPrompts,
  CENSUS_DECK,
  type CensusPrompt,
} from '../lib/census'
import { dateInputToTs, todayInput } from '../lib/dates'
import { Modal } from './ui'

// The sky census: one creative question at a time — about communities, the
// meals and laughter you remember, the people behind them. Each answer becomes
// real structure (stars, threads, moments, details), placed immediately.
// Skippable, resumable, and never a form to complete: the deck simply keeps
// whatever's unanswered for later, surfaced again through the nudges.

function newPerson(name: string, context: string, prompt: CensusPrompt): Person {
  return blankPerson(name, context, prompt.suggestedRing ?? 'outer')
}

export function SkyCensus({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const [deck, setDeck] = useState<CensusPrompt[]>(() => {
    const remaining = remainingCensusPrompts()
    return remaining.length > 0 ? remaining : CENSUS_DECK
  })
  const [idx, setIdx] = useState(0)
  const [answeredNow, setAnsweredNow] = useState(0)
  const [justPlaced, setJustPlaced] = useState<string | null>(null)

  // Per-card answer state, reset when the card changes.
  const [chosenIds, setChosenIds] = useState<string[]>([])
  const [newNames, setNewNames] = useState<string[]>([])
  const [nameDraft, setNameDraft] = useState('')
  const [groupName, setGroupName] = useState('')
  const [text, setText] = useState('')
  const [when, setWhen] = useState(todayInput())
  const [mmdd, setMmdd] = useState('')

  const sortedPeople = useMemo(
    () => state.people.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [state.people],
  )

  if (deck.length === 0) {
    return (
      <Modal title="The sky census" onClose={onClose} wide>
        <h4>✦ That's the whole deck — for now</h4>
        <p className="hint">
          Every answer became something real in your sky. From here, the sky grows in flow:
          log moments as they happen, jot quick notes on the walk home, and open a star
          whenever something about them comes to mind.
        </p>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Back to the sky
          </button>
        </div>
      </Modal>
    )
  }

  const prompt = deck[idx % deck.length]
  const singlePerson = prompt.kind === 'detail' || prompt.kind === 'date'

  const resetCard = () => {
    setChosenIds([])
    setNewNames([])
    setNameDraft('')
    setGroupName('')
    setText('')
    setWhen(todayInput())
    setMmdd('')
  }

  const advance = (removeCurrent: boolean) => {
    setJustPlaced(null)
    resetCard()
    if (removeCurrent) {
      const next = deck.filter((p) => p.id !== prompt.id)
      setDeck(next)
      if (next.length === 0) return
      setIdx((cur) => cur % next.length)
    } else {
      setIdx((cur) => (cur + 1) % deck.length)
    }
  }

  const toggleChosen = (id: string) => {
    setChosenIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id)
      if (singlePerson) return [id]
      return [...cur, id]
    })
    if (singlePerson) setNewNames([])
  }

  const addNewName = () => {
    const name = nameDraft.trim()
    if (!name) return
    // If they typed someone already in the sky, select the star instead.
    const existing = state.people.find((p) => p.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!chosenIds.includes(existing.id)) toggleChosen(existing.id)
    } else if (singlePerson) {
      setNewNames([name])
      setChosenIds([])
    } else if (!newNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setNewNames((cur) => [...cur, name])
    }
    setNameDraft('')
  }

  const totalChosen = chosenIds.length + newNames.length
  const canPlace =
    totalChosen > 0 &&
    (prompt.kind !== 'detail' || text.trim().length > 0) &&
    (prompt.kind !== 'date' || /^\d{2}-\d{2}$/.test(mmdd)) &&
    (!prompt.askGroup || groupName.trim().length > 0)

  const place = () => {
    const context = groupName.trim() || prompt.presetContext || ''
    const created = newNames.map((n) => newPerson(n, context, prompt))
    const allIds = [...chosenIds, ...created.map((p) => p.id)]

    if (prompt.kind === 'people') {
      // A named group knows each other — thread the whole circle.
      const edges =
        prompt.askGroup && groupName.trim()
          ? allIds.flatMap((a, i) =>
              allIds.slice(i + 1).map((b) => ({
                a,
                b,
                context: groupName.trim(),
                introducedByUser: false,
              })),
            )
          : []
      dispatch({ type: 'add_people', people: created, edges })
    } else if (prompt.kind === 'moment') {
      if (created.length > 0) dispatch({ type: 'add_people', people: created, edges: [] })
      dispatch({
        type: 'log_action',
        action: {
          id: uid(),
          type: prompt.actionType ?? 'shared_experience',
          modality: 'in_person',
          participants: allIds,
          timestamp: when === todayInput() ? Date.now() : dateInputToTs(when),
          note: text.trim(),
        },
      })
    } else {
      // detail / date — exactly one person, existing or newly named.
      const field = prompt.field
      const value = text.trim()
      if (created.length > 0) {
        const p = created[0]
        if (prompt.kind === 'date') {
          p.details.dates.push({ id: uid(), label: 'Birthday', date: mmdd })
        } else if (field) {
          p.details[field] = [value]
        }
        dispatch({ type: 'add_people', people: created, edges: [] })
      } else {
        const p = state.people.find((x) => x.id === chosenIds[0])
        if (!p) return
        const details = { ...p.details }
        if (prompt.kind === 'date') {
          details.dates = [...details.dates, { id: uid(), label: 'Birthday', date: mmdd }]
        } else if (field) {
          details[field] = [...details[field], value]
        }
        dispatch({ type: 'update_person', person: { ...p, details } })
      }
    }

    markCensusAnswered(prompt.id)
    setAnsweredNow((n) => n + 1)
    setJustPlaced(
      prompt.kind === 'moment'
        ? '✦ Placed — the memory is a moment in your sky now.'
        : prompt.kind === 'people'
          ? `✦ Placed — ${totalChosen} star${totalChosen === 1 ? '' : 's'} touched.`
          : '✦ Placed on their page.',
    )
  }

  return (
    <Modal title="The sky census" onClose={onClose} wide>
      {justPlaced ? (
        <>
          <p className="census-placed">{justPlaced}</p>
          <div className="modal-footer">
            <button className="btn ghost" onClick={onClose}>
              That's enough for now
            </button>
            <button className="btn" onClick={() => advance(true)} autoFocus>
              {deck.length > 1 ? 'Another question' : 'Finish the deck'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="census-count muted small">
            {deck.length} question{deck.length === 1 ? '' : 's'} left in the deck
            {answeredNow > 0 ? ` · ${answeredNow} answered tonight` : ''} — answer any, skip
            any. It'll wait.
          </p>
          <h3 className="census-question">{prompt.question}</h3>
          <p className="hint">{prompt.hint}</p>

          {prompt.askGroup && (
            <>
              <h4>What do you call this group?</h4>
              <input
                className="wide"
                placeholder="e.g. The Tuesday climbing crew"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </>
          )}

          <h4>{singlePerson ? 'Who?' : 'Who are they?'}</h4>
          {sortedPeople.length > 0 && (
            <div className="chip-row">
              {sortedPeople.map((p) => (
                <button
                  key={p.id}
                  className={`chip ${chosenIds.includes(p.id) ? 'chip-on' : ''}`}
                  onClick={() => toggleChosen(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {newNames.length > 0 && (
            <div className="chip-row">
              {newNames.map((n) => (
                <button
                  key={n}
                  className="chip chip-new"
                  title="New star — click to remove"
                  onClick={() => setNewNames((cur) => cur.filter((x) => x !== n))}
                >
                  ✦ {n} ×
                </button>
              ))}
            </div>
          )}
          <div className="add-row">
            <input
              placeholder={
                sortedPeople.length > 0 ? 'Someone not in the sky yet? Type their name…' : 'Type a name…'
              }
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewName()}
            />
            <button className="btn small" onClick={addNewName} disabled={!nameDraft.trim()}>
              Add
            </button>
          </div>
          {newNames.length > 0 && (
            <p className="hint">
              {prompt.suggestedRing === 1
                ? 'New names here land in your innermost ring — that\'s what "call first" means.'
                : 'New names land in the outer field — draw them inward any time, from their page.'}
            </p>
          )}

          {prompt.kind === 'moment' && (
            <>
              <h4>{prompt.noteLabel ?? 'One line for the story'}</h4>
              <input
                className="wide"
                placeholder="A line is plenty"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <h4>Roughly when?</h4>
              <input
                type="date"
                value={when}
                max={todayInput()}
                onChange={(e) => setWhen(e.target.value)}
              />
            </>
          )}

          {prompt.kind === 'detail' && (
            <>
              <h4>{prompt.detailLabel}</h4>
              <input
                className="wide"
                placeholder="A few words is enough"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          )}

          {prompt.kind === 'date' && (
            <>
              <h4>{prompt.detailLabel}</h4>
              <input
                placeholder="MM-DD"
                style={{ maxWidth: '6rem' }}
                value={mmdd}
                onChange={(e) => setMmdd(e.target.value)}
              />
            </>
          )}

          <div className="modal-footer">
            <button className="btn ghost" onClick={() => advance(false)}>
              Skip — another question
            </button>
            <button className="btn" onClick={place} disabled={!canPlace}>
              Place it in the sky
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
