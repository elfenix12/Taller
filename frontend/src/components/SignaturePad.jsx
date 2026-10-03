import { useEffect, useRef } from "react";

export function SignaturePad({ value, onChange, testId }) {
  const ref = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = ref.current;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    Object.assign(ctx, { lineWidth: 2.8, lineCap: "round", lineJoin: "round", strokeStyle: "#0A0A0A" });
    if (value?.png) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height);
      img.src = value.png;
    }
    const stop = (e) => e.preventDefault();
    c.addEventListener("touchmove", stop, { passive: false });
    c.addEventListener("touchstart", stop, { passive: false });
    return () => {
      c.removeEventListener("touchmove", stop);
      c.removeEventListener("touchstart", stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (value) return;
    const c = ref.current;
    const ctx = c.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
  }, [value]);

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const down = (e) => {
    ref.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = ref.current.getContext("2d");
    const [x, y] = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = ref.current.getContext("2d");
    const [x, y] = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange({ png: ref.current.toDataURL("image/png"), fecha: new Date().toISOString() });
  };

  return (
    <canvas
      ref={ref}
      data-testid={testId}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      className="w-full h-[220px] sm:h-[260px] rounded-xl border-2 border-dashed border-slate-400 bg-white cursor-crosshair"
      style={{ touchAction: "none" }}
    />
  );
}
