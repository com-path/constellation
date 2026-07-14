import { useState } from 'react'
import { useSync } from '../sync/SyncContext'
import { Modal } from './ui'

// Account & sky sync. The tone matters here as much as anywhere: this is
// where we promise — truthfully — that the server can't read their sky.

export function AccountPanel({ onClose }: { onClose: () => void }) {
  const sync = useSync()
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [code, setCode] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const creating = sync.hasCloudSky === false

  const submitEmail = async () => {
    setBusy(true)
    setError(null)
    try {
      await sync.sendMagicLink(email.trim())
      setLinkSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async () => {
    setBusy(true)
    setError(null)
    try {
      await sync.verifyCode(email.trim(), code)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const submitPassphrase = async () => {
    if (creating && passphrase !== confirm) {
      setError("The two passphrases don't match.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await sync.unlock(passphrase)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Your sky, everywhere" onClose={onClose}>
      {sync.status === 'disabled' && (
        <p className="hint">
          Sync isn't configured for this deployment — the app is running purely on this
          device, which is a perfectly good way to use it. See SETUP.md in the repository to
          enable accounts.
        </p>
      )}

      {sync.status === 'signed_out' &&
        (linkSent ? (
          <>
            <p className="panel-lede">
              Check your email. The sign-in link brings you straight back here — but if the
              link opens somewhere else (phone email apps love doing that), type the 6-digit
              code from the same email below instead. That signs in <em>this</em> browser.
            </p>
            <div className="add-row">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={code}
                autoFocus
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && code.trim().length >= 6 && submitCode()}
              />
              <button
                className="btn small"
                onClick={submitCode}
                disabled={busy || code.trim().length < 6}
              >
                {busy ? 'Checking…' : 'Sign in with code'}
              </button>
            </div>
            <p className="hint">
              No code in the email? Your Supabase email template may only include the link —
              SETUP.md shows the one-line template change that adds the code.
            </p>
          </>
        ) : (
          <>
            <p className="panel-lede">
              Sign in to keep your sky across devices. Everything is encrypted on this device
              before it leaves — the server (and we) only ever see ciphertext.
            </p>
            <input
              className="wide"
              type="email"
              placeholder="you@example.com"
              value={email}
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && submitEmail()}
            />
            <div className="modal-footer">
              <button className="btn" onClick={submitEmail} disabled={busy || !email.includes('@')}>
                {busy ? 'Sending…' : 'Send me a sign-in link'}
              </button>
            </div>
          </>
        ))}

      {sync.status === 'locked' && sync.hasCloudSky === null && (
        <p className="hint">Checking for your sky…</p>
      )}

      {sync.status === 'locked' && sync.hasCloudSky !== null && (
        <>
          {creating ? (
            <>
              <p className="panel-lede">
                Choose a passphrase. It encrypts your whole sky on this device before
                anything is uploaded.
              </p>
              <p className="observation">
                There is no reset and no recovery — not because we're strict, but because we
                genuinely cannot read your data without it. Pick something long you'll
                remember, and keep it safe.
              </p>
            </>
          ) : (
            <p className="panel-lede">
              Welcome back, {sync.email}. Enter your passphrase to unlock your sky on this
              device.
            </p>
          )}
          <input
            className="wide"
            type="password"
            placeholder={creating ? 'A long passphrase you’ll remember' : 'Your passphrase'}
            value={passphrase}
            autoFocus
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' && !creating && passphrase.length > 0 && submitPassphrase()
            }
          />
          {creating && (
            <input
              className="wide"
              type="password"
              placeholder="Once more, to be sure"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && passphrase.length >= 8 && submitPassphrase()}
            />
          )}
          <div className="modal-footer">
            <button className="btn ghost" onClick={() => sync.signOut()} disabled={busy}>
              Sign out
            </button>
            <button
              className="btn"
              onClick={submitPassphrase}
              disabled={busy || passphrase.length < (creating ? 8 : 1)}
            >
              {busy ? 'Working…' : creating ? 'Encrypt & start syncing' : 'Unlock'}
            </button>
          </div>
          {creating && passphrase.length > 0 && passphrase.length < 8 && (
            <p className="hint">At least 8 characters — longer is better.</p>
          )}
        </>
      )}

      {(sync.status === 'synced' || sync.status === 'syncing' || sync.status === 'error') && (
        <>
          <p className="panel-lede">
            Signed in as <strong>{sync.email}</strong>.{' '}
            {sync.status === 'syncing'
              ? 'Syncing…'
              : sync.status === 'synced'
                ? 'Your sky is up to date, end-to-end encrypted.'
                : 'Sync hit a problem — nothing is uploading or downloading right now. Your sky is safe on this device; retry below.'}
          </p>
          {sync.status === 'error' && sync.lastError && (
            <p className="sync-error">Details: {sync.lastError}</p>
          )}
          <p className="hint">
            The passphrase is asked for once per browser session. Signing out keeps a copy of
            your sky on this device.
          </p>
          <div className="modal-footer">
            <button
              className="btn ghost"
              onClick={async () => {
                await sync.signOut()
                onClose()
              }}
            >
              Sign out
            </button>
            {sync.status === 'error' && (
              <button className="btn" onClick={() => sync.retry()}>
                Retry now
              </button>
            )}
          </div>
        </>
      )}

      {error && <p className="sync-error">{error}</p>}
    </Modal>
  )
}

export function SyncStatusButton({ onClick }: { onClick: () => void }) {
  const sync = useSync()
  if (sync.status === 'disabled') return null
  const label =
    sync.status === 'signed_out'
      ? '☁ sign in to sync'
      : sync.status === 'locked'
        ? '☁ locked — enter passphrase'
        : sync.status === 'syncing'
          ? '☁ syncing…'
          : sync.status === 'error'
            ? '☁ sync issue'
            : '☁ synced'
  return (
    <button className="link small" onClick={onClick}>
      {label}
    </button>
  )
}
