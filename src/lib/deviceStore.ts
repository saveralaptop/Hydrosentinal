export type DeviceRecord = {
  id: string;
  ownerUid: string;
  name: string;
  uniqueId: string;
  location: string;
  status: "active" | "inactive";
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

const buildInitialHistory = () =>
  Array.from({ length: 10 }, () => generateRandomReading());

const DEMO_DEVICES: DeviceRecord[] = [
  {
    id: "demo-user",
    ownerUid: "demo-user",
    name: "Demo Water Sensor",
    uniqueId: "demo-user",
    location: "North Zone",
    status: "active",
    createdAt: new Date().toISOString(),
  },
];

export const readLocalDevices = (): DeviceRecord[] => {
  if (typeof window === "undefined") {
    return DEMO_DEVICES;
  }

  try {
    const rawDevices = window.localStorage.getItem(LOCAL_DEVICES_KEY);
    if (!rawDevices) {
      window.localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(DEMO_DEVICES));
      return DEMO_DEVICES;
    }

    return JSON.parse(rawDevices) as DeviceRecord[];
  } catch {
    return DEMO_DEVICES;
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
      const seed: Record<string, DeviceReading[]> = {
        "demo-user": buildInitialHistory(),
      };
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

export const upsertLocalDevice = (device: DeviceRecord) => {
  const devices = readLocalDevices().filter((item) => item.id !== device.id);
  saveLocalDevices([...devices, device]);

  const historyMap = readHistoryMap();
  if (!historyMap[device.id]) {
    historyMap[device.id] = buildInitialHistory();
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
    historyMap[deviceId] = buildInitialHistory();
    saveHistoryMap(historyMap);
  }

  return historyMap[deviceId];
};

export const appendLocalDeviceReading = (deviceId: string, reading?: DeviceReading) => {
  const historyMap = readHistoryMap();
  const current = historyMap[deviceId] ?? buildInitialHistory();
  const nextReading = reading ?? generateRandomReading();
  historyMap[deviceId] = [...current, nextReading].slice(-30);
  saveHistoryMap(historyMap);
  return historyMap[deviceId];
};

export const toDevicePath = (ownerUid: string, deviceId: string) =>
  `users/${ownerUid}/devices/${deviceId}`;
