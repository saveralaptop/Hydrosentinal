import React from "react";
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

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
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
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Alert History
        </h3>

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
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              No alerts recorded. Water quality is stable! 💧
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
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
                      <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mt-1">
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

      {/* Safety Thresholds Reference */}
      <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/30">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
          Safety Thresholds
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="opacity-75">TDS</p>
            <p className="text-amber-600 dark:text-amber-400">
              ⚠️ &gt;{WATER_THRESHOLDS.TDS.warning} ppm
            </p>
            <p className="text-red-600 dark:text-red-400">
              🚨 &gt;{WATER_THRESHOLDS.TDS.danger} ppm
            </p>
          </div>
          <div>
            <p className="opacity-75">pH</p>
            <p className="text-red-600 dark:text-red-400">
              🚨 &lt;{WATER_THRESHOLDS.pH.min_safe}
            </p>
            <p className="text-red-600 dark:text-red-400">
              🚨 &gt;{WATER_THRESHOLDS.pH.max_safe}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
