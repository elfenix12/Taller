import { Loader2 } from "lucide-react";

export function PdfPages({ pages, sizeBytes }) {
  if (!pages) {
    return (
      <div className="min-h-[50vh] grid place-items-center" data-testid="pdf-preview-loading">
        <div className="flex items-center gap-3 text-lg font-semibold"><Loader2 className="animate-spin" /> Generando vista previa…</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-200 rounded-2xl p-3 sm:p-6 space-y-4" data-testid="pdf-preview">
      <div className="text-sm font-semibold text-slate-700">
        {pages.length} página(s) · {(sizeBytes / 1024 / 1024).toFixed(2)} MB · tamaño carta
      </div>
      {pages.map((src, i) => (
        <img key={i} src={src} alt={`Página ${i + 1}`} className="w-full max-w-3xl mx-auto bg-white shadow-xl" data-testid={`pdf-page-${i}`} />
      ))}
    </div>
  );
}
