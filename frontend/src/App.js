import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider, useApp } from "./context/AppContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Inventory from "./pages/Inventory";
import NewEntry from "./pages/NewEntry";
import EntryDetail from "./pages/EntryDetail";
import Success from "./pages/Success";
import Settings from "./pages/Settings";

function Protected({ children }) {
  const { user, checking, catalog } = useApp();
  if (checking || (user && !catalog)) {
    return <div className="min-h-screen grid place-items-center text-lg font-semibold" data-testid="app-loading">Cargando…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Inventory />} />
        <Route path="/nueva" element={<NewEntry />} />
        <Route path="/entradas/:id" element={<EntryDetail />} />
        <Route path="/entradas/:id/editar" element={<NewEntry />} />
        <Route path="/exito/:id" element={<Success />} />
        <Route path="/configuracion" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRouter />
        <Toaster position="top-center" richColors toastOptions={{ style: { fontSize: 16 } }} />
      </AppProvider>
    </BrowserRouter>
  );
}
