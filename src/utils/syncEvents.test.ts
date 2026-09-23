import { describe, expect, it, vi } from 'vitest';
import {
  emitSyncError,
  emitSyncStart,
  emitSyncSuccess,
  trackSync,
} from './syncEvents';

describe('Sync Events Dispatcher', () => {
  it('dispatches custom event for emitSyncStart', () => {
    const listener = vi.fn();
    window.addEventListener('dadu:sync', listener);

    emitSyncStart('Sedang sinkronisasi...');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({
      type: 'start',
      message: 'Sedang sinkronisasi...',
    });

    window.removeEventListener('dadu:sync', listener);
  });

  it('dispatches custom event for emitSyncSuccess', () => {
    const listener = vi.fn();
    window.addEventListener('dadu:sync', listener);

    emitSyncSuccess('Berhasil!');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({
      type: 'success',
      message: 'Berhasil!',
    });

    window.removeEventListener('dadu:sync', listener);
  });

  it('dispatches custom event for emitSyncError', () => {
    const listener = vi.fn();
    window.addEventListener('dadu:sync', listener);

    emitSyncError('Terjadi error!');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({
      type: 'error',
      message: 'Terjadi error!',
    });

    window.removeEventListener('dadu:sync', listener);
  });

  it('tracks successful promises with start and success events', async () => {
    const events: any[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('dadu:sync', listener);

    const result = await trackSync(Promise.resolve('selesai'), {
      startMessage: 'Mulai...',
      successMessage: 'Selesai!',
    });

    expect(result).toBe('selesai');
    expect(events).toEqual([
      { type: 'start', message: 'Mulai...' },
      { type: 'success', message: 'Selesai!' },
    ]);

    window.removeEventListener('dadu:sync', listener);
  });

  it('tracks failing promises with start and error events and rethrows', async () => {
    const events: any[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('dadu:sync', listener);

    await expect(
      trackSync(Promise.reject(new Error('Network failure')), {
        startMessage: 'Mulai...',
        errorMessage: 'Gagal total',
      })
    ).rejects.toThrow('Network failure');

    expect(events).toEqual([
      { type: 'start', message: 'Mulai...' },
      { type: 'error', message: 'Gagal total' },
    ]);

    window.removeEventListener('dadu:sync', listener);
  });
});
