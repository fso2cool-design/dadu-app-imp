import { describe, it, expect } from 'vitest';
import { aggregateAttendance, aggregateByStudent } from './attendanceAggregation';

describe("attendanceAggregation", () => {
  it("counts statuses case-insensitively and handles LATE and TRUANT", () => {
    const r = aggregateAttendance([
      { studentId: "s1", status: "hadir" },
      { studentId: "s1", status: "SAKIT" },
      { studentId: "s2", status: "alpa" },
      { studentId: "s3", status: "LATE" },
      { studentId: "s4", status: "TRUANT" },
      { studentId: "s5", status: "DISPENSATION" }
    ]);
    expect(r.present).toBe(2);
    expect(r.sick).toBe(1);
    expect(r.absent).toBe(2);
    expect(r.dispensation).toBe(1);
    expect(r.total).toBe(6);
    expect(r.rate).toBe(50);
  });

  it("group by student", () => {
    const m = aggregateByStudent([
      { studentId: "a", status: "HADIR" },
      { studentId: "a", status: "hadir" },
      { studentId: "b", status: "izin" }
    ]);
    expect(m.get("a")!.present).toBe(2);
    expect(m.get("b")!.permitted).toBe(1);
  });

  it("empty", () => expect(aggregateAttendance([]).total).toBe(0));
});
