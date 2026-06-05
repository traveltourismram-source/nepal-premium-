import * as React from "react";
import { authApi, tripsApi, type ApiUser, type ApiTrip, type SignupPayload, type TravelRole, getAccessToken, getRefreshToken, storeTokens } from "@/lib/api";

export type { TravelRole };

export type User = ApiUser & {
  savedTrips: Array<{ o: string; d: string; t: number; label: string }>;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  signup: (data: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  saveTrip: (o: string, d: string, mode?: string, distanceKm?: number, durationMin?: number) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  trips: ApiTrip[];
  refreshTrips: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

function toLocalUser(apiUser: ApiUser, trips: ApiTrip[]): User {
  return {
    ...apiUser,
    savedTrips: trips.map(t => ({
      o: t.origin,
      d: t.destination,
      t: t.createdAt,
      label: t.label,
    })),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [trips, setTrips] = React.useState<ApiTrip[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Rehydrate from token on mount
  React.useEffect(() => {
    // Handle OAuth redirect tokens
    const params = new URLSearchParams(window.location.search);
    const access = params.get("access");
    const refresh = params.get("refresh");
    if (access) {
      storeTokens(access, refresh ?? getRefreshToken() ?? "");
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", cleanUrl);
    }
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const [apiUser, apiTrips] = await Promise.all([authApi.me(), tripsApi.list()]);
        setTrips(apiTrips);
        setUser(toLocalUser(apiUser, apiTrips));
      } catch {
        // token invalid – just stay logged out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string, _remember: boolean) {
    const apiUser = await authApi.login(email, password);
    const apiTrips = await tripsApi.list();
    setTrips(apiTrips);
    setUser(toLocalUser(apiUser, apiTrips));
  }

  async function signup(data: SignupPayload) {
    const apiUser = await authApi.register(data);
    setTrips([]);
    setUser(toLocalUser(apiUser, []));
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
    setTrips([]);
  }

  async function refreshTrips() {
    if (!user) return;
    const apiTrips = await tripsApi.list();
    setTrips(apiTrips);
    setUser(prev => prev ? toLocalUser(prev, apiTrips) : null);
  }

  async function saveTrip(o: string, d: string, mode?: string, distanceKm?: number, durationMin?: number) {
    if (!user) return;
    await tripsApi.save({ origin: o, destination: d, mode, distanceKm, durationMin });
    await refreshTrips();
  }

  async function deleteTrip(id: string) {
    await tripsApi.remove(id);
    await refreshTrips();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, saveTrip, deleteTrip, trips, refreshTrips }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
