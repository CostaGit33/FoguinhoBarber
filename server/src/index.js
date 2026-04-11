import express from "express";
import cors from "cors";
import path from "path";

const app = express();

// =========================
// CONFIG
// =========================
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  "https://barbeariadofoguinho.online",
  "https://www.barbeariadofoguinho.online",
  "http://localhost:5173"
];

// =========================
// MIDDLEWARES
// =========================
app.use(express.json());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS bloqueado: " + origin));
    }
  },
  credentials: true
}));

// =========================
// ROTAS
// =========================
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// exemplo login
app.post("/auth/login", (req, res) => {
  return res.json({ message: "login ok (mock)" });
});

// =========================
// SERVIR FRONTEND (IMPORTANTE)
// =========================
const __dirname = new URL('.', import.meta.url).pathname;

app.use(express.static(path.join(__dirname, "../../dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../dist/index.html"));
});

// =========================
// START
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});
