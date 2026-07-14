import { useMemo, useRef, useState } from 'react'
import type { Ring } from '../types'
import { RING_NAMES } from '../types'
import { useStore } from '../store/store'
import {
  buildBatch,
  contactPickerAvailable,
  markDuplicates,
  parseBrainDump,
  parseVcf,
  pickContacts,
  stageCircle,
  type StagedPerson,
} from '../lib/skyBuilder'
import { remainingCensusPrompts } from '../lib/census'
import { Modal } from './ui'

// The setup journey (§8.3, revisited): three light steps to take the sting out
// of an empty sky — bring in names from the device, brain-dump the rest, then
// review and place everything at once. Every step is skippable, nothing lands
// without review, and imports default to the outer field: being in an address
// book is context, not closeness. The census picks up from here for warmth.

type Step = 'contacts' | 'braindump' | 'review' | 'done'

const RING_CHOICES: Ring[] = ['outer', 4, 3, 2, 1]

export function SetupJourney({
  onClose,
  onOpenCensus,
}: {
  onClose: () => void
  onOpenCensus: () => void
}) {
  const { state, dispatch } = useStore()
  const [step, setStep] = useState<Step>('contacts')
  const [stagedList, setStagedList] = useState<StagedPerson[]>([])
  const [dump, setDump] = useState('')
  const [threadOn, setThreadOn] = useState<Set<string>>(new Set())
  const [placedCount, setPlacedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // Placing your own stars over the demo sky makes no sense — the demo is
  // cleared on commit, so duplicates are only checked against a real sky.
  const isDemo = state.people.some((p) => p.id === 'amara')
  const existing = isDemo ? [] : state.people

  const addStaged = (items: StagedPerson[]) => {
    if (items.length === 0) return
    setStagedList((cur) => markDuplicates([...cur, ...items], existing))
  }

  const fromPicker = async () => addStaged(await pickContacts())

  const fromFile = async (file: File | undefined) => {
    if (!file) return
    addStaged(parseVcf(await file.text()))
    if (fileRef.current) fileRef.current.value = ''
  }

  const parseDump = () => {
    addStaged(parseBrainDump(dump))
    setDump('')
  }

  // Circles: one context, many people — staged together and pre-threaded,
  // because a circle knowing each other is what makes it a circle.
  const [circleName, setCircleName] = useState('')
  const [circleNames, setCircleNames] = useState('')
  const [addedCircles, setAddedCircles] = useState<Array<{ name: string; count: number }>>([])
  const circleReady = circleName.trim() !== '' && circleNames.trim() !== ''

  const addCircle = () => {
    if (!circleReady) return
    const items = stageCircle(circleName, circleNames)
    if (items.length === 0) return
    addStaged(items)
    setThreadOn((cur) => new Set([...cur, circleName.trim()]))
    setAddedCircles((cur) => [...cur, { name: circleName.trim(), count: items.length }])
    setCircleName('')
    setCircleNames('')
  }

  const included = stagedList.filter((s) => s.include && s.name.trim())

  const contextsInBatch = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of included) {
      const c = s.context.trim()
      if (!c) continue
      const inBatch = counts.get(c) ?? 0
      counts.set(c, inBatch + 1)
    }
    // A group is threadable when it wires at least one pair together —
    // two newcomers, or one newcomer joining people already in that context.
    return [...counts.entries()]
      .filter(([c, n]) => n >= 2 || (n >= 1 && existing.some((p) => p.contexts.includes(c))))
      .map(([c]) => c)
      .sort()
  }, [included, existing])

  const existingContexts = useMemo(
    () => [...new Set(existing.flatMap((p) => p.contexts))].sort(),
    [existing],
  )

  const updateRow = (key: string, patch: Partial<StagedPerson>) =>
    setStagedList((cur) => cur.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  const placeAll = () => {
    const threads = new Set([...threadOn].filter((c) => contextsInBatch.includes(c)))
    const { people, edges } = buildBatch(stagedList, existing, threads)
    if (people.length === 0) return
    if (isDemo) dispatch({ type: 'clear_all' })
    dispatch({ type: 'add_people', people, edges })
    setPlacedCount(people.length)
    setStep('done')
  }

  const stepIndex = { contacts: 0, braindump: 1, review: 2, done: 3 }[step]

  return (
    <Modal title="Populate your sky" onClose={onClose} wide>
      <div className="tour-progress setup-progress" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`tour-dot ${i === stepIndex ? 'tour-dot-on' : ''}`} />
        ))}
      </div>

      {step === 'contacts' && (
        <>
          <h4>Start with names from your device — if you like</h4>
          <p className="hint">
            Only names (and birthdays, from a contacts file) are read, right here in your
            browser. Nothing is uploaded anywhere, and you choose exactly who comes in —
            everything is reviewed before a single star is placed.
          </p>
          <div className="setup-sources">
            {contactPickerAvailable() ? (
              <button className="btn" onClick={fromPicker}>
                Choose from your contacts
              </button>
            ) : (
              <p className="hint">
                This browser can't open the contact picker directly — export a contacts file
                (.vcf) from Google Contacts or Apple Contacts and drop it in below.
              </p>
            )}
            <label className="btn ghost file-btn">
              Import a contacts file (.vcf)
              <input
                ref={fileRef}
                type="file"
                accept=".vcf,text/vcard,text/x-vcard"
                onChange={(e) => fromFile(e.target.files?.[0])}
              />
            </label>
          </div>
          {stagedList.length > 0 && (
            <p className="setup-count">
              ✦ {stagedList.length} name{stagedList.length === 1 ? '' : 's'} waiting — you'll
              review them all before anything lands.
            </p>
          )}
          <div className="modal-footer">
            <button className="btn ghost" onClick={() => setStep('braindump')}>
              Skip this step
            </button>
            <button className="btn" onClick={() => setStep('braindump')}>
              Next
            </button>
          </div>
        </>
      )}

      {step === 'braindump' && (
        <>
          <div className="dump-section">
            <h4>Whole circles at once</h4>
            <p className="hint">
              Name a context — the job, the club, the group chat — then everyone you met
              there. They all get that context, and since a circle knows each other, the
              threads between them come pre-drawn (you can untick that at review).
            </p>
            <input
              className="wide"
              placeholder="The circle — e.g. The Tuesday climbing crew"
              value={circleName}
              list="setup-contexts-dump"
              onChange={(e) => setCircleName(e.target.value)}
            />
            <datalist id="setup-contexts-dump">
              {existingContexts.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <textarea
              className="wide"
              rows={2}
              placeholder="Everyone you met there — Rosa, Idris, Femi, June…"
              value={circleNames}
              onChange={(e) => setCircleNames(e.target.value)}
            />
            <div className="circle-add-row">
              <button className="btn small" onClick={addCircle} disabled={!circleReady}>
                Add this circle
              </button>
              {addedCircles.length > 0 && (
                <span className="circle-chips">
                  {addedCircles.map((c, i) => (
                    <span key={i} className="chip-static">
                      {c.name} · {c.count}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </div>

          <div className="dump-section">
            <h4>One person at a time</h4>
            <p className="hint">
              One per line, as roughly as you like. A dash adds detail: context first, then
              anything the sky should know — <em>ring words</em> ("ride or die", "good
              friend", "promising"), <em>loves …</em>, <em>birthday MM-DD</em>. It's sorted
              transparently — no AI, and you review every line.
            </p>
            <textarea
              className="wide braindump"
              rows={6}
              autoFocus
              placeholder={
                'Sofia — work, close, loves ceramics\nMarco & Dena — the supper club\nPriya — university, ride or die, birthday 06-21\nBen'
              }
              value={dump}
              onChange={(e) => setDump(e.target.value)}
            />
          </div>

          {stagedList.length > 0 && (
            <p className="setup-count">
              ✦ {stagedList.length} name{stagedList.length === 1 ? '' : 's'} waiting for review.
            </p>
          )}
          <div className="modal-footer">
            <button className="btn ghost" onClick={() => setStep('contacts')}>
              Back
            </button>
            <button className="btn ghost" onClick={parseDump} disabled={!dump.trim()}>
              Add these lines
            </button>
            <button
              className="btn"
              onClick={() => {
                if (circleReady) addCircle()
                if (dump.trim()) parseDump()
                setStep('review')
              }}
            >
              Review the pile
            </button>
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          {stagedList.length === 0 ? (
            <>
              <p className="hint">
                Nothing staged yet — pick some contacts or brain-dump a few names first. Or
                close this and place stars one at a time with <strong>New star</strong>; the
                sky is happy to grow slowly.
              </p>
              <div className="modal-footer">
                <button className="btn ghost" onClick={() => setStep('contacts')}>
                  Back to contacts
                </button>
                <button className="btn" onClick={() => setStep('braindump')}>
                  Back to the brain dump
                </button>
              </div>
            </>
          ) : (
            <>
              <h4>Review before anything lands</h4>
              <p className="hint">
                Untick anyone who doesn't belong. New stars land in the outer field unless you
                say otherwise — you can always draw people inward later, from their page.
              </p>
              {isDemo && (
                <p className="setup-warn">
                  You're currently on the demo sky — placing your own stars clears the demo
                  first.
                </p>
              )}
              <ul className="stage-list">
                {stagedList.map((s) => (
                  <li key={s.key} className={s.include ? '' : 'stage-off'}>
                    <input
                      type="checkbox"
                      checked={s.include}
                      aria-label={`Include ${s.name}`}
                      onChange={(e) => updateRow(s.key, { include: e.target.checked })}
                    />
                    <input
                      className="stage-name"
                      value={s.name}
                      aria-label="Name"
                      onChange={(e) => updateRow(s.key, { name: e.target.value })}
                    />
                    <input
                      className="stage-context"
                      placeholder="Context — work, the club…"
                      value={s.context}
                      list="setup-contexts"
                      aria-label={`Context for ${s.name}`}
                      onChange={(e) => updateRow(s.key, { context: e.target.value })}
                    />
                    <select
                      className="ring-select"
                      value={String(s.ring)}
                      aria-label={`Ring for ${s.name}`}
                      onChange={(e) =>
                        updateRow(s.key, {
                          ring: (e.target.value === 'outer'
                            ? 'outer'
                            : Number(e.target.value)) as Ring,
                        })
                      }
                    >
                      {RING_CHOICES.map((r) => (
                        <option key={String(r)} value={String(r)}>
                          {RING_NAMES[String(r)]}
                        </option>
                      ))}
                    </select>
                    <span className="stage-tags">
                      {s.birthday && <span className="muted small">🎂 {s.birthday}</span>}
                      {s.duplicateOf && (
                        <span className="stage-dupe small">already in your sky</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <datalist id="setup-contexts">
                {[...new Set([...existingContexts, ...contextsInBatch])].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              {contextsInBatch.length > 0 && (
                <>
                  <h4>Do these groups know each other?</h4>
                  <p className="hint">
                    Ticking a group draws the threads between everyone in it — threads are
                    history, so only tick where it's true.
                  </p>
                  <div className="chip-row">
                    {contextsInBatch.map((c) => (
                      <button
                        key={c}
                        className={`chip ${threadOn.has(c) ? 'chip-on' : ''}`}
                        onClick={() =>
                          setThreadOn((cur) => {
                            const next = new Set(cur)
                            if (next.has(c)) next.delete(c)
                            else next.add(c)
                            return next
                          })
                        }
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="modal-footer">
                <button className="btn ghost" onClick={() => setStep('braindump')}>
                  Back
                </button>
                <button className="btn" onClick={placeAll} disabled={included.length === 0}>
                  Place {included.length} star{included.length === 1 ? '' : 's'} in the sky
                </button>
              </div>
            </>
          )}
        </>
      )}

      {step === 'done' && (
        <>
          <h4>
            ✦ {placedCount} star{placedCount === 1 ? '' : 's'} placed
          </h4>
          <p className="hint">
            The names are in the sky. What makes them <em>stars</em> is the texture — the
            memories, the obsessions, the birthdays. The <strong>sky census</strong> asks one
            small question at a time: about your communities, a meal you'll never forget, who
            made you laugh. Answer as many or as few as you like — it stays available in the
            corner suggestions, and everything can also be added in flow, whenever it comes to
            mind.
          </p>
          {remainingCensusPrompts().length > 0 && (
            <button
              className="btn"
              onClick={() => {
                onClose()
                onOpenCensus()
              }}
            >
              Try the sky census
            </button>
          )}{' '}
          <button className="btn ghost" onClick={onClose}>
            I'm done for now
          </button>
        </>
      )}
    </Modal>
  )
}
