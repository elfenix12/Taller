import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, downloadPdf, errMsg } from "../lib/api";

export function useEntryActions(entry, setEntry) {
  const [busy, setBusy] = useState("");
  const navigate = useNavigate();
  const needsSign = (e) => {
    if (e?.response?.status !== 409) return false;
    toast.info("Primero captura las firmas para generar el PDF");
    navigate(`/entradas/${entry.id}/firmar`);
    return true;
  };
  const download = async () => {
    setBusy("pdf");
    try {
      await downloadPdf(`/entries/${entry.id}/pdf`, entry.pdf_label || entry.folio_str);
    } catch (e) {
      if (!needsSign(e)) toast.error(errMsg(e, "No se pudo descargar el PDF"));
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
      if (!needsSign(e)) toast.error(errMsg(e, "No se pudo reenviar"));
    } finally {
      setBusy("");
    }
  };
  return { busy, download, resend };
}
