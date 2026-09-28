import type { SharedReportRepository } from '../../../application/ports/sharedReportRepository';
import * as S from '../../../services/firestore/sharedReports';
export const sharedReportRepository: SharedReportRepository = {
  getAll: (uid) => (S as any).getSharedReports?.(uid) ?? [],
  getById: (uid,id) => (S as any).getSharedReportById?.(uid,id) ?? null,
  create: (uid,d) => (S as any).createSharedReport?.(uid,d),
  update: (uid,id,d) => (S as any).updateSharedReport?.(uid,id,d),
  delete: (uid,id) => (S as any).deleteSharedReport?.(uid,id),
};
