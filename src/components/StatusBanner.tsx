import { ShieldAlert, ShieldCheck, Activity } from "lucide-react";

export const StatusBanner = ({ status, updatedAt, simulatorRunning }: { status?: "SAFE" | "NOT SAFE"; updatedAt?: string; simulatorRunning?: boolean }) => {
  const safe = status === "SAFE";
  const unknown = !status;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-8 shadow-card ${
        unknown
          ? "border-border bg-card"
          : safe
          ? "border-safe/40 bg-gradient-safe text-safe-foreground"
          : "border-danger/40 bg-gradient-danger text-danger-foreground"
      }`}
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-background/15 backdrop-blur ${
              !unknown ? "animate-pulse-glow" : ""
            }`}
          >
            {unknown ? (
              <ShieldAlert className="h-7 w-7 text-muted-foreground" />
            ) : safe ? (
              <ShieldCheck className="h-7 w-7" />
            ) : (
              <ShieldAlert className="h-7 w-7" />
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-80">Current water status</p>
            <h2 className="mt-1 text-3xl font-bold sm:text-4xl">
              {unknown ? "Awaiting data" : safe ? "Safe" : "Not Safe"}
            </h2>
          </div>
        </div>
        <div className="flex flex-col items-end gap-4 sm:gap-6">
          {updatedAt && (
            <div className="text-right text-xs opacity-80">
              <p className="uppercase tracking-wider">Last reading</p>
              <p className="mt-1 font-medium">{new Date(updatedAt).toLocaleTimeString()}</p>
            </div>
          )}
          {simulatorRunning !== undefined && (
            <div className="flex items-center gap-2 text-xs">
              <Activity className={`h-4 w-4 ${simulatorRunning ? "text-green-400 animate-pulse" : "text-muted-foreground"}`} />
              <span className="font-medium capitalize">{simulatorRunning ? "🟢 Simulator Running" : "🔴 Simulator Paused"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
