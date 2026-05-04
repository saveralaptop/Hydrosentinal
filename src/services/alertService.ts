import { collection, query, onSnapshot, where, orderBy, limit, setDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

export interface WaterReading {
  id: string;
  deviceId: string;
  tds: number;
  ph: number;
  turbidity: number;
  temperature?: number;
  timestamp: number;
  createdAt?: string;
}

export enum AlertLevel {
  SAFE = "safe",
  WARNING = "warning",
  DANGER = "danger",
}

export interface WaterAlert {
  id: string;
  deviceId: string;
  userId: string;
  level: AlertLevel;
  message: string;
  readings: {
    tds?: number;
    ph?: number;
    turbidity?: number;
  };
  timestamp: number;
  sentSMS: boolean;
  createdAt: string;
}

export const WATER_THRESHOLDS = {
  TDS: {
    warning: 500,
    danger: 800,
  },
  pH: {
    min_safe: 6.5,
    max_safe: 8.5,
  },
  TURBIDITY: {
    warning: 5,
    danger: 10,
  },
};

// Evaluate water quality alert level
export const evaluateAlertLevel = (reading: WaterReading): AlertLevel | null => {
  let level = AlertLevel.SAFE;

  // Check TDS
  if (reading.tds > WATER_THRESHOLDS.TDS.danger) {
    level = AlertLevel.DANGER;
  } else if (reading.tds > WATER_THRESHOLDS.TDS.warning) {
    level = AlertLevel.WARNING;
  }

  // Check pH (takes priority if danger level)
  if (reading.ph < WATER_THRESHOLDS.pH.min_safe || reading.ph > WATER_THRESHOLDS.pH.max_safe) {
    level = AlertLevel.DANGER;
  }

  // Check Turbidity
  if (reading.turbidity > WATER_THRESHOLDS.TURBIDITY.danger) {
    level = AlertLevel.DANGER;
  } else if (reading.turbidity > WATER_THRESHOLDS.TURBIDITY.warning) {
    if (level === AlertLevel.SAFE) level = AlertLevel.WARNING;
  }

  return level === AlertLevel.SAFE ? null : level;
};

// Get alert message based on reading and level
export const generateAlertMessage = (reading: WaterReading, level: AlertLevel): string => {
  const issues: string[] = [];

  if (reading.tds > WATER_THRESHOLDS.TDS.danger) {
    issues.push(`High TDS (${reading.tds} ppm)`);
  } else if (reading.tds > WATER_THRESHOLDS.TDS.warning) {
    issues.push(`Elevated TDS (${reading.tds} ppm)`);
  }

  if (reading.ph < WATER_THRESHOLDS.pH.min_safe || reading.ph > WATER_THRESHOLDS.pH.max_safe) {
    issues.push(`Unsafe pH (${reading.ph})`);
  }

  if (reading.turbidity > WATER_THRESHOLDS.TURBIDITY.danger) {
    issues.push(`High Turbidity (${reading.turbidity} NTU)`);
  } else if (reading.turbidity > WATER_THRESHOLDS.TURBIDITY.warning) {
    issues.push(`Elevated Turbidity (${reading.turbidity} NTU)`);
  }

  const severity = level === AlertLevel.DANGER ? "🚨 DANGER" : "⚠️ WARNING";
  return `${severity}: ${issues.join(", ")}`;
};

// Check if alert should be sent (spam prevention - 10 minutes)
export const shouldSendAlert = async (
  deviceId: string,
  userId: string
): Promise<boolean> => {
  try {
    const recentAlerts = await new Promise<WaterAlert[]>((resolve, reject) => {
      const q = query(
        collection(db, "alerts"),
        where("deviceId", "==", deviceId),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(1)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          unsubscribe();
          resolve(snapshot.docs.map((doc) => doc.data() as WaterAlert));
        },
        reject
      );
    });

    if (recentAlerts.length === 0) {
      return true;
    }

    const lastAlert = recentAlerts[0];
    const timeDiff = Date.now() - lastAlert.timestamp;
    const tenMinutes = 10 * 60 * 1000;

    return timeDiff > tenMinutes;
  } catch (error) {
    console.error("Error checking alert spam:", error);
    return true;
  }
};

// Store alert in Firestore
export const storeAlert = async (
  deviceId: string,
  userId: string,
  reading: WaterReading,
  level: AlertLevel,
  sentSMS: boolean = false
): Promise<void> => {
  try {
    const alertMessage = generateAlertMessage(reading, level);
    const alertId = `${deviceId}-${Date.now()}`;

    await setDoc(doc(db, "alerts", alertId), {
      id: alertId,
      deviceId,
      userId,
      level,
      message: alertMessage,
      readings: {
        tds: reading.tds,
        ph: reading.ph,
        turbidity: reading.turbidity,
      },
      timestamp: Date.now(),
      sentSMS,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error storing alert:", error);
  }
};

// Get recent alerts for device
export const getDeviceAlerts = (
  deviceId: string,
  callback: (alerts: WaterAlert[]) => void,
  limit_count: number = 10
): (() => void) => {
  const q = query(
    collection(db, "alerts"),
    where("deviceId", "==", deviceId),
    orderBy("timestamp", "desc"),
    limit(limit_count)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map((doc) => doc.data() as WaterAlert);
    callback(alerts);
  });

  return unsubscribe;
};

// Monitor water readings in real-time for alerts
export const monitorWaterReadings = (
  deviceId: string,
  userId: string,
  callback: (reading: WaterReading, level: AlertLevel | null) => void
): (() => void) => {
  const q = query(
    collection(db, `devices/${deviceId}/readings`),
    orderBy("timestamp", "desc"),
    limit(1)
  );

  const unsubscribe = onSnapshot(q, async (snapshot) => {
    for (const docSnapshot of snapshot.docs) {
      const reading = {
        id: docSnapshot.id,
        ...docSnapshot.data(),
      } as WaterReading;

      const level = evaluateAlertLevel(reading);
      callback(reading, level);

      // Auto-trigger SMS alert if applicable
      if (level) {
        const canSend = await shouldSendAlert(deviceId, userId);
        if (canSend) {
          await storeAlert(deviceId, userId, reading, level, false);
        }
      }
    }
  });

  return unsubscribe;
};

// Get alert statistics for dashboard
export const getAlertStats = async (userId: string) => {
  try {
    return new Promise<{ total: number; danger: number; warning: number }>((resolve, reject) => {
      const q = query(
        collection(db, "alerts"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(100)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          unsubscribe();
          const alerts = snapshot.docs.map((doc) => doc.data() as WaterAlert);
          const stats = {
            total: alerts.length,
            danger: alerts.filter((a) => a.level === AlertLevel.DANGER).length,
            warning: alerts.filter((a) => a.level === AlertLevel.WARNING).length,
          };
          resolve(stats);
        },
        reject
      );
    });
  } catch (error) {
    console.error("Error getting alert stats:", error);
    return { total: 0, danger: 0, warning: 0 };
  }
};
