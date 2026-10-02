import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const api = axios.create({ baseURL: API, withCredentials: true });

export const photoUrl = (id) => `${API}/photos/${id}`;

export const errMsg = (e, fallback = "Ocurrió un error") => e?.response?.data?.detail || fallback;

export async function downloadPdf(entry) {
  const res = await api.get(`/entries/${entry.id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Entrada_${entry.folio_str}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
