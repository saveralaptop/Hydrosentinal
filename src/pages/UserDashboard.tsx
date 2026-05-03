import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBanner } from "@/components/StatusBanner";
import { SensorCard } from "@/components/SensorCard";
import { WaterGraph } from "@/components/WaterGraph";
import { ChatPanel } from "@/components/ChatPanel";
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

export const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    window.localStorage.removeItem("hydrosentinel.localDeviceHistory");
    window.localStorage.removeItem("hydrosentinel.localDevices");

    const localDevices = getLocalDevicesByOwner(user.uid);
    setDevices(localDevices);
    setSelectedDeviceId((prev) => prev ?? localDevices[0]?.id ?? null);
    setLoading(false);

    const fetchDevices = async () => {
      if (simulatorOnly) {
        // In simulator-only mode we skip remote device fetches
        return;
      }

      try {
        const snapshot = await getDocs(
          collection(db, "users", user.uid, "devices"),
        );

        const remoteDevices = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<DeviceRecord, "id">),
        }));

        if (remoteDevices.length > 0) {
          setDevices(remoteDevices);
          setSelectedDeviceId((prev) => prev ?? remoteDevices[0].id);
          remoteDevices.forEach((device) => upsertLocalDevice(device));
        }
      } catch (error) {
        console.error("Error fetching user devices:", error);
      }
    };

    void fetchDevices();
  }, [navigate, user, simulatorOnly]);

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

        try {
          await setDoc(doc(db, "devices", deviceId), payload);
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
    try {
      const rootDeviceQuery = query(
        collection(db, "devices"),
        where("ownerUid", "==", user.uid),
      );
      const rootSnapshot = await getDocs(rootDeviceQuery);
      const rootDevices = rootSnapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<DeviceRecord, "id">),
      }));

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

      if (rootDevices.length > 0) {
        setDevices(rootDevices);
        setSelectedDeviceId((prev) => prev ?? rootDevices[0]?.id ?? null);
      }
    } catch (error) {
      console.error("Failed to sync device registry:", error);
    } finally {
      setSyncingDevices(false);
    }
  };

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

  return (
    <main className="min-h-screen bg-transparent">
      <div className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">
              User Device Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[96rem] mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 xl:pl-[15.5rem] xl:pr-[5.25rem]">
        <aside className="hidden xl:flex fixed left-4 top-20 bottom-4 z-40 w-56 flex-col rounded-2xl border border-slate-700 bg-slate-800/70 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all duration-200 ${active ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <aside className="fixed right-3 top-24 z-40 hidden w-14 flex-col items-center gap-3 rounded-full border border-slate-700 bg-slate-900/80 py-3 shadow-2xl shadow-slate-950/40 backdrop-blur-xl xl:flex">
          {[
            { label: "Profile", icon: UserRound },
            { label: "Alerts", icon: AlertTriangle },
            { label: "Announcements", icon: Bell },
            { label: "Battery", icon: BatteryCharging },
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
                className="fixed inset-x-4 top-20 bottom-4 z-50 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800/95 p-4 shadow-2xl shadow-slate-950/60 backdrop-blur-xl sm:left-auto sm:w-96 xl:right-20"
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

                <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-slate-700 text-xl font-bold text-white">
                    {user?.email?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <div className="max-w-full text-center">
                    <p className="break-words font-semibold text-white">
                      {user?.email}
                    </p>
                    <p className="mt-1 break-all text-xs text-gray-300">
                      User ID: {user?.uid}
                    </p>
                  </div>
                  <Button onClick={handleLogout} className="w-full bg-blue-600">
                    Logout
                  </Button>
                </div>

                <div className="mt-4 space-y-4">
                  <section className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                    <div className="flex items-center gap-2 text-gray-200">
                      <AlertTriangle className="h-4 w-4 text-amber-300" />
                      <h4 className="text-sm font-semibold">Alerts</h4>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      No alerts at the moment.
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                    <div className="flex items-center gap-2 text-gray-200">
                      <Bell className="h-4 w-4 text-cyan-300" />
                      <h4 className="text-sm font-semibold">Announcements</h4>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs text-gray-300">
                      <li className="rounded-lg bg-slate-800/70 p-3 transition-colors duration-300 hover:bg-slate-800">
                        Beta live: Try real-time monitoring.
                      </li>
                      <li className="rounded-lg bg-slate-800/70 p-3 transition-colors duration-300 hover:bg-slate-800">
                        Join early testers for feedback.
                      </li>
                      <li className="rounded-lg bg-slate-800/70 p-3 transition-colors duration-300 hover:bg-slate-800">
                        AI assistant available in Charts.
                      </li>
                    </ul>
                  </section>

                  <section className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                    <div className="flex items-center gap-2 text-gray-200">
                      <BatteryCharging className="h-4 w-4 text-emerald-300" />
                      <h4 className="text-sm font-semibold">Battery</h4>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-800 font-semibold text-white">
                        96%
                      </div>
                      <div className="text-xs text-gray-300">
                        Battery life remaining
                      </div>
                    </div>
                  </section>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Your Registered Devices
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Manage your simulator and real device registry from one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => void syncDeviceRegistry()}
                className="bg-slate-700 hover:bg-slate-600 text-white transition-all duration-200"
                disabled={syncingDevices}
              >
                {syncingDevices ? "Syncing..." : "Sync Devices"}
              </Button>
              <Button
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
              className="grid md:grid-cols-4 gap-3 mb-5"
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
              >
                Register Device
              </Button>
            </form>
          )}

          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 mb-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Alerts</h3>
                <p className="text-sm text-slate-400">
                  Real-time water quality and synchronization alerts.
                </p>
              </div>
              <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">
                {alerts.length} active
              </span>
            </div>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-slate-700 bg-slate-800/90 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {alert.reason}
                        </p>
                        <p className="text-xs text-slate-400">
                          Device: {alert.deviceId}
                        </p>
                      </div>
                      <span className="rounded-full px-2 py-1 text-xs font-semibold uppercase text-slate-900 bg-amber-300">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : "Unknown time"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No active alerts yet. Systems are stable.</p>
            )}
          </div>

          {devices.length === 0 ? (
            <p className="text-gray-400">
              No devices registered yet. Add your first device.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {devices.map((device) => (
                <motion.div
                  key={device.id}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`text-left rounded-xl border backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden ${
                    selectedDeviceId === device.id
                      ? "border-cyan-400/80 bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-slate-800/20 shadow-lg shadow-cyan-500/25"
                      : "border-slate-700/60 bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 hover:border-slate-600/80 hover:shadow-lg hover:shadow-slate-700/20"
                  }`}
                >
                  <button
                    onClick={() => setSelectedDeviceId(device.id)}
                    className="w-full text-left p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
                          <p className="text-white font-semibold text-base">{device.name}</p>
                        </div>
                        <span className="inline-block text-[10px] rounded-full bg-gradient-to-r from-slate-700 to-slate-800 px-3 py-1 uppercase tracking-widest text-slate-300 font-medium">
                          {device.deviceType ?? "simulator"}
                        </span>
                      </div>
                      <Waves className="w-5 h-5 text-cyan-400/60" />
                    </div>
                    <p className="text-cyan-300/80 text-xs font-mono mt-3 bg-slate-900/50 px-2 py-1.5 rounded inline-block">
                      {device.uniqueId}
                    </p>
                    <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                      <span className="text-slate-500">Owner:</span>
                      <span className="text-slate-300">
                        {device.ownerUid === user?.uid ? user?.email?.split('@')[0] ?? device.ownerUid : device.ownerUid}
                      </span>
                    </p>
                    <p className="text-sm text-slate-300 mt-2 flex items-center gap-2">
                      <span className="text-slate-500">📍</span>
                      {device.location}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg px-2.5 py-2">
                        <BatteryCharging className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-blue-300 font-semibold">
                          {device.battery ?? 0}%
                        </span>
                      </div>
                      <div className={`flex items-center justify-center rounded-lg font-semibold text-xs ${
                        device.status === "active"
                          ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300"
                          : "bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-300"
                      }`}>
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                          device.status === "active" ? "bg-green-400 animate-pulse" : "bg-red-400"
                        }`}></span>
                        {device.status}
                      </div>
                    </div>
                  </button>
                  <div className="px-5 pb-4 pt-2 border-t border-slate-700/30 flex items-center justify-end">
                    <button
                      onClick={() => void handleDeleteDevice(device.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 transition-colors duration-200 group"
                      title="Delete device"
                    >
                      <Trash2 className="w-4 h-4 text-red-400/60 group-hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

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
                  {/* <div className="mt-4 p-4 rounded-xl bg-blue-900 text-white">
                    <h3>🌍 Area Water Status</h3>
                    <p>{areaStatus}</p>
                  </div> */}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                    <div>
                      <h3 className="text-white font-semibold">
                        Selected Device: {selectedDevice.name}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Device ID: {selectedDevice.uniqueId} | Installed at:{" "}
                        {selectedDevice.location}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Owner: {selectedDevice.ownerUid === user?.uid ? user?.email ?? selectedDevice.ownerUid : selectedDevice.ownerUid}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <BatteryCharging className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-blue-300 font-medium">
                            {selectedDevice.battery ?? 0}% Battery
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <Button
                        onClick={() => setShowDataPanel((prev) => !prev)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2"
                      >
                        <Table2 className="w-4 h-4" />
                        Data
                      </Button>
                      <Button
                        onClick={() => void addNewReading()}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white"
                      >
                        Add New Reading
                      </Button>
                    </div>
                  </div>
                  <div className="mt-6">
                    <StatusBanner
                      status={latest?.status}
                      updatedAt={latest?.timestamp}
                      simulatorRunning={true}
                    />
                  </div>

                  {showDataPanel && (
                    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 mt-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            Data
                          </h3>
                          <p className="mt-1 text-xs text-cyan-300">
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
                        <p className="text-sm text-gray-400">
                          No readings found.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-slate-800/80 text-xs uppercase text-gray-400">
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
                            <tbody className="divide-y divide-slate-700 text-gray-200">
                              {latestReadings.map((reading, index) => (
                                <tr
                                  key={`${selectedDevice.id}-${reading.timestamp}-${index}`}
                                >
                                  <td className="px-4 py-3">{index + 1}</td>
                                  <td className="px-4 py-3">
                                    {new Date(
                                      reading.timestamp,
                                    ).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3">{reading.ph}</td>
                                  <td className="px-4 py-3">{reading.tds}</td>
                                  <td className="px-4 py-3">
                                    {reading.turbidity}
                                  </td>
                                  <td className="px-4 py-3">
                                    {reading.temperature}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`rounded-full px-2 py-1 text-xs ${
                                        reading.status === "SAFE"
                                          ? "bg-green-500/20 text-green-300"
                                          : "bg-red-500/20 text-red-300"
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
                    </div>
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

                  <section className="grid gap-4 lg:grid-cols-2">
                    <WaterGraph
                      key={`tds-${history.length}-${latest?.timestamp}`}
                      data={tdsData}
                      type="tds"
                    />
                    <WaterGraph
                      key={`ph-${history.length}-${latest?.timestamp}`}
                      data={phTurbidityData}
                      type="ph"
                    />
                  </section>

                  <ChatPanel />
                </motion.div>
              )}

              {activeTab === "Charts" && (
                <motion.section
                  key="charts-page"
                  className="space-y-4"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-white font-semibold">Charts</h3>
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border p-4 bg-slate-900/40">
                      <WaterGraph data={tdsData} type="tds" />
                    </div>
                    <div className="rounded-xl border p-4 bg-slate-900/40">
                      <WaterGraph data={phTurbidityData} type="ph" />
                    </div>
                  </div>
                </motion.section>
              )}

              {activeTab === "AI" && (
                <motion.section
                  key="ai-page"
                  className="rounded-xl border p-6 bg-slate-900/40"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-white font-semibold mb-3">
                    AI Assistant
                  </h3>
                  <ChatPanel />
                </motion.section>
              )}

              {activeTab === "Cloud" && (
                <motion.section
                  key="cloud-page"
                  className="rounded-xl border p-6 bg-slate-900/40"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-white font-semibold mb-3">
                    Cloud Backups
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Save or load JSON backups for the selected device. Running
                    in{" "}
                    <strong className="text-amber-300">simulator only</strong>{" "}
                    mode will operate on local data.
                  </p>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-amber-600 rounded text-white"
                    >
                      Load Backup
                    </button>
                    <button
                      onClick={handleSaveData}
                      className="px-3 py-2 bg-emerald-600 rounded text-white"
                    >
                      Download Backup
                    </button>
                  </div>
                </motion.section>
              )}

              {activeTab === "Hardware" && (
                <motion.section
                  key="hardware-page"
                  className="rounded-xl border p-6 bg-slate-900/40"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-white font-semibold mb-3">
                    Hardware Status
                  </h3>
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="text-xs text-gray-400">
                      <tr>
                        <th className="py-2">Sensor</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-200">
                      <tr>
                        <td className="py-2">pH Sensor</td>
                        <td className="py-2">Active</td>
                        <td className="py-2">{latest?.ph ?? "—"}</td>
                      </tr>
                      <tr>
                        <td className="py-2">TDS Sensor</td>
                        <td className="py-2">Active</td>
                        <td className="py-2">{latest?.tds ?? "—"} ppm</td>
                      </tr>
                      <tr>
                        <td className="py-2">Turbidity Sensor</td>
                        <td className="py-2">Active</td>
                        <td className="py-2">{latest?.turbidity ?? "—"} NTU</td>
                      </tr>
                      <tr>
                        <td className="py-2">Temperature Sensor</td>
                        <td className="py-2">Active</td>
                        <td className="py-2">
                          {latest?.temperature ?? "—"} °C
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </motion.section>
              )}

              {activeTab === "Reports" && (
                <motion.section
                  key="reports-page"
                  className="rounded-xl border p-6 bg-slate-900/40"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-white font-semibold mb-3">Reports</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadCSV}
                      className="px-3 py-2 bg-blue-600 rounded text-white"
                    >
                      Download CSV
                    </button>
                    <button
                      onClick={handleSaveData}
                      className="px-3 py-2 bg-emerald-600 rounded text-white"
                    >
                      Download JSON
                    </button>
                  </div>
                </motion.section>
              )}

              {activeTab === "Profile" && (
                <motion.section
                  key="profile-page"
                  className="rounded-xl border p-6 bg-slate-900/40"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-white font-semibold mb-3">Profile</h3>
                  <p className="text-gray-300">Email: {user?.email}</p>
                  <p className="text-gray-300">User ID: {user?.uid}</p>
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
                  className="rounded-xl border p-6 bg-slate-900/40"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-white font-semibold mb-3">Settings</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-gray-300">Simulator only:</label>
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
                  className="rounded-xl border p-6 bg-slate-900/40"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-white font-semibold mb-3">Help</h3>
                  <p className="text-gray-300">
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
