import dotenv from "dotenv";

dotenv.config();

function normalizeOrigin(origin) {
  if (!origin) return null;
  return origin.trim().toLowerCase().replace(/\/$/, "");
}

function requireEnv(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseAllowedOrigins() {
  // Origens configuradas por variáveis de ambiente (com suporte a múltiplas separadas por vírgula)
  const envOrigins = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URLS,
    process.env.FRONTEND_PREVIEW_URL,
    process.env.FRONTEND_PREVIEW_URLS
  ];

  // Origens default hardcoded (sempre permitidas)
  const defaultOrigins = [
    "https://barbeariadofoguinho.online",
    "https://www.barbeariadofoguinho.online",
    "https://scraper-foguinho-frontend.dybxu9.easypanel.host"
  ];

  // Origens de desenvolvimento (localhost)
  const devOrigins = process.env.NODE_ENV === "production" ? [] : [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ];

  // Combinar todas as origens
  const all = [...envOrigins, ...defaultOrigins, ...devOrigins]
    .filter(Boolean)
    .flatMap((value) => value.split(",").map((v) => v.trim().toLowerCase().replace(/\/$/, "")))
    .filter(Boolean);

  const unique = [...new Set(all)];
  
  // Log detalhado
  if (process.env.NODE_ENV !== "production") {
    console.log(`[CONFIG] CORS Origins (${unique.length}):`);
    unique.forEach((origin, idx) => {
      console.log(`  ${idx + 1}. ${origin}`);
    });
  }
  
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
