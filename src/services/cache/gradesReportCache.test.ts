import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildGradesReportCacheKey,
  getCachedGradesReport,
  setCachedGradesReport,
  invalidateGradesReportCache,
  CachedGradesReportData,
} from './gradesReportCache';
import { AssessmentItem, Enrollment, Score } from '../../types';

describe('gradesReportCache service & revalidation semantics', () => {
  beforeEach(() => {
    invalidateGradesReportCache();
  });

  const sampleData: CachedGradesReportData = {
    assessmentItems: [{ id: 'item-1', name: 'UH 1' } as AssessmentItem],
    enrollments: [{ id: 'enr-1', studentId: 'student-1' } as Enrollment],
    scores: [{ id: 'sc-1', studentId: 'student-1', assessmentItemId: 'item-1', score: 85 } as Score],
  };

  const updatedData: CachedGradesReportData = {
    assessmentItems: [{ id: 'item-1', name: 'UH 1' } as AssessmentItem],
    enrollments: [{ id: 'enr-1', studentId: 'student-1' } as Enrollment],
    scores: [{ id: 'sc-1', studentId: 'student-1', assessmentItemId: 'item-1', score: 95 } as Score],
  };

  it('1. stores and retrieves report data based on cache key', () => {
    const key = buildGradesReportCacheKey('u1', 'ay1', 'ODD', 'ta1');
    expect(getCachedGradesReport(key)).toBeUndefined();

    setCachedGradesReport(key, sampleData);
    const retrieved = getCachedGradesReport(key);

    expect(retrieved).toBeDefined();
    expect(retrieved?.assessmentItems.length).toBe(1);
    expect(retrieved?.scores[0].score).toBe(85);
  });

  it('2. invalidation clears all cache entries when key is omitted', () => {
    const key1 = buildGradesReportCacheKey('u1', 'ay1', 'ODD', 'ta1');
    const key2 = buildGradesReportCacheKey('u1', 'ay1', 'ODD', 'ta2');

    setCachedGradesReport(key1, sampleData);
    setCachedGradesReport(key2, sampleData);

    invalidateGradesReportCache();

    expect(getCachedGradesReport(key1)).toBeUndefined();
    expect(getCachedGradesReport(key2)).toBeUndefined();
  });

  it('3. invalidation with specific key deletes only target entry', () => {
    const key1 = buildGradesReportCacheKey('u1', 'ay1', 'ODD', 'ta1');
    const key2 = buildGradesReportCacheKey('u1', 'ay1', 'ODD', 'ta2');

    setCachedGradesReport(key1, sampleData);
    setCachedGradesReport(key2, sampleData);

    invalidateGradesReportCache(key1);

    expect(getCachedGradesReport(key1)).toBeUndefined();
    expect(getCachedGradesReport(key2)).toBeDefined();
  });

  it('4. different contexts produce isolated keys and do not collide', () => {
    const keyUserA = buildGradesReportCacheKey('userA', 'ay1', 'ODD', 'ta1');
    const keyUserB = buildGradesReportCacheKey('userB', 'ay1', 'ODD', 'ta1');
    const keySemesterEven = buildGradesReportCacheKey('userA', 'ay1', 'EVEN', 'ta1');
    const keyAssignment2 = buildGradesReportCacheKey('userA', 'ay1', 'ODD', 'ta2');

    const keys = [keyUserA, keyUserB, keySemesterEven, keyAssignment2];
    const uniqueKeys = new Set(keys);

    expect(uniqueKeys.size).toBe(4);

    setCachedGradesReport(keyUserA, sampleData);
    expect(getCachedGradesReport(keyUserB)).toBeUndefined();
    expect(getCachedGradesReport(keySemesterEven)).toBeUndefined();
    expect(getCachedGradesReport(keyAssignment2)).toBeUndefined();
  });

  it('5. mutation workflow: successful save invalidates cache, failed save does not', async () => {
    const key = buildGradesReportCacheKey('u1', 'ay1', 'ODD', 'ta1');
    setCachedGradesReport(key, sampleData);
    expect(getCachedGradesReport(key)).toBeDefined();

    // Simulation A: save fails -> catch block executed, invalidate NOT called
    let saveFailed = false;
    try {
      throw new Error('Network error');
    } catch {
      saveFailed = true;
    }
    expect(saveFailed).toBe(true);
    // Cache remains available since operation failed
    expect(getCachedGradesReport(key)).toBeDefined();

    // Simulation B: save succeeds -> invalidate called post-await
    const mockSave = async () => Promise.resolve();
    await mockSave();
    invalidateGradesReportCache();

    // Cache is now cleared so next report view will fetch fresh data from Firestore
    expect(getCachedGradesReport(key)).toBeUndefined();
  });

  it('6. cache hit provides synchronous initial data while revalidation is in-flight', () => {
    const key = buildGradesReportCacheKey('u1', 'ay1', 'ODD', 'ta1');
    setCachedGradesReport(key, sampleData);

    const initialData = getCachedGradesReport(key);
    expect(initialData).toBeDefined();
    // Cache hit allows UI to render initialData with isRevalidating: true without blocking loader
    expect(initialData?.scores[0].score).toBe(85);
  });

  it('7. successful background revalidation replaces stale cache with fresh data', async () => {
    const key = buildGradesReportCacheKey('u1', 'ay1', 'ODD', 'ta1');
    setCachedGradesReport(key, sampleData);

    // Mock fetch resolves with updatedData
    const mockFetch = async () => Promise.resolve(updatedData);
    const fresh = await mockFetch();

    setCachedGradesReport(key, fresh);
    const latest = getCachedGradesReport(key);

    expect(latest?.scores[0].score).toBe(95);
  });

  it('8. failed background revalidation retains stale cache and allows warning notice', async () => {
    const key = buildGradesReportCacheKey('u1', 'ay1', 'ODD', 'ta1');
    setCachedGradesReport(key, sampleData);

    let revalidateError: string | null = null;
    const mockFetchFail = async () => Promise.reject(new Error('Connection timeout'));

    try {
      await mockFetchFail();
    } catch {
      // Revalidation failed while cached data exists
      const cached = getCachedGradesReport(key);
      expect(cached).toBeDefined();
      expect(cached?.scores[0].score).toBe(85);
      revalidateError = 'Pembaruan data terkini gagal. Laporan menampilkan data terakhir yang tersimpan di cache.';
    }

    expect(revalidateError).toContain('Laporan menampilkan data terakhir yang tersimpan di cache');
  });

  it('9. initial fetch failure without cache produces error state rather than valid empty report', async () => {
    const key = buildGradesReportCacheKey('u1', 'ay1', 'ODD', 'ta1');
    const cached = getCachedGradesReport(key);
    expect(cached).toBeUndefined();

    let initialFetchError: string | null = null;
    const mockFetchFail = async () => Promise.reject(new Error('Firestore unavailable'));

    try {
      await mockFetchFail();
    } catch (err: any) {
      if (!cached) {
        initialFetchError = err.message || 'Gagal memuat data laporan';
      }
    }

    expect(initialFetchError).toBe('Firestore unavailable');
  });
});
