import { CheckCircle2, AlertTriangle, MailWarning } from "lucide-react";

export function MailStatus({ entry }) {
  const s = entry.mail_status;
  const to = entry.cliente?.correo ? `${entry.cliente.correo} y al taller` : "al taller";
  const map = {
    enviado: ["border-emerald-600 bg-emerald-50 text-emerald-900", CheckCircle2, `Correo enviado ${to}.`],
    fallido: ["border-red-600 bg-red-50 text-red-900", AlertTriangle, entry.mail_error || "No se pudo enviar el correo. Puedes reenviarlo."],
    no_configurado: ["border-amber-500 bg-amber-50 text-amber-900", MailWarning, "Envío de correo pendiente de configurar"],
  };
  const m = map[s];
  if (!m) return null;
  const [cls, Icon, text] = m;
  return (
    <div className={`flex items-start gap-3 rounded-xl border-2 p-4 font-semibold text-base ${cls}`} data-testid="mail-status-banner" data-status={s}>
      <Icon className="shrink-0" /> {text}
    </div>
  );
}
