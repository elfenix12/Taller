import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [catalog, setCatalog] = useState(null);
  const [settings, setSettings] = useState(null);

  const loadData = useCallback(async () => {
    const [c, s] = await Promise.all([api.get("/catalog"), api.get("/settings")]);
    setCatalog(c.data);
    setSettings(s.data);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      await loadData();
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, [loadData]);

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) {
      setChecking(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = async (u) => {
    setUser(u);
    await loadData();
  };

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, checking, catalog, settings, setSettings, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}
