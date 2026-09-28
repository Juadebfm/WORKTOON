import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

interface SeedCustomer {
  id: string;
  fullName: string;
  email: string;
}

interface SeedOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  daysAgo: number;
  totalAmountCents: number;
  itemName: string;
  isFinalSale: boolean;
}

export const seedCustomers: SeedCustomer[] = [
  { id: "5c7b8d2a-9f14-4e63-8a51-1d3e7f906a21", fullName: "Amina Yusuf", email: "amina.yusuf@example.test" },
  { id: "f2a68e1c-3d57-4b90-8c24-6e19a5f72d03", fullName: "Chinedu Okafor", email: "chinedu.okafor@example.test" },
  { id: "8d41c6f3-0b92-4a7e-9f15-2c68d4e1a570", fullName: "Damilola Adeyemi", email: "damilola.adeyemi@example.test" },
  { id: "1e9f52a7-6c30-4d84-8b61-7a2e5f903c16", fullName: "Fatima Bello", email: "fatima.bello@example.test" },
  { id: "b3c71d8e-4a25-4f69-9e02-8d6f1a53c740", fullName: "Gabriel Mensah", email: "gabriel.mensah@example.test" },
  { id: "64e2a9c1-7f38-4b05-8d71-3c5f9e126a84", fullName: "Halima Musa", email: "halima.musa@example.test" },
  { id: "a87c13e5-2d64-4f90-9b36-5e1a7c842d09", fullName: "Ifeanyi Nwosu", email: "ifeanyi.nwosu@example.test" },
  { id: "3f6a8d20-1c57-4e93-8b41-9d2f5a706c18", fullName: "Jumoke Balogun", email: "jumoke.balogun@example.test" },
  { id: "c19e47a6-8b03-4d72-9f54-2a6c1e853d70", fullName: "Kelechi Eze", email: "kelechi.eze@example.test" },
  { id: "7a5d2c91-6e48-4f30-8b17-3c9a6d205e84", fullName: "Lara Williams", email: "lara.williams@example.test" },
  { id: "e46b1f83-9c25-4a70-8d62-1f5e3a907c14", fullName: "Musa Ibrahim", email: "musa.ibrahim@example.test" },
  { id: "2c8f5a17-4d69-4e03-9b41-6a2d8c750e93", fullName: "Nneka Obi", email: "nneka.obi@example.test" },
  { id: "9d30e6a4-1f75-4b82-8c19-5e7a2d640f31", fullName: "Oluwaseun Adebayo", email: "oluwaseun.adebayo@example.test" },
  { id: "6a14c8e2-3f90-4d57-9b26-1e5c7a830d64", fullName: "Peace Okoro", email: "peace.okoro@example.test" },
  { id: "d75e2a90-8c41-4f63-9a17-3b6d1e508c24", fullName: "Tunde Ajayi", email: "tunde.ajayi@example.test" },
];

export const seedOrders: SeedOrder[] = [
  { id: "1d5a83c7-4e20-4b69-8f31-6c2a9e705d14", orderNumber: "WO-1001", customerId: "5c7b8d2a-9f14-4e63-8a51-1d3e7f906a21", daysAgo: 7, totalAmountCents: 12_000, itemName: "Everyday Backpack", isFinalSale: false },
  { id: "b8e26d14-7a53-4f90-9c61-2d5e8a370f42", orderNumber: "WO-1002", customerId: "f2a68e1c-3d57-4b90-8c24-6e19a5f72d03", daysAgo: 5, totalAmountCents: 14_500, itemName: "Clearance Sneakers", isFinalSale: true },
  { id: "4c71a9e2-3d86-4f05-8b41-7e2a6c930d15", orderNumber: "WO-1003", customerId: "8d41c6f3-0b92-4a7e-9f15-2c68d4e1a570", daysAgo: 31, totalAmountCents: 7_500, itemName: "Insulated Water Bottle", isFinalSale: false },
  { id: "e95d20a6-1f47-4c83-9b62-5a7e3d810f24", orderNumber: "WO-1004", customerId: "1e9f52a7-6c30-4d84-8b61-7a2e5f903c16", daysAgo: 3, totalAmountCents: 65_000, itemName: "Premium Espresso Machine", isFinalSale: false },
  { id: "7f31c8d5-6a90-4e27-8b14-2d5e9a603c71", orderNumber: "WO-1005", customerId: "b3c71d8e-4a25-4f69-9e02-8d6f1a53c740", daysAgo: 9, totalAmountCents: 9_500, itemName: "Linen Throw Pillow", isFinalSale: false },
  { id: "2a68e4c1-9d35-4f70-8b26-6c1e5a903d47", orderNumber: "WO-1006", customerId: "64e2a9c1-7f38-4b05-8d71-3c5f9e126a84", daysAgo: 15, totalAmountCents: 18_000, itemName: "Wireless Keyboard", isFinalSale: false },
  { id: "c42e71a9-5d08-4f63-9b15-8a3c6e270d94", orderNumber: "WO-1007", customerId: "a87c13e5-2d64-4f90-9b36-5e1a7c842d09", daysAgo: 2, totalAmountCents: 25_000, itemName: "Desk Lamp", isFinalSale: false },
  { id: "6d15a8e3-2c79-4f40-8b61-9e5a3d720c14", orderNumber: "WO-1008", customerId: "3f6a8d20-1c57-4e93-8b41-9d2f5a706c18", daysAgo: 27, totalAmountCents: 4_900, itemName: "Ceramic Mug Set", isFinalSale: false },
  { id: "a73c5e19-8d24-4f60-9b31-2e6a7c850d14", orderNumber: "WO-1009", customerId: "c19e47a6-8b03-4d72-9f54-2a6c1e853d70", daysAgo: 40, totalAmountCents: 22_000, itemName: "Travel Duffel", isFinalSale: false },
  { id: "3e90a6c2-7d14-4f85-8b31-5c2e9a670d48", orderNumber: "WO-1010", customerId: "7a5d2c91-6e48-4f30-8b17-3c9a6d205e84", daysAgo: 12, totalAmountCents: 51_000, itemName: "Standing Desk Converter", isFinalSale: false },
  { id: "d18a4e75-6c20-4f93-8b61-2a5e7d840c19", orderNumber: "WO-1011", customerId: "e46b1f83-9c25-4a70-8d62-1f5e3a907c14", daysAgo: 6, totalAmountCents: 8_000, itemName: "Cotton T-Shirt", isFinalSale: true },
  { id: "8c52d1a6-3e97-4f40-9b18-6a2e5c730d14", orderNumber: "WO-1012", customerId: "2c8f5a17-4d69-4e03-9b41-6a2d8c750e93", daysAgo: 18, totalAmountCents: 15_500, itemName: "Bluetooth Speaker", isFinalSale: false },
  { id: "5a27e9c3-1d64-4f80-8b31-7e2a6c950d14", orderNumber: "WO-1013", customerId: "9d30e6a4-1f75-4b82-8c19-5e7a2d640f31", daysAgo: 29, totalAmountCents: 11_000, itemName: "Yoga Mat", isFinalSale: false },
  { id: "f61d3a82-9c45-4e70-8b16-2a5e7d930c14", orderNumber: "WO-1014", customerId: "6a14c8e2-3f90-4d57-9b26-1e5c7a830d64", daysAgo: 1, totalAmountCents: 42_000, itemName: "Noise Cancelling Headphones", isFinalSale: false },
  { id: "2e85c7a1-6d39-4f40-9b12-8a5e3c670d14", orderNumber: "WO-1015", customerId: "d75e2a90-8c41-4f63-9a17-3b6d1e508c24", daysAgo: 22, totalAmountCents: 6_500, itemName: "Stainless Lunch Box", isFinalSale: false },
  { id: "9a14e6c5-3d72-4f80-8b31-5e2a7c960d14", orderNumber: "WO-1016", customerId: "5c7b8d2a-9f14-4e63-8a51-1d3e7f906a21", daysAgo: 45, totalAmountCents: 19_000, itemName: "Rain Jacket", isFinalSale: false },
  { id: "4d70a2e8-1c56-4f93-8b21-6a5e7d830c14", orderNumber: "WO-1017", customerId: "b3c71d8e-4a25-4f69-9e02-8d6f1a53c740", daysAgo: 4, totalAmountCents: 5_500, itemName: "Notebook Set", isFinalSale: false },
  { id: "c83e5a17-2d69-4f40-9b31-6a5e7c920d14", orderNumber: "WO-1018", customerId: "7a5d2c91-6e48-4f30-8b17-3c9a6d205e84", daysAgo: 8, totalAmountCents: 13_500, itemName: "USB-C Hub", isFinalSale: false },
];

export const demoSupportUser = {
  id: "c49e1a72-6d35-4f80-9b21-5a7e3c960d14",
  email: "support@worktoon.local",
  password: "ReviewOnly!2026",
  role: "SUPPORT_AGENT",
} as const;

function daysBefore(date: Date, days: number): string {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function seedDatabase(database: Database.Database, now = new Date()): void {
  const createdAt = now.toISOString();
  const insertCustomer = database.prepare(
    "INSERT INTO customers (id, full_name, email, created_at) VALUES (?, ?, ?, ?)",
  );
  const insertOrder = database.prepare(
    "INSERT INTO orders (id, order_number, customer_id, purchased_at, placed_at, paid_at, fulfilled_at, shipped_at, delivered_at, subtotal_cents, discount_cents, shipping_cents, tax_cents, total_amount_cents, currency, status, payment_status, fulfillment_status, shipping_method, carrier, tracking_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertOrderItem = database.prepare(
    "INSERT INTO order_items (id, order_id, product_name, sku, unit_price_cents, quantity, is_final_sale) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insertSupportUser = database.prepare(
    "INSERT OR IGNORE INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
  );

  const seed = database.transaction(() => {
    database.exec("DELETE FROM refund_messages; DELETE FROM refund_review_actions; DELETE FROM refund_audit_logs; DELETE FROM refund_requests; DELETE FROM order_items; DELETE FROM orders; DELETE FROM customers;");

    for (const customer of seedCustomers) {
      insertCustomer.run(customer.id, customer.fullName, customer.email, createdAt);
    }

    for (const order of seedOrders) {
      const shippingCents = order.totalAmountCents < 10_000 ? 750 : 0;
      const discountCents = order.orderNumber.endsWith("5") ? 500 : 0;
      const subtotalCents = Math.floor((order.totalAmountCents - shippingCents + discountCents) / 1.075);
      const taxCents = order.totalAmountCents - subtotalCents - shippingCents + discountCents;
      const placedAt = daysBefore(now, order.daysAgo);
      const deliveredAt = daysBefore(now, Math.max(order.daysAgo - 2, 0));
      insertOrder.run(
        order.id,
        order.orderNumber,
        order.customerId,
        placedAt,
        placedAt,
        new Date(new Date(placedAt).getTime() + 5 * 60 * 1000).toISOString(),
        new Date(new Date(placedAt).getTime() + 12 * 60 * 60 * 1000).toISOString(),
        new Date(new Date(placedAt).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        deliveredAt,
        subtotalCents,
        discountCents,
        shippingCents,
        taxCents,
        order.totalAmountCents,
        "USD",
        "DELIVERED",
        "PAID",
        "DELIVERED",
        shippingCents === 0 ? "Standard delivery" : "Economy delivery",
        "Worktoon Logistics",
        `WT-${order.orderNumber.replace("-", "")}`,
        createdAt,
      );
      insertOrderItem.run(
        randomUUID(),
        order.id,
        order.itemName,
        `SKU-${order.orderNumber.replace("WO-", "")}`,
        subtotalCents,
        1,
        Number(order.isFinalSale),
      );
    }

    insertSupportUser.run(
      demoSupportUser.id,
      demoSupportUser.email,
      bcrypt.hashSync(demoSupportUser.password, 12),
      demoSupportUser.role,
      createdAt,
    );
  });

  seed();
}
