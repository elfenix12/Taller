import { useRef, useState } from "react";
import { Camera, Images, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, Field } from "../Field";
import { Btn } from "../Btn";
import { api, photoUrl, errMsg } from "../../lib/api";
import { compressImage } from "../../lib/image";

const MAX = 20;

export default function StepPhotos({ data, setData }) {
  const cam = useRef(null);
  const gal = useRef(null);
  const [uploading, setUploading] = useState(0);
  const count = data.fotos.length;

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX - count - uploading;
    if (files.length > room) toast.warning(`Solo se pueden agregar ${Math.max(room, 0)} fotos más (máximo ${MAX}).`);
    const batch = files.slice(0, Math.max(room, 0));
    setUploading((u) => u + batch.length);
    for (const f of batch) {
      try {
        const blob = await compressImage(f);
        const fd = new FormData();
        fd.append("file", blob, "foto.jpg");
        const { data: r } = await api.post("/photos", fd);
        setData((d) => ({ ...d, fotos: [...d.fotos, r.id].slice(0, MAX) }));
      } catch (err) {
        toast.error(errMsg(err, "No se pudo subir una foto"));
      } finally {
        setUploading((u) => u - 1);
      }
    }
  };

  const remove = (id) => setData((d) => ({ ...d, fotos: d.fotos.filter((x) => x !== id) }));

  return (
    <div className="space-y-5">
      <Card title="Fotos" actions={<span className="font-mono font-bold text-lg" data-testid="photo-count">{count}/{MAX}</span>}>
        <div className="grid grid-cols-2 gap-3 max-w-xl">
          <Btn onClick={() => cam.current.click()} disabled={count >= MAX} data-testid="photo-camera-btn"><Camera /> Cámara</Btn>
          <Btn variant="outline" onClick={() => gal.current.click()} disabled={count >= MAX} data-testid="photo-gallery-btn"><Images /> Galería</Btn>
        </div>
        <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFiles} data-testid="photo-camera-input" />
        <input ref={gal} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} data-testid="photo-gallery-input" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-5">
          {data.fotos.map((id, i) => (
            <div key={id} className="relative">
              <img src={photoUrl(id)} alt={`Foto ${i + 1}`} className="aspect-square w-full object-cover rounded-xl border-2 border-slate-300" />
              <button type="button" onClick={() => remove(id)} data-testid={`photo-remove-${i}`}
                className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-red-600 text-white grid place-items-center shadow-lg active:scale-95">
                <X size={20} />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="aspect-square rounded-xl border-2 border-dashed border-slate-400 grid place-items-center">
              <Loader2 className="animate-spin" />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <Field label="Comentarios generales" textarea value={data.comentarios}
          onChange={(e) => setData((d) => ({ ...d, comentarios: e.target.value }))} data-testid="input-comentarios" />
      </Card>
    </div>
  );
}
