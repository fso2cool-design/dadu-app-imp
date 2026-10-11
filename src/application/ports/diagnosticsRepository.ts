import type { DiagnosticResult } from '../../domain/diagnostics.types';

export interface DiagnosticsRepository {
  runIntegrityAudit(uid: string): Promise<DiagnosticResult>;
}