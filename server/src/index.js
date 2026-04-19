import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// =========================
// FIX __dirname (ESM)
// =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =========================
// APP
// =========================
const app = express();
const PORT = process.env.PORT || 4000;

// =========================
// CORS CONFIG
// =========================
const allowedOrigins = [
  "https://barbeariadofoguinho.online",
  "https://www.barbeariadofoguinho.online",
  "http://localhost:5173"
];

app.use(express.json());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS bloqueado: " + origin));
    }
  },
  credentials: true
}));

// =========================
// ROTAS API
// =========================

// health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// auth (mock)
app.post("/api/auth/login", (req, res) => {
  res.json({ message: "login ok (mock)" });
});

// =========================
// BARBEIROS (TESTE REAL)
// =========================
app.get("/api/barbers", (req, res) => {
  res.json([
    {
      id: 1,
      nome: "João Fade",
      avaliacao: 4.8,
      preco: 30,
      distancia: "1.2km"
    },
    {
      id: 2,
      nome: "Carlos Corte",
      avaliacao: 4.6,
      preco: 40,
      distancia: "2.0km"
    }
  ]);
});

// =========================
// SERVIR FRONTEND
// =========================
const distPath = path.join(__dirname, "../../dist");

app.use(express.static(distPath));

// ⚠️ fallback só depois das APIs
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// =========================
// START
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});


});
