import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Download, Send, Plus, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { fmtFecha } from "../lib/format";
import { Btn } from "../components/Btn";
import { MailStatus } from "../components/MailStatus";
import { useEntryActions } from "../hooks/useEntryActions";

export default function Success() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(location.state?.entry || null);
  const edited = location.state?.edited;
  const { busy, download, resend } = useEntryActions(entry, setEntry);

  useEffect(() => {
    if (!entry) api.get(`/entries/${id}`).then((r) => setEntry(r.data)).catch(() => navigate("/"));
  }, [entry, id, navigate]);

  if (!entry) return <div className="py-20 text-center text-lg font-semibold">Cargando…</div>;
  return (
    <div className="max-w-2xl mx-auto text-center rise" data-testid="success-screen">
      <CheckCircle2 size={72} className="mx-auto text-emerald-600" />
      <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">{edited ? "Cambios guardados" : "Entrada registrada"}</h1>
      <div className="mt-6 inline-block rounded-2xl border-2 border-[#0F172A] bg-white px-8 py-5">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Folio</div>
        <div className="font-mono text-5xl font-bold" data-testid="success-folio">{entry.folio_str}</div>
        <div className="mt-1 text-lg font-bold">{entry.vehiculo.placas} · {entry.cliente.nombre}</div>
        <div className="text-slate-600">{fmtFecha(entry.fecha_ingreso)}</div>
      </div>
      <div className="mt-6 text-left">
        {edited ? (
          <div className="rounded-xl border-2 border-slate-300 bg-white p-4 font-semibold">PDF regenerado con los cambios. Puedes descargarlo o reenviarlo.</div>
        ) : <MailStatus entry={entry} />}
      </div>
      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        <Btn variant="outline" onClick={download} disabled={busy === "pdf"} data-testid="pdf-download-btn">
          {busy === "pdf" ? <Loader2 className="animate-spin" /> : <Download />} Descargar PDF
        </Btn>
        <Btn variant="outline" onClick={resend} disabled={busy === "send"} data-testid="resend-btn">
          {busy === "send" ? <Loader2 className="animate-spin" /> : <Send />} Reenviar
        </Btn>
        <Btn onClick={() => navigate("/nueva")} data-testid="new-entry-success-btn"><Plus /> Nueva entrada</Btn>
      </div>
    </div>
  );
}
