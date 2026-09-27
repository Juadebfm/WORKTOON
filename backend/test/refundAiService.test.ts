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

  it("falls back safely when the configured provider fails", async () => {
    const unavailableService: RefundAiService = { review: async () => Promise.reject(new Error("provider unavailable")) };
    const service = new ResilientRefundAiService(unavailableService);
    const review = await service.review(input);

    expect(review).toMatchObject({ reasonCategory: "DAMAGED", suspicionFlags: [], source: "FALLBACK" });
  });
});
