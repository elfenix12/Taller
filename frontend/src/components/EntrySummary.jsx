import { Pencil } from "lucide-react";
import { Card } from "./Field";
import { Btn } from "./Btn";
import { photoUrl } from "../lib/api";
import { fmtFecha } from "../lib/format";

const KV = ({ items }) => (
  <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
    {items.map(([k, v]) => (
      <div key={k} className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{k}</dt>
        <dd className="text-base font-semibold break-words">{v || "—"}</dd>
      </div>
    ))}
  </dl>
);

export function EntrySummary({ data, catalog, onEdit }) {
  const { cliente: c, vehiculo: v, orden: o } = data;
  const edit = (step, id) =>
    onEdit && (
      <Btn size="sm" variant="outline" onClick={() => onEdit(step)} data-testid={`summary-edit-${id}`}>
        <Pencil size={18} /> Editar
      </Btn>
    );
  const allDamage = catalog.danios.flatMap((g) => g.items.map((i) => ({ ...i, zona: g.label })));
  const danios = allDamage.filter((i) => i.id in data.danios);
  const aseg = o.tipo === "aseguradora";
  return (
    <div className="space-y-4" data-testid="entry-summary">
      <Card title="Cliente y vehículo" actions={edit(0, "cliente")}>
        <KV items={[["Cliente", c.nombre], ["Teléfono", c.telefono], ["Correo", c.correo], ["Placas", v.placas],
          ["Marca", v.marca], ["Modelo", v.modelo], ["Año", v.anio], ["Color", v.color], ["VIN", v.vin],
          ["Kilometraje", v.kilometraje], ["Combustible", v.combustible]]} />
      </Card>
      <Card title="Orden" actions={edit(1, "orden")}>
        <KV items={[["Tipo", aseg ? "Aseguradora" : "Particular"],
          ...(aseg ? [["Aseguradora", o.aseguradora], ["Póliza", o.poliza], ["Siniestro", o.siniestro], ["Reporte", o.reporte]] : []),
          ["Tipo de daño", o.tipo_danio === "Otro" && o.tipo_danio_otro ? `Otro: ${o.tipo_danio_otro}` : o.tipo_danio],
          ["Ingreso", fmtFecha(data.fecha_ingreso)]]} />
      </Card>
      <Card title="¿Qué trae?" actions={edit(2, "inventario")}>
        <div className="grid sm:grid-cols-2 gap-4">
          {catalog.inventario.map((g) => {
            const items = g.items.filter((i) => data.inventario[i.id] > 0);
            return (
              <div key={g.id}>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{g.label}</div>
                <div className="text-base font-semibold">
                  {items.length ? items.map((i) => `${i.label} (${data.inventario[i.id]})`).join(", ") : "Nada marcado"}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-base"><b>Otros objetos:</b> {data.otros_objetos || "—"}</div>
      </Card>
      <Card title="¿Qué se dañó?" actions={edit(3, "danios")}>
        {danios.length ? (
          <ul className="divide-y divide-slate-200">
            {danios.map((d) => (
              <li key={d.id} className="py-2 flex flex-wrap gap-x-3">
                <span className="text-xs font-bold uppercase text-slate-500 w-24 pt-1">{d.zona}</span>
                <span className="font-bold">{d.label}</span>
                {data.danios[d.id] && <span className="text-slate-700">— {data.danios[d.id]}</span>}
              </li>
            ))}
          </ul>
        ) : <p className="text-slate-600">Sin daños marcados</p>}
      </Card>
      <Card title={`Fotos y comentarios (${data.fotos.length})`} actions={edit(4, "fotos")}>
        {data.fotos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4">
            {data.fotos.map((id) => (
              <a key={id} href={photoUrl(id)} target="_blank" rel="noreferrer">
                <img src={photoUrl(id)} alt="" className="aspect-square object-cover rounded-lg border border-slate-300 w-full" />
              </a>
            ))}
          </div>
        )}
        <p className="text-base whitespace-pre-wrap"><b>Comentarios:</b> {data.comentarios || "—"}</p>
      </Card>
    </div>
  );
}
