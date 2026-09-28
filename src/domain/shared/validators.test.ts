import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidNISN, normalizeTrim } from './validators';
describe("validators", () => {
  it("email", () => { expect(isValidEmail("a@b-com")).toBe(false); expect(isValidEmail("a@b@com")).toBe(false); });
  it("nisn 10 digits", () => { expect(isValidNISN("1234567890")).toBe(true); expect(isValidNISN("123")).toBe(false); });
  it("trim", () => expect(normalizeTrim("  hi  ")).toBe("hi"));
});
