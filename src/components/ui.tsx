import { useState, type ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function EditableList({
  label,
  hint,
  items,
  onChange,
  placeholder,
}: {
  label: string
  hint?: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v) return
    onChange([...items, v])
    setDraft('')
  }
  return (
    <div className="editable-list">
      <h4>{label}</h4>
      {hint && items.length === 0 && <p className="hint">{hint}</p>}
      <ul>
        {items.map((item, i) => (
          <li key={i}>
            <span>{item}</span>
            <button
              className="icon-btn subtle"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="add-row">
        <input
          value={draft}
          placeholder={placeholder ?? 'Add…'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn small" onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </div>
  )
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function fmtDateFull(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
