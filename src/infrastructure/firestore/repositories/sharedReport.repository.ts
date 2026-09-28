import * as S from '../../../services/firestore/sharedReports';
export const sharedReportRepository = {
  create: S.createSharedReport,
  getByToken: S.getSharedReportByToken,
  decrypt: S.decryptSharedReport,
  incrementView: S.incrementReportViewCount,
  getUserReports: S.getUserSharedReports,
  revoke: S.revokeSharedReport,
  delete: S.deleteSharedReport,
  generateToken: S.generateShareToken,
};
