import { useState } from "react";
import { toast } from "sonner";
import { api, downloadPdf, errMsg } from "../lib/api";

export function useEntryActions(entry, setEntry) {
  const [busy, setBusy] = useState("");
  const download = async () => {
    setBusy("pdf");
    try {
      await downloadPdf(entry);
    } catch (e) {
      toast.error(errMsg(e, "No se pudo descargar el PDF"));
    } finally {
      setBusy("");
    }
  };
  const resend = async () => {
    setBusy("send");
    try {
      const { data } = await api.post(`/entries/${entry.id}/send`);
      setEntry((en) => ({ ...en, ...data }));
      if (data.mail_status === "enviado") toast.success("Correo enviado");
      else if (data.mail_status === "no_configurado") toast.warning("Envío de correo pendiente de configurar");
      else toast.error(data.mail_error || "No se pudo enviar el correo");
    } catch (e) {
      toast.error(errMsg(e, "No se pudo reenviar"));
    } finally {
      setBusy("");
    }
  };
  return { busy, download, resend };
}
