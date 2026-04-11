const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

/**
 * 🔐 Headers builder
 */
function buildHeaders(token, hasBody) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

/**
 * 🌐 Verifica se API remota está ativa
 */
export function isRemoteApiEnabled() {
  return Boolean(apiBaseUrl);
}

/**
 * 🚀 Função base de requisição
 */
export async function apiRequest(
  path,
  { method = "GET", token, body } = {}
) {
  if (!apiBaseUrl) {
    throw new Error("VITE_API_URL nao configurada.");
  }

  const requestUrl = `${apiBaseUrl}${path}`;
  const hasBody = Boolean(body);

  let response;

  try {
    console.log(`📡 [API] ${method} ${requestUrl}`);

    response = await fetch(requestUrl, {
      method,
      headers: buildHeaders(token, hasBody),
      body: hasBody ? JSON.stringify(body) : undefined

      // ❌ REMOVIDO:
      // credentials: "include"
      // 👉 Não precisa porque você usa JWT (Authorization header)
      // 👉 Isso evita 90% dos problemas de CORS
    });

    console.log(`✅ [API Response] ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error("❌ [Network Error]", error);

    const err = new Error(
      "Nao foi possivel conectar com a API. Verifique sua conexao ou o servidor."
    );

    err.isNetworkError = true;
    err.originalError = error;

    throw err;
  }

  /**
   * 🧠 Parse seguro da resposta
   */
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  /**
   * ❌ Tratamento de erro HTTP
   */
  if (!response.ok) {
    const message =
      data?.message ||
      `Erro HTTP ${response.status} (${response.statusText})`;

    console.error(`❌ [API Error] ${method} ${path} -> ${message}`);

    const error = new Error(message);
    error.status = response.status;
    error.response = data;

    throw error;
  }

  return data;
}

/**
 * 📦 Camada de serviços da API
 */
export const serverApi = {
  health: () => apiRequest("/health"),

  availability: ({ date, professional }) =>
    apiRequest(
      `/availability?date=${encodeURIComponent(
        date
      )}&professional=${encodeURIComponent(professional)}`
    ),

  login: (body) =>
    apiRequest("/auth/login", {
      method: "POST",
      body
    }),

  register: (body) =>
    apiRequest("/auth/register", {
      method: "POST",
      body
    }),

  me: (token) =>
    apiRequest("/auth/me", {
      token
    }),

  updateProfile: (token, body) =>
    apiRequest("/users/me", {
      method: "PUT",
      token,
      body
    }),

  listBookings: (token) =>
    apiRequest("/bookings", {
      token
    }),

  createBooking: (token, body) =>
    apiRequest("/bookings", {
      method: "POST",
      token,
      body
    }),

  cancelBooking: (token, id) =>
    apiRequest(`/bookings/${id}/cancel`, {
      method: "PATCH",
      token
    }),

  adminUsers: (token) =>
    apiRequest("/admin/users", {
      token
    })
};
