import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { applySchema } from "../src/db/schema.js";
import { seedDatabase } from "../src/db/seed.js";

const databases: Database.Database[] = [];

function createDatabase(): Database.Database {
  const database = new Database(":memory:");
  databases.push(database);
  applySchema(database);
  return database;
}

function rowCount(database: Database.Database, table: string): number {
  return (database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }
});

describe("SQLite schema and seed data", () => {
  it("creates the required relational tables", () => {
    const database = createDatabase();
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual([
      "customers",
      "order_items",
      "orders",
      "refund_audit_logs",
      "refund_requests",
      "user_sessions",
      "users",
    ]);
  });

  it("seeds 15 customers, 18 orders, and linked order items", () => {
    const database = createDatabase();

    seedDatabase(database, new Date("2026-09-27T12:00:00.000Z"));

    expect(rowCount(database, "customers")).toBe(15);
    expect(rowCount(database, "orders")).toBe(18);
    expect(rowCount(database, "order_items")).toBe(18);
    expect(rowCount(database, "users")).toBe(1);
  });

  it("uses UUIDs for seeded customer, order, and item identifiers", () => {
    const database = createDatabase();
    const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    seedDatabase(database);

    const customerIds = database.prepare("SELECT id FROM customers").all() as Array<{ id: string }>;
    const orderIds = database.prepare("SELECT id FROM orders").all() as Array<{ id: string }>;
    const itemIds = database.prepare("SELECT id FROM order_items").all() as Array<{ id: string }>;

    expect([...customerIds, ...orderIds, ...itemIds].every(({ id }) => uuidV4Pattern.test(id))).toBe(true);
  });

  it("includes predictable orders for approval, denial, and escalation demos", () => {
    const database = createDatabase();

    seedDatabase(database, new Date("2026-09-27T12:00:00.000Z"));

    const demoOrders = database
      .prepare(
        "SELECT order_number, total_amount_cents FROM orders WHERE order_number IN ('WO-1001', 'WO-1002', 'WO-1003', 'WO-1004') ORDER BY order_number",
      )
      .all() as Array<{ order_number: string; total_amount_cents: number }>;

    expect(demoOrders).toEqual([
      { order_number: "WO-1001", total_amount_cents: 12_000 },
      { order_number: "WO-1002", total_amount_cents: 14_500 },
      { order_number: "WO-1003", total_amount_cents: 7_500 },
      { order_number: "WO-1004", total_amount_cents: 65_000 },
    ]);
  });

  it("can be safely reseeded without duplicate rows", () => {
    const database = createDatabase();

    seedDatabase(database);
    seedDatabase(database);

    expect(rowCount(database, "customers")).toBe(15);
    expect(rowCount(database, "orders")).toBe(18);
  });
});
