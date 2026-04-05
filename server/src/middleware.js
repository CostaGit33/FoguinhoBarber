import { extractToken, verifyToken } from "./auth.js";
import { query } from "./db.js";

export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: "Token ausente." });
    }

    const payload = verifyToken(token);
    const { rows } = await query(
      "select id, name, email, phone, role, created_at from users where id = $1 limit 1",
      [payload.sub]
    );

    if (!rows[0]) {
      return res.status(401).json({ message: "Usuario nao encontrado." });
    }

    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ message: "Sessao invalida ou expirada." });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Acesso restrito ao administrador." });
  }

  next();
}
