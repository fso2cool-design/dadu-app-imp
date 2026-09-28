import { describe, it, expect } from "vitest";
import { checkIsHoliday } from "./holiday";

describe("checkIsHoliday (domain)", () => {
  it("empty false", () => expect(checkIsHoliday("",{"schoolDaysOption":6})).toEqual({isHoliday:false}));
  it("invalid date false", () => expect(checkIsHoliday("bad",{schoolDaysOption:6})).toEqual({isHoliday:false}));
  it("Sunday is holiday", () => expect(checkIsHoliday("2026-01-04",{schoolDaysOption:6})).toMatchObject({isHoliday:true}));
  it("Saturday 5-day is holiday", () => expect(checkIsHoliday("2026-01-03",{schoolDaysOption:5})).toMatchObject({isHoliday:true}));
  it("Saturday 6-day not holiday", () => expect(checkIsHoliday("2026-01-03",{schoolDaysOption:6})).toEqual({isHoliday:false}));
  it("custom range match", () => expect(checkIsHoliday("2026-08-17",{schoolDaysOption:6,holidays:[{startDate:"2026-08-17",endDate:"2026-08-18",description: "Merdeka"}]})).toMatchObject({isHoliday:true, reason: "Merdeka"}));
  it("custom single date match", () => expect(checkIsHoliday("2026-12-25",{schoolDaysOption:6,holidays:[{startDate:"2026-12-25",description:"Natal"}]})).toMatchObject({isHoliday:true}));
});
