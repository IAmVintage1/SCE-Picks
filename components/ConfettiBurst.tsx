"use client";

const COLORS = ["#EA2A2A", "#1E5FFF", "#F5F4F1", "#FF5A4E", "#5C8AFF"];

export default function ConfettiBurst({ trigger }: { trigger: number }) {
  if (trigger === 0) return null;

  const pieces = Array.from({ length: 14 });

  return (
    <div
      key={trigger}
      className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-visible"
      aria-hidden
    >
      {pieces.map((_, i) => {
        const left = (i / pieces.length) * 100 + (Math.random() * 6 - 3);
        const delay = Math.random() * 0.15;
        const color = COLORS[i % COLORS.length];
        return (
          <span
            key={i}
            className="absolute top-0 h-2 w-2 animate-confettiFall rounded-sm"
            style={{
              left: `${left}%`,
              backgroundColor: color,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
