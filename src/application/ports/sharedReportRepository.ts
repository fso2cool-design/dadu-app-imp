import type { SharedReport, SharedReportPayload, SharedReportType } from '../../types';

export interface CreateSharedReportParams {
  userId: string;
  userName: string;
  reportType: SharedReportType;
  title: string;
  description?: string;
  passcode?: string;
  expiresInDays?: number;
  payload: SharedReportPayload;
}

export interface SharedReportRepository {
  create(params: CreateSharedReportParams): Promise<SharedReport>;
  getByToken(token: string): Promise<SharedReport | null>;
  decrypt(report: SharedReport, passcode: string): Promise<SharedReportPayload>;
  incrementView(token: string): Promise<void>;
  getUserReports(userId: string): Promise<SharedReport[]>;
  revoke(token: string): Promise<void>;
  delete(token: string): Promise<void>;
  generateToken(length?: number): string;
}
