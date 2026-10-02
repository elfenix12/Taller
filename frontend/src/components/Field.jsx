export const inputCls =
  "w-full min-h-[56px] text-lg font-medium px-4 border-2 border-slate-300 focus:border-[#0A0A0A] focus:outline-none rounded-xl bg-white";

export function Field({ label, required, error, className = "", textarea, ...props }) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <label className={`block ${className}`}>
      <span className="block mb-1.5 text-sm font-bold uppercase tracking-wide text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <Tag
        className={`${inputCls} ${textarea ? "py-3 min-h-[120px]" : ""} ${error ? "border-red-600 bg-red-50" : ""}`}
        {...props}
      />
      {error && <span className="block mt-1 text-sm font-bold text-red-700" data-testid={`${props["data-testid"]}-error`}>{error}</span>}
    </label>
  );
}

export function Card({ title, children, actions, className = "" }) {
  return (
    <section className={`bg-white border-2 border-[#0F172A] rounded-2xl p-4 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          {title && <h3 className="text-lg sm:text-xl font-bold">{title}</h3>}
          {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
