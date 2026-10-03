export const fmtFecha = (iso) =>
  iso
    ? new Intl.DateTimeFormat("es-MX", {
        timeZone: "America/Tijuana",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "";

export const emptyEntry = () => ({
  cliente: { nombre: "", telefono: "", correo: "" },
  vehiculo: { marca: "", modelo: "", anio: "", color: "", placas: "", vin: "", kilometraje: "", combustible: "" },
  orden: { tipo: "particular", aseguradora: "", poliza: "", siniestro: "", reporte: "", tipo_danio: "", tipo_danio_otro: "" },
  inventario: {},
  otros_objetos: "",
  danios: {},
  fotos: [],
  comentarios: "",
  fecha_ingreso: new Date().toISOString(),
  firmas: null,
});

export const pickEntry = (e) => {
  const base = emptyEntry();
  return Object.fromEntries(Object.keys(base).map((k) => [k, e[k] ?? base[k]]));
};
