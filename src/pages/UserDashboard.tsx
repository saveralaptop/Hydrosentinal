import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBanner } from "@/components/StatusBanner";
import { SensorCard } from "@/components/SensorCard";
import { WaterGraph } from "@/components/WaterGraph";
import { ChatPanel } from "@/components/ChatPanel";
import { LogOut, Plus, Table2, Trash2 } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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
import { increment } from "firebase/firestore";

const LOCATIONS = ["North Zone", "South Zone", "East Zone", "West Zone", "Central Hub"];

const toFirestoreIdPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildDeviceDocumentId = (uid: string, deviceName: string) => {
  const username = toFirestoreIdPart(uid) || "user";
  const device = toFirestoreIdPart(deviceName) || "device";

  return `${username}-${device}`;
};

export const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [history, setHistory] = useState<ReturnType<typeof getLocalDeviceHistory>>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: "", location: "North Zone" });

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId]
  );

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchDevices = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users", user.uid, "devices"));

        const remoteDevices = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<DeviceRecord, "id">),
        }));

        if (remoteDevices.length > 0) {
          setDevices(remoteDevices);
          setSelectedDeviceId((prev) => prev ?? remoteDevices[0].id);
          remoteDevices.forEach((device) => upsertLocalDevice(device));
          return;
        }

        const localDevices = getLocalDevicesByOwner(user.uid);
        setDevices(localDevices);
        setSelectedDeviceId((prev) => prev ?? localDevices[0]?.id ?? null);
      } catch (error) {
        console.error("Error fetching user devices:", error);
        const localDevices = getLocalDevicesByOwner(user.uid);
        setDevices(localDevices);
        setSelectedDeviceId((prev) => prev ?? localDevices[0]?.id ?? null);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [navigate, user]);

  useEffect(() => {
    if (!selectedDevice) {
      setHistory([]);
      return;
    }

    const loadHistory = async () => {
      try {
        const readingSnapshot = await getDocs(
          collection(db, "users", user!.uid, "devices", selectedDevice.id, "readings")
        );

        if (readingSnapshot.size > 0) {
          const remoteHistory = readingSnapshot.docs.map((item) => item.data() as ReturnType<typeof getLocalDeviceHistory>[number]);
          setHistory(remoteHistory);
          return;
        }
      } catch {
        // Use local fallback below.
      }

      setHistory(getLocalDeviceHistory(selectedDevice.id));
    };

    void loadHistory();
  }, [selectedDevice]);

  const refreshDeviceStatus = async (deviceId: string) => {
    const latest = getLocalDeviceHistory(deviceId).slice(-1)[0];
    if (!latest) {
      return;
    }

    const nextStatus = latest.status === "SAFE" ? "active" : "inactive";

    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, status: nextStatus } : device
      )
    );

    const updated = devices.find((device) => device.id === deviceId);
    if (updated) {
      upsertLocalDevice({ ...updated, status: nextStatus });
    }

    try {
      await updateDoc(doc(db, "users", user!.uid, "devices", deviceId), { status: nextStatus });
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
      return;
    }

    const deviceId = buildDeviceDocumentId(user.uid, newDevice.name);
    const payload: Omit<DeviceRecord, "id"> = {
      ownerUid: user.uid,
      name: newDevice.name.trim(),
      uniqueId: deviceId,
      location: newDevice.location,
      status: "active",
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
    } catch {
      created = { id: deviceId, ...payload };
    }

    upsertLocalDevice(created);
    setDevices((prev) => [created, ...prev]);
    setSelectedDeviceId(created.id);
    setNewDevice({ name: "", location: "North Zone" });
    setShowAddForm(false);
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
        collection(db, "users", user!.uid, "devices", selectedDevice.id, "readings"),
        readingDocument
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

  const latest = history.length ? history[history.length - 1] : null;
  const latestReadings = history.slice(-10);
  const tdsData = history.map((item, index) => ({ time: index + 1, tds: item.tds }));
  const phTurbidityData = history.map((item, index) => ({
    time: index + 1,
    ph: item.ph,
    turbidity: item.turbidity,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">User Device Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <h2 className="text-xl font-semibold text-white">Your Registered Devices</h2>
            <Button onClick={() => setShowAddForm((prev) => !prev)} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Device
            </Button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddDevice} className="grid md:grid-cols-3 gap-3 mb-5">
              <Input
                placeholder="Device name"
                value={newDevice.name}
                onChange={(event) => setNewDevice((prev) => ({ ...prev, name: event.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
              <select
                value={newDevice.location}
                onChange={(event) => setNewDevice((prev) => ({ ...prev, location: event.target.value }))}
                className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
              >
                {LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white">Register Device</Button>
            </form>
          )}

          {devices.length === 0 ? (
            <p className="text-gray-400">No devices registered yet. Add your first device.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    selectedDeviceId === device.id
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
                  }`}
                >
                  <button
                    onClick={() => setSelectedDeviceId(device.id)}
                    className="w-full text-left"
                  >
                    <p className="text-white font-semibold">{device.name}</p>
                    <p className="text-cyan-400 text-xs font-mono mt-1">{device.uniqueId}</p>
                    <p className="text-sm text-gray-300 mt-2">{device.location}</p>
                  </button>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${device.status === "active" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                      {device.status}
                    </span>
                    <button
                      onClick={() => void handleDeleteDevice(device.id)}
                      className="p-1.5 rounded hover:bg-slate-700"
                      title="Delete device"
                    >
                      <Trash2 className="w-4 h-4 text-red-300" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {selectedDevice ? (
          <>
            <StatusBanner
              status={latest?.status}
              updatedAt={latest?.timestamp}
              simulatorRunning={true}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <div>
                <h3 className="text-white font-semibold">Selected Device: {selectedDevice.name}</h3>
                <p className="text-gray-300 text-sm">Device ID: {selectedDevice.uniqueId} | Installed at: {selectedDevice.location}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button onClick={() => setShowDataPanel((prev) => !prev)} className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2">
                  <Table2 className="w-4 h-4" />
                  Data
                </Button>
                <Button onClick={() => void addNewReading()} className="bg-indigo-500 hover:bg-indigo-600 text-white">
                  Add New Reading
                </Button>
              </div>
            </div>

            {showDataPanel && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Data</h3>
                    <p className="mt-1 text-xs text-cyan-300">Device ID: {selectedDevice.uniqueId}</p>
                  </div>
                  <Button
                    onClick={() => setShowDataPanel(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    Close
                  </Button>
                </div>

                {latestReadings.length === 0 ? (
                  <p className="text-sm text-gray-400">No readings found.</p>
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
                          <tr key={`${selectedDevice.id}-${reading.timestamp}-${index}`}>
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3">{new Date(reading.timestamp).toLocaleString()}</td>
                            <td className="px-4 py-3">{reading.ph}</td>
                            <td className="px-4 py-3">{reading.tds}</td>
                            <td className="px-4 py-3">{reading.turbidity}</td>
                            <td className="px-4 py-3">{reading.temperature}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-1 text-xs ${
                                reading.status === "SAFE"
                                  ? "bg-green-500/20 text-green-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}>
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
              <SensorCard label="pH" value={latest?.ph} unit="" icon="ph" safeRange="6.5 - 8.5" alert={(latest?.ph ?? 7) < 6.5 || (latest?.ph ?? 7) > 8.5} />
              <SensorCard label="TDS" value={latest?.tds} unit="ppm" icon="tds" safeRange="200 - 1000" alert={(latest?.tds ?? 0) > 1000} />
              <SensorCard label="Turbidity" value={latest?.turbidity} unit="NTU" icon="turbidity" safeRange="0 - 25" alert={(latest?.turbidity ?? 0) > 25} />
              <SensorCard label="Temperature" value={latest?.temperature} unit="deg C" icon="temperature" safeRange="20 - 35" />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <WaterGraph data={tdsData} type="tds" />
              <WaterGraph data={phTurbidityData} type="ph" />
            </section>

            <ChatPanel />
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
