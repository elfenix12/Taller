import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const api = axios.create({ baseURL: API, withCredentials: true });

export const photoUrl = (id) => `${API}/photos/${id}`;

export const errMsg = (e, fallback = "Ocurrió un error") => e?.response?.data?.detail || fallback;

export async function downloadPdf(path, filename) {
  const res = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Entrada_${filename.replace(/\s/g, "")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
