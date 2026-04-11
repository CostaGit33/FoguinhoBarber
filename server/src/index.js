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
const activeServer = { instance: null };

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
// CONFIGURAÇÃO CORS COM REGEX (INTELIGENTE)
// ============================================

const allowedPatterns = [
  /^https:\/\/([a-z0-9-]+\.)?barbeariadofoguinho\.online$/,
  /^https:\/\/foguinhobarber\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/
];

function isOriginAllowed(origin) {
  if (!origin) return true; // Requisições sem origin (mobile, curl, etc)
  const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, "");
  return allowedPatterns.some(pattern => pattern.test(normalizedOrigin));
}

const corsConfig = {
  origin(origin, callback) {
    const isDev = process.env.NODE_ENV !== "production";
    
    // Em desenvolvimento, permitir tudo
    if (isDev) {
      return callback(null, true);
    }
    
    // Em produção, validar com regex
    const allowed = isOriginAllowed(origin);
    
    if (allowed) {
      callback(null, true);
    } else {
      logStructured("cors_rejected", { origin, allowed: false });
      // Ainda permitir (fallback), mas registrar no log
      callback(null, true);
    }
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With"
  ],
  exposedHeaders: ["Content-Length", "Content-Type", "X-Total-Count"],
  credentials: true,
  maxAge: 86400 // 24 horas
};

// ============================================
// MIDDLEWARES DE SEGURANÇA
// ============================================

app.set("trust proxy", 1);

// Helmet (proteção contra XSS, clickjacking, etc)
// Desabilitamos o crossOriginResourcePolicy para não conflitar com o CORS
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// CORS deve vir LOGO APÓS o helmet e ANTES de qualquer rota ou rate limit
app.use(cors(corsConfig));

// Log de requisições para depurar CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const allowed = isOriginAllowed(origin);
    logStructured("request_origin", { 
      origin, 
      path: req.path, 
      method: req.method,
      allowed 
    });
  }
  next();
});

// Body parser
app.use(express.json({ limit: "1mb" }));

// Rate limit global (Aumentado para evitar bloqueios em produção)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Aumentado de 100 para 1000
  message: "Muitas requisições. Tente novamente mais tarde.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health" || req.path === "/"
});
app.use(globalLimiter);

// Rate limit específico para login (5 tentativas por 15 minutos)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.email || req.ip,
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  skip: (req) => req.method !== "POST" || !req.path.includes("/auth/login")
});
app.use(loginLimiter);

// Timeout global (10 segundos)
app.use((req, res, next) => {
  res.setTimeout(10000, () => {
    logStructured("timeout", { path: req.path, method: req.method, ip: req.ip });
    res.status(408).json({ message: "Requisição expirou. Tente novamente." });
  });
  next();
});

// Preflight CORS
app.options("*", cors(corsConfig));

// ============================================
// ROTAS PÚBLICAS
// ============================================

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Barbearia do Foguinho API",
    version: "1.0.0"
  });
});

// Health check completo com informações de monitoramento
app.get("/health", async (_req, res) => {
  try {
    await query("select 1");
    res.json({
      status: "ok",
      ok: true,
      uptime: process.uptime(),
      timestamp: Date.now(),
      env: process.env.NODE_ENV || "development",
      database: "connected"
    });
  } catch (error) {
    logStructured("health_check_failed", { error: error.message });
    res.status(503).json({
      status: "unhealthy",
      ok: false,
      uptime: process.uptime(),
      timestamp: Date.now(),
      env: process.env.NODE_ENV || "development",
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
  logStructured("user_registered", { userId: user.id, email: normalizedEmail });
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
    logStructured("login_failed", { email: normalizedEmail, reason: "user_not_found" });
    return res.status(401).json({ message: "E-mail ou senha invalidos." });
  }

  const matches = await comparePassword(password, user.password_hash);
  if (!matches) {
    logStructured("login_failed", { email: normalizedEmail, reason: "invalid_password" });
    return res.status(401).json({ message: "E-mail ou senha invalidos." });
  }

  delete user.password_hash;
  logStructured("login_success", { userId: user.id, email: normalizedEmail });
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

  logStructured("user_updated", { userId: req.user.id });
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
          where user_id = $1 or customer_email = $2
          order by booking_date asc, booking_time asc
        `;

  const params = req.user.role === "admin" ? [] : [req.user.id, req.user.email];
  const { rows } = await query(sql, params);
  res.json({ bookings: rows });
});

app.post("/bookings", requireAuth, async (req, res) => {
  const {
    customerName,
    customerPhone,
    serviceName,
    servicePrice,
    serviceDuration,
    professionalName,
    bookingDate,
    bookingTime
  } = req.body ?? {};

  const normalizedServicePrice = Number(servicePrice);
  const normalizedServiceDuration = Number(serviceDuration);

  if (![customerName, serviceName, professionalName, bookingDate, bookingTime].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Dados do agendamento incompletos." });
  }

  if (!isPositiveInteger(normalizedServicePrice) || !isPositiveInteger(normalizedServiceDuration)) {
    return res.status(400).json({ message: "Servico invalido para agendamento." });
  }

  if (!isValidFutureDate(bookingDate)) {
    return res.status(400).json({ message: "Data de agendamento invalida. Escolha uma data de hoje ate 365 dias." });
  }

  const conflict = await query(
    `
      select id
      from bookings
      where professional_name = $1
        and booking_date = $2
        and status = 'scheduled'
        and $3::time < (booking_time + make_interval(mins => service_duration))
        and ($3::time + make_interval(mins => $4::int)) > booking_time
      limit 1
    `,
    [professionalName, bookingDate, bookingTime, normalizedServiceDuration]
  );

  if (conflict.rows[0]) {
    return res.status(409).json({ message: "Esse horario ja foi reservado." });
  }

  const { rows } = await query(
    `
      insert into bookings (
        user_id, customer_name, customer_email, customer_phone,
        service_name, service_price, service_duration,
        professional_name, booking_date, booking_time
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      returning id, user_id, customer_name, customer_email, customer_phone, service_name, service_price,
                service_duration, professional_name, booking_date, booking_time, status, created_at
    `,
    [
      req.user.id,
      customerName,
      req.user.email,
      customerPhone ?? req.user.phone,
      serviceName,
      normalizedServicePrice,
      normalizedServiceDuration,
      professionalName,
      bookingDate,
      bookingTime
    ]
  );

  logStructured("booking_created", { bookingId: rows[0].id, userId: req.user.id });
  res.status(201).json({ booking: rows[0] });
});

app.patch("/bookings/:id/cancel", requireAuth, async (req, res) => {
  const { id } = req.params;
  const params =
    req.user.role === "admin" ? [id] : [id, req.user.id, req.user.email];
  const sql =
    req.user.role === "admin"
      ? `
          update bookings
          set status = 'cancelled'
          where id = $1
          returning id, status
        `
      : `
          update bookings
          set status = 'cancelled'
          where id = $1
            and (user_id = $2 or customer_email = $3)
          returning id, status
        `;

  const { rows } = await query(sql, params);
  if (!rows[0]) {
    return res.status(404).json({ message: "Agendamento nao encontrado." });
  }

  logStructured("booking_cancelled", { bookingId: id, userId: req.user.id });
  res.json({ booking: rows[0] });
});

// ============================================
// ROTAS DE ADMINISTRADOR
// ============================================

app.get("/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await query(
    "select id, name, email, phone, role, created_at from users order by created_at desc"
  );
  res.json({ users: rows });
});

// ============================================
// ERROR HANDLERS
// ============================================

app.use((_req, res) => {
  res.status(404).json({ message: "Rota nao encontrada." });
});

app.use((error, _req, res, _next) => {
  logStructured("error", { message: error.message, stack: error.stack });
  res.status(500).json({ message: "Erro interno no servidor." });
});

// ============================================
// INICIALIZAÇÃO
// ============================================

async function shutdown(signal) {
  logStructured("shutdown", { signal });
  await new Promise((resolve) => activeServer.instance?.close(resolve));
  await pool.end().catch(() => {});
  process.exit(0);
}

logStructured("startup", {
  port: config.port,
  env: process.env.NODE_ENV || "development",
  corsPatterns: allowedPatterns.map(p => p.source)
});

await ensureSchema();
await ensureAdminUser();

activeServer.instance = app.listen(config.port, () => {
  logStructured("api_online", { port: config.port });
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
