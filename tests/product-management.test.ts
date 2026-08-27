import { describe, expect, it } from "vitest";
import { finalSellingPrice } from "../server/product-management";

describe("Phase 2 product pricing", () => {
  it("keeps the original price when no discount is selected", () => {
    expect(finalSellingPrice(100, "none", 50)).toBe(100);
  });

  it("calculates percentage and fixed discounts without producing negative prices", () => {
    expect(finalSellingPrice(100, "percentage", 25)).toBe(75);
    expect(finalSellingPrice(100, "fixed", 30)).toBe(70);
    expect(finalSellingPrice(100, "fixed", 500)).toBe(0);
  });
});
