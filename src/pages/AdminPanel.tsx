import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/StatusBanner";
import { SensorCard } from "@/components/SensorCard";
import { WaterGraph } from "@/components/WaterGraph";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { Users, LogOut, Cpu } from "lucide-react";
import {
  DeviceRecord,
  DeviceReading,
  getLocalDeviceHistory,
  readLocalDevices,
} from "@/lib/deviceStore";

type UserRole = "user" | "admin";

type UserSummary = {
  id: string;
  email: string;
  role: UserRole;
  deviceCount?: number;
};

const LOCAL_ACCOUNTS_KEY = "hydrosentinel.localAccounts";

const DEMO_USERS: UserSummary[] = [
  { id: "demo-user", email: "user@demo.com", role: "user" },
  { id: "demo-admin", email: "admin@demo.com", role: "admin" },
];

const readLocalUsers = (): UserSummary[] => {
  if (typeof window === "undefined") {
    return DEMO_USERS;
  }

  try {
    const rawAccounts = window.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!rawAccounts) {
      return DEMO_USERS;
    }

    const parsed = JSON.parse(rawAccounts) as Array<{
      uid: string;
      email: string;
      role: UserRole;
      deviceCount?: number;
    }>;

    const localMapped: UserSummary[] = parsed.map((item) => ({
      id: item.uid,
      email: item.email,
      role: item.role,
      deviceCount: item.deviceCount,
    }));

    const unique = new Map<string, UserSummary>();
    [...DEMO_USERS, ...localMapped].forEach((entry) => unique.set(entry.id, entry));
    return Array.from(unique.values());
  } catch {
    return DEMO_USERS;
  }
};

export const AdminPanel = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<DeviceReading[]>([]);

  useEffect(() => {
    if (!loading && role !== "admin") {
      navigate("/");
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const remoteUsers: UserSummary[] = usersSnap.docs.map((item) => {
          const data = item.data() as { email?: string; role?: UserRole; deviceCount?: number };
          return {
            id: item.id,
            email: data.email ?? "unknown@user",
            role: data.role ?? "user",
            deviceCount: data.deviceCount ?? 0,
          };
        });

        const deviceSnapshots = await Promise.all(
          remoteUsers.map(async (entry) => {
            const snapshot = await getDocs(collection(db, "users", entry.id, "devices"));
            return snapshot.docs.map((item) => ({
              id: item.id,
              ...(item.data() as Omit<DeviceRecord, "id">),
            }));
          })
        );

        const remoteDevices = deviceSnapshots.flat();

        const mergedUsers = [...readLocalUsers(), ...remoteUsers].filter(
          (entry, index, arr) => arr.findIndex((other) => other.id === entry.id) === index
        );

        setUsers(mergedUsers);
        setDevices(remoteDevices.length ? remoteDevices : readLocalDevices());
        setSelectedUserId((prev) => prev ?? mergedUsers.find((u) => u.role === "user")?.id ?? null);
      } catch (error) {
        console.error("Error loading admin data:", error);
        const fallbackUsers = readLocalUsers();
        setUsers(fallbackUsers);
        setDevices(readLocalDevices());
        setSelectedUserId((prev) => prev ?? fallbackUsers.find((u) => u.role === "user")?.id ?? null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedUser = users.find((entry) => entry.id === selectedUserId) ?? null;
  const selectedUserDevices = useMemo(
    () => devices.filter((device) => device.ownerUid === selectedUserId),
    [devices, selectedUserId]
  );

  const selectedDevice = useMemo(
    () => selectedUserDevices.find((device) => device.id === selectedDeviceId) ?? null,
    [selectedDeviceId, selectedUserDevices]
  );

  useEffect(() => {
    setSelectedDeviceId(selectedUserDevices[0]?.id ?? null);
  }, [selectedUserId, selectedUserDevices]);

  useEffect(() => {
    if (!selectedDevice) {
      setSelectedHistory([]);
      return;
    }

    const loadHistory = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "users", selectedUserId ?? "", "devices", selectedDevice.id, "readings")
        );

        if (snapshot.size > 0) {
          setSelectedHistory(snapshot.docs.map((item) => item.data() as DeviceReading));
          return;
        }
      } catch {
        // Fall through to local cache.
      }

      setSelectedHistory(getLocalDeviceHistory(selectedDevice.id));
    };

    void loadHistory();
  }, [selectedDevice, selectedUserId]);

  const usersWithDeviceCount = useMemo(
    () =>
      users
        .filter((entry) => entry.role === "user")
        .map((entry) => ({
          ...entry,
            deviceCount:
              entry.deviceCount ??
              devices.filter((device) => device.ownerUid === entry.id).length,
        })),
    [devices, users]
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const latestReading = selectedHistory.length ? selectedHistory[selectedHistory.length - 1] : null;
  const tdsData = selectedHistory.map((item, index) => ({
    time: index + 1,
    tds: item.tds,
  }));
  const phTurbidityData = selectedHistory.map((item, index) => ({
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
            <h1 className="text-2xl font-bold text-white">Admin User Monitoring</h1>
            <p className="text-sm text-gray-400 mt-1">Track users and registered devices</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-300 text-sm">{user?.email}</span>
            <Button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 grid lg:grid-cols-[340px_1fr] gap-6">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Users</h2>
          </div>

          <div className="space-y-3">
            {usersWithDeviceCount.length === 0 ? (
              <p className="text-gray-400 text-sm">No users found.</p>
            ) : (
              usersWithDeviceCount.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedUserId(entry.id)}
                  className={`w-full text-left rounded-xl border p-3 ${
                    selectedUserId === entry.id
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
                  }`}
                >
                  <p className="text-white text-sm font-semibold">{entry.email}</p>
                  <p className="text-cyan-300 text-xs mt-1">Devices: {entry.deviceCount}</p>
                  <p className="text-gray-500 text-[11px] mt-1">User ID: {entry.id}</p>
                </button>
              ))
            )}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          {selectedUser ? (
            <>
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedUser.email}</h2>
                  <p className="text-sm text-gray-400">User ID: {selectedUser.id}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-gray-300">
                  Total Devices: <span className="text-cyan-300 font-semibold">{selectedUserDevices.length}</span>
                </div>
              </div>

              {selectedUserDevices.length === 0 ? (
                <p className="text-gray-400">This user has not registered any device yet.</p>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedUserDevices.map((device) => (
                      <button
                        key={device.id}
                        onClick={() => setSelectedDeviceId(device.id)}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          selectedDeviceId === device.id
                            ? "border-cyan-500 bg-cyan-500/10"
                            : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-white font-semibold">{device.name}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${device.status === "active" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                            {device.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-cyan-300 font-mono">Device ID: {device.uniqueId}</p>
                        <p className="mt-2 text-sm text-gray-300">Location: {device.location}</p>
                        <p className="mt-1 text-xs text-gray-500">Record ID: {device.id}</p>
                      </button>
                    ))}
                  </div>

                  {selectedDevice && (
                    <div className="mt-6 space-y-4">
                      <StatusBanner
                        status={latestReading?.status}
                        updatedAt={latestReading?.timestamp}
                        simulatorRunning={false}
                      />

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <SensorCard
                          label="pH"
                          value={latestReading?.ph}
                          unit=""
                          icon="ph"
                          safeRange="6.5 - 8.5"
                          alert={(latestReading?.ph ?? 7) < 6.5 || (latestReading?.ph ?? 7) > 8.5}
                        />
                        <SensorCard
                          label="TDS"
                          value={latestReading?.tds}
                          unit="ppm"
                          icon="tds"
                          safeRange="200 - 1000"
                          alert={(latestReading?.tds ?? 0) > 1000}
                        />
                        <SensorCard
                          label="Turbidity"
                          value={latestReading?.turbidity}
                          unit="NTU"
                          icon="turbidity"
                          safeRange="0 - 25"
                          alert={(latestReading?.turbidity ?? 0) > 25}
                        />
                        <SensorCard
                          label="Temperature"
                          value={latestReading?.temperature}
                          unit="deg C"
                          icon="temperature"
                          safeRange="20 - 35"
                        />
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <WaterGraph data={tdsData} type="tds" />
                        <WaterGraph data={phTurbidityData} type="ph" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="h-full min-h-[260px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Cpu className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                Select a user to see registered devices.
              </div>
            </div>
          )}
        </motion.section>
      </div>
    </main>
  );
};

export default AdminPanel;
