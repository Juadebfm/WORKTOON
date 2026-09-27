import { describe, expect, it } from "vitest";

import {
  HUMAN_REVIEW_THRESHOLD_CENTS,
  REFUND_WINDOW_DAYS,
  evaluateRefundPolicy,
  type RefundPolicyInput,
} from "../src/policy/refundPolicy.js";

const requestedAt = new Date("2026-09-27T12:00:00.000Z");

function validInput(overrides: Partial<RefundPolicyInput> = {}): RefundPolicyInput {
  return {
    order: {
      purchasedAt: new Date("2026-09-20T12:00:00.000Z"),
      refundAmountCents: 12_000,
      hasFinalSaleItem: false,
    },
    emailMatchesOrder: true,
    reason: "DAMAGED",
    isSuspiciousOrConflicting: false,
    requestedAt,
    ...overrides,
  };
}

describe("evaluateRefundPolicy", () => {
  it("escalates when no verified order/customer record is found", () => {
    const result = evaluateRefundPolicy(validInput({ order: undefined }));

    expect(result).toEqual({
      decision: "ESCALATED",
      triggeredRules: ["ORDER_OR_CUSTOMER_NOT_FOUND"],
    });
  });

  it("escalates when the submitted email does not belong to the order", () => {
    const result = evaluateRefundPolicy(validInput({ emailMatchesOrder: false }));

    expect(result).toEqual({
      decision: "ESCALATED",
      triggeredRules: ["EMAIL_DOES_NOT_MATCH_ORDER"],
    });
  });

  it("escalates suspicious requests before ordinary eligibility rules", () => {
    const result = evaluateRefundPolicy(
      validInput({
        isSuspiciousOrConflicting: true,
        order: {
          purchasedAt: new Date("2026-08-01T12:00:00.000Z"),
          refundAmountCents: 70_000,
          hasFinalSaleItem: true,
        },
      }),
    );

    expect(result).toEqual({
      decision: "ESCALATED",
      triggeredRules: ["SUSPICIOUS_OR_CONFLICTING_REQUEST"],
    });
  });

  it("denies final-sale items", () => {
    const result = evaluateRefundPolicy(
      validInput({ order: { ...validInput().order!, hasFinalSaleItem: true } }),
    );

    expect(result).toEqual({
      decision: "DENIED",
      triggeredRules: ["FINAL_SALE_ITEM"],
    });
  });

  it("denies an order older than the refund window", () => {
    const result = evaluateRefundPolicy(
      validInput({
        order: {
          ...validInput().order!,
          purchasedAt: new Date("2026-08-27T11:59:59.999Z"),
        },
      }),
    );

    expect(result).toEqual({
      decision: "DENIED",
      triggeredRules: ["OUTSIDE_REFUND_WINDOW"],
    });
  });

  it("allows an order exactly at the refund-window boundary to continue", () => {
    const result = evaluateRefundPolicy(
      validInput({
        order: {
          ...validInput().order!,
          purchasedAt: new Date("2026-08-28T12:00:00.000Z"),
        },
      }),
    );

    expect(result.decision).toBe("APPROVED");
    expect(result.triggeredRules).toEqual(["DAMAGED_OR_INCORRECT_ITEM"]);
  });

  it("escalates refunds above $500", () => {
    const result = evaluateRefundPolicy(
      validInput({
        order: {
          ...validInput().order!,
          refundAmountCents: HUMAN_REVIEW_THRESHOLD_CENTS + 1,
        },
      }),
    );

    expect(result).toEqual({
      decision: "ESCALATED",
      triggeredRules: ["REFUND_ABOVE_HUMAN_REVIEW_THRESHOLD"],
    });
  });

  it("approves recent damaged and incorrect-item requests under $500", () => {
    expect(evaluateRefundPolicy(validInput({ reason: "DAMAGED" })).decision).toBe("APPROVED");
    expect(evaluateRefundPolicy(validInput({ reason: "INCORRECT_ITEM" })).decision).toBe("APPROVED");
  });

  it("denies a reason that is not eligible under the documented policy", () => {
    const result = evaluateRefundPolicy(validInput({ reason: "CHANGE_OF_MIND" }));

    expect(result).toEqual({
      decision: "DENIED",
      triggeredRules: ["REASON_NOT_ELIGIBLE"],
    });
  });

  it("defines the refund window as 30 days", () => {
    expect(REFUND_WINDOW_DAYS).toBe(30);
  });
});
