// Monitors localStorage and IndexedDB health, provides fallback storage mechanisms
// Prevents silent data loss from quota exceeded and other storage failures

export interface StorageStatus {
  localStorage: {
    available: boolean
    quotaBytes: number
    usedBytes: number
    quotaPercentage: number
    error: string | null
  }
  indexedDB: {
    available: boolean
    error: string | null
  }
}

const DB_NAME = 'constellation-backup'
const BACKUP_STORE = 'sync-queue'

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export class StorageMonitor {
  private static instance: StorageMonitor

  private localStorageErrors: string[] = []
  private statusCallbacks: ((status: StorageStatus) => void)[] = []

  private constructor() {
    this.checkStorageHealth()
  }

  static getInstance(): StorageMonitor {
    if (!StorageMonitor.instance) {
      StorageMonitor.instance = new StorageMonitor()
    }
    return StorageMonitor.instance
  }

  /**
   * Write with fallback: try localStorage, then IndexedDB, with error tracking
   */
  async writeWithFallback(key: string, data: string): Promise<{ success: boolean; error?: string }> {
    // Try localStorage first
    try {
      localStorage.setItem(key, data)
      this.localStorageErrors = []
      return { success: true }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      this.localStorageErrors.push(error)
      console.warn('[Storage] localStorage write failed:', error)

      // Fall back to IndexedDB
      try {
        await this.writeToIndexedDB(key, data)
        console.log('[Storage] Fallback to IndexedDB succeeded')
        return { success: true }
      } catch (idbError) {
        const fallbackError = idbError instanceof Error ? idbError.message : String(idbError)
        console.error('[Storage] Both localStorage and IndexedDB failed:', fallbackError)
        return { success: false, error: fallbackError }
      }
    }
  }

  /**
   * Read with fallback: try localStorage, then IndexedDB
   */
  async readWithFallback(key: string): Promise<string | null> {
    try {
      const data = localStorage.getItem(key)
      if (data) return data
    } catch {
      console.warn('[Storage] localStorage read failed')
    }

    try {
      const data = await this.readFromIndexedDB(key)
      if (data) console.log('[Storage] Recovered from IndexedDB')
      return data
    } catch {
      console.error('[Storage] IndexedDB read also failed')
      return null
    }
  }

  /**
   * Keep a second copy in IndexedDB — separate quota and failure domain from
   * localStorage, so one being cleared or corrupted doesn't take both.
   */
  async mirror(key: string, data: string): Promise<void> {
    try {
      await this.writeToIndexedDB(key, data)
    } catch {
      // localStorage still holds the working copy
    }
  }

  /** Read the IndexedDB copy, used to recover when localStorage comes up empty. */
  async readMirrorCopy(key: string): Promise<string | null> {
    try {
      return await this.readFromIndexedDB(key)
    } catch {
      return null
    }
  }

  /**
   * Get current storage health status
   */
  async getStatus(): Promise<StorageStatus> {
    return {
      localStorage: this.getLocalStorageStatus(),
      indexedDB: await this.getIndexedDBStatus(),
    }
  }

  /**
   * Register callback for storage status changes
   */
  onStatusChange(callback: (status: StorageStatus) => void): () => void {
    this.statusCallbacks.push(callback)
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== callback)
    }
  }

  /**
   * Queue a sync operation for retry if it fails
   */
  async queueSyncOperation(operation: {
    id: string
    timestamp: number
    data: string
    retryCount: number
  }): Promise<void> {
    try {
      const db = await this.openDB()
      const tx = db.transaction(BACKUP_STORE, 'readwrite')
      await promisifyRequest(tx.objectStore(BACKUP_STORE).put(operation))
    } catch (e) {
      console.error('[Storage] Failed to queue sync operation:', e)
    }
  }

  /**
   * Get all queued sync operations waiting to retry
   */
  async getPendingSyncOperations(): Promise<
    Array<{
      id: string
      timestamp: number
      data: string
      retryCount: number
    }>
  > {
    try {
      const db = await this.openDB()
      const tx = db.transaction(BACKUP_STORE, 'readonly')
      const allOps = await promisifyRequest(tx.objectStore(BACKUP_STORE).getAll())
      return allOps as Array<{
        id: string
        timestamp: number
        data: string
        retryCount: number
      }>
    } catch {
      return []
    }
  }

  /**
   * Remove a queued sync operation after successful upload
   */
  async removePendingSyncOperation(id: string): Promise<void> {
    try {
      const db = await this.openDB()
      const tx = db.transaction(BACKUP_STORE, 'readwrite')
      await promisifyRequest(tx.objectStore(BACKUP_STORE).delete(id))
    } catch (e) {
      console.error('[Storage] Failed to remove sync operation:', e)
    }
  }

  // Private methods

  private getLocalStorageStatus() {
    try {
      const testKey = '__storage-test-' + Date.now()
      const testData = 'x'.repeat(1024)

      try {
        localStorage.setItem(testKey, testData)
        localStorage.removeItem(testKey)
      } catch {
        return {
          available: false,
          quotaBytes: 0,
          usedBytes: 0,
          quotaPercentage: 100,
          error: 'localStorage quota exceeded or unavailable',
        }
      }

      // Estimate quota usage
      let total = 0
      try {
        for (const key in localStorage) {
          if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            total += localStorage.getItem(key)?.length ?? 0
          }
        }
      } catch {
        // ignore
      }

      return {
        available: true,
        quotaBytes: 5 * 1024 * 1024, // Typical limit
        usedBytes: total,
        quotaPercentage: Math.round((total / (5 * 1024 * 1024)) * 100),
        error: this.localStorageErrors.length > 0 ? this.localStorageErrors[0] : null,
      }
    } catch (e) {
      return {
        available: false,
        quotaBytes: 0,
        usedBytes: 0,
        quotaPercentage: 0,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  }

  private async getIndexedDBStatus() {
    try {
      await this.openDB()
      return { available: true, error: null }
    } catch (e) {
      return {
        available: false,
        error: e instanceof Error ? e.message : 'IndexedDB unavailable',
      }
    }
  }

  private async checkStorageHealth() {
    const status = await this.getStatus()
    this.statusCallbacks.forEach((cb) => cb(status))

    if (status.localStorage.quotaPercentage > 90) {
      console.warn('[Storage] localStorage quota > 90% ⚠️')
    }
  }

  private async writeToIndexedDB(key: string, data: string): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction('data', 'readwrite')
    await promisifyRequest(tx.objectStore('data').put({ key, value: data, timestamp: Date.now() }))
  }

  private async readFromIndexedDB(key: string): Promise<string | null> {
    const db = await this.openDB()
    const tx = db.transaction('data', 'readonly')
    const result = await promisifyRequest<{ key: string; value: string; timestamp: number } | undefined>(
      tx.objectStore('data').get(key),
    )
    return result?.value ?? null
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(BACKUP_STORE)) {
          db.createObjectStore(BACKUP_STORE, { keyPath: 'id' })
        }
      }
    })
  }
}

export const storageMonitor = StorageMonitor.getInstance()
