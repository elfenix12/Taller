import { Field, Card } from "../Field";
import { Chip } from "../Chip";

export default function StepClient({ data, setSection, errors, catalog }) {
  const c = data.cliente;
  const v = data.vehiculo;
  const fc = (k) => (e) => setSection("cliente", { [k]: e.target.value });
  const fv = (k) => (e) => setSection("vehiculo", { [k]: e.target.value });
  return (
    <div className="space-y-5">
      <Card title="Cliente">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Nombre del cliente" required value={c.nombre} onChange={fc("nombre")} error={errors.nombre} data-testid="input-cliente-nombre" className="md:col-span-3" />
          <Field label="Teléfono" type="tel" inputMode="tel" value={c.telefono} onChange={fc("telefono")} data-testid="input-cliente-telefono" />
          <Field label="Correo (opcional)" type="email" value={c.correo} onChange={fc("correo")} data-testid="input-cliente-correo" className="md:col-span-2" />
        </div>
      </Card>
      <Card title="Vehículo">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Marca" value={v.marca} onChange={fv("marca")} data-testid="input-vehiculo-marca" />
          <Field label="Modelo" value={v.modelo} onChange={fv("modelo")} data-testid="input-vehiculo-modelo" />
          <Field label="Año" inputMode="numeric" value={v.anio} onChange={fv("anio")} data-testid="input-vehiculo-anio" />
          <Field label="Color" value={v.color} onChange={fv("color")} data-testid="input-vehiculo-color" />
          <Field label="Placas" required value={v.placas} onChange={(e) => setSection("vehiculo", { placas: e.target.value.toUpperCase() })} error={errors.placas} data-testid="input-vehiculo-placas" />
          <Field label="Kilometraje" required inputMode="numeric" value={v.kilometraje} onChange={fv("kilometraje")} error={errors.kilometraje} data-testid="input-vehiculo-kilometraje" />
          <Field label="VIN" value={v.vin} onChange={(e) => setSection("vehiculo", { vin: e.target.value.toUpperCase() })} data-testid="input-vehiculo-vin" className="col-span-2" />
        </div>
        <div className="mt-6">
          <span className="block mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Combustible</span>
          <div className="grid grid-cols-5 gap-2">
            {catalog.combustible.map((f, i) => (
              <Chip key={f} selected={v.combustible === f} className="justify-center !px-2"
                onClick={() => setSection("vehiculo", { combustible: v.combustible === f ? "" : f })} testId={`fuel-chip-${i}`}>
                {f}
              </Chip>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
