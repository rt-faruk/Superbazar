import { useEffect, useState } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (now == null) return null;
  const t = parts(new Date(endsAt).getTime() - now);
  return (
    <div className="flex items-center gap-1.5 font-mono text-sm" aria-label="Time left in the flash sale">
      {[
        [t.d, "d"],
        [t.h, "h"],
        [t.m, "m"],
        [t.s, "s"],
      ].map(([value, label]) => (
        <span key={label} className="rounded-md bg-foreground px-2 py-1 font-semibold text-background">
          {String(value).padStart(2, "0")}
          <span className="ml-0.5 text-[10px] opacity-70">{label}</span>
        </span>
      ))}
    </div>
  );
}
