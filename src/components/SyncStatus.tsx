import { useSync } from '../sync/SyncContext'

export function SyncStatus() {
  const { status, pendingSync, lastError, retrySync } = useSync()

  if (status === 'disabled' || status === 'signed_out') {
    return null // Not using sync
  }

  const isDarkBackground = status === 'error' || (status === 'offline' && pendingSync)
  const bgColor =
    status === 'error'
      ? '#d32f2f' // red
      : status === 'offline'
        ? '#f57c00' // orange
        : status === 'syncing'
          ? '#1976d2' // blue
          : status === 'synced' && !pendingSync
            ? '#388e3c' // green
            : '#ff9800' // orange for synced but pending

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: bgColor,
        color: isDarkBackground ? 'white' : '#333',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      {status === 'syncing' && <span>⟳ Saving…</span>}
      {status === 'synced' && !pendingSync && <span>✓ Saved</span>}
      {status === 'synced' && pendingSync && <span>● Pending</span>}
      {status === 'error' && (
        <>
          <span>✕ Sync failed</span>
          <button
            onClick={() => retrySync()}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            Retry
          </button>
        </>
      )}
      {status === 'offline' && pendingSync && <span>🌐 Offline - saving locally</span>}
      {lastError && status === 'error' && (
        <div
          title={lastError}
          style={{
            fontSize: '10px',
            opacity: 0.9,
            marginLeft: 'auto',
            cursor: 'help',
          }}
        >
          {lastError.length > 30 ? lastError.substring(0, 30) + '…' : lastError}
        </div>
      )}
    </div>
  )
}
