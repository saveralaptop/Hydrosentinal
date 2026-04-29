import { Droplet, Gauge, Thermometer, Waves, type LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: number | undefined;
  unit: string;
  icon: "ph" | "tds" | "turbidity" | "temperature";
  safeRange: string;
  alert?: boolean;
};

const ICONS: Record<Props["icon"], LucideIcon> = {
  ph: Droplet,
  tds: Gauge,
  turbidity: Waves,
  temperature: Thermometer,
};

export const SensorCard = ({ label, value, unit, icon, safeRange, alert }: Props) => {
  const Icon = ICONS[icon];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 ${
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
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            alert ? "bg-danger/15 text-danger" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Safe: {safeRange}</p>
    </div>
  );
};
