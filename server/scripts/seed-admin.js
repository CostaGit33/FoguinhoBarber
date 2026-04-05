import { ensureAdminUser, ensureSchema } from "../src/seed.js";
import { pool } from "../src/db.js";

try {
  await ensureSchema();
  await ensureAdminUser();
  console.log("Admin pronto.");
} finally {
  await pool.end();
}
