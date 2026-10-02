import { Card, inputCls } from "../Field";
import { Chip } from "../Chip";

export default function StepDamage({ data, setData, catalog }) {
  const d = data.danios;
  const toggle = (id) =>
    setData((s) => {
      const next = { ...s.danios };
      if (id in next) delete next[id];
      else next[id] = "";
      return { ...s, danios: next };
    });
  const note = (id, v) => setData((s) => ({ ...s, danios: { ...s.danios, [id]: v } }));
  return (
    <div className="space-y-5">
      {catalog.danios.map((g) => (
        <Card key={g.id} title={g.label}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.items.map((i) => (
              <div key={i.id} className={i.id in d ? "sm:col-span-1 space-y-2" : ""}>
                <Chip selected={i.id in d} onClick={() => toggle(i.id)} testId={`damage-chip-${i.id}`} className="w-full">
                  {i.label}
                </Chip>
                {i.id in d && (
                  <input className={`${inputCls} rise`} placeholder="Nota breve (opcional)" value={d[i.id]}
                    onChange={(e) => note(i.id, e.target.value)} data-testid={`damage-note-${i.id}`} />
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
