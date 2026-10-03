import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, PenLine } from "lucide-react";
import { toast } from "sonner";
import { api, downloadPdf, errMsg } from "../lib/api";
import { fmtFecha } from "../lib/format";
import { Card } from "./Field";
import { Btn } from "./Btn";

export function VersionHistory({ entry }) {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  useEffect(() => {
    api.get(`/entries/${entry.id}/versions`).then((r) => setList(r.data));
  }, [entry.id, entry.pdf_version]);

  const open = (v) => downloadPdf(`/entries/${entry.id}/versions/${v.version}/pdf`, v.label)
    .catch((e) => toast.error(errMsg(e, "No se pudo abrir el PDF")));

  if (!list) return null;
  if (!list.length) {
    return (
      <Card title="PDF firmado">
        <p className="text-base text-slate-700 mb-4" data-testid="versions-empty">Esta entrada aún no tiene PDF firmado. Captura las firmas para generarlo.</p>
        <Btn onClick={() => navigate(`/entradas/${entry.id}/firmar`)} data-testid="versions-sign-btn"><PenLine /> Capturar firmas</Btn>
      </Card>
    );
  }
  return (
    <Card title="Historial de versiones del PDF">
      <ul className="divide-y divide-slate-200" data-testid="versions-list">
        {list.map((v, i) => (
          <li key={v.version} className="py-3 flex flex-wrap items-center gap-3">
            <span className="font-mono font-bold text-lg w-36">{v.label}</span>
            <span className="flex-1 text-slate-700 font-medium">{fmtFecha(v.created_at)} · {v.created_by}{i === 0 && <b className="ml-2 text-emerald-700">Actual</b>}</span>
            <Btn size="sm" variant="outline" onClick={() => open(v)} data-testid={`version-open-${v.version}`}><FileText size={18} /> Abrir</Btn>
          </li>
        ))}
      </ul>
    </Card>
  );
}
