import dotenv from "dotenv";

dotenv.config();

function requireEnv(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseAllowedOrigins() {
  // Origens configuradas por variáveis de ambiente
  const envOrigins = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URLS,
    process.env.FRONTEND_PREVIEW_URL,
    process.env.FRONTEND_PREVIEW_URLS
  ];

  // Origens default hardcoded - SEMPRE permitidas em qualquer deploy
  const defaultOrigins = [
    "https://barbeariadofoguinho.online",
    "https://www.barbeariadofoguinho.online",
    "https://scraper-foguinho-frontend.dybxu9.easypanel.host",
    "https://foguinhobarber.vercel.app",
    "http://barbeariadofoguinho.online",
    "http://www.barbeariadofoguinho.online"
  ];

  // Origens de desenvolvimento (apenas se NÃO for produção)
  const devOrigins = process.env.NODE_ENV === "production" ? [] : [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4000",
    "http://127.0.0.1:4000"
  ];

  // Combinar e normalizar todas as origens
  const all = [...envOrigins, ...defaultOrigins, ...devOrigins]
    .filter(Boolean) // Remove null/undefined
    .flatMap((value) => 
      value
        .split(",")
        .map((v) => v.trim().toLowerCase().replace(/\/$/, ""))
        .filter(Boolean)
    );

  // Remover duplicatas
  const unique = [...new Set(all)];
  
  // Log detalhado
  console.log(`✓ [CONFIG] CORS - Allowed Origins (${unique.length}):`);
  unique.forEach((origin, idx) => {
    const isDefault = defaultOrigins.some(o => o.toLowerCase().replace(/\/$/, "") === origin);
    const icon = isDefault ? "📌" : "📍";
    console.log(`  ${icon} ${idx + 1}. ${origin}`);
  });
  
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
