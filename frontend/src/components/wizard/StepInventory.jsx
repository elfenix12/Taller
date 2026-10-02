import { Field, Card } from "../Field";
import { CountChip } from "../Chip";
import { Btn } from "../Btn";

export default function StepInventory({ data, setData, catalog }) {
  const inv = data.inventario;
  const setQty = (id, q) =>
    setData((d) => {
      const next = { ...d.inventario };
      if (q > 0) next[id] = q;
      else delete next[id];
      return { ...d, inventario: next };
    });
  const setGroup = (group, on) =>
    setData((d) => {
      const next = { ...d.inventario };
      group.items.forEach((i) => (on ? (next[i.id] = next[i.id] || 1) : delete next[i.id]));
      return { ...d, inventario: next };
    });
  return (
    <GroupList catalog={catalog} setGroup={setGroup} setQty={setQty} inv={inv}>
      <Field label="Otros objetos" textarea value={data.otros_objetos}
        onChange={(e) => setData((d) => ({ ...d, otros_objetos: e.target.value }))} data-testid="input-otros-objetos" />
    </GroupList>
  );
}

function GroupList({ catalog, setGroup, setQty, inv, children }) {
  return (
    <div className="space-y-5">
      {catalog.inventario.map((g) => (
        <Card key={g.id} title={g.label} actions={<>
          <Btn size="sm" variant="outline" onClick={() => setGroup(g, true)} data-testid={`mark-all-${g.id}`}>Marcar todo</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setGroup(g, false)} data-testid={`clear-${g.id}`}>Limpiar</Btn>
        </>}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.items.map((i) => (
              <CountChip key={i.id} id={i.id} label={i.label} qty={inv[i.id] || 0}
                onToggle={() => setQty(i.id, inv[i.id] ? 0 : 1)} onQty={(q) => setQty(i.id, q)} />
            ))}
          </div>
        </Card>
      ))}
      <Card>{children}</Card>
    </div>
  );
}
