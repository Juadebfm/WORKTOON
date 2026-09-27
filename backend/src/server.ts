import Database from "better-sqlite3";

import { createApp } from "./app.js";
import { applySchema } from "./db/schema.js";

const port = Number(process.env.PORT ?? 3000);
const databasePath = process.env.DATABASE_PATH ?? "data/worktoon.db";
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "http://localhost:5173";
const database = new Database(databasePath);

applySchema(database);

createApp({ database, allowedOrigin }).listen(port, () => {
  console.log(`Refund API listening on port ${port}`);
});
