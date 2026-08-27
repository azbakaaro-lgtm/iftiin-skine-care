import { describe, expect, it } from "vitest";
import { somaliFormError } from "../lib/form-errors";
import { customerSafeOrder } from "../server/shopping";

describe("customer experience refinements", () => {
  it("turns raw username validation payloads into Somali guidance", () => {
    const message = somaliFormError(new Error('[{"path":["username"],"code":"invalid_format"}]'), "Fallback");
    expect(message).toContain("Magaca isticmaalaha");
    expect(message).not.toContain('"path"');
  });

  it("removes the Store Admin receiving account from a customer order response", () => {
    const safe = customerSafeOrder({ id: 4, payment: { id: 8, receivingAccount: "615952500", amount: 18, status: "pending_payment" } });
    expect(safe.payment).toEqual({ id: 8, amount: 18, status: "pending_payment" });
    expect("receivingAccount" in (safe.payment ?? {})).toBe(false);
  });
});
