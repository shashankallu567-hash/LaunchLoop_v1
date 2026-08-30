import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking
  const [ready, setReady] = useState(false);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("ll_token");
    if (!token) { setUser(false); setReady(true); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      localStorage.removeItem("ll_token");
      setUser(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const persist = (data) => {
    localStorage.setItem("ll_token", data.access_token);
    setUser(data.user);
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    persist(data);
  };
  const register = async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    persist(data);
  };
  const demoLogin = async () => {
    const { data } = await api.post("/auth/demo");
    persist(data);
  };
  const logout = () => {
    localStorage.removeItem("ll_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
