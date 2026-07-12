// End-to-end encryption for sky sync (§10.3: privacy is non-negotiable).
// The whole app state is encrypted here, in the browser, with a key derived
// from a passphrase only the user knows. The server only ever sees ciphertext:
// it cannot read names, notes, or grief anniversaries — and neither can we.
//
// Scheme: PBKDF2-SHA256 (310k iterations, per-user random salt) → AES-256-GCM
// with a fresh IV per write. GCM's auth tag doubles as wrong-passphrase
// detection: decryption with the wrong key throws rather than returning junk.

export interface EncryptedBlob {
  iv: string // base64
  ciphertext: string // base64
}

const enc = new TextEncoder()
const dec = new TextDecoder()

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const bytes = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}

function encodeUtf8(s: string): Uint8Array<ArrayBuffer> {
  const encoded = enc.encode(s)
  const copy = new Uint8Array(new ArrayBuffer(encoded.length))
  copy.set(encoded)
  return copy
}

export function randomSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)))
}

export async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    encodeUtf8(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations: 310_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so the unlocked key can persist for this tab's session
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJson(value: unknown, key: CryptoKey): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodeUtf8(JSON.stringify(value)),
  )
  return { iv: toB64(iv), ciphertext: toB64(ciphertext) }
}

/** Throws on wrong key / tampered data (AES-GCM authentication failure). */
export async function decryptJson<T>(blob: EncryptedBlob, key: CryptoKey): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(blob.iv) },
    key,
    fromB64(blob.ciphertext),
  )
  return JSON.parse(dec.decode(plain)) as T
}

// The unlocked key survives a reload within this tab (sessionStorage), but a
// fresh session asks for the passphrase again. The raw passphrase is never stored.

const KEY_STORE = 'constellation-sky-key'

export async function stashKey(key: CryptoKey, salt: string, userId: string): Promise<void> {
  const jwk = await crypto.subtle.exportKey('jwk', key)
  sessionStorage.setItem(KEY_STORE, JSON.stringify({ jwk, salt, userId }))
}

export async function restoreKey(
  userId: string,
): Promise<{ key: CryptoKey; salt: string } | null> {
  try {
    const raw = sessionStorage.getItem(KEY_STORE)
    if (!raw) return null
    const { jwk, salt, userId: storedUser } = JSON.parse(raw)
    if (storedUser !== userId) return null
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt',
    ])
    return { key, salt }
  } catch {
    return null
  }
}

export function clearStashedKey(): void {
  sessionStorage.removeItem(KEY_STORE)
}
