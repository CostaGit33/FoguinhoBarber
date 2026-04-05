const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

function buildHeaders(token) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function isRemoteApiEnabled() {
  return Boolean(apiBaseUrl);
}

export async function apiRequest(path, { method = "GET", token, body } = {}) {
  if (!apiBaseUrl) {
    throw new Error("VITE_API_URL nao configurada.");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: buildHeaders(token),
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message ?? "Erro na API.");
  }

  return data;
}

export const serverApi = {
  health: () => apiRequest("/health"),
  login: (body) => apiRequest("/auth/login", { method: "POST", body }),
  register: (body) => apiRequest("/auth/register", { method: "POST", body }),
  me: (token) => apiRequest("/auth/me", { token }),
  updateProfile: (token, body) => apiRequest("/users/me", { method: "PUT", token, body }),
  listBookings: (token) => apiRequest("/bookings", { token }),
  createBooking: (token, body) => apiRequest("/bookings", { method: "POST", token, body }),
  cancelBooking: (token, id) => apiRequest(`/bookings/${id}/cancel`, { method: "PATCH", token }),
  adminUsers: (token) => apiRequest("/admin/users", { token })
};
