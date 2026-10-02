import { useEffect, useState } from "react";
import { Save, Trash2, UserPlus, Mail } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Card, Field, inputCls } from "../components/Field";
import { Btn } from "../components/Btn";
import { Chip } from "../components/Chip";

function MailBadge({ active }) {
  return (
    <div className={`inline-flex items-center gap-2 min-h-[48px] px-4 rounded-xl border-2 font-bold ${active ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-amber-500 bg-amber-50 text-amber-900"}`} data-testid="mail-status-indicator">
      <Mail size={20} /> Correo: {active ? "activo" : "no configurado"}
    </div>
  );
}

function Users({ me }) {
  const [list, setList] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const load = () => api.get("/users").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const add = async () => {
    try {
      await api.post("/users", { email, role });
      setEmail("");
      load();
      toast.success("Acceso agregado");
    } catch (e) { toast.error(errMsg(e)); }
  };
  const del = async (em) => {
    if (!window.confirm(`¿Quitar acceso a ${em}?`)) return;
    try { await api.delete(`/users/${encodeURIComponent(em)}`); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Card title="Personal con acceso (cuentas de Google)">
      <div className="flex flex-wrap gap-3 items-end">
        <input className={`${inputCls} flex-1 min-w-[240px]`} type="email" placeholder="correo@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="users-email-input" />
        <Chip selected={role === "staff"} onClick={() => setRole("staff")} testId="users-role-staff">Personal</Chip>
        <Chip selected={role === "admin"} onClick={() => setRole("admin")} testId="users-role-admin">Administrador</Chip>
        <Btn onClick={add} disabled={!email} data-testid="users-add-btn"><UserPlus /> Agregar</Btn>
      </div>
      <ul className="mt-4 divide-y divide-slate-200" data-testid="users-list">
        {list.map((u) => (
          <li key={u.email} className="py-3 flex items-center gap-3">
            <span className="flex-1 font-semibold break-all">{u.email}</span>
            <span className="text-sm font-bold uppercase text-slate-500">{u.role === "admin" ? "Administrador" : "Personal"}</span>
            {u.email !== me && <Btn size="sm" variant="danger" onClick={() => del(u.email)} data-testid={`users-remove-${u.email}`}><Trash2 size={18} /></Btn>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Settings() {
  const { settings, setSettings, user } = useApp();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/settings", form);
      setSettings(data);
      toast.success("Configuración guardada");
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rise">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Configuración</h1>
        <MailBadge active={settings.mail_configured} />
      </div>
      <Card title="Datos del taller">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nombre" value={form.nombre} onChange={f("nombre")} data-testid="settings-nombre" />
          <Field label="Teléfono" value={form.telefono} onChange={f("telefono")} data-testid="settings-telefono" />
          <Field label="Dirección" value={form.direccion} onChange={f("direccion")} className="md:col-span-2" data-testid="settings-direccion" />
          <Field label="Nota legal del PDF" textarea value={form.nota_legal} onChange={f("nota_legal")} className="md:col-span-2" data-testid="settings-nota-legal" />
        </div>
        <Btn className="mt-5" onClick={save} disabled={saving} data-testid="settings-save-btn"><Save /> Guardar</Btn>
      </Card>
      {user.role === "admin" && <Users me={user.email} />}
    </div>
  );
}
