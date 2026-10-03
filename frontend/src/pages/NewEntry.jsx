import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { api, errMsg } from "../lib/api";
import { emptyEntry, pickEntry } from "../lib/format";
import { Btn } from "../components/Btn";
import { EntrySummary } from "../components/EntrySummary";
import StepClient from "../components/wizard/StepClient";
import StepOrder from "../components/wizard/StepOrder";
import StepInventory from "../components/wizard/StepInventory";
import StepDamage from "../components/wizard/StepDamage";
import StepPhotos from "../components/wizard/StepPhotos";
import StepPreview from "../components/wizard/StepPreview";
import StepSignatures from "../components/wizard/StepSignatures";

const STEPS = ["Cliente y vehículo", "Orden", "¿Qué trae?", "¿Qué se dañó?", "Fotos y comentarios", "Resumen", "Firmas", "Vista previa"];

export default function NewEntry() {
  const { id: editId } = useParams();
  const { catalog } = useApp();
  const navigate = useNavigate();
  const key = editId ? `ccp_draft_edit_${editId}` : "ccp_draft_new";
  const [state, setState] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) return setState(JSON.parse(saved));
    if (!editId) return setState({ step: 0, data: emptyEntry() });
    api.get(`/entries/${editId}`).then((r) => setState({ step: 5, data: { ...pickEntry(r.data), firmas: null }, folio: r.data.folio_str }))
      .catch(() => navigate("/"));
  }, [key, editId, navigate]);

  useEffect(() => {
    if (state) localStorage.setItem(key, JSON.stringify(state));
  }, [state, key]);

  if (!state) return <div className="py-20 text-center text-lg font-semibold">Cargando…</div>;
  const { step, data } = state;

  const setData = (fn) =>
    setState((s) => {
      const d = typeof fn === "function" ? fn(s.data) : fn;
      return { ...s, data: { ...d, firmas: null } };
    });
  const setFirmas = (f) => setState((s) => ({ ...s, data: { ...s.data, firmas: f } }));
  const signed = !!(data.firmas?.taller && data.firmas?.cliente);
  const setSection = (sec, patch) => setData((d) => ({ ...d, [sec]: { ...d[sec], ...patch } }));
  const goto = (n) => {
    setState((s) => ({ ...s, step: n }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validate = () => {
    const e = {};
    if (!data.cliente.nombre.trim()) e.nombre = "Escribe el nombre del cliente";
    if (!data.vehiculo.placas.trim()) e.placas = "Escribe las placas";
    if (!String(data.vehiculo.kilometraje).trim()) e.kilometraje = "Escribe el kilometraje";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if ((step === 0 || step === 5) && !validate()) {
      if (step === 5) goto(0);
      return toast.error("Faltan datos obligatorios");
    }
    if (step === 6 && !signed) return toast.error("Faltan las firmas del taller y del cliente");
    goto(step + 1);
  };

  const discard = () => {
    if (!window.confirm(editId ? "¿Descartar los cambios?" : "¿Descartar este borrador?")) return;
    localStorage.removeItem(key);
    navigate(editId ? `/entradas/${editId}` : "/");
  };

  const confirm = async () => {
    setConfirming(true);
    try {
      const r = editId ? await api.put(`/entries/${editId}`, data) : await api.post("/entries", data);
      localStorage.removeItem(key);
      navigate(`/exito/${r.data.id}`, { replace: true, state: { entry: r.data, edited: !!editId } });
    } catch (e) {
      toast.error(errMsg(e, "No se pudo guardar la entrada"));
      setConfirming(false);
    }
  };

  const props = { data, setData, setSection, errors, catalog };
  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="pb-4">
      <div className="mb-6 rise">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold uppercase tracking-wider text-slate-500" data-testid="wizard-step-indicator">
              {editId ? `Editando folio ${state.folio || ""} · ` : ""}Paso {step + 1} de {STEPS.length}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight" data-testid="wizard-step-title">{STEPS[step]}</h1>
          </div>
          <Btn size="sm" variant="ghost" onClick={discard} data-testid="wizard-discard-btn"><Trash2 size={18} /> Descartar</Btn>
        </div>
        <div className="mt-4 h-3 rounded-full bg-slate-200 overflow-hidden" data-testid="wizard-progress">
          <div className="h-full bg-[#0A0A0A] transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 hidden md:grid grid-cols-8 gap-1 text-xs font-semibold text-slate-500">
          {STEPS.map((s, i) => <span key={s} className={i <= step ? "text-slate-900" : ""}>{s}</span>)}
        </div>
      </div>

      <div key={step} className="rise">
        {step === 0 && <StepClient {...props} />}
        {step === 1 && <StepOrder {...props} />}
        {step === 2 && <StepInventory {...props} />}
        {step === 3 && <StepDamage {...props} />}
        {step === 4 && <StepPhotos {...props} />}
        {step === 5 && (
          <>
            <EntrySummary data={data} catalog={catalog} onEdit={goto} />
            <Btn className="w-full mt-6 min-h-[68px] text-xl" onClick={next} data-testid="summary-preview-btn">Continuar a firmas <ArrowRight /></Btn>
          </>
        )}
        {step === 6 && <StepSignatures firmas={data.firmas} nombreCliente={data.cliente.nombre} onChange={setFirmas} />}
        {step === 7 && (
          <StepPreview data={data} editId={editId} onBack={() => goto(5)} onConfirm={confirm} confirming={confirming}
            confirmLabel={editId ? "Todo correcto, guardar" : "Todo correcto, enviar"}
            hint={editId ? "Al guardar se creará una versión nueva del PDF; la anterior se conserva." : "No se envía nada hasta que pulses “Todo correcto, enviar”."} />
        )}
      </div>

      {step < 7 && (
        <div className="sticky bottom-0 z-30 mt-6 bg-white/95 backdrop-blur-md border-t-2 border-[#0F172A] -mx-3 sm:-mx-6 px-3 sm:px-6 py-4 grid grid-cols-2 gap-3">
          <Btn variant="outline" onClick={() => goto(step - 1)} disabled={step === 0} data-testid="wizard-prev-step-btn"><ArrowLeft /> Atrás</Btn>
          {step < 5 ? (
            <Btn onClick={next} data-testid="wizard-next-step-btn">Continuar <ArrowRight /></Btn>
          ) : step === 5 ? (
            <Btn onClick={next} data-testid="wizard-next-step-btn">Continuar a firmas <ArrowRight /></Btn>
          ) : (
            <Btn onClick={next} disabled={!signed} data-testid="wizard-next-step-btn"><FileText /> Ver vista previa del PDF</Btn>
          )}
        </div>
      )}
    </div>
  );
}
