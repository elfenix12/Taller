import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { pickEntry } from "../lib/format";
import { Btn } from "../components/Btn";
import StepSignatures from "../components/wizard/StepSignatures";
import StepPreview from "../components/wizard/StepPreview";

export default function SignEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [firmas, setFirmas] = useState(null);
  const [stage, setStage] = useState("firmar");
  const [confirming, setConfirming] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/entries/${id}`).then((r) => {
      if (r.data.pdf_version) return navigate(`/entradas/${id}`, { replace: true });
      setEntry(r.data);
    }).catch(() => navigate("/"));
  }, [id, navigate]);

  if (!entry) return <div className="py-20 text-center text-lg font-semibold">Cargando…</div>;
  const signed = !!(firmas?.taller && firmas?.cliente);

  const toPreview = () => {
    setData({ ...pickEntry(entry), firmas });
    setStage("preview");
    window.scrollTo({ top: 0 });
  };

  const confirm = async () => {
    setConfirming(true);
    try {
      await api.post(`/entries/${id}/sign`, { firmas });
      toast.success("PDF firmado generado y guardado");
      navigate(`/entradas/${id}`, { replace: true });
    } catch (e) {
      toast.error(errMsg(e, "No se pudo guardar el PDF firmado"));
      setConfirming(false);
    }
  };

  return (
    <div className="pb-4" data-testid="sign-entry-page">
      <button onClick={() => navigate(`/entradas/${id}`)} className="min-h-[48px] flex items-center gap-2 font-bold text-slate-700" data-testid="sign-back-btn">
        <ArrowLeft /> Folio {entry.folio_str}
      </button>
      <h1 className="mt-2 mb-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">{stage === "firmar" ? "Firmas" : "Vista previa"}</h1>
      <p className="mb-5 text-slate-600 text-base">Esta entrada se registró antes de las firmas digitales. Captura ambas firmas para generar su PDF firmado.</p>
      {stage === "firmar" ? (
        <>
          <StepSignatures firmas={firmas} nombreCliente={entry.cliente.nombre} onChange={setFirmas} />
          <div className="sticky bottom-0 z-30 mt-6 bg-white/95 backdrop-blur-md border-t-2 border-[#0F172A] -mx-3 sm:-mx-6 px-3 sm:px-6 py-4">
            <Btn className="w-full" onClick={toPreview} disabled={!signed} data-testid="sign-preview-btn"><FileText /> Ver vista previa del PDF</Btn>
          </div>
        </>
      ) : (
        <StepPreview data={data} editId={id} onBack={() => setStage("firmar")} onConfirm={confirm} confirming={confirming}
          confirmLabel="Todo correcto, guardar PDF" hint="Al guardar, este PDF firmado quedará fijo y no podrá modificarse." />
      )}
    </div>
  );
}
