import { Check, Minus, Plus } from "lucide-react";

export function Chip({ selected, onClick, children, testId, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={selected}
      className={`min-h-[56px] px-5 py-3 rounded-2xl border-2 text-base font-semibold flex items-center gap-2 transition-colors active:scale-[0.98] text-left ${
        selected ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-white text-slate-900 border-slate-300 hover:border-slate-900"
      } ${className}`}
    >
      {selected && <Check size={20} className="shrink-0" />}
      {children}
    </button>
  );
}

export function CountChip({ id, label, qty, onToggle, onQty }) {
  const on = qty > 0;
  return (
    <div
      className={`min-h-[60px] rounded-2xl border-2 flex items-center transition-colors ${
        on ? "bg-[#0A0A0A] border-[#0A0A0A] text-white" : "bg-white border-slate-300 hover:border-slate-900"
      }`}
    >
      <button type="button" onClick={onToggle} data-testid={`chip-item-${id}`} aria-pressed={on}
        className="flex-1 min-h-[56px] px-4 flex items-center gap-2 text-left font-semibold text-base">
        {on && <Check size={20} className="shrink-0" />}
        <span className="leading-tight">
          {label}
          {on && <span className="block text-xs font-bold uppercase tracking-wider text-emerald-300">Sí trae</span>}
        </span>
      </button>
      {on && (
        <div className="flex items-center gap-1 pr-2">
          <button type="button" onClick={() => onQty(Math.max(1, qty - 1))} data-testid={`chip-counter-minus-${id}`}
            className="w-11 h-11 rounded-xl bg-white text-[#0A0A0A] grid place-items-center active:scale-95"><Minus size={20} /></button>
          <span className="w-8 text-center text-lg font-bold font-mono" data-testid={`chip-qty-${id}`}>{qty}</span>
          <button type="button" onClick={() => onQty(qty + 1)} data-testid={`chip-counter-plus-${id}`}
            className="w-11 h-11 rounded-xl bg-white text-[#0A0A0A] grid place-items-center active:scale-95"><Plus size={20} /></button>
        </div>
      )}
    </div>
  );
}
