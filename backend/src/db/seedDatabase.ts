import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { applySchema } from "./schema.js";
import { seedDatabase } from "./seed.js";

const databasePath = process.env.DATABASE_PATH ?? "data/worktoon.db";

mkdirSync(dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
applySchema(database);
seedDatabase(database);
database.close();

console.log(`Seeded SQLite database at ${databasePath}`);
