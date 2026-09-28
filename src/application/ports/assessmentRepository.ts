import type { AssessmentItem, Score } from '../../types';
import type { AssessmentFilterOptions, MatrixScoreInput } from '../../services/firestore/assessments';

export interface AssessmentRepository {
  getItems(uid: string, options?: AssessmentFilterOptions): Promise<AssessmentItem[]>;
  getItemById(uid: string, itemId: string): Promise<AssessmentItem | null>;
  createItem(uid: string, data: Omit<AssessmentItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateItem(uid: string, itemId: string, data: Partial<Omit<AssessmentItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void>;
  canDeleteItem(uid: string, itemId: string): Promise<{ canDelete: boolean; reason?: string; hasScores: boolean; scoresCount?: number }>;
  deleteItem(uid: string, itemId: string): Promise<void>;
  getScoresByItemIds(uid: string, ids: string[]): Promise<Score[]>;
  saveScoresBatch(uid: string, assessmentItemId: string, scores: Array<{ studentId: string; score: number; note?: string }>): Promise<void>;
  saveMatrixScores(uid: string, scores: MatrixScoreInput[]): Promise<void>;
}
