const API_BASE = "/api";

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("authToken");
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("authToken");
}

function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem("authToken", token);
  } else {
    clearAuthToken();
  }
}

function parseErrorMessage(response, bodyText) {
  try {
    const data = JSON.parse(bodyText);
    if (data.message) return data.message;
    if (data.errors) {
      const first = Object.values(data.errors).flat()[0];
      if (first) return first;
    }
  } catch {
    // not JSON
  }
  return bodyText || `Request failed: ${response.status}`;
}

async function request(path, options = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    if (response.status === 401 && token) {
      clearAuthToken();
    }
    throw new Error(parseErrorMessage(response, bodyText));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  async register(payload) {
    const data = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(data.token);
    return data;
  },
  async login(payload) {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(data.token);
    return data;
  },
  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      clearAuthToken();
    }
  },
  me: () => request("/auth/me"),

  listSubUsers: () => request("/sub-users"),
  createSubUser: (payload) =>
    request("/sub-users", { method: "POST", body: JSON.stringify(payload) }),
  updateSubUser: (id, payload) =>
    request(`/sub-users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSubUser: (id) => request(`/sub-users/${id}`, { method: "DELETE" }),

  getAppState: () => request("/app-state"),
  saveClient: (client) =>
    request("/clients", { method: "POST", body: JSON.stringify(client) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: "DELETE" }),
  saveProduct: (product) =>
    request(`/products/${product.id}`, { method: "PUT", body: JSON.stringify(product) }),
  createProduct: (product) =>
    request("/products", { method: "POST", body: JSON.stringify(product) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  saveProposal: (proposal) =>
    request(`/proposals/${proposal.id}`, { method: "PUT", body: JSON.stringify(proposal) }),
  createProposal: (proposal) =>
    request("/proposals", { method: "POST", body: JSON.stringify(proposal) }),
  deleteProposal: (id) => request(`/proposals/${id}`, { method: "DELETE" }),
  sendProposalEmail: (payload) =>
    request("/proposals/send-email", { method: "POST", body: JSON.stringify(payload) }),
  saveSettings: (settings) =>
    request("/settings", { method: "PUT", body: JSON.stringify(settings) }),
};

export async function upsertProposal(proposal) {
  return api.createProposal(proposal);
}
