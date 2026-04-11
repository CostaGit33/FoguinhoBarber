import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { comparePassword, hashPassword, signToken } from "./auth.js";
import { config } from "./config.js";
import { pool, query } from "./db.js";
import { requireAdmin, requireAuth } from "./middleware.js";
import { ensureAdminUser, ensureSchema } from "./seed.js";

const app = express();

// ============================================
// UTILIDADES
// ============================================

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

// Função para logs estruturados (JSON)
function logStructured(type, data = {}) {
  console.log(JSON.stringify({
    type,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    ...data
  }));
}

// ============================================
// MIDDLEWARES DE SEGURANÇA
// ============================================

app.set("trust proxy", 1);

// Helmet (proteção contra XSS, clickjacking, etc)
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// CORS SIMPLIFICADO PARA TESTE
app.use(cors({
  origin: true, // Permite qualquer origem que faça a requisição
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"]
}));

// Body parser
app.use(express.json({ limit: "1mb" }));

// Rate limit global (Aumentado para evitar bloqueios em produção)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Muitas requisições. Tente novamente mais tarde.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health" || req.path === "/"
});
app.use(globalLimiter);

// ============================================
// ROTAS PÚBLICAS
// ============================================

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Barbearia do Foguinho API",
    version: "1.1.0",
    cors: "simplified"
  });
});

// Health check completo
app.get("/health", async (_req, res) => {
  try {
    await query("select 1");
    res.json({
      status: "ok",
      ok: true,
      uptime: process.uptime(),
      timestamp: Date.now(),
      database: "connected",
      cors: "simplified"
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      ok: false,
      database: "disconnected",
      error: error.message
    });
  }
});

app.get("/availability", async (req, res) => {
  const { date, professional } = req.query ?? {};
  if (!date || !professional) {
    return res.status(400).json({ message: "Informe data e profissional." });
  }

  const { rows } = await query(
    `
      select id, professional_name, booking_date, booking_time, service_duration, status
      from bookings
      where professional_name = $1
        and booking_date = $2
        and status = 'scheduled'
      order by booking_time asc
    `,
    [professional, date]
  );

  res.json({ bookings: rows });
});

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

app.post("/auth/register", async (req, res) => {
  const { name, email, phone, password } = req.body ?? {};
  if (![name, email, phone, password].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Preencha nome, e-mail, telefone e senha." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await query("select id from users where email = $1 limit 1", [normalizedEmail]);
  if (existing.rows[0]) {
    return res.status(409).json({ message: "Ja existe uma conta com esse e-mail." });
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await query(
    `
      insert into users (name, email, phone, password_hash)
      values ($1, $2, $3, $4)
      returning id, name, email, phone, role, created_at
    `,
    [name.trim(), normalizedEmail, phone.trim(), passwordHash]
  );

  const user = rows[0];
  res.status(201).json({ token: signToken(user), user });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (![email, password].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Informe e-mail e senha." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  
  const { rows } = await query(
    "select id, name, email, phone, role, created_at, password_hash from users where email = $1 limit 1",
    [normalizedEmail]
  );
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ message: "E-mail ou senha invalidos." });
  }

  const matches = await comparePassword(password, user.password_hash);
  if (!matches) {
    return res.status(401).json({ message: "E-mail ou senha invalidos." });
  }

  delete user.password_hash;
  res.json({ token: signToken(user), user });
});

app.get("/auth/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// ============================================
// ROTAS DE USUÁRIO
// ============================================

app.put("/users/me", requireAuth, async (req, res) => {
  const { name, email, phone } = req.body ?? {};
  const normalizedEmail = email?.trim().toLowerCase();

  if (name !== undefined && !isNonEmptyString(name)) {
    return res.status(400).json({ message: "Informe um nome valido." });
  }

  if (email !== undefined && !isNonEmptyString(email)) {
    return res.status(400).json({ message: "Informe um e-mail valido." });
  }

  if (phone !== undefined && !isNonEmptyString(phone)) {
    return res.status(400).json({ message: "Informe um telefone valido." });
  }

  if (normalizedEmail && normalizedEmail !== req.user.email) {
    const existing = await query("select id from users where email = $1 and id <> $2 limit 1", [
      normalizedEmail,
      req.user.id
    ]);

    if (existing.rows[0]) {
      return res.status(409).json({ message: "Ja existe uma conta com esse e-mail." });
    }
  }

  const { rows } = await query(
    `
      update users
      set name = $1, email = $2, phone = $3
      where id = $4
      returning id, name, email, phone, role, created_at
    `,
    [name?.trim() ?? req.user.name, normalizedEmail ?? req.user.email, phone?.trim() ?? req.user.phone, req.user.id]
  );

  res.json({ user: rows[0] });
});

// ============================================
// ROTAS DE AGENDAMENTO
// ============================================

app.get("/bookings", requireAuth, async (req, res) => {
  const sql =
    req.user.role === "admin"
      ? `
          select id, user_id, customer_name, customer_email, customer_phone, service_name, service_price,
                 service_duration, professional_name, booking_date, booking_time, status, created_at
          from bookings
          order by booking_date asc, booking_time asc
        `
      : `
          select id, user_id, customer_name, customer_email, customer_phone, service_name, service_price,
                 service_duration, professional_name, booking_date, booking_time, status, created_at
          from bookings
          where user_id = $1
          order by booking_date asc, booking_time asc
        `;

  const params = req.user.role === "admin" ? [] : [req.user.id];
  const { rows } = await query(sql, params);
  res.json({ bookings: rows });
});

app.post("/bookings", requireAuth, async (req, res) => {
  const {
    customer_name,
    customer_email,
    customer_phone,
    service_name,
    service_price,
    service_duration,
    professional_name,
    booking_date,
    booking_time
  } = req.body ?? {};

  if (
    ![customer_name, customer_email, customer_phone, service_name, professional_name, booking_date, booking_time].every(
      isNonEmptyString
    ) ||
    !isPositiveInteger(service_price) ||
    !isPositiveInteger(service_duration)
  ) {
    return res.status(400).json({ message: "Dados de agendamento incompletos ou invalidos." });
  }

  if (!isValidFutureDate(booking_date)) {
    return res.status(400).json({ message: "Data de agendamento invalida ou muito distante." });
  }

  const { rows } = await query(
    `
      insert into bookings (
        user_id, customer_name, customer_email, customer_phone, service_name,
        service_price, service_duration, professional_name, booking_date, booking_time
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      returning *
    `,
    [
      req.user.id,
      customer_name.trim(),
      customer_email.trim().toLowerCase(),
      customer_phone.trim(),
      service_name.trim(),
      service_price,
      service_duration,
      professional_name.trim(),
      booking_date,
      booking_time
    ]
  );

  res.status(201).json({ booking: rows[0] });
});

app.patch("/bookings/:id/cancel", requireAuth, async (req, res) => {
  const { id } = req.params;
  const sql =
    req.user.role === "admin"
      ? "update bookings set status = 'cancelled' where id = $1 returning *"
      : "update bookings set status = 'cancelled' where id = $1 and user_id = $2 returning *";

  const params = req.user.role === "admin" ? [id] : [id, req.user.id];
  const { rows } = await query(sql, params);

  if (!rows[0]) {
    return res.status(404).json({ message: "Agendamento nao encontrado." });
  }

  res.json({ booking: rows[0] });
});

// ============================================
// ROTAS DE ADMIN
// ============================================

app.get("/admin/users", requireAdmin, async (_req, res) => {
  const { rows } = await query("select id, name, email, phone, role, created_at from users order by created_at desc");
  res.json({ users: rows });
});

// ============================================
// INICIALIZAÇÃO
// ============================================

async function start() {
  try {
    await ensureSchema();
    await ensureAdminUser();
    
    app.listen(config.port, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();
