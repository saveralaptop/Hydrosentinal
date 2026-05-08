import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import ComplaintForm from "@/components/ComplaintForm";
import {
  ArrowLeft,
  LogOut,
  Lock,
  Shield,
  Bell,
  Settings,
  Plus,
  Edit2,
  Key,
  Trash2,
  Copy,
  Check,
  X,
  Zap,
  Wifi,
  Battery,
  Droplet,
  TrendingUp,
  Activity,
  Award,
  MessageSquare,
  Smartphone,
  Cloud,
  Eye,
  EyeOff,
  Send,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Hexagon,
  Circle,
  Radio,
  DownloadCloud,
  FileText,
} from "lucide-react";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

// === PROGRESS BAR COMPONENT ===
const ProgressBar: React.FC<{ value: number; color: string }> = ({
  value,
  color,
}) => (
  <div className="h-2 w-full rounded-full bg-slate-700/50 overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 1, ease: "easeOut" }}
      className={`h-full rounded-full ${color}`}
    />
  </div>
);

// === PROFILE CARD COMPONENT ===
const ProfileCard: React.FC<{
  user: any;
  onEdit: () => void;
  onChangePassword: () => void;
}> = ({ user, onEdit, onChangePassword }) => {
  const getInitials = (email: string) => {
    return email?.split("@")[0]?.charAt(0)?.toUpperCase() || "U";
  };

  const accountAge = user?.createdAt
    ? Math.floor(
        (new Date().getTime() - new Date(user.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-cyan-900/20 to-slate-900/80 p-8 backdrop-blur-xl transition-all hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/20"
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl transition-all group-hover:bg-cyan-500/20" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 blur-lg opacity-0 transition-opacity group-hover:opacity-50" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl font-bold text-white shadow-lg shadow-cyan-500/50 transition-all group-hover:border-cyan-300">
            {getInitials(user?.email || "U")}
          </div>
          <motion.div
            className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-white bg-emerald-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* User Info */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-white">
              {user?.email?.split("@")[0] || "User"}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <Check className="h-3 w-3" />
              Verified
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
              Premium
            </span>
          </div>

          <p className="text-sm text-slate-400 mb-3">{user?.email}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg bg-slate-800/50 px-3 py-2 border border-slate-700/50">
              <p className="text-xs text-slate-500">Account Age</p>
              <p className="text-sm font-semibold text-cyan-300">
                {accountAge} days
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/50 px-3 py-2 border border-slate-700/50">
              <p className="text-xs text-slate-500">Joined</p>
              <p className="text-sm font-semibold text-cyan-300">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/50 px-3 py-2 border border-slate-700/50">
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-sm font-semibold text-emerald-300">Active</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onEdit}
              className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </Button>
            <Button
              onClick={onChangePassword}
              variant="outline"
              className="gap-2 border-slate-600 text-cyan-300 hover:bg-slate-800"
            >
              <Key className="h-4 w-4" />
              Change Password
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// === DEVICE MANAGEMENT COMPONENT ===
const DeviceManagement: React.FC<{ userId: string; devices: any[] }> = ({
  userId,
  devices,
}) => {
  const healthScore = useMemo(
    () =>
      devices.length > 0
        ? Math.round((devices.filter((d) => d.status === "online").length / devices.length) * 100)
        : 0,
    [devices]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-blue-900/20 to-slate-900/80 p-8 backdrop-blur-xl"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/20 p-3 border border-blue-500/30">
            <Smartphone className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Device Management</h3>
            <p className="text-xs text-slate-400">
              {devices.length} device{devices.length !== 1 ? "s" : ""} connected
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          className="rounded-full bg-blue-500/20 p-3 text-blue-400 transition hover:bg-blue-500/30 border border-blue-500/30"
        >
          <Plus className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">Total</p>
          <p className="text-2xl font-bold text-cyan-300">{devices.length}</p>
        </div>
        <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">Online</p>
          <p className="text-2xl font-bold text-emerald-300">
            {devices.filter((d) => d.status === "online").length}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">Health</p>
          <p className="text-2xl font-bold text-orange-300">{healthScore}%</p>
        </div>
      </div>

      {/* Device Cards */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {devices.length > 0 ? (
          devices.map((device, idx) => (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 transition hover:bg-slate-800/60 hover:border-cyan-500/30 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/20 p-2">
                    <Smartphone className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{device.name}</p>
                    <p className="text-xs text-slate-400">{device.type}</p>
                  </div>
                </div>
                <motion.div
                  animate={{
                    scale: device.status === "online" ? [1, 1.1, 1] : 1,
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`h-2 w-2 rounded-full ${
                    device.status === "online"
                      ? "bg-emerald-500"
                      : "bg-slate-500"
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">Battery</p>
                  <p className="font-semibold text-cyan-300">
                    {device.battery || 85}%
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Synced</p>
                  <p className="font-semibold text-cyan-300">
                    {device.lastSync || "Just now"}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No devices connected yet</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// === WATER ANALYTICS COMPONENT ===
const WaterAnalytics: React.FC<{ devices: any[] }> = ({ devices }) => {
  const avgPH = 7.4;
  const avgTDS = 285;
  const avgTemp = 28.5;
  const purityScore = 92;
  const alertsTriggered = 12;
  const anomalies = 3;

  const AnimatedCounter: React.FC<{ value: number; suffix?: string }> = ({
    value,
    suffix = "",
  }) => {
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
      let start = 0;
      const increment = value / 30;
      const timer = setInterval(() => {
        start += increment;
        if (start >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 30);
      return () => clearInterval(timer);
    }, [value]);

    return (
      <span>
        {count}
        {suffix}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-purple-900/20 to-slate-900/80 p-8 backdrop-blur-xl"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-purple-500/20 p-3 border border-purple-500/30">
          <BarChart3 className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Water Analytics</h3>
          <p className="text-xs text-slate-400">Real-time water quality metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Avg pH", value: avgPH, suffix: "", color: "from-cyan-400 to-blue-400" },
          { label: "Avg TDS", value: avgTDS, suffix: " ppm", color: "from-blue-400 to-purple-400" },
          { label: "Avg Temp", value: avgTemp, suffix: "°C", color: "from-orange-400 to-red-400" },
          { label: "Purity", value: purityScore, suffix: "%", color: "from-emerald-400 to-green-400" },
          { label: "Alerts", value: alertsTriggered, suffix: "", color: "from-yellow-400 to-orange-400" },
          { label: "Anomalies", value: anomalies, suffix: "", color: "from-red-400 to-pink-400" },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4"
          >
            <p className="text-xs text-slate-400 mb-2">{stat.label}</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            </p>
            <ProgressBar value={(stat.value / (stat.label === "Alerts" ? 20 : stat.label === "Anomalies" ? 10 : 100)) * 100} color={`bg-gradient-to-r ${stat.color}`} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// === AI ASSISTANT COMPONENT ===
const AIAssistant: React.FC = () => {
  const [input, setInput] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-emerald-900/20 to-slate-900/80 p-8 backdrop-blur-xl"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/20 p-3 border border-emerald-500/30">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Hydro AI Assistant</h3>
            <p className="text-xs text-slate-400">Smart water analysis & recommendations</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-transparent border-t-emerald-400 border-r-emerald-400"
        />
      </div>

      {/* AI Confidence Score */}
      <div className="mb-6 rounded-xl bg-slate-800/30 p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white">AI Confidence</p>
          <p className="text-sm font-bold text-emerald-300">96%</p>
        </div>
        <ProgressBar value={96} color="bg-gradient-to-r from-emerald-400 to-green-400" />
      </div>

      {/* Smart Recommendations */}
      <div className="mb-6 space-y-2">
        <p className="text-sm font-semibold text-slate-300">Latest Recommendations:</p>
        {[
          "Calibrate pH sensor - 28 days since last calibration",
          "Water purity optimal - no action needed",
          "Check North Zone device battery - at 20%",
        ].map((rec, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex gap-3 rounded-lg bg-slate-800/40 p-3 border border-slate-700/30 text-sm text-slate-300 hover:bg-slate-800/60 transition"
          >
            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span>{rec}</span>
          </motion.div>
        ))}
      </div>

      {/* Ask AI */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask Hydro AI anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-lg bg-emerald-600 p-3 text-white hover:bg-emerald-700 transition"
        >
          <Send className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};

// === SECURITY CENTER COMPONENT ===
const SecurityCenter: React.FC<{ onChangePassword: () => void }> = ({ onChangePassword }) => {
  const [twoFAEnabled, setTwoFAEnabled] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-red-900/20 to-slate-900/80 p-8 backdrop-blur-xl"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-red-500/20 p-3 border border-red-500/30">
          <Shield className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Security Center</h3>
          <p className="text-xs text-slate-400">Account protection & access management</p>
        </div>
      </div>

      {/* Security Score */}
      <div className="mb-6 rounded-xl bg-slate-800/30 p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white">Security Score</p>
          <p className="text-sm font-bold text-emerald-300">85/100</p>
        </div>
        <ProgressBar value={85} color="bg-gradient-to-r from-emerald-400 to-green-400" />
      </div>

      {/* Security Options */}
      <div className="space-y-3 mb-6">
        {[
          {
            label: "Two-Factor Authentication",
            description: "Add extra security to your account",
            icon: Lock,
            enabled: twoFAEnabled,
            onChange: setTwoFAEnabled,
          },
          {
            label: "Login Alerts",
            description: "Get notified of unusual login activity",
            icon: Bell,
            enabled: true,
            onChange: () => {},
          },
          {
            label: "Session Management",
            description: "Manage active devices and sessions",
            icon: Smartphone,
            enabled: true,
            onChange: () => {},
          },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 hover:bg-slate-800/60 transition"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-700/50 p-2">
                <item.icon className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{item.label}</p>
                <p className="text-xs text-slate-400">{item.description}</p>
              </div>
            </div>
            <motion.button
              onClick={() => item.onChange(!item.enabled)}
              className={`h-6 w-11 rounded-full transition ${
                item.enabled ? "bg-emerald-500" : "bg-slate-700"
              }`}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ x: item.enabled ? 20 : 2 }}
                className="h-5 w-5 rounded-full bg-white shadow-lg"
              />
            </motion.button>
          </motion.div>
        ))}
      </div>

      <Button
        onClick={onChangePassword}
        className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white"
      >
        <Key className="h-4 w-4" />
        Change Password
      </Button>
    </motion.div>
  );
};

// === ACHIEVEMENTS COMPONENT ===
const AchievementsSection: React.FC = () => {
  const achievements = [
    { label: "Water Saved", value: "2,450 L", icon: Droplet, color: "from-cyan-400 to-blue-400" },
    { label: "Alerts Prevented", value: "47", icon: AlertTriangle, color: "from-yellow-400 to-orange-400" },
    { label: "Villages Monitored", value: "12", icon: Radio, color: "from-purple-400 to-pink-400" },
    { label: "Eco Impact", value: "98%", icon: Award, color: "from-emerald-400 to-green-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-yellow-900/20 to-slate-900/80 p-8 backdrop-blur-xl"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-yellow-500/20 p-3 border border-yellow-500/30">
          <Award className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Impact & Achievements</h3>
          <p className="text-xs text-slate-400">Your environmental contribution</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {achievements.map((achievement, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className="group cursor-pointer rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 transition hover:bg-slate-800/60 hover:border-cyan-500/30"
          >
            <div className={`mb-3 inline-flex rounded-lg bg-gradient-to-r ${achievement.color} p-3 text-white shadow-lg`}>
              <achievement.icon className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-400 mb-1">{achievement.label}</p>
            <p className="text-xl font-bold text-white">{achievement.value}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// === ACTIVITY FEED COMPONENT ===
const ActivityFeed: React.FC = () => {
  const activities = [
    { type: "device", title: "Device Connected", description: "North Zone Device #001", time: "2 hours ago", icon: Wifi },
    { type: "alert", title: "Water Anomaly Detected", description: "pH level above threshold", time: "4 hours ago", icon: AlertTriangle },
    { type: "complaint", title: "Complaint Submitted", description: "Device offline issue", time: "1 day ago", icon: MessageSquare },
    { type: "sync", title: "Data Synced", description: "All devices synchronized", time: "2 days ago", icon: Cloud },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-blue-900/20 to-slate-900/80 p-8 backdrop-blur-xl"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-500/20 p-3 border border-blue-500/30">
          <Activity className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Activity Timeline</h3>
          <p className="text-xs text-slate-400">Recent account activities</p>
        </div>
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto">
        {activities.map((activity, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex gap-4 pb-4 border-b border-slate-700/50 last:border-0"
          >
            <div className={`rounded-lg p-2 flex-shrink-0 ${
              activity.type === "device" ? "bg-blue-500/20 text-blue-400" :
              activity.type === "alert" ? "bg-yellow-500/20 text-yellow-400" :
              activity.type === "complaint" ? "bg-red-500/20 text-red-400" :
              "bg-purple-500/20 text-purple-400"
            }`}>
              <activity.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{activity.title}</p>
              <p className="text-xs text-slate-400">{activity.description}</p>
              <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// === NOTIFICATION CENTER COMPONENT ===
const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = React.useState({
    emailAlerts: true,
    smsAlerts: false,
    emergencyAlerts: true,
    anomalyAlerts: true,
    deviceAlerts: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-purple-900/20 to-slate-900/80 p-8 backdrop-blur-xl"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-purple-500/20 p-3 border border-purple-500/30">
          <Bell className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Notifications</h3>
          <p className="text-xs text-slate-400">Manage your alert preferences</p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { key: "emailAlerts" as const, label: "Email Alerts", description: "Receive alerts via email" },
          { key: "smsAlerts" as const, label: "SMS Alerts", description: "Get critical alerts via SMS" },
          { key: "emergencyAlerts" as const, label: "Emergency Alerts", description: "Instant notifications for emergencies" },
          { key: "anomalyAlerts" as const, label: "AI Anomaly Alerts", description: "Get notified of unusual patterns" },
          { key: "deviceAlerts" as const, label: "Device Alerts", description: "When devices go offline" },
        ].map((item) => (
          <motion.div
            key={item.key}
            className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 hover:bg-slate-800/60 transition"
          >
            <div>
              <p className="font-semibold text-white text-sm">{item.label}</p>
              <p className="text-xs text-slate-400">{item.description}</p>
            </div>
            <motion.button
              onClick={() => toggleNotification(item.key)}
              className={`h-6 w-11 rounded-full transition ${
                notifications[item.key] ? "bg-purple-500" : "bg-slate-700"
              }`}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ x: notifications[item.key] ? 20 : 2 }}
                className="h-5 w-5 rounded-full bg-white shadow-lg"
              />
            </motion.button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// === SETTINGS PANEL COMPONENT ===
const SettingsPanel: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = React.useState({
    darkMode: theme === "dark",
    autoSync: true,
    realtimeMonitoring: true,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-slate-900/20 to-slate-900/80 p-8 backdrop-blur-xl"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-slate-600/20 p-3 border border-slate-600/30">
          <Settings className="h-5 w-5 text-slate-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Settings</h3>
          <p className="text-xs text-slate-400">Customize your preferences</p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { label: "Dark Mode", description: "Reduce eye strain", key: "darkMode" },
          { label: "Auto Sync", description: "Automatically sync device data", key: "autoSync" },
          { label: "Real-time Monitoring", description: "Enable live data updates", key: "realtimeMonitoring" },
        ].map((item) => (
          <motion.div
            key={item.key}
            className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 hover:bg-slate-800/60 transition"
          >
            <div>
              <p className="font-semibold text-white text-sm">{item.label}</p>
              <p className="text-xs text-slate-400">{item.description}</p>
            </div>
            <motion.button
              onClick={() => {
                if (item.key === "darkMode") toggleTheme();
                else setSettings((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }));
              }}
              className={`h-6 w-11 rounded-full transition ${
                settings[item.key as keyof typeof settings] ? "bg-cyan-500" : "bg-slate-700"
              }`}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ x: settings[item.key as keyof typeof settings] ? 20 : 2 }}
                className="h-5 w-5 rounded-full bg-white shadow-lg"
              />
            </motion.button>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <DownloadCloud className="h-4 w-4" />
          Export Data
        </Button>
        <Button variant="outline" className="w-full gap-2 border-slate-600 text-slate-300 hover:bg-slate-800">
          <FileText className="h-4 w-4" />
          Download Reports
        </Button>
      </div>
    </motion.div>
  );
};

// === SUPPORT SECTION COMPONENT ===
const SupportSection: React.FC<{
  onOpenComplaint: () => void;
}> = ({ onOpenComplaint }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-cyan-900/20 to-slate-900/80 p-8 backdrop-blur-xl"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-cyan-500/20 p-3 border border-cyan-500/30">
          <MessageSquare className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Support & Complaints</h3>
          <p className="text-xs text-slate-400">Get help or report issues</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={onOpenComplaint}
          className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 p-4 text-left transition hover:border-cyan-500/50 hover:bg-cyan-500/20"
        >
          <p className="font-semibold text-cyan-300 mb-1">Raise Complaint</p>
          <p className="text-xs text-slate-400">Report an issue or feedback</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-purple-500/10 p-4 text-left transition hover:border-purple-500/50 hover:bg-purple-500/20"
        >
          <p className="font-semibold text-purple-300 mb-1">Emergency Support</p>
          <p className="text-xs text-slate-400">Chat with support team now</p>
        </motion.button>
      </div>
    </motion.div>
  );
};

// === MAIN PROFILE PAGE ===
export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [userData, setUserData] = React.useState<any>(null);
  const [devices, setDevices] = React.useState<any[]>([]);
  const [complaintOpen, setComplaintOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          setUserData({ email: user.email, uid: user.uid });
        }

        const devicesRef = collection(db, "users", user.uid, "devices");
        const devicesDocs = await getDocs(devicesRef);
        const devicesData = devicesDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDevices(devicesData);
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-8">
        <Skeleton className="h-32 rounded-2xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-cyan-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </motion.button>

          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-lg bg-red-600/20 px-4 py-2 text-red-400 hover:bg-red-600/30 transition border border-red-500/30"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Logout</span>
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
            Smart Profile Center
          </h1>
          <p className="text-slate-400">
            Manage your HydroSentinal account, devices, and water analytics
          </p>
        </motion.div>

        {/* Profile Card */}
        <ProfileCard
          user={{ ...userData, email: user?.email }}
          onEdit={() => {}}
          onChangePassword={() => {}}
        />

        {/* Main Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <DeviceManagement userId={user?.uid || ""} devices={devices} />
            <WaterAnalytics devices={devices} />
            <AIAssistant />
            <ActivityFeed />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <SecurityCenter onChangePassword={() => {}} />
            <AchievementsSection />
            <NotificationCenter />
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="mt-8 space-y-8">
          <SettingsPanel />
          <SupportSection onOpenComplaint={() => setComplaintOpen(true)} />
        </div>
      </div>

      {/* Complaint Form Modal */}
      <ComplaintForm
        open={complaintOpen}
        onOpenChange={setComplaintOpen}
      />
    </div>
  );
};

export default ProfilePage;
