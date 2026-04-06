const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

function buildHeaders(token) {
  const headers = {};

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

  let response;
  try {
    const requestUrl = `${apiBaseUrl}${path}`;
    console.log(`[API] ${method} ${requestUrl}`);
    
    response = await fetch(requestUrl, {
      method,
      headers: {
        ...buildHeaders(token),
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    console.log(`[API Response] ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error(`[API Error] Nao foi possivel conectar:`, error.message);
    const err = new Error(`Nao foi possivel conectar com a API: ${error.message}`);
    err.isNetworkError = true;
    err.originalError = error;
    throw err;
  }

  // Tentar parsear response
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  
  if (!response.ok) {
    const errorMsg = data.message ?? `HTTP ${response.status}`;
    console.error(`[API Error] ${method} ${path} - ${errorMsg}`);
    const error = new Error(errorMsg);
    error.status = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

export const serverApi = {
  health: () => apiRequest("/health"),
  availability: ({ date, professional }) =>
    apiRequest(`/availability?date=${encodeURIComponent(date)}&professional=${encodeURIComponent(professional)}`),
  login: (body) => apiRequest("/auth/login", { method: "POST", body }),
  register: (body) => apiRequest("/auth/register", { method: "POST", body }),
  me: (token) => apiRequest("/auth/me", { token }),
  updateProfile: (token, body) => apiRequest("/users/me", { method: "PUT", token, body }),
  listBookings: (token) => apiRequest("/bookings", { token }),
  createBooking: (token, body) => apiRequest("/bookings", { method: "POST", token, body }),
  cancelBooking: (token, id) => apiRequest(`/bookings/${id}/cancel`, { method: "PATCH", token }),
  adminUsers: (token) => apiRequest("/admin/users", { token })
};
