import dotenv from "dotenv";

dotenv.config();

function requireEnv(name, fallback = "") {
  const value = process.env[name] ?? fallback;

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function normalizeOrigin(origin) {
  return origin.trim().toLowerCase().replace(/\/$/, "");
}

function parseAllowedOrigins() {
  const envOriginsRaw = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URLS,
    process.env.FRONTEND_PREVIEW_URL,
    process.env.FRONTEND_PREVIEW_URLS
  ];

  const defaultOrigins = [
    "https://barbeariadofoguinho.online",
    "https://www.barbeariadofoguinho.online",
    "https://foguinhobarber.vercel.app",
    "https://scraper-foguinho-frontend.dybxu9.easypanel.host"
  ];

  const devOrigins =
    process.env.NODE_ENV === "production"
      ? []
      : [
          "http://localhost:5173",
          "http://127.0.0.1:5173",
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:4000",
          "http://127.0.0.1:4000"
        ];

  const allOrigins = [
    ...envOriginsRaw
      .filter(Boolean)
      .flatMap((value) =>
        value
          .split(",")
          .map((v) => normalizeOrigin(v))
          .filter(Boolean)
      ),
    ...defaultOrigins.map(normalizeOrigin),
    ...devOrigins.map(normalizeOrigin)
  ];

  const unique = [...new Set(allOrigins)];

  if (unique.length === 0) {
    console.warn("⚠️ Nenhuma origem configurada para CORS!");
  }

  console.log("\n========================================");
  console.log(`🔒 CORS Allowed Origins (${unique.length})`);
  console.log("========================================");

  unique.forEach((origin, i) => {
    console.log(`✓ ${i + 1}. ${origin}`);
  });

  console.log("========================================\n");

  return unique;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),

  clientUrl:
    process.env.CLIENT_URL?.trim() || "http://localhost:5173",

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
