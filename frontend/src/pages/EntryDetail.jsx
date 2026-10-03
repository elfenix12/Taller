import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Send, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { fmtFecha } from "../lib/format";
import { useApp } from "../context/AppContext";
import { Btn } from "../components/Btn";
import { EntrySummary } from "../components/EntrySummary";
import { EstadoToggle } from "../components/EstadoToggle";
import { MailStatus } from "../components/MailStatus";
import { useEntryActions } from "../hooks/useEntryActions";
import { VersionHistory } from "../components/VersionHistory";

export default function EntryDetail() {
  const { id } = useParams();
  const { catalog } = useApp();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const { busy, download, resend } = useEntryActions(entry, setEntry);

  useEffect(() => {
    api.get(`/entries/${id}`).then((r) => setEntry(r.data)).catch(() => navigate("/"));
  }, [id, navigate]);

  const setEstado = async (v) => {
    try {
      const { data } = await api.patch(`/entries/${id}/estado`, { estado: v });
      setEntry(data);
      toast.success(v === "entregado" ? "Marcado como entregado" : "Marcado en taller");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (!entry) return <div className="py-20 text-center text-lg font-semibold">Cargando…</div>;
  return (
    <div className="space-y-5" data-testid="entry-detail">
      <button onClick={() => navigate("/")} className="min-h-[48px] flex items-center gap-2 font-bold text-slate-700" data-testid="detail-back-btn">
        <ArrowLeft /> Inventario
      </button>
      <div className="bg-white border-2 border-[#0F172A] rounded-2xl p-4 sm:p-6 flex flex-wrap items-center gap-4 rise">
        <div className="flex-1 min-w-[220px]">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Folio <span className="font-mono text-slate-900 text-base" data-testid="detail-folio">{entry.pdf_label || entry.folio_str}</span></div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" data-testid="detail-placas">{entry.vehiculo.placas}</h1>
          <div className="text-slate-600 font-medium">Ingreso {fmtFecha(entry.fecha_ingreso)}</div>
        </div>
        <EstadoToggle value={entry.estado} onChange={setEstado} testId="detail-status-toggle" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Btn variant="outline" onClick={download} disabled={busy === "pdf"} data-testid="detail-pdf-download-btn">
          {busy === "pdf" ? <Loader2 className="animate-spin" /> : <Download />} Descargar PDF
        </Btn>
        <Btn variant="outline" onClick={resend} disabled={busy === "send"} data-testid="detail-resend-btn">
          {busy === "send" ? <Loader2 className="animate-spin" /> : <Send />} Reenviar PDF
        </Btn>
        <Btn onClick={() => navigate(`/entradas/${id}/editar`)} data-testid="detail-edit-btn"><Pencil /> Editar entrada</Btn>
      </div>
      <MailStatus entry={entry} />
      <VersionHistory entry={entry} />
      <EntrySummary data={entry} catalog={catalog} />
    </div>
  );
}
