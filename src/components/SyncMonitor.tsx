import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { readPendingDeviceOperations, readPendingSignupOperations } from "@/lib/deviceStore";

interface SyncQueueItem {
  id: string;
  type: "device_upsert" | "device_delete" | "signup";
  description: string;
  timestamp: string;
  retries?: number;
}

export const SyncMonitor: React.FC<{ userId?: string }> = ({ userId }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedItems, setQueuedItems] = useState<SyncQueueItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSyncTime(new Date().toLocaleTimeString());
      console.log("[SyncMonitor] Connection restored, last sync at", lastSyncTime);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [lastSyncTime]);

  // Poll queue status
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const deviceOps = readPendingDeviceOperations();
        const signupOps = readPendingSignupOperations();

        const items: SyncQueueItem[] = [
          ...deviceOps
            .filter((op) => !userId || op.ownerUid === userId)
            .map((op) => ({
              id: `${op.type}-${op.deviceId || "unknown"}`,
              type: op.type === "delete" ? "device_delete" : "device_upsert",
              description: `Device ${op.type === "delete" ? "delete" : "upsert"}: ${op.deviceId}`,
              timestamp: new Date(op.queuedAt).toLocaleTimeString(),
              retries: op.retries || 0,
            })),
          ...signupOps.map((signup, idx) => ({
            id: `signup-${idx}`,
            type: "signup",
            description: `Signup: ${signup.email}`,
            timestamp: new Date(signup.queuedAt).toLocaleTimeString(),
          })),
        ];

        setQueuedItems(items);
      } catch (error) {
        console.error("[SyncMonitor] Error reading queue:", error);
      }
    }, 1000); // Poll every second for real-time updates

    return () => clearInterval(interval);
  }, [userId]);

  const totalQueued = queuedItems.length;
  const deviceOpsQueued = queuedItems.filter((item) => item.type.includes("device")).length;
  const signupOpsQueued = queuedItems.filter((item) => item.type === "signup").length;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main Status Indicator */}
      <div
        className={`rounded-lg border p-3 shadow-lg cursor-pointer transition-all ${
          isOnline
            ? "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-800"
            : "bg-yellow-50 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-800"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          )}
          <div className="text-sm font-medium">
            {isOnline ? "Connected" : "Offline"}
            {totalQueued > 0 && (
              <span className="ml-2 font-semibold">
                {totalQueued} queued
              </span>
            )}
          </div>
        </div>
        {lastSyncTime && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Last sync: {lastSyncTime}
          </div>
        )}
      </div>

      {/* Expanded Queue View */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-80 bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Sync Queue
            </h3>
            {!isOnline && (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                Offline
              </span>
            )}
          </div>

          {/* Queue Summary */}
          <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
              <div className="font-semibold text-blue-900 dark:text-blue-100">
                {deviceOpsQueued}
              </div>
              <div className="text-blue-700 dark:text-blue-300">Device ops</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded">
              <div className="font-semibold text-purple-900 dark:text-purple-100">
                {signupOpsQueued}
              </div>
              <div className="text-purple-700 dark:text-purple-300">Signups</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {totalQueued}
              </div>
              <div className="text-gray-700 dark:text-gray-400">Total</div>
            </div>
          </div>

          {/* Queue Items */}
          {totalQueued === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
              All data synced!
            </div>
          ) : (
            <div className="space-y-2">
              {queuedItems.map((item) => (
                <div
                  key={item.id}
                  className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border-l-2 border-orange-400"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.description}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.timestamp}
                        {item.retries && item.retries > 0 && (
                          <span className="ml-1">
                            <AlertCircle className="w-3 h-3 inline text-orange-500" />
                            Retry {item.retries}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            ✓ Data auto-syncs when connection restored
          </div>
        </div>
      )}
    </div>
  );
};
