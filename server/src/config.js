import dotenv from "dotenv";

dotenv.config();

function requireEnv(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET", "dev-secret-change-me"),
  admin: {
    name: process.env.ADMIN_NAME ?? "Administrador",
    email: (process.env.ADMIN_EMAIL ?? "admin@foguinhobarber.com").toLowerCase(),
    password: process.env.ADMIN_PASSWORD ?? "admin123",
    phone: process.env.ADMIN_PHONE ?? "(24) 99874-7229"
  }
};
