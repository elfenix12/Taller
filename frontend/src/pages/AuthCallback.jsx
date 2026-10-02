import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, errMsg } from "../lib/api";
import { useApp } from "../context/AppContext";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useApp();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sid = new URLSearchParams(location.hash.slice(1)).get("session_id");
    window.history.replaceState(null, "", window.location.pathname);
    api
      .post("/auth/session", { session_id: sid })
      .then(async ({ data }) => {
        await login(data);
        navigate("/", { replace: true });
      })
      .catch((e) => navigate("/login", { replace: true, state: { error: errMsg(e, "No se pudo iniciar sesión") } }));
  }, [location.hash, login, navigate]);

  return <div className="min-h-screen grid place-items-center text-lg font-semibold">Verificando acceso…</div>;
}
