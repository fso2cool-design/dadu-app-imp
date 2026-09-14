import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { SharedReport, SharedReportType, SharedReportPayload } from '../../types';

const SHARED_REPORTS_COL = 'sharedReports';

/**
 * Generate a friendly, secure random alphanumeric token (8 chars)
 * e.g. "x8k2m9ap"
 */
export function generateShareToken(length = 8): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Create a new public shared report link
 */
export async function createSharedReport(params: {
  userId: string;
  userName: string;
  reportType: SharedReportType;
  title: string;
  description?: string;
  passcode?: string;
  expiresInDays?: number; // e.g. 7, 30, or null (forever)
  payload: SharedReportPayload;
}): Promise<SharedReport> {
  const token = generateShareToken(8);
  const docRef = doc(db, SHARED_REPORTS_COL, token);

  let expiresAt: any = null;
  if (params.expiresInDays && params.expiresInDays > 0) {
    const exp = new Date();
    exp.setDate(exp.getDate() + params.expiresInDays);
    expiresAt = exp.toISOString();
  }

  const newReport: SharedReport = {
    id: token,
    userId: params.userId,
    userName: params.userName,
    reportType: params.reportType,
    title: params.title,
    description: params.description || '',
    passcode: params.passcode?.trim() || '',
    expiresAt: expiresAt,
    isRevoked: false,
    viewCount: 0,
    payload: params.payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newReport);
  return newReport;
}

/**
 * Fetch a shared report by token (Read-only for public access)
 */
export async function getSharedReportByToken(token: string): Promise<SharedReport | null> {
  try {
    const docRef = doc(db, SHARED_REPORTS_COL, token);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as SharedReport;
    if (data.isRevoked) {
      return null;
    }
    // Check expiration if set
    if (data.expiresAt) {
      const expDate = new Date(data.expiresAt);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        return null; // Expired
      }
    }
    return { ...data, id: snap.id };
  } catch (err) {
    console.error('Error fetching public shared report:', err);
    return null;
  }
}

/**
 * Record a view count increment on the shared report
 */
export async function incrementReportViewCount(token: string): Promise<void> {
  try {
    const docRef = doc(db, SHARED_REPORTS_COL, token);
    await updateDoc(docRef, {
      viewCount: increment(1),
      lastViewedAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-fatal, just log
    console.warn('Could not increment view count:', err);
  }
}

/**
 * Get all shared reports created by a specific user (to manage or revoke)
 */
export async function getUserSharedReports(userId: string): Promise<SharedReport[]> {
  try {
    const q = query(
      collection(db, SHARED_REPORTS_COL),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const list: SharedReport[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as SharedReport);
    });
    // Sort descending by creation date
    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis?.() || (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
    return list;
  } catch (err) {
    console.error('Error fetching user shared reports:', err);
    return [];
  }
}

/**
 * Revoke or permanently disable a shared report link
 */
export async function revokeSharedReport(token: string): Promise<void> {
  const docRef = doc(db, SHARED_REPORTS_COL, token);
  await updateDoc(docRef, {
    isRevoked: true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a shared report completely
 */
export async function deleteSharedReport(token: string): Promise<void> {
  const docRef = doc(db, SHARED_REPORTS_COL, token);
  await deleteDoc(docRef);
}
