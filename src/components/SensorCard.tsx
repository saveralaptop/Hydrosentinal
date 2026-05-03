import { Droplet, Gauge, Thermometer, Waves, type LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: number | undefined;
  unit: string;
  icon: "ph" | "tds" | "turbidity" | "temperature";
  safeRange: string;
  alert?: boolean;
  sparkline?: number[];
};

const ICONS: Record<Props["icon"], LucideIcon> = {
  ph: Droplet,
  tds: Gauge,
  turbidity: Waves,
  temperature: Thermometer,
};

export const SensorCard = ({ label, value, unit, icon, safeRange, alert, sparkline }: Props) => {
  const Icon = ICONS[icon];
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  const ranges: Record<Props['icon'], { min: number; max: number }> = {
    ph: { min: 0, max: 14 },
    tds: { min: 0, max: 1500 },
    turbidity: { min: 0, max: 500 },
    temperature: { min: -10, max: 50 },
  };

  const percent = (() => {
    if (value === undefined || value === null) return 0;
    const { min, max } = ranges[icon];
    return clamp((value - min) / (max - min), 0, 1);
  })();

  const gaugeColor = alert ? '#f43f5e' : '#06b6d4';
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-card transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-xl ${
        alert ? "border-danger/60" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">
            {value !== undefined ? value.toFixed(icon === "ph" ? 2 : 1) : "—"}
            <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none">
            <svg viewBox="0 0 44 44" width="44" height="44">
              <circle cx="22" cy="22" r="18" stroke="#0f172a" strokeWidth="6" fill="none" />
              <circle
                cx="22"
                cy="22"
                r="18"
                stroke={gaugeColor}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={Math.PI * 2 * 18}
                strokeDashoffset={Math.PI * 2 * 18 * (1 - percent)}
                style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1), stroke 300ms linear' }}
                transform="rotate(-90 22 22)"
              />
              <text x="22" y="26" fontSize="9" textAnchor="middle" fill="#e6eef8" style={{ fontWeight: 700 }}>{value !== undefined ? (icon === 'ph' ? value.toFixed(1) : Math.round(value)) : '—'}</text>
            </svg>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              alert ? "bg-danger/15 text-danger" : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Safe: {safeRange}</p>
        <div className="w-20 h-6 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
          {sparkline && sparkline.length > 0 ? (
            (() => {
              const spark = sparkline;
              const max = Math.max(...spark);
              const min = Math.min(...spark);
              const range = max - min || 1;
              const points = spark
                .slice(-10)
                .map((v, i) => `${(i / 9) * 100},${100 - ((v - min) / range) * 100}`)
                .join(" ");

              return (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="motion-safe:animate-pulse"
                    style={{ animationDuration: "4s" }}
                  />
                </svg>
              );
            })()
          ) : null}
        </div>
      </div>
    </div>
  );
};
