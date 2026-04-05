import { config } from "./config.js";
import { hashPassword } from "./auth.js";
import { query } from "./db.js";

export async function ensureSchema() {
  await query(`
    create extension if not exists "pgcrypto";

    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text not null unique,
      phone text not null,
      password_hash text not null,
      role text not null default 'client' check (role in ('client', 'admin')),
      created_at timestamptz not null default now()
    );

    create table if not exists bookings (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references users(id) on delete set null,
      customer_name text not null,
      customer_email text,
      customer_phone text,
      service_name text not null,
      service_price integer not null,
      service_duration integer not null,
      professional_name text not null,
      booking_date date not null,
      booking_time time not null,
      status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'done')),
      created_at timestamptz not null default now()
    );

    create index if not exists idx_bookings_date_professional on bookings (booking_date, professional_name, booking_time);
  `);
}

export async function ensureAdminUser() {
  const existing = await query("select id from users where email = $1 limit 1", [config.admin.email]);
  if (existing.rows[0]) {
    return;
  }

  const passwordHash = await hashPassword(config.admin.password);
  await query(
    `
      insert into users (name, email, phone, password_hash, role)
      values ($1, $2, $3, $4, 'admin')
    `,
    [config.admin.name, config.admin.email, config.admin.phone, passwordHash]
  );
}
