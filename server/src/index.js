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
  
  if (recentAttempts.length >= 5) {
    return false;
  }
  
  recentAttempts.push(now);
  loginAttempts.set(email, recentAttempts);
  return true;
}

app.set("trust proxy", 1);

// Configuração CORS Explícita (Similar a .AddDefaultPolicy em .NET)
const corsConfig = {
  // WithOrigins("urls...")
  origin(origin, callback) {
    // Permite requisições sem origin (mobile apps, curl, postman, same-origin)
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, "");
    const isAllowed = config.allowedOrigins.includes(normalizedOrigin);
    
    console.log(`[CORS CHECK] Origin: ${normalizedOrigin} | Allowed: ${isAllowed}`);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS REJECTED] Origin: ${normalizedOrigin}`);
      console.warn(`[CORS INFO] Allowed list: ${config.allowedOrigins.join(", ")}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  // WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  // WithHeaders("Content-Type", "Authorization") + mais alguns úteis
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With"
  ],
  exposedHeaders: ["Content-Length", "Content-Type", "X-Total-Count"],
  credentials: true,
  maxAge: 86400 // 24 horas - cache de preflight
};

app.use(cors(corsConfig));

app.use(helmet());
app.use(express.json({ limit: "1mb" }));

// Handle preflight requests explicitamente com a MESMA config
app.options("*", cors(corsConfig));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Barbearia do Foguinho API"
  });
});

app.get("/health", async (_req, res) => {
  try {
    await query("select 1");
    res.json({ ok: true, status: "healthy" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(503).json({ ok: false, status: "unhealthy", error: error.message });
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
  
  if (!checkRateLimit(normalizedEmail)) {
    return res.status(429).json({ message: "Muitas tentativas de login. Tente novamente em 15 minutos." });
  }
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

  res.json({ booking: rows[0] });
});

app.get("/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await query(
    "select id, name, email, phone, role, created_at from users order by created_at desc"
  );
  res.json({ users: rows });
});

app.use((_req, res) => {
  res.status(404).json({ message: "Rota nao encontrada." });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Erro interno no servidor." });
});

async function shutdown(signal) {
  console.log(`Encerrando API com sinal ${signal}...`);
  await new Promise((resolve) => activeServer.instance?.close(resolve));
  await pool.end().catch(() => {});
  process.exit(0);
}

console.log("\n========================================");
console.log("🔒 CORS Security Policy Configured");
console.log("========================================");
console.log(`Allowed Origins (${config.allowedOrigins.length}):`);
config.allowedOrigins.forEach((origin) => {
  console.log(`  ✓ ${origin}`);
});
console.log("========================================\n");

await ensureSchema();
await ensureAdminUser();

activeServer.instance = app.listen(config.port, () => {
  console.log(`API online na porta ${config.port}`);
  console.log(`Origens liberadas: ${config.allowedOrigins.join(", ")}`);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});
