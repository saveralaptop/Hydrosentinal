const { admin, initializeFirebase } = require("./firebase");
const { getDb } = require("./db");

const processingDocs = new Set();
let realtimeListeners = [];
let firestore = null;

function parseIdsFromPath(path) {
  const nestedMatch = path.match(/^users\/([^/]+)\/devices\/([^/]+)\/readings\/[^/]+$/);
  if (nestedMatch) {
    return {
      userId: nestedMatch[1],
      deviceId: nestedMatch[2],
    };
  }

  return {
    userId: "",
    deviceId: "",
  };
}

function toSafeDate(value) {
  if (!value) {
    return new Date();
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function normalizeReading(docSnap) {
  const data = docSnap.data() || {};
  const idsFromPath = parseIdsFromPath(docSnap.ref.path);

  return {
    docId: docSnap.ref.path,
    userId: String(data.userId || data.user_id || idsFromPath.userId || ""),
    deviceId: String(data.deviceId || data.device_id || idsFromPath.deviceId || ""),
    ph: data.ph === undefined || data.ph === null ? null : Number(data.ph),
    turbidity:
      data.turbidity === undefined || data.turbidity === null ? null : Number(data.turbidity),
    timestamp: toSafeDate(data.timestamp),
    synced: data.synced === true,
  };
}

async function retry(fn, attempts = 3, delayMs = 500) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}

function detectReadingAnomaly(reading) {
  const anomalies = [];

  if (reading.ph !== null) {
    if (reading.ph < 6.5) {
      anomalies.push(`pH too low (${reading.ph})`);
    } else if (reading.ph > 8.5) {
      anomalies.push(`pH too high (${reading.ph})`);
    }
  }

  if (reading.turbidity !== null && reading.turbidity > 15) {
    anomalies.push(`turbidity too high (${reading.turbidity})`);
  }

  if (anomalies.length === 0) {
    return null;
  }

  return {
    severity: anomalies.length > 1 ? "critical" : "warning",
    reason: anomalies.join("; "),
  };
}

async function createAnomalyAlert(reading, anomaly) {
  try {
    const alertPayload = {
      userId: reading.userId,
      deviceId: reading.deviceId,
      timestamp: reading.timestamp.toISOString(),
      severity: anomaly.severity,
      reason: anomaly.reason,
      source: "firestore-sync",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await firestore.collection("alerts").add(alertPayload);
    console.warn(`Anomaly detected for ${reading.deviceId}: ${anomaly.reason}`);
  } catch (error) {
    console.error("Failed to create anomaly alert:", error);
  }
}

async function insertReadingIntoSQLite(reading) {
  const db = getDb();
  const sql = `
    INSERT OR IGNORE INTO readings (user_id, device_id, ph, turbidity, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `;

  const stmt = db.prepare(sql);
  stmt.run([
    reading.userId,
    reading.deviceId,
    reading.ph,
    reading.turbidity,
    reading.timestamp.toISOString(),
  ]);
}

async function markDocumentSynced(docSnap) {
  await docSnap.ref.update({
    synced: true,
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function syncDocument(docSnap) {
  if (!docSnap.exists) {
    return;
  }

  if (processingDocs.has(docSnap.ref.path)) {
    return;
  }

  const reading = normalizeReading(docSnap);
  if (reading.synced) {
    return;
  }

  if (!reading.userId || !reading.deviceId) {
    console.warn(`Skipping reading ${docSnap.ref.path}: missing userId or deviceId`);
    return;
  }

  processingDocs.add(docSnap.ref.path);

  try {
    await retry(() => insertReadingIntoSQLite(reading));

    const anomaly = detectReadingAnomaly(reading);
    if (anomaly) {
      await createAnomalyAlert(reading, anomaly);
    }

    await markDocumentSynced(docSnap);
  } catch (error) {
    console.error(`Failed to sync reading ${docSnap.ref.path}:`, error);
  } finally {
    processingDocs.delete(docSnap.ref.path);
  }
}

async function syncExistingReadings() {
  // Catch up from both legacy (top-level) and current nested paths.
  const waterDataSnapshot = await firestore.collection("waterData").get();
  for (const docSnap of waterDataSnapshot.docs) {
    await syncDocument(docSnap);
  }

  const nestedSnapshot = await firestore.collectionGroup("readings").get();
  for (const docSnap of nestedSnapshot.docs) {
    await syncDocument(docSnap);
  }
}

function startRealtimeSync() {
  if (realtimeListeners.length > 0) {
    return realtimeListeners;
  }

  const sources = [
    firestore.collection("waterData"),
    firestore.collectionGroup("readings"),
  ];

  realtimeListeners = sources.map((ref) =>
    ref.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            void syncDocument(change.doc);
          }
        });
      },
      (error) => {
        console.error("Firestore realtime listener error:", error);
      }
    )
  );

  return realtimeListeners;
}

async function getLast10ReadingsPerDevice() {
  const db = getDb();
  // Fetch in descending order, then keep only the newest 10 per device in memory.
  const sql = `
    SELECT id, user_id, device_id, ph, turbidity, timestamp
    FROM readings
    ORDER BY device_id ASC, timestamp DESC, id DESC
  `;
  const rows = db.prepare(sql).all();

  const grouped = {};

  for (const row of rows) {
    const deviceId = row.device_id;

    if (!grouped[deviceId]) {
      grouped[deviceId] = [];
    }

    if (grouped[deviceId].length < 10) {
      grouped[deviceId].push({
        id: row.id,
        user_id: row.user_id,
        device_id: row.device_id,
        ph: row.ph,
        turbidity: row.turbidity,
        timestamp: row.timestamp,
      });
    }
  }

  return grouped;
}

async function runSyncWorker() {
  if (!firestore) {
    ({ firestore } = initializeFirebase());
  }

  await syncExistingReadings();
  startRealtimeSync();
}

if (require.main === module) {
  runSyncWorker().catch((error) => {
    console.error("Sync worker failed to start:", error);
    process.exitCode = 1;
  });
}

module.exports = {
  getLast10ReadingsPerDevice,
  runSyncWorker,
  startRealtimeSync,
  syncExistingReadings,
  syncDocument,
  insertReadingIntoSQLite,
};
