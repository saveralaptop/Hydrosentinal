import React from "react";
import { toIsoTimestamp } from "@/lib/deviceStore";
import { motion } from "framer-motion";
import { AlertLevel, WaterAlert, WATER_THRESHOLDS } from "@/services/alertService";
import { Clock, AlertCircle, CheckCircle } from "lucide-react";

interface AlertPanelProps {
  alerts: WaterAlert[];
  currentLevel: AlertLevel | null;
  isLoading?: boolean;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,
  currentLevel,
  isLoading = false,
}) => {
  const latestAlert = alerts[0] ?? null;
  const alertCount = alerts.length;

  const getAlertBgColor = (level: AlertLevel): string => {
    switch (level) {
      case AlertLevel.DANGER:
        return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50";
      case AlertLevel.WARNING:
        return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50";
      default:
        return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50";
    }
  };

  const getAlertTextColor = (level: AlertLevel): string => {
    switch (level) {
      case AlertLevel.DANGER:
        return "text-red-900 dark:text-red-200";
      case AlertLevel.WARNING:
        return "text-amber-900 dark:text-amber-200";
      default:
        return "text-emerald-900 dark:text-emerald-200";
    }
  };

  const formatTime = (timestampValue: unknown): string => {
    const iso = toIsoTimestamp(timestampValue);
    const date = iso ? new Date(iso) : (typeof timestampValue === 'number' ? new Date(timestampValue) : new Date(String(timestampValue)));
    const now = new Date();
    const time = date.getTime();
    const diffMs = now.getTime() - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (level: AlertLevel | null) => {
    switch (level) {
      case AlertLevel.DANGER:
        return "🚨";
      case AlertLevel.WARNING:
        return "⚠️";
      case null:
        return "✅";
      default:
        return "•";
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Status */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-4 transition-all ${getAlertBgColor(currentLevel || AlertLevel.SAFE)}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{getStatusIcon(currentLevel)}</div>
              <div>
                <p className={`text-sm font-semibold ${getAlertTextColor(currentLevel || AlertLevel.SAFE)}`}>
                  {currentLevel === AlertLevel.DANGER
                    ? "Water Unsafe - DO NOT DRINK"
                    : currentLevel === AlertLevel.WARNING
                    ? "Water Quality Warning"
                    : "Water Quality Safe"}
                </p>
                <p className="text-xs opacity-75">
                  {currentLevel
                    ? "Immediate action recommended"
                    : "All parameters within safe range"}
                </p>
              </div>
            </div>
            {currentLevel && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl"
              >
                {getStatusIcon(currentLevel)}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Recent Alerts List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Recent Alert History
          </h3>
          {!isLoading && alertCount > 3 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing latest 3 of {alertCount}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse"
              />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 dark:border-cyan-900/40 dark:bg-cyan-950/20">
            <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-200">
              No alert history yet.
            </p>
            <p className="mt-1 text-xs text-cyan-700 dark:text-cyan-300/80">
              We will show warning and danger events here once readings start crossing thresholds.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {alerts.slice(0, 3).map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-xl border p-3 transition-all hover:shadow-md ${getAlertBgColor(alert.level)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon(alert.level)}</span>
                      <p className={`text-sm font-semibold ${getAlertTextColor(alert.level)}`}>
                        {alert.message}
                      </p>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      {alert.readings.tds !== undefined && (
                        <div className="rounded-lg bg-white/50 px-2 py-1 dark:bg-black/20">
                          <p className="opacity-75">TDS</p>
                          <p className="font-semibold">{alert.readings.tds} ppm</p>
                        </div>
                      )}
                      {alert.readings.ph !== undefined && (
                        <div className="rounded-lg bg-white/50 px-2 py-1 dark:bg-black/20">
                          <p className="opacity-75">pH</p>
                          <p className="font-semibold">{alert.readings.ph.toFixed(2)}</p>
                        </div>
                      )}
                      {alert.readings.turbidity !== undefined && (
                        <div className="rounded-lg bg-white/50 px-2 py-1 dark:bg-black/20">
                          <p className="opacity-75">Turbidity</p>
                          <p className="font-semibold">{alert.readings.turbidity} NTU</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="flex items-center gap-1 text-xs opacity-75">
                      <Clock className="w-3 h-3" />
                      {formatTime(alert.timestamp)}
                    </p>
                    {alert.sentSMS && (
                      <p className="mt-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                        📱 SMS Sent
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
