import { useEffect, useState } from "react";

export const Confetti = ({ trigger }: { trigger: number }) => {
  const [pieces, setPieces] = useState<{ id: number; x: number; y: number; color: string; rot: number }[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const colors = ["hsl(188 100% 50%)", "hsl(195 100% 60%)", "hsl(215 60% 20%)", "hsl(0 0% 100%)"];
    const next = Array.from({ length: 60 }, (_, i) => ({
      id: trigger * 1000 + i,
      x: (Math.random() - 0.5) * 600,
      y: -Math.random() * 600 - 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 1600);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute h-2 w-2 rounded-sm"
          style={{
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            ["--tx" as any]: `${p.x}px`,
            ["--ty" as any]: `${p.y}px`,
            animation: "confetti-pop 1.4s cubic-bezier(0.2,0.7,0.4,1) forwards",
          }}
        />
      ))}
    </div>
  );
};
