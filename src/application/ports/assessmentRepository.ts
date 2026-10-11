import type { AssessmentItem, Score } from '../../types';
import type { AssessmentFilterOptions, MatrixScoreInput } from '../../domain/assessment.types';

export interface AssessmentRepository {
  getAssessmentItems(uid: string, options?: AssessmentFilterOptions): Promise<AssessmentItem[]>;
  getAssessmentItemById(uid: string, itemId: string): Promise<AssessmentItem | null>;
  createAssessmentItem(uid: string, data: Omit<AssessmentItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateAssessmentItem(uid: string, itemId: string, data: Partial<Omit<AssessmentItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void>;
  canDeleteAssessmentItem(uid: string, itemId: string): Promise<{ canDelete: boolean; reason?: string; hasScores: boolean; scoresCount?: number }>;
  deleteAssessmentItem(uid: string, itemId: string): Promise<void>;
  getScoresByItemIds(uid: string, ids: string[]): Promise<Score[]>;
  saveScoresBatch(uid: string, assessmentItemId: string, scores: Array<{ studentId: string; score: number; note?: string }>): Promise<void>;
  saveMatrixScores(uid: string, scores: MatrixScoreInput[]): Promise<void>;
}
