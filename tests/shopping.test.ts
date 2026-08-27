import { describe, expect, it } from "vitest";
import { canCustomerCancelOrder, canTransitionOrderStatus, storeCanReceiveNewOrders } from "../server/shopping";
import { canReactivateStore, canStoreSubmitCommission, commissionBreakdown, commissionDueDate, commissionReminder, commissionRequiresRestriction } from "../server/payments";

describe("Store Admin order status rules", () => {
  it("allows the requested paid-order lifecycle", () => {
    expect(canTransitionOrderStatus("pending", "payment_confirmed")).toBe(true);
    expect(canTransitionOrderStatus("payment_confirmed", "processing")).toBe(true);
    expect(canTransitionOrderStatus("processing", "ready")).toBe(true);
    expect(canTransitionOrderStatus("ready", "out_for_delivery")).toBe(true);
    expect(canTransitionOrderStatus("out_for_delivery", "delivered")).toBe(true);
    expect(canTransitionOrderStatus("delivered", "completed")).toBe(true);
  });

  it("prevents invalid or final-state transitions", () => {
    expect(canTransitionOrderStatus("pending", "processing")).toBe(false);
    expect(canTransitionOrderStatus("delivered", "cancelled")).toBe(false);
    expect(canTransitionOrderStatus("completed", "processing")).toBe(false);
    expect(canTransitionOrderStatus("cancelled", "payment_confirmed")).toBe(false);
  });

  it("allows customers to cancel only pending orders", () => {
    expect(canCustomerCancelOrder("pending")).toBe(true);
    expect(canCustomerCancelOrder("payment_confirmed")).toBe(false);
    expect(canCustomerCancelOrder("delivered")).toBe(false);
  });

  it("calculates the five-percent commission only from the confirmed sale amount", () => {
    expect(commissionBreakdown(100)).toEqual({ saleAmount: 100, commissionAmount: 5, storeEarnings: 95 });
    expect(commissionBreakdown(99)).toEqual({ saleAmount: 99, commissionAmount: 5, storeEarnings: 94 });
  });

  it("requires restriction until each commission has been verified as paid", () => {
    expect(commissionRequiresRestriction("required")).toBe(true);
    expect(commissionRequiresRestriction("commission_payment_sent")).toBe(true);
    expect(commissionRequiresRestriction("paid")).toBe(false);
    expect(canStoreSubmitCommission("required")).toBe(true);
    expect(canStoreSubmitCommission("rejected")).toBe(true);
    expect(canStoreSubmitCommission("commission_payment_sent")).toBe(false);
    expect(canReactivateStore(["paid", "paid"])).toBe(true);
    expect(canReactivateStore(["paid", "commission_payment_sent"])).toBe(false);
  });

  it("allows new orders only for active stores", () => {
    expect(storeCanReceiveNewOrders("active")).toBe(true);
    expect(storeCanReceiveNewOrders("restricted")).toBe(false);
    expect(storeCanReceiveNewOrders("suspended")).toBe(false);
    expect(storeCanReceiveNewOrders("pending")).toBe(false);
  });

  it("sets a three-day commission due date and gives a clear unpaid reminder", () => {
    const created = new Date("2026-08-25T10:00:00.000Z");
    const due = commissionDueDate(created);
    expect(due.toISOString()).toBe("2026-08-28T10:00:00.000Z");
    expect(commissionReminder("required", due, created)).toContain("3 maalmood");
    expect(commissionReminder("paid", due, created)).toContain("la bixiyey");
    expect(commissionReminder("required", due, new Date("2026-08-29T10:00:00.000Z"))).toContain("dhacay");
  });
});
