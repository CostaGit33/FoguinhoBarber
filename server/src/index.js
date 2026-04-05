import cors from "cors";
import express from "express";
import helmet from "helmet";
import { comparePassword, hashPassword, signToken } from "./auth.js";
import { config } from "./config.js";
import { query } from "./db.js";
import { requireAdmin, requireAuth } from "./middleware.js";
import { ensureAdminUser, ensureSchema } from "./seed.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [config.clientUrl].filter(Boolean),
    credentials: true
  })
);
app.use(express.json());

app.get("/health", async (_req, res) => {
  await query("select 1");
  res.json({ ok: true });
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
  if (!name || !email || !phone || !password) {
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
  if (!email || !password) {
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

app.put("/users/me", requireAuth, async (req, res) => {
  const { name, email, phone } = req.body ?? {};
  const normalizedEmail = email?.trim().toLowerCase();

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

  if (!customerName || !serviceName || !professionalName || !bookingDate || !bookingTime) {
    return res.status(400).json({ message: "Dados do agendamento incompletos." });
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
    [professionalName, bookingDate, bookingTime, serviceDuration]
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
      servicePrice,
      serviceDuration,
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

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Erro interno no servidor." });
});

await ensureSchema();
await ensureAdminUser();

app.listen(config.port, () => {
  console.log(`API online na porta ${config.port}`);
});
