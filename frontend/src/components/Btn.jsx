const variants = {
  primary: "bg-[#0A0A0A] text-white hover:bg-slate-800 border-2 border-[#0A0A0A]",
  outline: "bg-white text-[#0A0A0A] border-2 border-[#0A0A0A] hover:bg-slate-100",
  ghost: "bg-transparent text-slate-800 border-2 border-transparent hover:bg-slate-100",
  danger: "bg-white text-red-700 border-2 border-red-600 hover:bg-red-50",
  success: "bg-emerald-600 text-white border-2 border-emerald-700 hover:bg-emerald-700",
};

export function Btn({ variant = "primary", size = "lg", className = "", children, ...props }) {
  const sz = size === "sm" ? "min-h-[48px] px-4 text-base" : "min-h-[60px] px-6 text-lg";
  return (
    <button
      type="button"
      className={`${sz} rounded-xl font-bold inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
