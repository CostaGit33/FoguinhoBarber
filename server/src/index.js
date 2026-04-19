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

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isValidTimeString(value) {
  return /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function hasBookingConflict(existingBookings, bookingTime, duration, ignoreBookingId = null) {
  const nextStart = timeToMinutes(bookingTime);
  const nextEnd = nextStart + duration;

  return existingBookings.some((booking) => {
    if (ignoreBookingId && booking.id === ignoreBookingId) {
      return false;
    }

    const currentStart = timeToMinutes(String(booking.booking_time).slice(0, 5));
    const currentEnd = currentStart + Number(booking.service_duration);
    return nextStart < currentEnd && nextEnd > currentStart;
  });
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

app.get("/availability", async (req, res) => {
  const { date, professional } = req.query ?? {};

  if (!isNonEmptyString(date) || !isNonEmptyString(professional) || !isValidFutureDate(date)) {
    return res.status(400).json({ message: "Parametros de disponibilidade invalidos." });
  }

  const { rows } = await query(
    `
      select *
      from bookings
      where booking_date = $1
        and professional_name = $2
        and status = 'scheduled'
      order by booking_time asc, created_at asc
    `,
    [date, professional.trim()]
  );

  res.json({ bookings: rows });
});

app.put("/users/me", requireAuth, async (req, res) => {
  const { name, email, phone } = req.body ?? {};

  if (![name, email, phone].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Dados invalidos." });
  }

  const normalizedEmail = normalizeEmail(email);
  const { rows: existingUsers } = await query(
    "select id from users where email = $1 and id <> $2 limit 1",
    [normalizedEmail, req.user.id]
  );

  if (existingUsers[0]) {
    return res.status(409).json({ message: "Email ja existe." });
  }

  const { rows } = await query(
    `
      update users
      set name = $1,
          email = $2,
          phone = $3
      where id = $4
      returning id, name, email, phone, role, created_at
    `,
    [name.trim(), normalizedEmail, phone.trim(), req.user.id]
  );

  res.json({ user: rows[0] });
});

app.get("/bookings", requireAuth, async (req, res) => {
  const params = [];
  let whereClause = "";

  if (req.user.role !== "admin") {
    params.push(req.user.id, req.user.email);
    whereClause = "where user_id = $1 or customer_email = $2";
  }

  const { rows } = await query(
    `
      select *
      from bookings
      ${whereClause}
      order by booking_date asc, booking_time asc, created_at asc
    `,
    params
  );

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

  if (
    ![customerName, customerPhone, serviceName, professionalName, bookingDate, bookingTime].every(isNonEmptyString) ||
    !isPositiveInteger(Number(servicePrice)) ||
    !isPositiveInteger(Number(serviceDuration)) ||
    !isValidFutureDate(bookingDate) ||
    !isValidTimeString(bookingTime)
  ) {
    return res.status(400).json({ message: "Dados do agendamento invalidos." });
  }

  const normalizedDuration = Number(serviceDuration);
  const normalizedPrice = Number(servicePrice);

  const { rows: dayBookings } = await query(
    `
      select id, booking_time, service_duration
      from bookings
      where booking_date = $1
        and professional_name = $2
        and status = 'scheduled'
      order by booking_time asc
    `,
    [bookingDate, professionalName.trim()]
  );

  if (hasBookingConflict(dayBookings, bookingTime, normalizedDuration)) {
    return res.status(409).json({ message: "Esse horario nao esta mais disponivel." });
  }

  const { rows } = await query(
    `
      insert into bookings (
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        service_name,
        service_price,
        service_duration,
        professional_name,
        booking_date,
        booking_time,
        status
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'scheduled')
      returning *
    `,
    [
      req.user.id,
      customerName.trim(),
      req.user.email,
      customerPhone.trim(),
      serviceName.trim(),
      normalizedPrice,
      normalizedDuration,
      professionalName.trim(),
      bookingDate,
      bookingTime
    ]
  );

  res.status(201).json({ booking: rows[0] });
});

app.patch("/bookings/:id/cancel", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { rows } = await query(
    "select * from bookings where id = $1 limit 1",
    [id]
  );

  const booking = rows[0];

  if (!booking) {
    return res.status(404).json({ message: "Agendamento nao encontrado." });
  }

  const isOwner =
    booking.user_id === req.user.id ||
    (booking.customer_email && booking.customer_email === req.user.email);

  if (req.user.role !== "admin" && !isOwner) {
    return res.status(403).json({ message: "Voce nao pode cancelar este agendamento." });
  }

  if (booking.status === "cancelled") {
    return res.json({ booking });
  }

  const { rows: updatedRows } = await query(
    `
      update bookings
      set status = 'cancelled'
      where id = $1
      returning *
    `,
    [id]
  );

  res.json({ booking: updatedRows[0] });
});

app.get("/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await query(
    `
      select id, name, email, phone, role, created_at
      from users
      order by created_at desc
    `
  );

  res.json({ users: rows });
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
