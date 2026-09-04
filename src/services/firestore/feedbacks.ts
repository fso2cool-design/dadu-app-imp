import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  getCountFromServer, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FeedbackItem, FeedbackStatus, FeedbackType } from '../../types';

const FEEDBACKS_COL = 'feedbacks';

/**
 * Submit feedback from a user (Bug report, feature request, improvement, etc.)
 */
export async function createFeedback(data: {
  userId: string;
  userName: string;
  userEmail: string;
  type: FeedbackType;
  title: string;
  description: string;
}): Promise<string> {
  const colRef = collection(db, FEEDBACKS_COL);
  const now = serverTimestamp();
  
  const docRef = await addDoc(colRef, {
    ...data,
    status: 'NEW',
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * Lightweight aggregated count of NEW (unread) feedbacks.
 * Uses getCountFromServer which costs only 1 document read per 1,000 documents,
 * preserving Firestore free-tier quota.
 */
export async function getUnreadFeedbackCount(): Promise<number> {
  try {
    const q = query(
      collection(db, FEEDBACKS_COL),
      where('status', '==', 'NEW')
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (err) {
    console.warn('Could not fetch unread feedback count:', err);
    return 0;
  }
}

/**
 * Fetch all feedbacks for Admin Panel (sorted newest first)
 */
export async function getAllFeedbacks(): Promise<FeedbackItem[]> {
  try {
    const q = query(
      collection(db, FEEDBACKS_COL),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as any)
    })) as FeedbackItem[];
  } catch (err) {
    // If composite index is building or not yet available, fallback without orderBy
    console.warn('Fallback fetching feedbacks without order:', err);
    const snap = await getDocs(collection(db, FEEDBACKS_COL));
    const list = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as any)
    })) as FeedbackItem[];
    return list.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  }
}

/**
 * Update feedback status (NEW -> IN_PROGRESS -> RESOLVED) and optional admin notes
 */
export async function updateFeedbackStatus(
  feedbackId: string, 
  status: FeedbackStatus, 
  adminReply?: string
): Promise<void> {
  const docRef = doc(db, FEEDBACKS_COL, feedbackId);
  const updateData: Record<string, any> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (adminReply !== undefined) {
    updateData.adminReply = adminReply;
  }
  if (status === 'RESOLVED') {
    updateData.resolvedAt = serverTimestamp();
  }

  await updateDoc(docRef, updateData);
}

/**
 * Delete feedback (Admin only)
 */
export async function deleteFeedback(feedbackId: string): Promise<void> {
  const docRef = doc(db, FEEDBACKS_COL, feedbackId);
  await deleteDoc(docRef);
}
