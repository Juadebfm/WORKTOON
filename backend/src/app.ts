import type Database from "better-sqlite3";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";

import { createRefundAiService, type RefundAiService } from "./ai/refundAiService.js";
import {
  authenticateSupportUser,
  createSession,
  deleteSession,
  getSessionUser,
  type SupportUser,
} from "./auth/session.js";
import { addAiMessage, addCustomerMessage, addSupportMessage, DuplicateRefundRequestError, getCustomerRefundRequest, getRefundRequest, getSupportAssistantContext, getSupportOrderContext, listPolicyActivity, listRefundRequests, OrderAssistantContextNotFoundError, processRefundRequest, RefundRequestNotFoundError, RefundReviewNotAllowedError, resolveEscalatedRefundRequest } from "./refunds/refundService.js";

const safeTextSchema = z
  .string()
  .trim()
  .max(1_000)
  .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value));

const safeDetailsSchema = safeTextSchema.min(10);

const refundRequestSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().regex(/^WO-\d{4}$/),
  email: z.string().trim().toLowerCase().email().max(254),
  reason: z.enum(["DAMAGED", "INCORRECT_ITEM", "CHANGE_OF_MIND", "OTHER"]),
  details: safeDetailsSchema,
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(128),
}).strict();

const reviewRefundSchema = z.object({
  decision: z.enum(["APPROVED", "DENIED"]),
  note: safeDetailsSchema.min(5),
}).strict();

const orderAssistantSchema = z.object({
  question: safeTextSchema.min(3).max(500),
}).strict();

const customerMessageSchema = z.object({ body: safeTextSchema.min(3) }).strict();
const publicAccessTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

interface AuthenticatedRequest extends Request {
  supportUser?: SupportUser;
}

export interface CreateAppOptions {
  database: Database.Database;
  aiService?: RefundAiService;
  now?: () => Date;
  allowedOrigin?: string;
}

function bearerToken(request: Request): string | undefined {
  const [scheme, token] = request.header("authorization")?.split(" ") ?? [];
  return scheme === "Bearer" && token ? token : undefined;
}

function isUnsafeAssistantQuestion(question: string): boolean {
  return /(ignore (?:all )?(?:previous )?(instructions|rules|policy)|reveal (the )?(system |hidden )?prompt|system prompt|query (?:all|other) (?:orders|customers))/i.test(question);
}

function asksForOrderDetails(question: string): boolean {
  return /(order details|order number|delivery|deliver|shipping|tracking|price|cost|total|item details)/i.test(question);
}

export function createApp({
  database,
  aiService,
  now = () => new Date(),
  allowedOrigin = "http://localhost:5173",
}: CreateAppOptions): express.Express {
  const app = express();
  const activeAiService = aiService ?? createRefundAiService();
  app.set("trust proxy", 1);
  // Limit public endpoints before they consume database or AI capacity.
  const refundLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false });
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false });
  const assistantLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
  const customerConversationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });

  // Remove framework fingerprints and apply standard HTTP protections.
  app.disable("x-powered-by");
  app.use(helmet());
  // Accept requests only from the configured frontend origin.
  app.use(cors({ origin: allowedOrigin, methods: ["GET", "POST"], credentials: false }));
  // Reject oversized JSON before it reaches request processing.
  app.use(express.json({ limit: "10kb" }));

  // Require a valid, unexpired support session for internal data.
  const requireSupportSession = (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
    const token = bearerToken(request);
    const user = token ? getSessionUser(database, token, now()) : undefined;

    if (!user) {
      response.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
      return;
    }

    request.supportUser = user;
    next();
  };

  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.post("/api/auth/login", loginLimiter, (request, response) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: "INVALID_LOGIN_PAYLOAD" });
      return;
    }

    const user = authenticateSupportUser(database, parsed.data.email, parsed.data.password, now());

    if (!user) {
      // Use one generic error to avoid credential disclosure.
      response.status(401).json({ error: "INVALID_CREDENTIALS" });
      return;
    }

    const session = createSession(database, user, now());
    response.status(200).json({ token: session.token, expiresAt: session.expiresAt, user: { email: user.email, role: user.role } });
  });

  app.post("/api/auth/logout", requireSupportSession, (request, response) => {
    const token = bearerToken(request);
    if (token) deleteSession(database, token);
    response.status(204).send();
  });

  app.post("/api/refund-requests", refundLimiter, async (request, response, next) => {
    const parsed = refundRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      // Do not expose validation internals to anonymous callers.
      response.status(400).json({ error: "INVALID_REFUND_REQUEST" });
      return;
    }

    try {
      const result = await processRefundRequest(database, parsed.data, activeAiService, now());
      response.status(201).json(result);
    } catch (error) {
      if (error instanceof DuplicateRefundRequestError) {
        response.status(409).json({ error: "DUPLICATE_REFUND_REQUEST" });
        return;
      }

      next(error);
    }
  });

  app.get("/api/customer-requests/:accessToken", customerConversationLimiter, (request, response) => {
    const accessToken = Array.isArray(request.params.accessToken) ? request.params.accessToken[0] : request.params.accessToken;
    if (!accessToken || !publicAccessTokenSchema.safeParse(accessToken).success) {
      response.status(404).json({ error: "REQUEST_NOT_FOUND" });
      return;
    }
    const refundRequest = getCustomerRefundRequest(database, accessToken);
    if (!refundRequest) {
      response.status(404).json({ error: "REQUEST_NOT_FOUND" });
      return;
    }
    response.status(200).json({ request: refundRequest });
  });

  app.post("/api/customer-requests/:accessToken/messages", customerConversationLimiter, (request, response) => {
    const accessToken = Array.isArray(request.params.accessToken) ? request.params.accessToken[0] : request.params.accessToken;
    const parsed = customerMessageSchema.safeParse(request.body);
    if (!accessToken || !publicAccessTokenSchema.safeParse(accessToken).success || !parsed.success) {
      response.status(400).json({ error: "INVALID_CUSTOMER_MESSAGE" });
      return;
    }
    try {
      response.status(201).json({ request: addCustomerMessage(database, accessToken, parsed.data.body, now()) });
    } catch (error) {
      if (error instanceof RefundRequestNotFoundError) {
        response.status(404).json({ error: "REQUEST_NOT_FOUND" });
        return;
      }
      throw error;
    }
  });

  app.post("/api/customer-requests/:accessToken/assistant", customerConversationLimiter, async (request, response, next) => {
    const accessToken = Array.isArray(request.params.accessToken) ? request.params.accessToken[0] : request.params.accessToken;
    const parsed = orderAssistantSchema.safeParse(request.body);
    if (!accessToken || !publicAccessTokenSchema.safeParse(accessToken).success || !parsed.success || isUnsafeAssistantQuestion(parsed.data.question)) {
      response.status(400).json({ error: "INVALID_ASSISTANT_QUESTION" });
      return;
    }
    const customerRequest = getCustomerRefundRequest(database, accessToken) as { id: string; reason: string; details: string; decision: string; decision_explanation: string; triggered_rules_json: string | null } | undefined;
    if (!customerRequest) {
      response.status(404).json({ error: "REQUEST_NOT_FOUND" });
      return;
    }
    try {
      const fallback = createRefundAiService({});
      const customerAssistant = activeAiService.answerCustomerQuestion ? activeAiService : fallback;
      const answer = await customerAssistant.answerCustomerQuestion!({ question: parsed.data.question, refundRequest: { reason: customerRequest.reason, details: customerRequest.details, decision: customerRequest.decision, explanation: customerRequest.decision_explanation, triggeredRules: customerRequest.triggered_rules_json ? JSON.parse(customerRequest.triggered_rules_json) as string[] : [] }, order: asksForOrderDetails(parsed.data.question) ? getSupportOrderContext(database, customerRequest.id) : undefined });
      const text = answer.answer;
      response.status(200).json({ request: addAiMessage(database, accessToken, parsed.data.question, text, now()) });
    } catch (error) {
      if (error instanceof OrderAssistantContextNotFoundError) {
        response.status(404).json({ error: "ORDER_CONTEXT_UNAVAILABLE" });
        return;
      }
      next(error);
    }
  });

  app.get("/api/refund-requests", requireSupportSession, (_request, response) => {
    response.status(200).json({ requests: listRefundRequests(database) });
  });

  app.get("/api/refund-requests/:id", requireSupportSession, (request, response) => {
    const requestId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
    const refundRequest = getRefundRequest(database, requestId);

    if (!refundRequest) {
      response.status(404).json({ error: "REFUND_REQUEST_NOT_FOUND" });
      return;
    }

    response.status(200).json({ request: refundRequest });
  });

  app.post("/api/refund-requests/:id/assistant", requireSupportSession, assistantLimiter, async (request, response, next) => {
    const parsed = orderAssistantSchema.safeParse(request.body);
    const requestId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

    if (!parsed.success || !requestId || isUnsafeAssistantQuestion(parsed.data.question)) {
      response.status(400).json({ error: "INVALID_ASSISTANT_QUESTION" });
      return;
    }

    try {
      const context = getSupportAssistantContext(database, requestId);
      const answer = await activeAiService.answerOrderQuestion({ question: parsed.data.question, ...context });
      response.status(200).json(answer);
    } catch (error) {
      if (error instanceof OrderAssistantContextNotFoundError) {
        response.status(404).json({ error: "ORDER_CONTEXT_UNAVAILABLE" });
        return;
      }
      next(error);
    }
  });

  app.post("/api/refund-requests/:id/messages", requireSupportSession, (request, response) => {
    const requestId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
    const parsed = customerMessageSchema.safeParse(request.body);
    if (!requestId || !parsed.success) {
      response.status(400).json({ error: "INVALID_SUPPORT_MESSAGE" });
      return;
    }
    try {
      response.status(201).json({ request: addSupportMessage(database, requestId, parsed.data.body, now()) });
    } catch (error) {
      if (error instanceof RefundRequestNotFoundError) {
        response.status(404).json({ error: "REFUND_REQUEST_NOT_FOUND" });
        return;
      }
      throw error;
    }
  });

  app.post("/api/refund-requests/:id/review", requireSupportSession, (request: AuthenticatedRequest, response) => {
    const parsed = reviewRefundSchema.safeParse(request.body);
    const requestId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

    if (!parsed.success || !requestId) {
      response.status(400).json({ error: "INVALID_REFUND_REVIEW" });
      return;
    }

    try {
      const refundRequest = resolveEscalatedRefundRequest(
        database,
        requestId,
        parsed.data.decision,
        parsed.data.note,
        request.supportUser!.id,
        now(),
      );
      response.status(200).json({ request: refundRequest });
    } catch (error) {
      if (error instanceof RefundRequestNotFoundError) {
        response.status(404).json({ error: "REFUND_REQUEST_NOT_FOUND" });
        return;
      }
      if (error instanceof RefundReviewNotAllowedError) {
        response.status(409).json({ error: "REFUND_REVIEW_NOT_ALLOWED" });
        return;
      }
      throw error;
    }
  });

  app.get("/api/policy-activity", requireSupportSession, (_request, response) => {
    response.status(200).json({ events: listPolicyActivity(database) });
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    console.error(error);
    response.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  });

  return app;
}
