export function EstadoToggle({ value, onChange, testId = "status-toggle" }) {
  const opt = (v, label, on) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (value !== v) onChange(v);
      }}
      data-testid={`${testId}-${v}`}
      aria-pressed={value === v}
      className={`min-h-[48px] px-4 rounded-lg text-sm sm:text-base font-bold transition-colors ${value === v ? on : "text-slate-600 hover:bg-white"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex p-1 rounded-xl bg-slate-100 border-2 border-slate-300 gap-1" data-testid={testId}>
      {opt("en_taller", "En taller", "bg-amber-400 text-amber-950 shadow")}
      {opt("entregado", "Entregado", "bg-emerald-500 text-white shadow")}
    </div>
  );
}
