import cors from "cors";
import express from "express";
import helmet from "helmet";
import { comparePassword, hashPassword, signToken } from "./auth.js";
import { config } from "./config.js";
import { pool, query } from "./db.js";
import { requireAdmin, requireAuth } from "./middleware.js";
import { ensureAdminUser, ensureSchema } from "./seed.js";

const app = express();
const activeServer = { instance: null };

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isValidFutureDate(dateString) {
  const bookingDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 365);

  return bookingDate >= today && bookingDate <= maxDate;
}

const loginAttempts = new Map();
function checkRateLimit(email) {
  const attempts = loginAttempts.get(email) || [];
  const now = Date.now();

  const recentAttempts = attempts.filter((t) => now - t < 15 * 60 * 1000);

  if (recentAttempts.length >= 5) return false;

  recentAttempts.push(now);
  loginAttempts.set(email, recentAttempts);

  return true;
}

app.set("trust proxy", 1);

const corsConfig = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, "");
    const isAllowed = config.allowedOrigins.includes(normalizedOrigin);

    if (isAllowed) return callback(null, true);

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With"
  ],
  credentials: true
};

app.use(cors(corsConfig));
app.options("*", cors(corsConfig));

app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, name: "API Barbearia" });
});

app.get("/health", async (_req, res) => {
  try {
    await query("select 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.post("/auth/register", async (req, res) => {
  const { name, email, phone, password } = req.body ?? {};

  if (![name, email, phone, password].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await query(
    "select id from users where email = $1 limit 1",
    [normalizedEmail]
  );

  if (existing.rows[0]) {
    return res.status(409).json({ message: "Email já existe." });
  }

  const passwordHash = await hashPassword(password);

  const { rows } = await query(
    `insert into users (name,email,phone,password_hash)
     values ($1,$2,$3,$4)
     returning id,name,email,phone,role,created_at`,
    [name.trim(), normalizedEmail, phone.trim(), passwordHash]
  );

  const user = rows[0];

  res.status(201).json({
    token: signToken(user),
    user
  });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (![email, password].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Credenciais inválidas." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!checkRateLimit(normalizedEmail)) {
    return res.status(429).json({ message: "Muitas tentativas." });
  }

  const { rows } = await query(
    "select * from users where email=$1 limit 1",
    [normalizedEmail]
  );

  const user = rows[0];

  if (!user) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  const valid = await comparePassword(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  delete user.password_hash;

  res.json({
    token: signToken(user),
    user
  });
});

app.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, message: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, message: "Erro interno" });
});

async function shutdown(signal) {
  console.log(`Encerrando (${signal})`);
  await new Promise((resolve) => activeServer.instance?.close(resolve));
  await pool.end().catch(() => {});
  process.exit(0);
}

await ensureSchema();
await ensureAdminUser();

activeServer.instance = app.listen(config.port, () => {
  console.log(`API rodando na porta ${config.port}`);
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
