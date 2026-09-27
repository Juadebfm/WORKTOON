import type {
  RefundReason,
  RefundRequestDetails,
  RefundRequestListItem,
  RefundResult,
  SupportSession,
} from "./types";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new ApiError(body.error ?? "REQUEST_FAILED", response.status);
  }

  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}

export function submitRefundRequest(payload: {
  orderNumber: string;
  email: string;
  reason: RefundReason;
  details: string;
}): Promise<RefundResult> {
  return apiRequest("/api/refund-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(
  email: string,
  password: string,
): Promise<SupportSession> {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout(token: string): Promise<void> {
  return apiRequest("/api/auth/logout", { method: "POST" }, token);
}

export function listRefundRequests(
  token: string,
): Promise<{ requests: RefundRequestListItem[] }> {
  return apiRequest("/api/refund-requests", {}, token);
}

export function getRefundRequest(
  token: string,
  id: string,
): Promise<{ request: RefundRequestDetails }> {
  return apiRequest(`/api/refund-requests/${id}`, {}, token);
}
