import { useEffect, useState } from "react";
import { Send, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "../../lib/api";
import { PdfPages } from "../PdfPages";
import { Btn } from "../Btn";

export default function StepPreview({ data, editId, onBack, onConfirm, confirming }) {
  const [pv, setPv] = useState(null);
  useEffect(() => {
    api
      .post("/entries/preview", { ...data, entry_id: editId || null })
      .then((r) => setPv(r.data))
      .catch((e) => toast.error(errMsg(e, "No se pudo generar la vista previa")));
  }, [data, editId]);

  return (
    <div className="space-y-5">
      <p className="text-base sm:text-lg text-slate-700">Revisa el documento. {editId ? "Al guardar se regenerará el PDF." : "No se envía nada hasta que pulses “Todo correcto, enviar”."}</p>
      <PdfPages pages={pv?.pages} sizeBytes={pv?.size_bytes} />
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t-2 border-[#0F172A] -mx-3 sm:-mx-6 px-3 sm:px-6 py-4 grid sm:grid-cols-2 gap-3">
        <Btn variant="outline" onClick={onBack} disabled={confirming} data-testid="preview-back-btn"><Pencil /> Volver a editar</Btn>
        <Btn variant="success" onClick={onConfirm} disabled={!pv || confirming} data-testid="preview-confirm-btn">
          {confirming ? <Loader2 className="animate-spin" /> : <Send />} {editId ? "Todo correcto, guardar" : "Todo correcto, enviar"}
        </Btn>
      </div>
    </div>
  );
}
