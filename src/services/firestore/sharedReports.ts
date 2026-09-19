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
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { SharedReport, SharedReportType, SharedReportPayload } from '../../types';
import { encryptReportPayload, decryptReportPayload } from '../../utils/reportCrypto';

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
 * Create a new public shared report link with Zero-Knowledge encryption if passcode is set.
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

  let expiresAt: Timestamp | null = null;
  if (params.expiresInDays && params.expiresInDays > 0) {
    const exp = new Date();
    exp.setDate(exp.getDate() + params.expiresInDays);
    expiresAt = Timestamp.fromDate(exp);
  }

  const cleanPasscode = params.passcode?.trim() || '';
  const hasPasscode = Boolean(cleanPasscode);

  let encryptedData: { encryptedPayload: string; salt: string; iv: string } | null = null;
  if (hasPasscode) {
    encryptedData = await encryptReportPayload(params.payload, cleanPasscode);
  }

  const firestoreData: Record<string, any> = {
    id: token,
    userId: params.userId,
    userName: params.userName,
    reportType: params.reportType,
    title: params.title,
    description: params.description || '',
    hasPasscode,
    expiresAt,
    isRevoked: false,
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (hasPasscode && encryptedData) {
    firestoreData.encryptedPayload = encryptedData.encryptedPayload;
    firestoreData.salt = encryptedData.salt;
    firestoreData.iv = encryptedData.iv;
    // Do NOT store plaintext payload or plaintext passcode in Firestore!
    firestoreData.payload = null;
  } else {
    firestoreData.payload = params.payload;
  }

  await setDoc(docRef, firestoreData);

  // Return the report object in memory for the creator modal UI
  return {
    id: token,
    userId: params.userId,
    userName: params.userName,
    reportType: params.reportType,
    title: params.title,
    description: params.description || '',
    passcode: cleanPasscode || undefined,
    hasPasscode,
    salt: encryptedData?.salt,
    iv: encryptedData?.iv,
    encryptedPayload: encryptedData?.encryptedPayload,
    expiresAt,
    isRevoked: false,
    viewCount: 0,
    payload: params.payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
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
    const data = snap.data() as any;
    if (data.isRevoked) {
      return null;
    }
    // Check expiration if set
    if (data.expiresAt) {
      const expTime = data.expiresAt.toMillis
        ? data.expiresAt.toMillis()
        : typeof data.expiresAt === 'string'
        ? new Date(data.expiresAt).getTime()
        : 0;
      if (expTime > 0 && expTime < Date.now()) {
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
 * Decrypts a protected shared report's payload using the user-provided passcode.
 */
export async function decryptSharedReport(
  report: SharedReport,
  passcode: string
): Promise<SharedReportPayload> {
  if (!report.encryptedPayload || !report.salt || !report.iv) {
    // If it's a legacy report or already plain
    if (report.payload) return report.payload;
    throw new Error('Laporan tidak memiliki data terenkripsi yang valid.');
  }

  return await decryptReportPayload(
    report.encryptedPayload,
    report.salt,
    report.iv,
    passcode
  );
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
