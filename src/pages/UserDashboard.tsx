import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBanner } from "@/components/StatusBanner";
import { SensorCard } from "@/components/SensorCard";
import { WaterGraph } from "@/components/WaterGraph";
import { ChatPanel } from "@/components/ChatPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AlertPanel } from "@/components/AlertPanel";
import { useWaterAlerts } from "@/hooks/useWaterAlerts";
import {
  LogOut,
  Plus,
  Table2,
  Play,
  Pause,
  UploadCloud,
  DownloadCloud,
  Wifi,
  LayoutDashboard,
  ChartLine,
  Waves,
  Cpu,
  Brain,
  Cloud,
  FileBarChart2,
  UserRound,
  Settings,
  MessageSquare,
  HelpCircle,
  Bell,
  AlertTriangle,
  BatteryCharging,
  X,
  Trash2,
} from "lucide-react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase";
import {
  DeviceRecord,
  appendLocalDeviceReading,
  generateRandomReading,
  getLocalDeviceHistory,
  getLocalDevicesByOwner,
  removeLocalDevice,
  upsertLocalDevice,
} from "@/lib/deviceStore";
import { getZone } from "@/lib/utils";
import { getDevicesByZone } from "@/lib/deviceStore";
import { calculateAreaStatus } from "@/lib/utils";
const LOCATIONS = [
  "North Zone",
  "South Zone",
  "East Zone",
  "West Zone",
  "Central Hub",
];

const resolveDeviceZone = (device: {
  zone?: string;
  latitude?: number;
  longitude?: number;
}) => {
  if (device.zone) {
    return device.zone;
  }

  if (Number.isFinite(device.latitude) && Number.isFinite(device.longitude)) {
    return getZone(device.latitude, device.longitude);
  }

  return null;
};

const toFirestoreIdPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildDeviceDocumentId = (
  uid: string,
  email: string | null,
  deviceName: string,
) => {
  const username =
    toFirestoreIdPart(email?.split("@")[0] ?? uid) || "user";
  const device = toFirestoreIdPart(deviceName) || "device";

  return `${username}-${device}`;
};

const mergeDeviceLists = (...deviceGroups: DeviceRecord[][]) => {
  const merged = new Map<string, DeviceRecord>();

  deviceGroups.flat().forEach((device) => {
    if (device?.id) {
      merged.set(device.id, device);
    }
  });

  return Array.from(merged.values());
};

export const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [simulatorOnly, setSimulatorOnly] = useState(true);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [history, setHistory] = useState<
    ReturnType<typeof getLocalDeviceHistory>
  >([]);
  const [areaStatus, setAreaStatus] = useState("Loading...");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [rightRailOpen, setRightRailOpen] = useState(false);
  const [addDeviceLoading, setAddDeviceLoading] = useState(false);
  const [newDevice, setNewDevice] = useState<{
    name: string;
    type: "simulator" | "real";
    manualLocation: string;
    latitude: number;
    longitude: number;
  }>({
    name: "",
    type: "simulator",
    manualLocation: "",
    latitude: 25.61,
    longitude: 85.14,
  });
  const [newDeviceConnected, setNewDeviceConnected] = useState(false);
  const [syncingDevices, setSyncingDevices] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [deviceLoadError, setDeviceLoadError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<
    Array<{
      id: string;
      deviceId: string;
      reason: string;
      severity: string;
      timestamp: string;
    }>
  >([]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId],
  );

  // Monitor water alerts for selected device
  const waterAlerts = useWaterAlerts(
    selectedDeviceId ?? "",
    user?.uid ?? "",
    user?.email ?? undefined
  );

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const localDevices = getLocalDevicesByOwner(user.uid);
    setDevices(localDevices);
    setSelectedDeviceId((prev) => prev ?? localDevices[0]?.id ?? null);
    setLoading(false);
    setDeviceLoadError(null);
    setDevicesLoading(true);

    if (simulatorOnly) {
      setDevicesLoading(false);
      return;
    }

    const deviceQuery = collection(db, "users", user.uid, "devices");

    const unsubscribe = onSnapshot(
      deviceQuery,
      (snapshot) => {
        try {
          const remoteDevices = snapshot.docs
            .map((item) => ({
              id: item.id,
              ...(item.data() as Omit<DeviceRecord, "id">),
            }))
            .filter((device) => Boolean(device.id) && Boolean(device.name));

          const nextDevices = mergeDeviceLists(localDevices, remoteDevices);

          console.log("[Dashboard] Device snapshot received", {
            remoteCount: remoteDevices.length,
            mergedCount: nextDevices.length,
            selectedDeviceId,
          });

          nextDevices.forEach((device) => upsertLocalDevice(device));
          setDevices(nextDevices);
          setSelectedDeviceId((prev) => prev ?? nextDevices[0]?.id ?? null);
          setDeviceLoadError(null);
        } catch (error) {
          console.error("[Dashboard] Failed to process device snapshot:", error);
          setDeviceLoadError("Unable to load devices. Please try again.");
          setDevices(localDevices);
        } finally {
          setDevicesLoading(false);
        }
      },
      (error) => {
        console.error("[Dashboard] Device listener error:", error);
        setDeviceLoadError("Unable to load devices. Please try again.");
        setDevices(localDevices);
        setDevicesLoading(false);
      },
    );

    return () => unsubscribe();
  }, [navigate, user, simulatorOnly, selectedDeviceId]);

  useEffect(() => {
    if (!selectedDevice) {
      setHistory([]);
      return;
    }

    const loadHistory = async () => {
      try {
        if (!simulatorOnly) {
          const readingSnapshot = await getDocs(
            collection(
              db,
              "users",
              user!.uid,
              "devices",
              selectedDevice.id,
              "readings",
            ),
          );

          if (readingSnapshot.size > 0) {
            const remoteHistory = readingSnapshot.docs.map(
              (item) =>
                item.data() as ReturnType<typeof getLocalDeviceHistory>[number],
            );
            setHistory(remoteHistory);
            return;
          }
        }
      } catch {
        // Use local fallback below.
      }

      setHistory(getLocalDeviceHistory(selectedDevice.id));
    };

    void loadHistory();
  }, [selectedDevice, user, simulatorOnly]);

  useEffect(() => {
    if (!selectedDevice) {
      setAreaStatus("Loading...");
      return;
    }

    const fetchAreaData = async () => {
      try {
        const zone = resolveDeviceZone(selectedDevice);
        console.log(`[Area Status Fetch] Using zone: ${zone}`, {
          deviceZone: selectedDevice?.zone,
          deviceLocation: selectedDevice?.location,
        });

        if (!zone) {
          setAreaStatus("No Data");
          return;
        }

        const zoneDevices = await getDevicesByZone(zone);
        const status = calculateAreaStatus(zoneDevices);
        setAreaStatus(status);
      } catch (error) {
        console.error("Failed to calculate area status:", error);
        setAreaStatus("Unable to load area status");
      }
    };

    void fetchAreaData();
  }, [selectedDevice]);

  const refreshDeviceStatus = async (deviceId: string) => {
    const latest = getLocalDeviceHistory(deviceId).slice(-1)[0];
    if (!latest) {
      return;
    }

    const nextStatus = latest.status === "SAFE" ? "active" : "inactive";

    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, status: nextStatus } : device,
      ),
    );

    const updated = devices.find((device) => device.id === deviceId);
    if (updated) {
      upsertLocalDevice({ ...updated, status: nextStatus });
    }

    try {
      await updateDoc(doc(db, "users", user!.uid, "devices", deviceId), {
        status: nextStatus,
      });
    } catch {
      // Local fallback already updated.
    }

    try {
      await updateDoc(doc(db, "devices", deviceId), { status: nextStatus });
    } catch {
      // Root devices mirror may be unavailable depending on Firestore rules.
    }
  };

  const handleAddDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    setSyncError(null);
    if (!user || !newDevice.name.trim()) {
      console.warn("[Dashboard] Invalid device input");
      return;
    }

    if (!newDevice.manualLocation.trim()) {
      alert("Please enter where you want to locate this device.");
      return;
    }

    if (newDevice.type === "real" && !newDeviceConnected) {
      alert("Please connect the real device before registering it.");
      return;
    }

    setAddDeviceLoading(true);
    try {
      const deviceId = buildDeviceDocumentId(
        user.uid,
        user.email,
        newDevice.name,
      );

      // Validate coordinates
      if (
        !Number.isFinite(newDevice.latitude) ||
        !Number.isFinite(newDevice.longitude)
      ) {
        console.error("[Dashboard] Invalid latitude/longitude");
        alert("Please enter valid latitude and longitude values");
        return;
      }

      // Compute zone from latitude and longitude
      const deviceZone = getZone(newDevice.latitude, newDevice.longitude);
      console.log(`[Dashboard] Creating device with zone: ${deviceZone}`);

      const payload: Omit<DeviceRecord, "id"> = {
        ownerUid: user.uid,
        name: newDevice.name.trim(),
        uniqueId: deviceId,
        location: newDevice.manualLocation.trim(),
        latitude: newDevice.latitude,
        longitude: newDevice.longitude,
        zone: deviceZone,
        status:
          newDevice.type === "real"
            ? newDeviceConnected
              ? "active"
              : "inactive"
            : "active",
        battery: 85,
        deviceType: newDevice.type,
        createdAt: new Date().toISOString(),
      };

      let created: DeviceRecord;

      try {
        const deviceRef = doc(db, "users", user.uid, "devices", deviceId);
        const existingDevice = await getDoc(deviceRef);

        await setDoc(deviceRef, payload);
        created = { id: deviceId, ...payload };
        console.log("[Dashboard] Saved device to user collection", created);

        try {
          await setDoc(doc(db, "devices", deviceId), payload);
          console.log("[Dashboard] Saved device to root mirror", deviceId);
        } catch {
          // Root devices mirror may be unavailable depending on Firestore rules.
        }

        if (!existingDevice.exists()) {
          await updateDoc(doc(db, "users", user.uid), {
            deviceCount: increment(1),
          });
        }
      } catch (error) {
        console.error("[Dashboard] Firestore error:", error);
        created = { id: deviceId, ...payload };
      }

      upsertLocalDevice(created);
      setDevices((prev) => [created, ...prev]);
      setSelectedDeviceId(created.id);
      setNewDevice({
        name: "",
        type: "simulator",
        manualLocation: "",
        latitude: 25.61,
        longitude: 85.14,
      });
      setNewDeviceConnected(false);
      setShowAddForm(false);
      console.log("[Dashboard] Device created successfully:", created.id);
    } catch (error) {
      console.error("[Dashboard] Unexpected error in handleAddDevice:", error);
      alert("Failed to create device. Check the console for details.");
    } finally {
      setAddDeviceLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!window.confirm("Delete this device from your account?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", user!.uid, "devices", deviceId));
      await updateDoc(doc(db, "users", user!.uid), {
        deviceCount: increment(-1),
      });
    } catch {
      // Local fallback still applies.
    }

    try {
      await deleteDoc(doc(db, "devices", deviceId));
    } catch {
      // Root devices mirror may be unavailable depending on Firestore rules.
    }

    removeLocalDevice(deviceId);
    const nextDevices = devices.filter((device) => device.id !== deviceId);
    setDevices(nextDevices);

    if (selectedDeviceId === deviceId) {
      setSelectedDeviceId(nextDevices[0]?.id ?? null);
    }
  };

  const syncDeviceRegistry = async () => {
    if (!user) return;

    setSyncingDevices(true);
    setSyncError(null);
    try {
      const rootDeviceQuery = query(
        collection(db, "devices"),
        where("ownerUid", "==", user.uid),
      );
      const rootSnapshot = await getDocs(rootDeviceQuery);
      const rootDevices = rootSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...(item.data() as Omit<DeviceRecord, "id">),
        }))
        .filter((device) => device.id && device.name); // Basic validation

      console.log("[Dashboard] Sync fetched root devices", {
        count: rootDevices.length,
        ownerUid: user.uid,
      });

      if (rootDevices.length === 0) {
        console.warn("Sync found no remote devices. Keeping local registry.");
        setSyncError("No remote devices found. Local devices are preserved.");
        setDevices(getLocalDevicesByOwner(user.uid));
        return;
      }

      const localDevices = getLocalDevicesByOwner(user.uid);
      const existingSnapshot = await getDocs(
        collection(db, "users", user.uid, "devices"),
      );
      const existingIds = new Set(existingSnapshot.docs.map((item) => item.id));

      await Promise.all(
        rootDevices.map(async (device) => {
          if (!existingIds.has(device.id)) {
            await setDoc(
              doc(db, "users", user.uid, "devices", device.id),
              device,
            );
          }
          upsertLocalDevice(device);
        }),
      );

      const mergedDevices = mergeDeviceLists(localDevices, rootDevices);
      setDevices(mergedDevices);
      setSelectedDeviceId((prev) => prev ?? mergedDevices[0]?.id ?? null);
    } catch (error) {
      console.error("Failed to sync device registry:", error);
      setSyncError("Failed to sync devices. Please try again.");
      setDevices(getLocalDevicesByOwner(user.uid));
    } finally {
      setSyncingDevices(false);
    }
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[Dashboard] render state", {
        loading,
        devicesLoading,
        deviceCount: devices.length,
        selectedDeviceId,
        deviceLoadError,
        syncingDevices,
        addDeviceLoading,
      });
    }
  }, [
    addDeviceLoading,
    deviceLoadError,
    devices.length,
    devicesLoading,
    loading,
    selectedDeviceId,
    syncingDevices,
  ]);

  useEffect(() => {
    const loadAlerts = async () => {
      if (!user) {
        setAlerts([]);
        return;
      }

      try {
        const alertsQuery = query(
          collection(db, "alerts"),
          where("userId", "==", user.uid),
        );
        const snapshot = await getDocs(alertsQuery);
        const alertList = snapshot.docs
          .map((item) => {
            const data = item.data();
            const createdAt =
              data.createdAt && typeof data.createdAt.toDate === "function"
                ? data.createdAt.toDate().toISOString()
                : data.timestamp || "";

            return {
              id: item.id,
              deviceId: data.deviceId || "unknown",
              reason: data.reason || "Anomaly detected",
              severity: data.severity || "warning",
              timestamp: createdAt,
            };
          })
          .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

        setAlerts(alertList);
      } catch (error) {
        console.error("Failed to load alerts:", error);
        setAlerts([]);
      }
    };

    void loadAlerts();
  }, [user, devices]);

  const addNewReading = async () => {
    if (!selectedDevice) {
      return;
    }

    const newReading = generateRandomReading();
    const readingDocument = {
      ...newReading,
      userId: user!.uid,
      deviceId: selectedDevice.id,
    };

    try {
      await addDoc(
        collection(
          db,
          "users",
          user!.uid,
          "devices",
          selectedDevice.id,
          "readings",
        ),
        readingDocument,
      );
    } catch {
      // Local fallback still works.
    }

    const nextHistory = appendLocalDeviceReading(selectedDevice.id, newReading);
    setHistory(nextHistory);
    await refreshDeviceStatus(selectedDevice.id);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Monitoring control states
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected"
  >("connected");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const activePageTitle = useMemo(() => {
    const labels: Record<string, string> = {
      Overview: "Dashboard",
      Charts: "Charts",
      "Water Distribution": "Water Distribution",
      Hardware: "Hardware",
      AI: "Artificial Intelligence",
      Cloud: "Cloud",
      Reports: "Reports",
      Profile: "Profile",
      Settings: "Settings",
      Help: "Help",
    };

    return labels[activeTab] ?? activeTab;
  }, [activeTab]);

  const activeTabMeta = useMemo(() => {
    const themes: Record<
      string,
      {
        eyebrow: string;
        subtitle: string;
        accent: string;
        chip: string;
      }
    > = {
      Overview: {
        eyebrow: "Command center",
        subtitle:
          "A focused cockpit for live device health, controls, and water intelligence.",
        accent: "from-cyan-500/20 via-sky-500/10 to-emerald-500/10",
        chip: "ring-cyan-400/25 bg-cyan-500/10 text-cyan-200",
      },
      Charts: {
        eyebrow: "Trend studio",
        subtitle:
          "Visualize water quality patterns with a calmer, analysis-first layout.",
        accent: "from-sky-500/20 via-indigo-500/10 to-cyan-500/10",
        chip: "ring-sky-400/25 bg-sky-500/10 text-sky-200",
      },
      "Water Distribution": {
        eyebrow: "Network flow",
        subtitle:
          "Inspect how water moves across zones with a map-like operational frame.",
        accent: "from-emerald-500/20 via-teal-500/10 to-cyan-500/10",
        chip: "ring-emerald-400/25 bg-emerald-500/10 text-emerald-200",
      },
      Hardware: {
        eyebrow: "Hardware room",
        subtitle:
          "A sensor-health focused view with practical device telemetry and status.",
        accent: "from-slate-500/20 via-cyan-500/10 to-emerald-500/10",
        chip: "ring-slate-400/25 bg-slate-500/10 text-slate-200",
      },
      AI: {
        eyebrow: "AI assistant",
        subtitle:
          "A conversation-first space tuned for guidance, forecasting, and action.",
        accent: "from-emerald-500/20 via-lime-500/10 to-cyan-500/10",
        chip: "ring-emerald-400/25 bg-emerald-500/10 text-emerald-200",
      },
      Cloud: {
        eyebrow: "Cloud vault",
        subtitle:
          "Backup and restore flows with a lighter utility-oriented presentation.",
        accent: "from-cyan-500/20 via-sky-500/10 to-slate-500/10",
        chip: "ring-cyan-400/25 bg-cyan-500/10 text-cyan-200",
      },
      Reports: {
        eyebrow: "Reporting suite",
        subtitle:
          "Exportable summaries and audit-friendly snapshots for quick review.",
        accent: "from-amber-500/20 via-rose-500/10 to-cyan-500/10",
        chip: "ring-amber-400/25 bg-amber-500/10 text-amber-200",
      },
      Profile: {
        eyebrow: "Identity panel",
        subtitle:
          "Account details and ownership information in a clean, low-noise frame.",
        accent: "from-indigo-500/20 via-sky-500/10 to-cyan-500/10",
        chip: "ring-indigo-400/25 bg-indigo-500/10 text-indigo-200",
      },
      Settings: {
        eyebrow: "Control room",
        subtitle:
          "Tuning switches and preferences without crowding the rest of the app.",
        accent: "from-violet-500/20 via-slate-500/10 to-cyan-500/10",
        chip: "ring-violet-400/25 bg-violet-500/10 text-violet-200",
      },
      Help: {
        eyebrow: "Support desk",
        subtitle:
          "Guidance and discovery kept separate from the operational dashboard.",
        accent: "from-lime-500/20 via-emerald-500/10 to-cyan-500/10",
        chip: "ring-lime-400/25 bg-lime-500/10 text-lime-200",
      },
    };

    return themes[activeTab] ?? themes.Overview;
  }, [activeTab]);

  const downloadCSV = () => {
    if (!selectedDevice) return;
    const rows = [
      ["timestamp", "ph", "tds", "turbidity", "temperature", "status"],
      ...history.map((h) => [
        h.timestamp,
        h.ph,
        h.tds,
        h.turbidity,
        h.temperature,
        h.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDevice.uniqueId}-readings.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const startMonitoring = () => {
    if (!selectedDevice) return;
    if (monitorRunning) return;
    setMonitorRunning(true);
    setConnectionStatus("connected");
    setTimerSeconds(0);

    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);

    // push a new reading every 5 seconds
    readingRef.current = setInterval(() => {
      void addNewReading();
    }, 5000);
  };

  const stopMonitoring = () => {
    setMonitorRunning(false);
    setConnectionStatus("disconnected");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (readingRef.current) {
      clearInterval(readingRef.current);
      readingRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (readingRef.current) clearInterval(readingRef.current);
    };
  }, []);

  const handleSaveData = () => {
    if (!selectedDevice) return;
    const filename = `${selectedDevice.uniqueId}-readings.json`;
    const content = JSON.stringify(history, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleLoadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDevice) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result ?? "[]"));
        if (Array.isArray(parsed)) {
          // append to local store and update UI
          parsed.forEach((r) => appendLocalDeviceReading(selectedDevice.id, r));
          setHistory(getLocalDeviceHistory(selectedDevice.id));
        } else {
          alert("Invalid file format: expected an array of readings");
        }
      } catch (err) {
        console.error("Failed to load readings:", err);
        alert("Failed to parse file. See console for details.");
      }
    };
    reader.readAsText(file);
    // clear the input so same file can be loaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const latest = history.length ? history[history.length - 1] : null;
  const latestReadings = history.slice(-10);
  const tdsData = history.map((item, index) => ({
    time: index + 1,
    tds: item.tds,
  }));
  const phTurbidityData = history.map((item, index) => ({
    time: index + 1,
    ph: item.ph,
    turbidity: item.turbidity,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const noDevices = !devicesLoading && devices.length === 0;

  return (
    <main className="min-h-screen bg-transparent text-slate-950 dark:text-white">
      {syncingDevices && (
        <div className="fixed inset-0 bg-slate-950/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center rounded-3xl border border-slate-200/80 bg-white/95 px-6 py-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900/90">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <div className="text-slate-950 dark:text-white text-xl font-semibold">Syncing Devices...</div>
            <div className="text-slate-600 dark:text-slate-400 mt-2">Please wait while we update your device registry.</div>
          </div>
        </div>
      )}
      {syncError && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {syncError}
          <button onClick={() => setSyncError(null)} className="ml-2 text-white hover:text-red-200">×</button>
        </div>
      )}
      <div className="bg-white/90 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-700 sticky top-0 z-50 shadow-sm backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-950 dark:text-white">
              User Device Dashboard
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <ThemeToggle />
            <Button
              onClick={handleLogout}
              className="premium-button flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[96rem] mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 xl:pl-[15.5rem] xl:pr-[5.25rem]">
        {devicesLoading && devices.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-500" />
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">Loading devices...</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Fetching your registry and latest data.</p>
              </div>
            </div>
          </div>
        ) : null}

        {deviceLoadError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50/90 p-4 text-red-800 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Unable to load devices. Please try again.</p>
                <p className="mt-1 text-sm opacity-90">{deviceLoadError}</p>
              </div>
              <Button
                type="button"
                onClick={() => void syncDeviceRegistry()}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Retry sync
              </Button>
            </div>
          </div>
        ) : null}

        {activeTab === "Overview" ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="premium-card p-5">
                <p className="text-sm text-slate-600 uppercase tracking-[0.22em] mb-3">Devices</p>
                <h3 className="text-3xl font-black text-slate-950 dark:text-white">{devices.length}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Connected simulators and real devices</p>
              </div>
              <div className="premium-card p-5">
                <p className="text-sm text-slate-600 uppercase tracking-[0.22em] mb-3">Alerts</p>
                <h3 className="text-3xl font-black text-slate-950 dark:text-white">{waterAlerts.recentAlerts.length}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Current warnings and stability status</p>
              </div>
              <div className="premium-card p-5">
                <p className="text-sm text-slate-600 uppercase tracking-[0.22em] mb-3">Selected Zone</p>
                <h3 className="text-3xl font-black text-slate-950 dark:text-white">{selectedDevice?.zone ?? "Not selected"}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Water monitoring region analysis</p>
              </div>
              <div className="premium-card p-5">
                <p className="text-sm text-slate-600 uppercase tracking-[0.22em] mb-3">Mode</p>
                <h3 className="text-3xl font-black text-slate-950 dark:text-white">{simulatorOnly ? "Simulator" : "Hybrid"}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Real-time status and sync controls</p>
              </div>
            </div>

            {/* Water Quality Alert Panel */}
            {selectedDeviceId && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80"
              >
                <AlertPanel
                  alerts={waterAlerts.recentAlerts}
                  currentLevel={waterAlerts.currentLevel}
                  isLoading={waterAlerts.isLoading}
                />
              </motion.div>
            )}
          </motion.div>
        ) : null}

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/88 p-5 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${activeTabMeta.accent} opacity-90`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_32%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600/90 dark:text-slate-300/80">
                {activeTabMeta.eyebrow}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-4xl">
                  {activePageTitle}
                </h2>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ring-1 ${activeTabMeta.chip}`}>
                  {activeTab}
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-300">
                {activeTabMeta.subtitle}
              </p>
              {devices.length > 0 ? (
                <div className="mt-4 flex max-w-md items-center gap-3 rounded-2xl border border-white/40 bg-white/65 px-3 py-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Switch device
                  </span>
                  <select
                    value={selectedDeviceId ?? devices[0]?.id ?? ""}
                    onChange={(event) => setSelectedDeviceId(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none dark:text-white"
                    aria-label="Select active device"
                  >
                    {devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name} · {device.status ?? "unknown"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {activeTab === "Overview" ? (
              <div className="flex flex-col items-end gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => void syncDeviceRegistry()}
                    className="rounded-2xl bg-slate-800/85 px-4 py-3 text-white shadow-sm shadow-slate-950/10 hover:bg-slate-700 dark:bg-white/10 dark:hover:bg-white/15"
                    disabled={syncingDevices}
                  >
                    {syncingDevices ? "Syncing..." : "Sync Data"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setActiveTab("Hardware");
                      setShowAddForm(true);
                    }}
                    className="rounded-2xl bg-cyan-500 px-4 py-3 text-white shadow-lg shadow-cyan-500/25 hover:bg-cyan-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Device
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-slate-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Live mode</p>
                    <p className="mt-1 text-sm font-semibold">{simulatorOnly ? "Simulator-first" : "Hybrid live sync"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-slate-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Selected device</p>
                    <p className="mt-1 text-sm font-semibold">{selectedDevice?.name ?? "None selected"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-slate-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Zone</p>
                    <p className="mt-1 text-sm font-semibold">{selectedDevice?.zone ?? "Unknown"}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </motion.section>

        <aside className="hidden xl:flex fixed left-4 top-20 bottom-4 z-40 w-56 flex-col sidebar-premium p-4">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-200">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">HydroSense</p>
              <p className="text-xs text-slate-400">User Panel</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {[
              { label: "Dashboard", icon: LayoutDashboard, tab: "Overview" },
              { label: "Charts", icon: ChartLine, tab: "Charts" },
              {
                label: "Water Distribution",
                icon: Waves,
                tab: "Water Distribution",
              },
              { label: "Hardware", icon: Cpu, tab: "Hardware" },
              { label: "Artificial Intelligence", icon: Brain, tab: "AI" },
              { label: "Cloud", icon: Cloud, tab: "Cloud" },
              { label: "Reports", icon: FileBarChart2, tab: "Reports" },
              { label: "Profile", icon: UserRound, tab: "Profile" },
              { label: "Settings", icon: Settings, tab: "Settings" },
              { label: "Feedback", icon: MessageSquare, tab: "Help" },
              { label: "Help", icon: HelpCircle, tab: "Help" },
            ].map(({ label, icon: Icon, tab }) => {
              const active =
                activeTab === tab ||
                (tab === "Overview" && activeTab === "Overview");

              return (
                <button
                  key={label}
                  onClick={() => setActiveTab(tab)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all duration-200 ${active ? "sidebar-item-active" : "text-slate-700 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white"}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <aside className="fixed right-3 top-24 z-40 hidden w-14 flex-col items-center gap-3 rounded-full border border-slate-200/80 bg-white/90 py-3 text-slate-700 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 xl:flex">
          {[
            { label: "Profile", icon: UserRound },
            { label: "Alerts", icon: AlertTriangle },
            { label: "Announcements", icon: Bell },
            // { label: "Battery", icon: BatteryCharging },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setRightRailOpen(true)}
              className="group relative flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition hover:bg-cyan-500/20 hover:text-cyan-200"
              aria-label={label}
              title={label}
            >
              <Icon className="h-5 w-5" />
              <span className="pointer-events-none absolute right-12 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                {label}
              </span>
            </button>
          ))}
        </aside>

        <button
          onClick={() => setRightRailOpen((prev) => !prev)}
          className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-950/40 xl:hidden"
          aria-label={rightRailOpen ? "Hide info panel" : "Show info panel"}
        >
          {rightRailOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </button>

        <AnimatePresence>
          {rightRailOpen && (
            <>
              <motion.button
                type="button"
                className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRightRailOpen(false)}
                aria-label="Close info panel"
              />
              <motion.aside
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 28 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-x-4 top-20 bottom-4 z-50 overflow-y-auto surface-card p-4 sm:left-auto sm:w-96 xl:right-20"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">
                      Info Panel
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                      Updates & Status
                    </h3>
                  </div>
                  <button
                    onClick={() => setRightRailOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-white hover:bg-slate-600"
                    aria-label="Close info panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-4 text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-white">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/20 dark:text-white text-xl font-bold">
                    {user?.email?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <div className="max-w-full text-center">
                    <p className="break-words font-semibold">
                      {user?.email}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-600 dark:text-slate-400">
                      User ID: {user?.uid}
                    </p>
                  </div>
                  <Button onClick={handleLogout} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Logout
                  </Button>
                </div>

                <div className="mt-4 space-y-4">
                    <section className="alert-panel-light alert-info">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <h4 className="text-sm font-semibold">Alerts</h4>
                    </div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      No alerts at the moment.
                    </div>
                  </section>

                  <section className="surface-card p-4">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Bell className="h-4 w-4 text-cyan-500" />
                      <h4 className="text-sm font-semibold">Announcements</h4>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li className="rounded-xl bg-slate-100/70 px-3 py-3 transition-colors duration-300 hover:bg-slate-200 dark:bg-slate-900/70 dark:hover:bg-slate-800">
                        Try real-time water quality monitoring system.
                      </li>
                      <li className="rounded-xl bg-slate-100/70 px-3 py-3 transition-colors duration-300 hover:bg-slate-200 dark:bg-slate-900/70 dark:hover:bg-slate-800">
                        New export options for device data.
                      </li>
                      <li className="rounded-xl bg-slate-100/70 px-3 py-3 transition-colors duration-300 hover:bg-slate-200 dark:bg-slate-900/70 dark:hover:bg-slate-800">
                        Enhanced security features for device management.
                      </li>
                      <li className="rounded-xl bg-slate-100/70 px-3 py-3 transition-colors duration-300 hover:bg-slate-200 dark:bg-slate-900/70 dark:hover:bg-slate-800">
                        Improved sync for real devices.
                      </li>
                      <li className="rounded-xl bg-slate-100/70 px-3 py-3 transition-colors duration-300 hover:bg-slate-200 dark:bg-slate-900/70 dark:hover:bg-slate-800">
                        AI assistant available in Charts.
                      </li>
                    </ul>
                  </section>

                  <section className="surface-card p-4">

                
                  </section>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
        {/* Map View Section - Temporarily disabled due to react-leaflet compatibility */}
        {/* TODO: Fix react-leaflet integration with React 18.3.1 */}

        {selectedDevice ? (
          <>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={startMonitoring}
                    className="inline-flex items-center gap-2 rounded px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    <Play className="w-4 h-4" /> Start Monitoring
                  </button>
                  <button
                    onClick={stopMonitoring}
                    className="inline-flex items-center gap-2 rounded px-3 py-2 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Pause className="w-4 h-4" /> Stop Monitoring
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <UploadCloud className="w-4 h-4" /> Load Data
                  </button>
                  <input
                    ref={fileInputRef}
                    onChange={handleLoadFile}
                    type="file"
                    accept="application/json"
                    className="hidden"
                  />
                  <button
                    onClick={handleSaveData}
                    className="inline-flex items-center gap-2 rounded px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <DownloadCloud className="w-4 h-4" /> Save Data
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${monitorRunning ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}
                  >
                    Status: {monitorRunning ? "Running" : "Stopped"}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm bg-slate-700/40 text-white">
                    Timer: {timerSeconds} seconds
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm flex items-center gap-2 bg-slate-700/40 text-white">
                    <Wifi className="w-4 h-4" />{" "}
                    {connectionStatus === "connected"
                      ? "Connected to Sensor Endpoint"
                      : "Disconnected"}
                  </span>
                </div>
              </div>
            </div>

            {/* <StatusBanner
              status={latest?.status}
              updatedAt={latest?.timestamp}
              simulatorRunning={true}
            /> */}

            {/* <div className="mt-4 mb-4 rounded-2xl border border-slate-700/60 bg-slate-900/30 p-4"> */}
            {/* <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">Current Page</p> */}
            {/* <h2 className="mt-1 text-2xl font-semibold text-white">{activePageTitle}</h2> */}
            {/* <p className="mt-1 text-sm text-slate-300">
                Use the left navigation to switch pages. The left and right panels stay fixed while the center section swaps like a page.
              </p> */}
            {/* </div> */}

            <AnimatePresence mode="wait">
              {activeTab === "Overview" && (
                <motion.div
                  key="overview-page"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <section className="space-y-5">
                    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/80">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-2xl space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-200">
                              Reading-first dashboard
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600 dark:bg-white/5 dark:text-slate-300">
                              Live device
                            </span>
                          </div>

                          <div>
                            <h3 className="text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-3xl">
                              {selectedDevice.name}
                            </h3>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                              Device ID: {selectedDevice.uniqueId} | Installed at: {selectedDevice.location}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                              Owner: {selectedDevice.ownerUid === user?.uid ? user?.email ?? selectedDevice.ownerUid : selectedDevice.ownerUid}
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Battery</p>
                              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{selectedDevice.battery ?? 0}%</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Zone</p>
                              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{selectedDevice.zone ?? "Unknown"}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Mode</p>
                              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{simulatorOnly ? "Simulator" : "Hybrid"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-white/5">
                          <Button
                            onClick={() => setShowDataPanel((prev) => !prev)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2"
                          >
                            <Table2 className="w-4 h-4" />
                            {showDataPanel ? "Hide table" : "Data table"}
                          </Button>
                          <Button
                            onClick={() => void addNewReading()}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white"
                          >
                            Add Reading
                          </Button>
                        </div>
                      </div>

                      <div className="mt-5">
                        <StatusBanner
                          status={latest?.status}
                          updatedAt={latest?.timestamp}
                          simulatorRunning={true}
                        />
                      </div>
                    </div>

                    {showDataPanel && (
                      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/80">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                              Live Readings
                            </h3>
                            <p className="mt-1 text-xs text-cyan-600 dark:text-cyan-300">
                              Device ID: {selectedDevice.uniqueId}
                            </p>
                          </div>
                          <Button
                            onClick={() => setShowDataPanel(false)}
                            className="bg-slate-700 hover:bg-slate-600 text-white"
                          >
                            Close
                          </Button>
                        </div>

                        {latestReadings.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No readings found.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                              <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800/80 dark:text-gray-400">
                                <tr>
                                  <th className="px-4 py-3">No.</th>
                                  <th className="px-4 py-3">Timestamp</th>
                                  <th className="px-4 py-3">pH</th>
                                  <th className="px-4 py-3">TDS</th>
                                  <th className="px-4 py-3">Turbidity</th>
                                  <th className="px-4 py-3">Temperature</th>
                                  <th className="px-4 py-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 text-slate-700 dark:divide-slate-700 dark:text-gray-200">
                                {latestReadings.map((reading, index) => (
                                  <tr key={`${selectedDevice.id}-${reading.timestamp}-${index}`}>
                                    <td className="px-4 py-3">{index + 1}</td>
                                    <td className="px-4 py-3">{new Date(reading.timestamp).toLocaleString()}</td>
                                    <td className="px-4 py-3">{reading.ph}</td>
                                    <td className="px-4 py-3">{reading.tds}</td>
                                    <td className="px-4 py-3">{reading.turbidity}</td>
                                    <td className="px-4 py-3">{reading.temperature}</td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`rounded-full px-2 py-1 text-xs ${
                                          reading.status === "SAFE"
                                            ? "bg-green-500/20 text-green-700 dark:text-green-300"
                                            : "bg-red-500/20 text-red-700 dark:text-red-300"
                                        }`}
                                      >
                                        {reading.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    )}

                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <SensorCard
                        label="pH"
                        value={latest?.ph}
                        unit=""
                        icon="ph"
                        safeRange="6.5 - 8.5"
                        alert={(latest?.ph ?? 7) < 6.5 || (latest?.ph ?? 7) > 8.5}
                        sparkline={history.map((h) => h.ph)}
                      />
                      <SensorCard
                        label="TDS"
                        value={latest?.tds}
                        unit="ppm"
                        icon="tds"
                        safeRange="200 - 1000"
                        alert={(latest?.tds ?? 0) > 1000}
                        sparkline={history.map((h) => h.tds)}
                      />
                      <SensorCard
                        label="Turbidity"
                        value={latest?.turbidity}
                        unit="NTU"
                        icon="turbidity"
                        safeRange="0 - 25"
                        alert={(latest?.turbidity ?? 0) > 25}
                        sparkline={history.map((h) => h.turbidity)}
                      />
                      <SensorCard
                        label="Temperature"
                        value={latest?.temperature}
                        unit="deg C"
                        icon="temperature"
                        safeRange="20 - 35"
                        sparkline={history.map((h) => h.temperature)}
                      />
                    </section>
                  </section>
                </motion.div>
              )}

              {activeTab === "Charts" && (
                <motion.section
                  key="charts-page"
                  className="space-y-4 rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/80"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">Charts</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Trend-only workspace for water analytics.
                    </p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                      <WaterGraph data={tdsData} type="tds" />
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                      <WaterGraph data={phTurbidityData} type="ph" />
                    </div>
                  </div>
                </motion.section>
              )}

              {activeTab === "AI" && (
                <motion.section
                  key="ai-page"
                  className="grid gap-4 rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/80 lg:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)]"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
                        Reading panel
                      </p>
                      <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                        AI context
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Latest reading and expert chat live together.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Selected device</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{selectedDevice?.name ?? "No device selected"}</p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {latest
                          ? `Latest pH ${latest.ph}, TDS ${latest.tds} ppm, Turbidity ${latest.turbidity} NTU, Temperature ${latest.temperature} °C`
                          : "No readings available yet."}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Reading status</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{latest?.status ?? "No data"}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Last update</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{latest?.timestamp ? new Date(latest.timestamp).toLocaleString() : "Unknown"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70">
                    <ChatPanel />
                  </div>
                </motion.section>
              )}

              {activeTab === "Cloud" && (
                <motion.section
                  key="cloud-page"
                  className="space-y-5 rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/80"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">Cloud</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Sync and last-reading workflow for the selected device.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">Sync</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Refresh registry</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pull the latest device list from Firebase and preserve local data on failure.</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => void syncDeviceRegistry()}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white"
                          disabled={syncingDevices}
                        >
                          {syncingDevices ? "Syncing..." : "Sync now"}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Load backup
                        </Button>
                        <input
                          ref={fileInputRef}
                          onChange={handleLoadFile}
                          type="file"
                          accept="application/json"
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">Last reading</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{selectedDevice?.name ?? "No device selected"}</p>
                      {latest ? (
                        <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                          <p>Time: {new Date(latest.timestamp).toLocaleString()}</p>
                          <p>pH: {latest.ph}</p>
                          <p>TDS: {latest.tds} ppm</p>
                          <p>Turbidity: {latest.turbidity} NTU</p>
                          <p>Temperature: {latest.temperature} °C</p>
                          <p>Status: {latest.status}</p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">No readings available yet.</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button onClick={handleSaveData} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          Download backup
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {activeTab === "Hardware" && (
                <motion.section
                  key="hardware-page"
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/80"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">Hardware</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Connected devices and sensor state.
                    </p>
                  </div>

                  <div className="mt-4 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
                          Device registry
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          Sync devices and register new hardware here.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => void syncDeviceRegistry()}
                          className="bg-slate-700 hover:bg-slate-600 text-white transition-all duration-200"
                          disabled={syncingDevices}
                        >
                          {syncingDevices ? "Syncing..." : "Sync Devices"}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setShowAddForm((prev) => !prev)}
                          className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-cyan-500/50 transition-all duration-200"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add Device
                        </Button>
                      </div>
                    </div>

                    {showAddForm && (
                      <form
                        onSubmit={handleAddDevice}
                        className="grid md:grid-cols-4 gap-3 mt-4 rounded-3xl border border-slate-700/70 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/10"
                      >
                        <Input
                          placeholder="Device name"
                          value={newDevice.name}
                          onChange={(event) =>
                            setNewDevice((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                        <select
                          value={newDevice.type}
                          onChange={(event) => {
                            setNewDevice((prev) => ({
                              ...prev,
                              type: event.target.value as "simulator" | "real",
                            }));
                            setNewDeviceConnected(event.target.value === "simulator");
                          }}
                          className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
                        >
                          <option value="simulator">Simulator</option>
                          <option value="real">Real Device</option>
                        </select>
                        <Input
                          placeholder="Manual location name"
                          value={newDevice.manualLocation}
                          onChange={(event) =>
                            setNewDevice((prev) => ({
                              ...prev,
                              manualLocation: event.target.value,
                            }))
                          }
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                        <Input
                          placeholder="Latitude"
                          type="number"
                          step="0.01"
                          value={newDevice.latitude}
                          onChange={(event) =>
                            setNewDevice((prev) => ({
                              ...prev,
                              latitude: parseFloat(event.target.value) || 25.61,
                            }))
                          }
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <Input
                          placeholder="Longitude"
                          type="number"
                          step="0.01"
                          value={newDevice.longitude}
                          onChange={(event) =>
                            setNewDevice((prev) => ({
                              ...prev,
                              longitude: parseFloat(event.target.value) || 85.14,
                            }))
                          }
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <div className="flex items-end gap-2">
                          {newDevice.type === "real" ? (
                            <>
                              <Button
                                type="button"
                                className={`bg-blue-500 hover:bg-blue-600 text-white ${newDeviceConnected ? "opacity-80" : ""}`}
                                onClick={() => setNewDeviceConnected(true)}
                              >
                                {newDeviceConnected ? "Connected" : "Connect Device"}
                              </Button>
                              <span className={`text-sm ${newDeviceConnected ? "text-emerald-300" : "text-amber-300"}`}>
                                {newDeviceConnected ? "Real device connected" : "Connect to enable registration"}
                              </span>
                            </>
                          ) : (
                            <div className="text-sm text-emerald-200">
                              Simulator mode selected. Enter location and coordinates.
                            </div>
                          )}
                        </div>
                        <Button
                          type="submit"
                          className="bg-green-500 hover:bg-green-600 text-white md:col-span-4"
                          disabled={addDeviceLoading}
                        >
                          {addDeviceLoading ? "Registering..." : "Register Device"}
                        </Button>
                      </form>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {devices.map((device) => (
                      <button
                        key={device.id}
                        type="button"
                        onClick={() => setSelectedDeviceId(device.id)}
                        className={`rounded-2xl border p-4 text-left transition-all duration-200 ${selectedDeviceId === device.id ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]" : "border-slate-200/80 bg-slate-50/90 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">{device.name}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{device.uniqueId}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${device.status === "active" ? "bg-green-500/15 text-green-700 dark:text-green-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>
                            {device.status}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="rounded-xl bg-white/80 p-3 dark:bg-white/5">Battery: {device.battery ?? 0}%</div>
                          <div className="rounded-xl bg-white/80 p-3 dark:bg-white/5">Type: {device.deviceType ?? "simulator"}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.section>
              )}

              {activeTab === "Reports" && (
                <motion.section
                  key="reports-page"
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/80"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">Reports</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Export summary data when you need it.
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={downloadCSV} className="rounded-xl bg-blue-600 px-4 py-2 text-white">
                      Download CSV
                    </button>
                    <button onClick={handleSaveData} className="rounded-xl bg-emerald-600 px-4 py-2 text-white">
                      Download JSON
                    </button>
                  </div>
                </motion.section>
              )}

              {activeTab === "Profile" && (
                <motion.section
                  key="profile-page"
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/80"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">Profile</h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">Email: {user?.email}</p>
                  <p className="text-slate-600 dark:text-slate-400">User ID: {user?.uid}</p>
                  <div className="mt-4">
                    <Button onClick={handleLogout} className="bg-red-500">
                      Logout
                    </Button>
                  </div>
                </motion.section>
              )}

              {activeTab === "Settings" && (
                <motion.section
                  key="settings-page"
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/80"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">Settings</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-slate-600 dark:text-slate-400">Simulator only:</label>
                    <button
                      onClick={() => setSimulatorOnly((s) => !s)}
                      className={`px-3 py-2 rounded ${simulatorOnly ? "bg-green-600 text-white" : "bg-slate-700 text-white"}`}
                    >
                      {simulatorOnly ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveTab("Overview");
                      }}
                      className="px-3 py-2 bg-cyan-600 rounded text-white"
                    >
                      Return to Overview
                    </button>
                  </div>
                </motion.section>
              )}

              {activeTab === "Help" && (
                <motion.section
                  key="help-page"
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/80"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">Help</h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">
                    This dashboard runs in simulator-only mode by default and
                    uses generated readings. Use the Start/Stop buttons to run
                    the simulator and the Charts/AI/Cloud tabs to explore
                    features.
                  </p>
                </motion.section>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6 text-gray-300">
            Select a device to view readings, graph, and chat analysis.
          </div>
        )}
      </div>
    </main>
  );
};

export default UserDashboard;
