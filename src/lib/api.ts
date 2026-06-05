/**
 * Nepal Route – typed API client
 * All communication with the Express backend lives here.
 * Falls back gracefully to localStorage when the backend is unreachable.
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// ── Token helpers ────────────────────────────────────────────────────
const ACCESS_KEY  = "nr_access";
const REFRESH_KEY = "nr_refresh";

export function getAccessToken(): string | null  { return localStorage.getItem(ACCESS_KEY);  }
export function getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }
export function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY,  access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ── Core fetch wrapper ───────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Token expired → try refresh once
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch<T>(path, options, false);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const data = await apiFetch<{ accessToken: string; refreshToken: string }>(
      "/api/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken: rt }) },
      false
    );
    storeTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// ── Types (mirror backend) ───────────────────────────────────────────
export type TravelRole = "solo-trekker" | "couple" | "family" | "group-tour" | "photographer" | "pilgrim";

export interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: TravelRole;
  newsletter: boolean;
  avatar: string;
  joinedAt: number;
}

export interface ApiTrip {
  id: string;
  origin: string;
  destination: string;
  label: string;
  mode: string;
  distanceKm: number | null;
  durationMin: number | null;
  notes: string | null;
  createdAt: number;
}

export interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: TravelRole;
  newsletter: boolean;
}

export interface TipResult {
  summary: string;
  tips: { category: string; tip: string }[];
  cached?: boolean;
}

// ── Auth ─────────────────────────────────────────────────────────────
export const authApi = {
  async register(data: SignupPayload): Promise<ApiUser> {
    const res = await apiFetch<{ user: ApiUser; accessToken: string; refreshToken: string }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify(data) }
    );
    storeTokens(res.accessToken, res.refreshToken);
    return res.user;
  },

  async login(email: string, password: string): Promise<ApiUser> {
    const res = await apiFetch<{ user: ApiUser; accessToken: string; refreshToken: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    storeTokens(res.accessToken, res.refreshToken);
    return res.user;
  },

  async logout(): Promise<void> {
    const rt = getRefreshToken();
    try {
      await apiFetch("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: rt }),
      });
    } finally {
      clearTokens();
    }
  },

  async me(): Promise<ApiUser> {
    const res = await apiFetch<{ user: ApiUser }>("/api/auth/me");
    return res.user;
  },

  async updateMe(data: Partial<SignupPayload & { password: string }>): Promise<ApiUser> {
    const res = await apiFetch<{ user: ApiUser }>(
      "/api/auth/me",
      { method: "PATCH", body: JSON.stringify(data) }
    );
    return res.user;
  },

  async deleteMe(): Promise<void> {
    await apiFetch("/api/auth/me", { method: "DELETE" });
    clearTokens();
  },
};

// ── Trips ─────────────────────────────────────────────────────────────
export const tripsApi = {
  async list(): Promise<ApiTrip[]> {
    const res = await apiFetch<{ trips: ApiTrip[] }>("/api/trips");
    return res.trips;
  },

  async save(data: {
    origin: string;
    destination: string;
    mode?: string;
    distanceKm?: number;
    durationMin?: number;
    notes?: string;
  }): Promise<ApiTrip> {
    const res = await apiFetch<{ trip: ApiTrip }>(
      "/api/trips",
      { method: "POST", body: JSON.stringify(data) }
    );
    return res.trip;
  },

  async update(id: string, data: { notes?: string; label?: string; mode?: string }): Promise<ApiTrip> {
    const res = await apiFetch<{ trip: ApiTrip }>(
      `/api/trips/${id}`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
    return res.trip;
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/api/trips/${id}`, { method: "DELETE" });
  },
};

// ── AI Tips ───────────────────────────────────────────────────────────
export const tipsApi = {
  async generate(params: {
    origin: string;
    destination: string;
    mode: string;
    distanceKm: number;
    durationMin: number;
  }): Promise<TipResult> {
    return apiFetch<TipResult>("/api/tips", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
};

// ── Contact ───────────────────────────────────────────────────────────
export const contactApi = {
  async send(data: {
    name: string;
    email: string;
    type?: string;
    message: string;
  }): Promise<{ ok: boolean; message: string }> {
    return apiFetch("/api/contact", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ── Health ────────────────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
