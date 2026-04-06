import dotenv from "dotenv";

dotenv.config();

function requireEnv(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeOrigin(origin) {
  if (!origin) return null;
  return origin.trim().toLowerCase().replace(/\/$/, "");
}

function parseAllowedOrigins() {
  const configured = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URLS,
    process.env.FRONTEND_PREVIEW_URL,
    process.env.FRONTEND_PREVIEW_URLS,
    "https://barbeariadofoguinho.online",
    "https://www.barbeariadofoguinho.online",
    "https://scraper-foguinho-frontend.dybxu9.easypanel.host",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(",").map((v) => v.trim()))
    .map(normalizeOrigin)
    .filter(Boolean);

  const unique = [...new Set(configured)];
  console.log(`Allowed CORS origins: ${unique.join(", ")}`);
  return unique;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  allowedOrigins: parseAllowedOrigins(),
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  admin: {
    name: requireEnv("ADMIN_NAME"),
    email: requireEnv("ADMIN_EMAIL").toLowerCase(),
    password: requireEnv("ADMIN_PASSWORD"),
    phone: requireEnv("ADMIN_PHONE")
  }
};
