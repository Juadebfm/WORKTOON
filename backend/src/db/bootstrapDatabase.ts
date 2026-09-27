import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { applySchema } from "./schema.js";
import { seedDatabase } from "./seed.js";

const databasePath = process.env.DATABASE_PATH ?? "data/worktoon.db";

mkdirSync(dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
applySchema(database);

// Seed only a new database so submitted refund requests survive restarts.
const customerCount = database.prepare("SELECT COUNT(*) AS count FROM customers").get() as { count: number };
if (customerCount.count === 0) seedDatabase(database);

database.close();
