import { NavLink, Outlet } from "react-router-dom";
import { Plus, List, Settings, LogOut } from "lucide-react";
import { useApp } from "../context/AppContext";

const link = ({ isActive }) =>
  `min-h-[52px] px-3 sm:px-4 rounded-xl flex items-center gap-2 font-bold text-base transition-colors ${
    isActive ? "bg-slate-100 text-[#0A0A0A] ring-2 ring-[#0A0A0A]" : "text-slate-700 hover:bg-slate-100"
  }`;

export default function Layout() {
  const { user, logout, settings } = useApp();
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[#0F172A]">
        <div className="max-w-6xl mx-auto h-20 px-3 sm:px-6 flex items-center gap-3">
          <NavLink to="/" className="flex items-center gap-3 min-w-0" data-testid="header-logo-link">
            <img src="/logo-mark.png" alt="CCP" className="h-12 w-auto" />
            <div className="hidden md:block leading-tight min-w-0">
              <div className="font-display font-extrabold text-lg truncate">{settings?.nombre}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Entrada de vehículos</div>
            </div>
          </NavLink>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <NavLink to="/" end className={link} data-testid="nav-inventory-btn">
              <List size={22} /> <span className="hidden sm:inline">Inventario</span>
            </NavLink>
            <NavLink to="/configuracion" className={link} data-testid="nav-config-btn">
              <Settings size={22} /> <span className="hidden sm:inline">Configuración</span>
            </NavLink>
            <NavLink
              to="/nueva"
              data-testid="nav-new-entry-btn"
              className="min-h-[52px] px-4 rounded-xl bg-[#0A0A0A] text-white flex items-center gap-2 font-bold hover:bg-slate-800 active:scale-[0.98] transition-transform"
            >
              <Plus size={22} /> <span className="hidden sm:inline">Nueva entrada</span>
            </NavLink>
            <button
              onClick={logout}
              title={user?.email}
              data-testid="logout-btn"
              className="min-h-[52px] px-3 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <LogOut size={22} /> <span className="hidden lg:inline">Salir</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
