/**
 * DADU Sync Events Dispatcher
 * Provides unified real-time feedback to the cloud sync indicator in the header
 */

export type SyncEventType = 'start' | 'success' | 'error';

export interface SyncEventDetail {
  type: SyncEventType;
  message?: string;
}

export function emitSyncStart(message: string = 'Menyimpan perubahan ke cloud...'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<SyncEventDetail>('dadu:sync', {
      detail: { type: 'start', message }
    }));
  }
}

export function emitSyncSuccess(message: string = 'Perubahan berhasil tersimpan!'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<SyncEventDetail>('dadu:sync', {
      detail: { type: 'success', message }
    }));
  }
}

export function emitSyncError(message: string = 'Gagal menyimpan ke cloud'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<SyncEventDetail>('dadu:sync', {
      detail: { type: 'error', message }
    }));
  }
}

export async function trackSync<T>(
  promise: Promise<T>,
  options?: { startMessage?: string; successMessage?: string; errorMessage?: string }
): Promise<T> {
  emitSyncStart(options?.startMessage);
  try {
    const result = await promise;
    emitSyncSuccess(options?.successMessage);
    return result;
  } catch (error) {
    emitSyncError(options?.errorMessage);
    throw error;
  }
}
