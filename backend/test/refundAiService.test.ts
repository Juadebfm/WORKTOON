import { describe, expect, it } from "vitest";

import {
  createRefundAiService,
  FallbackRefundAiService,
  ResilientRefundAiService,
  type RefundAiService,
} from "../src/ai/refundAiService.js";

const input = { reason: "DAMAGED" as const, details: "The item arrived damaged." };

describe("refund AI service", () => {
  it("uses a deterministic fallback when AI configuration is absent", async () => {
    const service = createRefundAiService({});
    const review = await service.review(input);

    expect(service).toBeInstanceOf(FallbackRefundAiService);
    expect(review).toMatchObject({ reasonCategory: "DAMAGED", suspicionFlags: [], source: "FALLBACK" });
  });

  it("returns an order summary when no AI configuration is present", async () => {
    const service = createRefundAiService({});
    const answer = await service.answerOrderQuestion({
      question: "What do we know about this order?",
      order: { orderNumber: "WO-1001", customerName: "Amina Yusuf", customerEmail: "amina@example.test", orderStatus: "DELIVERED", paymentStatus: "PAID", fulfillmentStatus: "DELIVERED", placedAt: "2026-09-20T12:00:00.000Z", paidAt: "2026-09-20T12:05:00.000Z", fulfilledAt: "2026-09-21T00:00:00.000Z", shippedAt: "2026-09-21T12:00:00.000Z", deliveredAt: "2026-09-22T12:00:00.000Z", subtotalCents: 10_000, discountCents: 0, shippingCents: 750, taxCents: 1_250, totalCents: 12_000, currency: "USD", shippingMethod: "Economy delivery", carrier: "Worktoon Logistics", trackingNumber: "WT-1001", items: [{ name: "Everyday Backpack", sku: "SKU-1001", quantity: 1, unitPriceCents: 10_000, isFinalSale: false }] },
    });

    expect(answer).toMatchObject({ source: "FALLBACK" });
    expect(answer.answer).toContain("Order WO-1001");
  });

  it("falls back safely when the configured provider fails", async () => {
    const unavailableService: RefundAiService = {
      review: async () => Promise.reject(new Error("provider unavailable")),
      answerOrderQuestion: async () => Promise.reject(new Error("provider unavailable")),
    };
    const service = new ResilientRefundAiService(unavailableService);
    const review = await service.review(input);

    expect(review).toMatchObject({ reasonCategory: "DAMAGED", suspicionFlags: [], source: "FALLBACK" });
  });
});
