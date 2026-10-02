import { Clock } from "lucide-react";
import { Field, Card } from "../Field";
import { Chip } from "../Chip";
import { fmtFecha } from "../../lib/format";

export default function StepOrder({ data, setSection, catalog }) {
  const o = data.orden;
  const f = (k) => (e) => setSection("orden", { [k]: e.target.value });
  return (
    <div className="space-y-5">
      <Card title="Tipo de orden">
        <div className="grid grid-cols-2 gap-3 max-w-xl">
          <Chip selected={o.tipo === "particular"} onClick={() => setSection("orden", { tipo: "particular" })} testId="orden-tipo-particular" className="justify-center">Particular</Chip>
          <Chip selected={o.tipo === "aseguradora"} onClick={() => setSection("orden", { tipo: "aseguradora" })} testId="orden-tipo-aseguradora" className="justify-center">Aseguradora</Chip>
        </div>
        {o.tipo === "aseguradora" && (
          <div className="grid sm:grid-cols-2 gap-4 mt-5 rise">
            <Field label="Aseguradora" value={o.aseguradora} onChange={f("aseguradora")} data-testid="input-orden-aseguradora" />
            <Field label="Póliza" value={o.poliza} onChange={f("poliza")} data-testid="input-orden-poliza" />
            <Field label="Siniestro" value={o.siniestro} onChange={f("siniestro")} data-testid="input-orden-siniestro" />
            <Field label="Reporte" value={o.reporte} onChange={f("reporte")} data-testid="input-orden-reporte" />
          </div>
        )}
      </Card>
      <Card title="Tipo de daño">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {catalog.tipo_danio.map((t) => (
            <Chip key={t} selected={o.tipo_danio === t} className="justify-center"
              onClick={() => setSection("orden", { tipo_danio: o.tipo_danio === t ? "" : t })} testId={`tipo-danio-${t}`}>
              {t}
            </Chip>
          ))}
        </div>
        {o.tipo_danio === "Otro" && (
          <Field label="Especifica" className="mt-4" value={o.tipo_danio_otro} onChange={f("tipo_danio_otro")} data-testid="input-orden-tipo-danio-otro" />
        )}
      </Card>
      <div className="flex items-center gap-3 rounded-2xl bg-slate-100 border-2 border-slate-300 p-4" data-testid="fecha-ingreso">
        <Clock />
        <span className="font-semibold">Fecha y hora de ingreso: <b>{fmtFecha(data.fecha_ingreso)}</b> (automática)</span>
      </div>
    </div>
  );
}
