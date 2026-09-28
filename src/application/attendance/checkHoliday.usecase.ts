import { checkIsHoliday as domainCheckIsHoliday, type AttendanceSettingsDomain } from '../../domain/attendance/holiday';

export interface CheckHolidayInput {
  dateStr: string;
  settings: AttendanceSettingsDomain;
}

export function checkHolidayUseCase(input: CheckHolidayInput): { isHoliday: boolean; reason?: string } {
  return domainCheckIsHoliday(input.dateStr, input.settings as any);
}
