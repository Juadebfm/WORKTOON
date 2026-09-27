import type Database from "better-sqlite3";

const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    purchased_at TEXT NOT NULL,
    total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    is_final_sale INTEGER NOT NULL CHECK (is_final_sale IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS refund_requests (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id),
    order_id TEXT REFERENCES orders(id),
    request_email TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'DENIED', 'ESCALATED')),
    decision_explanation TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS refund_audit_logs (
    id TEXT PRIMARY KEY,
    refund_request_id TEXT NOT NULL REFERENCES refund_requests(id) ON DELETE CASCADE,
    triggered_rules_json TEXT NOT NULL,
    ai_reason_category TEXT,
    ai_suspicion_flags_json TEXT,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPPORT_AGENT', 'ADMIN')),
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
  CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS refund_requests_created_at_idx ON refund_requests(created_at DESC);
  CREATE INDEX IF NOT EXISTS refund_audit_logs_refund_request_id_idx ON refund_audit_logs(refund_request_id);
  CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
  CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);
`;

export function applySchema(database: Database.Database): void {
  database.exec(schema);
}
