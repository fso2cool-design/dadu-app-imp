import { describe, it, expect } from 'vitest';
import { aggregateAttendance, aggregateByStudent } from './attendanceAggregation';
describe("attendanceAggregation", () => {
  it("counts statuses", () => { const r = aggregateAttendance([ { studentId: "s1", status: "HADIR" }, { studentId: "s1", status: "SAKIT" }, { studentId: "s2", status: "ALPA" } ]); expect(r.present).toBe(1); expect(r.sick).toBe(1); expect(r.absent).toBe(1); expect(r.total).toBe(3); });
  it("group by student", () => { const m = aggregateByStudent([ { studentId: "a", status: "HADIR" }, { studentId: "a", status: "HADIR" }, { studentId: "b", status: "IZIN" } ]); expect(m.get("a")!.present).toBe(2); expect(m.get("b")!.permitted).toBe(1); });
  it("empty", () => expect(aggregateAttendance([]).total).toBe(0));
});
