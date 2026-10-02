import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, CarFront } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { fmtFecha } from "../lib/format";
import { inputCls } from "../components/Field";
import { Chip } from "../components/Chip";
import { EstadoToggle } from "../components/EstadoToggle";

const ESTADOS = [["en_taller", "En taller"], ["entregado", "Entregado"], ["todas", "Todas"]];

export default function Inventory() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("en_taller");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [items, setItems] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/entries", { params: { q, estado, desde, hasta } }).then((r) => setItems(r.data))
        .catch((e) => toast.error(errMsg(e, "No se pudo cargar el inventario")));
    }, 250);
    return () => clearTimeout(t);
  }, [q, estado, desde, hasta]);

  const changeEstado = async (e, v) => {
    try {
      await api.patch(`/entries/${e.id}/estado`, { estado: v });
      setItems((list) => (estado === "todas" ? list.map((x) => (x.id === e.id ? { ...x, estado: v } : x)) : list.filter((x) => x.id !== e.id)));
      toast.success(`Folio ${e.folio_str}: ${v === "entregado" ? "Entregado" : "En taller"}`);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="rise">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Inventario</h1>
        <p className="text-slate-600 text-base sm:text-lg">Vehículos {estado === "en_taller" ? "actualmente en el taller" : estado === "entregado" ? "entregados" : "registrados"}</p>
      </div>
      <div className="bg-white border-2 border-[#0F172A] rounded-2xl p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className={`${inputCls} pl-12`} placeholder="Buscar por placas, cliente, folio, siniestro o reporte"
            value={q} onChange={(e) => setQ(e.target.value)} data-testid="inventory-search-input" />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2 flex-wrap">
            {ESTADOS.map(([v, l]) => (
              <Chip key={v} selected={estado === v} onClick={() => setEstado(v)} testId={`filter-estado-${v}`}>{l}</Chip>
            ))}
          </div>
          <label className="text-sm font-bold text-slate-700">Desde
            <input type="date" className={`${inputCls} block`} value={desde} onChange={(e) => setDesde(e.target.value)} data-testid="filter-desde" />
          </label>
          <label className="text-sm font-bold text-slate-700">Hasta
            <input type="date" className={`${inputCls} block`} value={hasta} onChange={(e) => setHasta(e.target.value)} data-testid="filter-hasta" />
          </label>
          {(desde || hasta || q) && (
            <button className="min-h-[56px] px-4 font-bold text-slate-700 flex items-center gap-1" onClick={() => { setQ(""); setDesde(""); setHasta(""); }} data-testid="filter-clear-btn">
              <X size={18} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {items === null ? (
        <div className="py-16 text-center font-semibold">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-300" data-testid="inventory-empty">
          <CarFront size={48} className="mx-auto text-slate-400" />
          <p className="mt-3 text-lg font-semibold text-slate-700">No hay entradas que coincidan</p>
        </div>
      ) : (
        <ul className="space-y-3" data-testid="inventory-list">
          {items.map((e) => (
            <li key={e.id} onClick={() => navigate(`/entradas/${e.id}`)} data-testid={`inventory-row-${e.folio_str}`}
              className="bg-white border-2 border-slate-300 hover:border-[#0F172A] rounded-2xl p-4 flex flex-wrap items-center gap-4 cursor-pointer transition-colors">
              <div className="font-mono text-xl font-bold w-20">{e.folio_str}</div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-xl font-extrabold font-display">{e.vehiculo.placas} <span className="text-base font-semibold text-slate-600">{[e.vehiculo.marca, e.vehiculo.modelo, e.vehiculo.color].filter(Boolean).join(" · ")}</span></div>
                <div className="text-slate-700 font-medium">{e.cliente.nombre} · {fmtFecha(e.fecha_ingreso)}</div>
                {e.orden.tipo === "aseguradora" && (
                  <div className="text-sm text-slate-600 font-semibold">{e.orden.aseguradora} {e.orden.siniestro && `· Sin. ${e.orden.siniestro}`} {e.orden.reporte && `· Rep. ${e.orden.reporte}`}</div>
                )}
              </div>
              <EstadoToggle value={e.estado} onChange={(v) => changeEstado(e, v)} testId={`status-toggle-${e.folio_str}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
