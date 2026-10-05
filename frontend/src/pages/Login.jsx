import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Login() {
  const { user, checking } = useApp();
  const location = useLocation();
  const error = location.state?.error;
  if (!checking && user) return <Navigate to="/" replace />;

  const signIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-white grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-[#0A0A0A] text-white p-14 flex-col justify-between">
        <span className="font-mono text-sm tracking-[0.3em] text-slate-400">RECEPCIÓN DE VEHÍCULOS</span>
        <div>
          <h2 className="font-display text-5xl font-extrabold leading-tight">Cada unidad, registrada como se recibió.</h2>
          <p className="mt-6 text-slate-300 text-lg max-w-md">Inventario, daños, fotos y comprobante PDF en un solo flujo pensado para el taller.</p>
        </div>
        <span className="text-slate-500 text-sm">Uso exclusivo del personal autorizado</span>
      </div>
      <div className="flex flex-col items-center justify-center px-6 py-12 rise">
        <img src="/logo-ccp.png?v=2" alt="Central de Carrocería y Pintura" className="w-40 sm:w-48" data-testid="login-logo" />
        <h1 className="mt-8 text-3xl sm:text-4xl font-extrabold tracking-tight text-center">Entrada de vehículos</h1>
        <p className="mt-2 text-slate-600 text-base sm:text-lg text-center">Inicia sesión con tu cuenta de Google autorizada</p>
        {error && (
          <div className="mt-6 max-w-md w-full flex gap-3 rounded-xl border-2 border-red-600 bg-red-50 p-4 text-red-800 font-semibold" data-testid="login-error">
            <ShieldAlert className="shrink-0" /> {error}
          </div>
        )}
        <button
          onClick={signIn}
          data-testid="login-google-btn"
          className="mt-8 w-full max-w-md min-h-[60px] rounded-xl bg-[#0A0A0A] text-white text-lg font-bold flex items-center justify-center gap-3 hover:bg-slate-800 active:scale-[0.98] transition-transform"
        >
          <span className="w-8 h-8 rounded-full bg-white text-[#0A0A0A] grid place-items-center font-black">G</span>
          Entrar con Google
        </button>
      </div>
    </div>
  );
}
