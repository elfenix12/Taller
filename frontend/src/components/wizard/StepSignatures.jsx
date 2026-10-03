import { Eraser, CheckCircle2 } from "lucide-react";
import { Card, Field } from "../Field";
import { Btn } from "../Btn";
import { SignaturePad } from "../SignaturePad";
import { fmtFecha } from "../../lib/format";

function SigCard({ title, firma, onChange, id, children, top }) {
  return (
    <Card title={title} actions={
      <Btn size="sm" variant="outline" onClick={() => onChange(null)} disabled={!firma} data-testid={`signature-clear-${id}`}>
        <Eraser size={18} /> Limpiar
      </Btn>
    }>
      {top}
      <SignaturePad value={firma} onChange={onChange} testId={`signature-pad-${id}`} />
      <div className="mt-2 min-h-[24px] text-sm font-semibold" data-testid={`signature-status-${id}`}>
        {firma ? (
          <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 size={18} /> Firmado {fmtFecha(firma.fecha)}</span>
        ) : <span className="text-slate-500">Firma con el dedo o stylus dentro del recuadro</span>}
      </div>
      {children}
    </Card>
  );
}

export default function StepSignatures({ firmas, nombreCliente, onChange }) {
  const f = firmas || { taller: null, cliente: null, nombre_cliente: nombreCliente };
  const set = (patch) => onChange({ ...f, ...patch });
  return (
    <div className="space-y-5">
      <SigCard title="Firma del taller" id="taller" firma={f.taller} onChange={(v) => set({ taller: v })} />
      <SigCard
        title="Firma del cliente" id="cliente" firma={f.cliente} onChange={(v) => set({ cliente: v })}
        top={<p className="mb-3 text-base font-semibold text-slate-800 bg-slate-100 rounded-xl p-3" data-testid="signature-legal-text">
          Al firmar, confirmo que los datos, el inventario y los daños registrados son correctos y acepto la nota legal.
        </p>}
      >
        <Field label="Nombre del cliente" className="mt-3" value={f.nombre_cliente ?? nombreCliente}
          onChange={(e) => set({ nombre_cliente: e.target.value })} data-testid="signature-cliente-nombre" />
      </SigCard>
    </div>
  );
}
