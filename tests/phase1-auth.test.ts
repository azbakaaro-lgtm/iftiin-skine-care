import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../server/phase1-auth";

describe("Phase 1 password security", () => {
  it("hashes a password and accepts the matching password", () => {
    const hash = hashPassword("Amaan-1234");
    expect(hash).not.toContain("Amaan-1234");
    expect(verifyPassword("Amaan-1234", hash)).toBe(true);
  });

  it("rejects an incorrect password and missing credential hash", () => {
    const hash = hashPassword("Amaan-1234");
    expect(verifyPassword("Khalad-1234", hash)).toBe(false);
    expect(verifyPassword("Amaan-1234", null)).toBe(false);
  });
});
