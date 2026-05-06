import { 
  collection, 
  query, 
  where, 
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebase"; 
import {
  flushPendingDeviceOperations as flushQueuedDeviceOperations,
  queuePendingDeviceDelete as syncDeviceDelete,
  queuePendingDeviceUpsert as syncDeviceUpsert,
  readPendingDeviceOperations as readQueuedDeviceOperations,
  type PendingDeviceOperation as SyncPendingDeviceOperation,
} from "./syncEngine";

export type DeviceRecord = {
  id: string;
  ownerUid: string;
  name: string;
  uniqueId: string;
  location: string;
  deviceType?: "simulator" | "real";
  latitude?: number;
  longitude?: number;
  zone?: string;
  status: "active" | "inactive";
  battery?: number;
  createdAt: string;
};

const LOCAL_DEVICES_KEY = "hydrosentinel.localDevices";
const LOCAL_DEVICE_HISTORY_KEY = "hydrosentinel.localDeviceHistory";
export type DeviceReading = {
  timestamp: string;
  ph: number;
  tds: number;
  turbidity: number;
  temperature: number;
  status: "SAFE" | "NOT SAFE";
};

export type DeviceReadingInput = Omit<DeviceReading, "timestamp"> & {
  timestamp?: string;
};

const randomRange = (min: number, max: number, decimals = 1) => {
  const value = min + Math.random() * (max - min);
  return Number(value.toFixed(decimals));
};

export const generateRandomReading = (): DeviceReading => {
  const ph = randomRange(6.2, 8.9, 2);
  const tds = Math.round(randomRange(180, 1200, 0));
  const turbidity = randomRange(1.5, 30, 1);
  const temperature = randomRange(20, 33, 1);
  const safe = tds <= 1000 && turbidity <= 25 && ph >= 6.5 && ph <= 8.5;

  return {
    timestamp: new Date().toISOString(),
    ph,
    tds,
    turbidity,
    temperature,
    status: safe ? "SAFE" : "NOT SAFE",
  };
};

export const getDevicesByZone = async (zone: string): Promise<DeviceRecord[]> => {
  if (!zone) {
    console.warn("[Zone Query] No zone provided, returning empty array");
    return [];
  }

  try {
    console.log(`[Zone Query] Fetching devices for zone: ${zone}`);
    const q = query(
      collection(db, "devices"),
      where("zone", "==", zone)
    );

    const snapshot = await getDocs(q);
    const devices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DeviceRecord[];

    console.log(`[Zone Query] Found ${devices.length} devices in zone ${zone}`, devices);
    return devices;
  } catch (error) {
    console.error(`[Zone Query] Error fetching devices for zone ${zone}:`, error);
    return [];
  }
};

const buildInitialHistory = (): DeviceReading[] => [];

export const readLocalDevices = (): DeviceRecord[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawDevices = window.localStorage.getItem(LOCAL_DEVICES_KEY);
    if (!rawDevices) {
      window.localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify([]));
      return [];
    }

    return JSON.parse(rawDevices) as DeviceRecord[];
  } catch {
    return [];
  }
};

const saveLocalDevices = (devices: DeviceRecord[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(devices));
};

const readHistoryMap = (): Record<string, DeviceReading[]> => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawHistory = window.localStorage.getItem(LOCAL_DEVICE_HISTORY_KEY);
    if (!rawHistory) {
      const seed: Record<string, DeviceReading[]> = {};
      window.localStorage.setItem(LOCAL_DEVICE_HISTORY_KEY, JSON.stringify(seed));
      return seed;
    }

    return JSON.parse(rawHistory) as Record<string, DeviceReading[]>;
  } catch {
    return {};
  }
};

const saveHistoryMap = (map: Record<string, DeviceReading[]>) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_DEVICE_HISTORY_KEY, JSON.stringify(map));
};

export type PendingDeviceOperation = SyncPendingDeviceOperation;

export const readPendingDeviceOperations = () => readQueuedDeviceOperations();

export const queuePendingDeviceUpsert = async (device: DeviceRecord) => {
  await syncDeviceUpsert(device);
  upsertLocalDevice(device);
};

export const queuePendingDeviceDelete = async (ownerUid: string, deviceId: string) => {
  await syncDeviceDelete(ownerUid, deviceId);
  removeLocalDevice(deviceId);
};

export const flushPendingDeviceOperations = async (ownerUid?: string) =>
  flushQueuedDeviceOperations(ownerUid);

export const upsertLocalDevice = (device: DeviceRecord) => {
  const devices = readLocalDevices().filter((item) => item.id !== device.id);
  saveLocalDevices([...devices, device]);

  const historyMap = readHistoryMap();
  if (!historyMap[device.id]) {
    historyMap[device.id] = [];
    saveHistoryMap(historyMap);
  }
};

export const removeLocalDevice = (deviceId: string) => {
  const devices = readLocalDevices().filter((item) => item.id !== deviceId);
  saveLocalDevices(devices);

  const historyMap = readHistoryMap();
  delete historyMap[deviceId];
  saveHistoryMap(historyMap);
};

export const getLocalDeviceByOwner = (ownerUid: string) =>
  readLocalDevices().find((device) => device.ownerUid === ownerUid) ?? null;

export const getLocalDevicesByOwner = (ownerUid: string) =>
  readLocalDevices().filter((device) => device.ownerUid === ownerUid);

export const getLocalDeviceHistory = (deviceId: string): DeviceReading[] => {
  const historyMap = readHistoryMap();
  if (!historyMap[deviceId]) {
    historyMap[deviceId] = [];
    saveHistoryMap(historyMap);
  }

  return historyMap[deviceId];
};

export const appendLocalDeviceReading = (deviceId: string, reading?: DeviceReading) => {
  const historyMap = readHistoryMap();
  const current = historyMap[deviceId] ?? [];
  const nextReading = reading ?? generateRandomReading();
  historyMap[deviceId] = [...current, nextReading].slice(-30);
  saveHistoryMap(historyMap);
  return historyMap[deviceId];
};

export const toDevicePath = (ownerUid: string, deviceId: string) =>
  `users/${ownerUid}/devices/${deviceId}`;

// Helper for SyncMonitor to read pending signup operations
export const readPendingSignupOperations = (): Array<{ email: string; queuedAt: string; [key: string]: unknown }> => {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem("hydrosentinel.pendingSignups");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
