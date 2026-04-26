import { useCallback, useEffect, useRef, useState } from "react";
import { Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SensorCard } from "@/components/SensorCard";
import { StatusBanner } from "@/components/StatusBanner";
import { ChatPanel } from "@/components/ChatPanel";
import { Simulator } from "@/components/Simulator";
import { WaterGraph } from "@/components/WaterGraph";
import { motion } from "framer-motion";

<section className="relative text-center py-20 overflow-hidden">
  {/* 🔥 Background Glow */}
  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-green-500/10 blur-3xl animate-pulse" />

  {/* 💧 Floating Circle */}
  <motion.div
    className="absolute w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl"
    animate={{ y: [0, -30, 0] }}
    transition={{ repeat: Infinity, duration: 6 }}
    style={{ top: "10%", left: "20%" }}
  />

  {/* 💧 Floating Circle 2 */}
  <motion.div
    className="absolute w-72 h-72 bg-green-400/20 rounded-full blur-3xl"
    animate={{ y: [0, 30, 0] }}
    transition={{ repeat: Infinity, duration: 7 }}
    style={{ bottom: "10%", right: "20%" }}
  />

  {/* 🚀 MAIN CONTENT */}
  <div className="relative z-10">
    {/* 🧠 TITLE */}
    <motion.h1
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-4xl md:text-6xl font-bold text-white"
    >
      💧 HydroSentinel
    </motion.h1>

    {/* 📊 SUBTITLE */}
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.8 }}
      className="mt-4 text-lg text-gray-300 max-w-xl mx-auto"
    >
      Real-time AI-powered water quality monitoring system for safer communities
    </motion.p>

    <div
      className=" px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-green-500 text-white font-medium shadow-lg transition-all uration-300 hover:shadow-2xl
"
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          document
            .getElementById("team")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
        className="px-5 py-2 rounded-xl bg-cyan-500 text-white shadow"
      >
        👨‍💻 Team
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          document
            .getElementById("project")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
        className="px-5 py-2 rounded-xl bg-blue-500 text-white shadow"
      >
        📄 Project
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          document
            .getElementById("prototype")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
        className="px-5 py-2 rounded-xl bg-green-500 text-white shadow"
      >
        ⚙️ Prototype
      </motion.button>
    </div>
  </div>
  <div className="mt-6 flex flex-wrap justify-center gap-4"></div>
</section>;

const FEATURES = [
  {
    title: "Real-time Monitoring",
    short: "Live sensor data updates",
    detail: "Continuously tracks pH, TDS, and turbidity using IoT sensors.",
    icon: "📡",
  },
  {
    title: "AI Insights",
    short: "Smart water analysis",
    detail: "AI analyzes data and gives intelligent suggestions.",
    icon: "🤖",
  },
  {
    title: "Smart Alerts",
    short: "Instant unsafe warning",
    detail: "Instant alerts when water becomes unsafe.",
    icon: "⚠️",
  },
  {
    title: "Prediction",
    short: "Future risk detection",
    detail: "Predicts future water safety using trends.",
    icon: "📊",
  },
];

const getFeatureExplanation = (title: string) => {
  switch (title) {
    case "Real-time Monitoring":
      return [
        "Sensors (pH, TDS, turbidity) water se data collect karte hain",
        "ESP32 us data ko process karta hai",
        "Data cloud (Supabase) me send hota hai",
        "Dashboard pe har 3 second me update hota hai",
      ];

    case "AI Insights":
      return [
        "Collected data AI model ko diya jata hai",
        "AI safe/unsafe detect karta hai",
        "User ko simple language me explanation deta hai",
        "User AI se questions bhi puch sakta hai",
      ];

    case "Smart Alerts":
      return [
        "System continuously water values check karta hai",
        "Agar threshold cross hota hai → alert trigger hota hai",
        "UI me red warning dikhta hai",
        "Audio alert bhi play hota hai",
      ];

    case "Prediction":
      return [
        "Past data (history) store hota hai",
        "Trend analysis kiya jata hai",
        "Future unsafe condition predict hota hai",
        "User ko pehle hi warning mil jata hai",
      ];

    default:
      return ["No details available"];
  }
};

const TEAM = [
  {
    name: "Nikhil Kumar",
    role: "AI + Backend",
    img: "/team1.jpg",
    intro:
      "This is Nikhil, a passionate AI developer. He is responsible for developing the AI models that analyze water quality data and provide insights to users. With a beginner's background in machine learning and data science, Nikhil ensures that HydroSentinel delivers accurate and actionable information about water safety.",
    github: "https://github.com/NIKHILKUMAR-186",
    linkedin: "https://www.linkedin.com/in/nikhil-kumar-b288a7303/",
  },

  {
    name: "Savera",
    role: "Frontend + UI",
    img: "/team2.jpg",
    intro:
      "This is Savera, a talented frontend developer with a keen eye for design. He is responsible for creating an intuitive and user-friendly interface for HydroSentinel. With a strong foundation in React and UI/UX principles, Savera ensures that users can easily navigate and interact with the application.",
    github: "https://github.com/SAVERA-123",
    linkedin: "https://www.linkedin.com/in/savera-456/",
  },
  {
    name: "Member 3",
    role: "Hardware + IoT",
    img: "/team3.jpg",
    intro: "Expert in AI systems and backend architecture",
  },
  {
    name: "Member 4",
    role: "AI + Backend",
    img: "/team1.jpg",
    intro: "Expert in AI systems and backend architecture",
  },
  {
    name: "Member 5",
    role: "Frontend + UI",
    img: "/team2.jpg",
    intro: "Expert in AI systems and backend architecture",
  },
  {
    name: "Member 6",
    role: "Hardware + IoT",
    img: "/team3.jpg",
    intro: "Expert in AI systems and backend architecture",
  },
];

const WATER_QUOTES = [
  "Water is life 💧",
  "Clean water, healthy future 🌍",
  "Every drop matters 💙",
  "Safe water = Safe life",
  "Protect water, protect tomorrow",
  "Pure water is priceless",
];

type Reading = {
  id: string;
  ph: number;
  tds: number;
  turbidity: number;
  temperature: number;
  status: "SAFE" | "NOT SAFE";
  created_at: string;
};

type TeamMember = {
  name: string;
  role: string;
  img: string;
  intro: string;
  github?: string;
  linkedin?: string;
};

const Index = () => {
  const [reading, setReading] = useState<Reading | null>(null);
  const [quote, setQuote] = useState(WATER_QUOTES[0]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [simulatorRunning, setSimulatorRunning] = useState(true);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);

  const fetchLatest = async () => {
    const { data, error } = await supabase.functions.invoke("latest");

    if (error) {
      console.error(error);
      return;
    }

    if (data?.reading) {
      setReading(data.reading);

      setHistory((prev) => {
        const newData = [...prev, data.reading];
        return newData.slice(-10);
      });
    }
  };

  const [history, setHistory] = useState(
    Array.from({ length: 10 }, () => ({
      tds: 500,
      ph: 7,
      turbidity: 5,
    })),
  );

  const normalizeTDS = (tds: number) => tds / 1000;
  const normalizePH = (ph: number) => Math.abs(ph - 7);
  const getCurrentScore = () => {
    if (!reading) return 0;
    return getWaterScore(reading.tds, reading.ph);
  };
  const getAIAction = useCallback(() => {
    if (!history.length) return "";

    const last = history[history.length - 1];

    // 🚨 High TDS
    if (last.tds > 1000) {
      return "💡 Use RO filter or boil water before drinking.";
    }

    // ⚠️ pH issue
    if (last.ph < 6.5) {
      return "💡 Add alkaline minerals or use a pH filter.";
    }

    if (last.ph > 8.5) {
      return "💡 Avoid direct consumption and use neutralizing filter.";
    }

    // 🌫️ Turbidity issue
    if (last.turbidity > 25) {
      return "💡 Use sediment filter or boil water to remove impurities.";
    }

    // ✅ Safe
    return safeMessages[Math.floor(Math.random() * safeMessages.length)];
  }, [history]);

  const safeMessages = [
    "💡 Water is safe. No action needed.",
    "💡 All parameters stable. You're good to go.",
    "💡 Safe for drinking and daily use.",
  ];

  const [action, setAction] = useState("");

  useEffect(() => {
    setAction(getAIAction());
  }, [getAIAction]);

  const getColor = (score: number) => {
    if (score > 1) return "text-red-400"; // danger
    if (score > 0.7) return "text-yellow-400"; // warning
    return "text-green-400"; // safe
  };

  const getWaterScore = (tds: number, ph: number) => {
    const tdsScore = normalizeTDS(tds);
    const phScore = normalizePH(ph);

    // weight assign karo
    const score = 0.6 * tdsScore + 0.4 * phScore;

    return score;
  };

  const linearRegression = (data: number[]) => {
    const n = data.length;

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i; // time index
      const y = data[i];

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };
  const getFinalPrediction = () => {
    const score = getFutureScore();

    if (!score) return "Not enough data";

    if (score > 1) {
      return "⚠️ Water quality may degrade in next 2 hours";
    }

    return "✅ Water likely to remain safe";
  };

  const predictFuture = (values: number[]) => {
    if (values.length < 2) return null;

    const { slope, intercept } = linearRegression(values);

    const futureX = values.length + 2; // 2 step ahead
    const predictedY = slope * futureX + intercept;

    return predictedY;
  };
  const getFutureScore = () => {
    if (history.length < 2) return null;

    const scores = history.map((item) => getWaterScore(item.tds, item.ph));

    return predictFuture(scores); // jo pehle banaya tha
  };

  const currentScore = getCurrentScore();
  const futureScore = getFutureScore();
  const predictionScore = futureScore ?? currentScore;
  const trend =
    futureScore !== null && futureScore > currentScore ? "up" : "down";
  const isUnsafe =
    currentScore > 0.7 || (futureScore !== null && futureScore > 0.7);
  useEffect(() => {
    const result = getPrediction();
    setPrediction(result);
  }, [history]);

  const tdsData = history.map((item, i) => ({
    time: i + 1,
    tds: item.tds,
  }));

  const phTurbidityData = history.map((item, i) => ({
    time: i + 1,
    ph: item.ph,
    turbidity: item.turbidity,
  }));

  const getUsage = () => {
    if (!reading) return null;

    if (reading.status === "SAFE") {
      return "✅ Safe for drinking, washing, and farming";
    }

    if (reading.tds > 1000) {
      return "❌ Not safe for drinking. Use only for cleaning";
    }

    if (reading.turbidity > 25) {
      return "❌ Dirty water. Filter before use";
    }

    return "⚠️ Limited use. Treat before drinking";
  };

  useEffect(() => {
    if (!reading) return;

    if (reading.status === "NOT SAFE") {
      setQuote("⚠️ Water is unsafe. Avoid drinking!");
    } else if (reading.turbidity > 25) {
      setQuote("💧 Water is too cloudy. Filtration needed.");
    } else if (reading.tds > 1000) {
      setQuote("🧂 High TDS detected. Not ideal for drinking.");
    } else if (reading.ph < 6.5 || reading.ph > 8.5) {
      setQuote("⚗️ pH imbalance detected. Check water source.");
    } else {
      setQuote("✅ Water looks safe and healthy!");
    }
  }, [reading]);

  const alertPlayedRef = useRef(false);

  useEffect(() => {
    if (!reading) return;

    if (reading.status === "SAFE") {
      alertPlayedRef.current = false;
      return;
    }

    if (!alertPlayedRef.current) {
      const audio = new Audio(
        "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
      );
      audio.play().catch(console.error);
      alertPlayedRef.current = true;
    }
  }, [reading]);

  // useEffect(() => {
  //   setHistory([
  //     { tds: 500, ph: 7, turbidity: 5 }
  //   ]);
  // }, []);

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  // const newReading = {
  //   tds: danger ? last.tds + 100 : last.tds + (Math.random() * 20 - 10),
  //   ph: danger ? last.ph + 0.5 : last.ph + (Math.random() * 0.1 - 0.05),
  //   turbidity: danger ? last.turbidity + 5 : last.turbidity + (Math.random() * 1 - 0.5),
  // };
  // useEffect(() => {
  //   if (!simulatorRunning) return;

  //   const interval = setInterval(() => {
  //     setHistory((prev) => {
  //       const last = prev[prev.length - 1] || {
  //         tds: 500,
  //         ph: 7,
  //         turbidity: 5,
  //       };

  //       const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  //       // 🔥 trend logic
  //       const tdsTrend = Math.random() > 0.3 ? 1 : -1;
  //       const phTrend = Math.random() > 0.3 ? 1 : -1;
  //       const turbidityTrend = Math.random() > 0.3 ? 1 : -1;

  //       // 🔥 danger mode
  //       const danger = Math.random() < 0.2;

  //       const newReading = {
  //         tds: clamp(
  //           danger
  //             ? last.tds + 100
  //             : last.tds + tdsTrend * (Math.random() * 20),
  //           100,
  //           1200,
  //         ),

  //         ph: clamp(
  //           danger ? last.ph + 0.5 : last.ph + phTrend * (Math.random() * 0.1),
  //           6,
  //           9,
  //         ),

  //         turbidity: clamp(
  //           danger
  //             ? last.turbidity + 5
  //             : last.turbidity + turbidityTrend * (Math.random() * 1),
  //           1,
  //           50,
  //         ),
  //       };
  //       const status =
  //         newReading.tds > 1000 || newReading.turbidity > 25
  //           ? "NOT SAFE"
  //           : "SAFE";

  //       const fullReading: Reading = {
  //         id: crypto.randomUUID(),
  //         tds: newReading.tds,
  //         ph: newReading.ph,
  //         turbidity: newReading.turbidity,
  //         temperature: 25 + Math.random() * 5,
  //         status,
  //         created_at: new Date().toISOString(),
  //       };

  //       setReading(fullReading);

  //       return [...prev.slice(-10), fullReading];
  //     });
  //   }, 3000);

  //   return () => clearInterval(interval);
  // }, [simulatorRunning]);

  useEffect(() => {
    if (simulatorRunning) {
      const generateRandomReading = () => {
        setHistory((prev) => {
          const last = prev[prev.length - 1] || {
            tds: 500,
            ph: 7,
            turbidity: 5,
          };

          const danger = Math.random() < 0.35;
          const shock = Math.random() < 0.15;
          const tdsTrend = Math.random() > 0.5 ? 1 : -1;
          const phTrend = Math.random() > 0.5 ? 1 : -1;
          const turbidityTrend = Math.random() > 0.5 ? 1 : -1;

          const tdsStep = Math.random() * 45 + 10;
          const phStep = Math.random() * 0.22 + 0.04;
          const turbidityStep = Math.random() * 2.4 + 0.2;

          const next = {
            tds: clamp(
              shock
                ? last.tds + (Math.random() > 0.5 ? 220 : -220)
                : danger
                  ? last.tds + 120
                  : last.tds + tdsTrend * tdsStep,
              100,
              1200,
            ),
            ph: clamp(
              shock
                ? last.ph + (Math.random() > 0.5 ? 0.8 : -0.8)
                : danger
                  ? last.ph + 0.6
                  : last.ph + phTrend * phStep,
              6,
              9,
            ),
            turbidity: clamp(
              shock
                ? last.turbidity + (Math.random() > 0.5 ? 12 : -12)
                : danger
                  ? last.turbidity + 6
                  : last.turbidity + turbidityTrend * turbidityStep,
              1,
              50,
            ),
          };

          const randomReading: Reading = {
            id: crypto.randomUUID(),
            ph: next.ph,
            tds: next.tds,
            turbidity: next.turbidity,
            temperature: clamp(25 + (Math.random() * 10 - 5), 18, 38),
            status:
              next.ph < 6.5 ||
              next.ph > 8.5 ||
              next.tds > 1000 ||
              next.turbidity > 25
                ? "NOT SAFE"
                : "SAFE",
            created_at: new Date().toISOString(),
          };

          setReading(randomReading);
          return [...prev, next].slice(-10);
        });
      };

      generateRandomReading();
      const interval = setInterval(generateRandomReading, 3000);
      return () => clearInterval(interval);
    }

    fetchLatest();
    const interval = setInterval(fetchLatest, 3000);
    return () => clearInterval(interval);
  }, [simulatorRunning]);

  const phOut = reading ? reading.ph < 6.5 || reading.ph > 8.5 : false;
  const tdsOut = reading ? reading.tds > 1000 : false;
  const turbOut = reading ? reading.turbidity > 25 : false;

  useEffect(() => {
    window.scrollTo(0, 0); // ✅ no animation
  }, []);

  const getPrediction = useCallback(() => {
    if (history.length < 2) return null;

    const last = history[history.length - 1];
    const prev = history[history.length - 2];

    // turbidity increasing
    if (last.turbidity > prev.turbidity && last.turbidity > 20) {
      return "⚠️ Water may become unsafe soon (getting dirty)";
    }
    console.log("history:", history);

    // TDS increasing
    if (last.tds > prev.tds && last.tds > 900) {
      return "⚠️ TDS is increasing. Water may become unsafe";
    }

    return null;
  }, [history]);

  return (
    <main className="min-h-screen bg-gradient-hero text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative text-center py-20 overflow-hidden">
          {/* 🔥 Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-green-500/10 blur-3xl animate-pulse" />

          {/* 💧 Floating Circle 1 */}
          <motion.div
            className="absolute w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl"
            animate={{ y: [0, -30, 0] }}
            transition={{ repeat: Infinity, duration: 6 }}
            style={{ top: "10%", left: "20%" }}
          />

          {/* 💧 Floating Circle 2 */}
          <motion.div
            className="absolute w-72 h-72 bg-green-400/20 rounded-full blur-3xl"
            animate={{ y: [0, 30, 0] }}
            transition={{ repeat: Infinity, duration: 7 }}
            style={{ bottom: "10%", right: "20%" }}
          />

          {/* 🚀 CONTENT */}
          <div className="relative z-10">
            {/* TITLE */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-6xl font-bold text-white"
            >
              💧 HydroSentinel
            </motion.h1>

            {/* SUBTITLE */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-4 text-lg text-gray-300 max-w-xl mx-auto"
            >
              Real-time AI-powered water quality monitoring system for safer
              communities
            </motion.p>

            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{
                scale: 1.11,
                boxShadow: "0px 0px 25px rgba(34,197,94,0.6)",
              }}
              whileTap={{ scale: 0.95 }}
              transition={{
                delay: 0.1,
                duration: 0.5,
                type: "spring",
                stiffness: 300,
              }}
              onClick={() =>
                document
                  .getElementById("team")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-green-500 text-white font-semibold shadow-lg"
            >
              👨‍💻 Team
            </motion.button>

            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{
                scale: 1.1,
                boxShadow: "0px 0px 25px rgba(34,197,94,0.6)",
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              onClick={() => {
                document
                  .getElementById("project")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-green-500 text-white font-semibold shadow-lg"
            >
              📄 Project
            </motion.button>

            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.1,
                duration: 0.5,
                type: "spring",
                stiffness: 300,
              }}
              whileHover={{
                scale: 1.1,
                boxShadow: "0px 0px 25px rgba(34,197,94,0.6)",
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                document
                  .getElementById("prototype")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-green-500 text-white font-semibold shadow-lg"
            >
              ⚙️ Prototype
            </motion.button>

            <div className="mt-6 flex flex-wrap justify-center gap-6"></div>
          </div>
        </section>
        {/* === team details === */}
        <section id="team" className="mt-12">
          <h2 className="text-xl font-bold mb-4 text-center">👨‍💻 Our Team</h2>
          <h2 className="text-lg text-primary font-semibold text-center mb-2">
            🚀 Team HYDROSENTINAL
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {TEAM.map((member, i) => (
              <div
                key={i}
                onClick={() => setSelectedMember(member)}
                className="  group   relative   rounded-2xl   bg-white/5 backdrop-blur-md   border border-white/10   p-6 text-center   cursor-pointer   transition-all duration-300   hover:-translate-y-2   hover:shadow-[0_10px_40px_rgba(0,255,200,0.2)]   hover:border-cyan-400/40
  "
              >
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-green-500 blur-md opacity-0 group-hover:opacity-70 transition"></div>

                  <img
                    src={member.img}
                    alt={member.name}
                    className="relative w-24 h-24 rounded-full object-cover border-2 border-white/20"
                  />
                </div>
                <p className="mt-3 inline-block text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">
                  {member.role}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  {member.name}
                </h3>

                {/* short intro on hover */}
                {/* <div
                  className="
opacity-0 group-hover:opacity-100
transition duration-300
mt-3 text-sm text-gray-300
"
                >
                  {member.intro}
                </div> */}
              </div>
            ))}
          </div>

          {selectedMember && (
            <div
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
              onClick={() => setSelectedMember(null)}
            >
              <div
                className="bg-card rounded-2xl p-6 w-[90%] max-w-md text-center relative animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-2 right-3 text-xl bg-red-500/20 px-2 rounded hover:bg-red-500/40"
                >
                  ✖
                </button>

                {/* Image */}
                <img
                  src={selectedMember.img}
                  className="mx-auto h-28 w-28 rounded-full object-cover border-4 border-primary shadow-lg"
                />

                {/* Name */}
                <h2 className="mt-4 text-2xl font-bold tracking-tight">
                  {selectedMember.name}
                </h2>

                {/* Role */}
                <p className="text-sm text-primary font-medium">
                  {selectedMember.role}
                </p>

                {/* Intro */}
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  {selectedMember.intro}
                </p>
                <div className="mt-6 p-4 border rounded-xl animate-fade-in">
                  <div
                    className={`cursor-pointer ${selectedMember === selectedMember ? "border-blue-500" : ""}`}
                  >
                    <a
                      href={selectedMember.github}
                      target="_blank"
                      className="text-blue-400 hover:underline "
                    >
                      🔗 GitHub
                    </a>

                    {" | "}

                    <a
                      href={selectedMember.linkedin}
                      target="_blank"
                      className="text-blue-400 hover:underline"
                    >
                      🔗 LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <p className="text-center text-sm text-muted-foreground mt-4 max-w-xl mx-auto">
          We built HydroSentinel to solve real-world water safety issues faced
          in rural areas. Our mission is to make clean and safe water
          accessible, understandable, and actionable for everyone using
          real-time data and AI.
        </p>

        <section id="project" className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-6">🚨 Problem & 💡 Solution</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Problem */}
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 text-left">
              <h3 className="text-lg font-semibold text-red-400 mb-2">
                🚨 Problem
              </h3>
              <p className="text-sm text-muted-foreground">
                Many communities lack real-time access to water quality data.
                People often consume contaminated water unknowingly, leading to
                serious health issues. There is no simple system to monitor and
                understand water safety instantly.
              </p>
            </div>

            {/* Solution */}
            <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-5 text-left">
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                💡 Solution
              </h3>
              <p className="text-sm text-muted-foreground">
                HydroSentinel provides real-time monitoring of water quality
                using IoT sensors. It analyzes parameters like pH, TDS, and
                turbidity, and gives instant feedback with AI insights. Users
                can easily understand whether water is safe or not and take
                necessary actions.
              </p>
            </div>
          </div>
        </section>
        <p className="mt-16 text-center"></p>

        <p className="mt-3 font-semibold text-white tracking-wide text-center">
          ⚡ Key Features
        </p>

        <div className="grid gap-6 md:grid-cols-2"></div>

        <div className=" flex flex-col space-y-4 items-center bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-2xl p-6">
          {/* <div className="grid gap-6"> */}
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              onMouseEnter={() => setActiveFeature(i)}
              onMouseLeave={() => setActiveFeature(null)}
              // onClick={() => setSelectedFeature(feature)}
              onClick={() =>
                setExpandedFeature(expandedFeature === i ? null : i)
              }
              whileHover={{
                scale: 1.05,
                y: -4,
              }}
              whileTap={{
                scale: 0.96,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 15,
              }}
              className={`
  w-full
  group
  cursor-pointer
  rounded-2xl
  bg-white/5 backdrop-blur-md
  border border-white/10
  p-5
  transition-all duration-200 ease-in-out
hover:shadow-xl
  flex

${
  expandedFeature === i
    ? "flex-row items-center justify-center gap-6"
    : "flex-col items-center text-center"
}
`}
            >
              <div
                className={`flex flex-col ${
                  expandedFeature === i
                    ? "w-[140px] shrink-0 items-start text-left"
                    : "w-full items-center text-center"
                }`}
              >
                <motion.div
                  animate={expandedFeature === i ? { x: -25 } : { x: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="text-3xl mb-2"
                >
                  {feature.icon}
                </motion.div>

                <p className="font-semibold text-white">{feature.title}</p>

                <p className="text-xs text-white/60">{feature.short}</p>
              </div>

              <motion.div
                className="block"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {expandedFeature === i && (
                  <motion.div
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex-1 w-full max-w-[600px] text-left bg-white/5 p-3 rounded-xl border border-white/10 shadow-xl backdrop-blur-sm"
                  >
                    <p className="text-sm text-gray-300 mb-3">
                      {feature.detail}
                    </p>

                    <div className="text-xs text-cyan-300">
                      ⚙️ How it works:
                      <ul className="mt-2 space-y-1 text-gray-400">
                        {getFeatureExplanation(feature.title).map(
                          (step, idx) => (
                            <li key={idx}>• {step}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>
        <p className="mt-16 text-center"></p>

        {/* Status */}

        <div id="prototype">
          <StatusBanner
            status={reading?.status}
            updatedAt={reading?.created_at}
            simulatorRunning={simulatorRunning}
          />
        </div>
        <button onClick={() => setSimulatorRunning((prev) => !prev)}>
          {simulatorRunning ? "Stop Simulator" : "Start Simulator"}
        </button>

        {reading &&
          (reading.ph < 6.5 ||
            reading.ph > 8.5 ||
            reading.tds > 1000 ||
            reading.turbidity > 25) && (
            <div className="mt-2 text-sm text-red-400">
              Reason:
              {reading.ph < 6.5 || reading.ph > 8.5 ? " pH out of range," : ""}
              {reading.tds > 1000 ? " high TDS," : ""}
              {reading.turbidity > 25 ? " dirty water," : ""}
            </div>
          )}

        {/* Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            <SensorCard
              label="pH"
              // value={reading?.ph}
              value={reading?.ph ?? 0}
              unit=""
              icon="ph"
              safeRange="6.5 – 8.5"
              alert={phOut}
            />
            <SensorCard
              label="TDS"
              value={reading?.tds}
              unit="ppm"
              icon="tds"
              safeRange="≤ 1000 ppm"
              alert={tdsOut}
            />
            <SensorCard
              label="Turbidity"
              value={reading?.turbidity}
              unit="NTU"
              icon="turbidity"
              safeRange="≤ 25 NTU"
              alert={turbOut}
            />
            <SensorCard
              label="Temperature"
              value={reading?.temperature}
              unit="°C"
              icon="temperature"
              safeRange="ambient"
            />
          </section>

          <aside className="h-[560px] lg:h-auto">
            <ChatPanel />
          </aside>
        </div>

        <div className="flex flex-col gap-6 mt-6">
          {/* LEFT: GRAPH */}
          <div className="bg-black/20 p-4 rounded-xl">
            <h2 className="text-lg font-semibold mb-2">
              📊 Water Trends Analysis
            </h2>
            {/* <WaterGraph data={graphData} />
             */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* 🔵 TDS GRAPH */}
              <div className="p-4 rounded-xl border bg-black/20">
                <h2 className="text-lg font-bold text-blue-400 mb-2">
                  📊 TDS Levels
                </h2>

                <WaterGraph data={tdsData} type="tds" />
              </div>

              {/* 🟢 pH + Turbidity GRAPH */}
              <div className="p-4 rounded-xl border bg-black/20">
                <h2 className="text-lg font-bold text-green-400 mb-2">
                  🌊 pH & Turbidity
                </h2>

                <WaterGraph data={phTurbidityData} type="ph" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              This graph visualizes real-time trends in water quality parameters
              like pH, TDS, and turbidity. AI analyzes these trends to detect
              anomalies and predict potential safety risks before they occur.
            </p>
          </div>
        </div>
        <div className="mt-6"> </div>
        {/* score AI INSIGHTS */}
        

        <div className="bg-black/20 p-4 rounded-xl">
          <div className="flex flex-col gap-4">
            {/* 🔮 Prediction */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500 space-y-3">
              <h2 className="text-lg font-bold text-blue-400">🔮 SCORE</h2>

              <div className="flex justify-between w-full">
                <p className="text-xl mt-2">Current Water Score</p>

                <h2
                  className={`text-xl mt-2 ${
                    currentScore > 0.7 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {currentScore.toFixed(2)}
                </h2>

                
                <p className="text-xl mt-2">||</p>
                <p className="text-xl mt-2">Prediction after 2 hours</p>

                <h2
                  className={`text-xl mt-2 ${
                    predictionScore > currentScore
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {predictionScore.toFixed(2)}
                </h2>

               
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                  ✅ Safe
                </span>
                <span className="ml-auto text-right">
                  {trend === "up" ? "📈 Getting Worse" : "📉 Improving"}
                </span>
              </div>
            </div>

            
            {reading?.status === "NOT SAFE" && (
              <div className="mt-4 rounded-xl bg-red-500/20 border border-red-500 p-4 text-red-300 font-semibold animate-pulse">
                <h2 className="text-lg font-bold text-green-400">🚨 Warning</h2>
                Water is NOT SAFE! Do not drink. Use filtration or boiling.
              </div>
            )}
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500">
              <h2 className="text-lg font-bold text-green-400">
                Recommended Action
              </h2>
              <p className="mt-2">{action}</p>

              {/* <p className="mt-2">No action needed. Water is safe for use.</p> */}
            </div>

            {/* <p className="mt-2">No action needed. Water is safe for use.</p> */}
          </div>
        </div>
      </div>
      {/* <div className="mt-10">
        <footer className="mt-10 rounded-2xl border border-border bg-card/60 p- text-xs text-muted-foreground">
          <p className="text-xl font-semibold tracking-wide text-primary">
            💧 {quote}
          </p>
          {getUsage() && (
            <div className="mt-4 rounded-xl bg-yellow-500/20 border border-yellow-500 p-4 text-yellow-300 font-semibold">
              💡 {getUsage()}
            </div>
          )}
          {getPrediction() && (
            <div className="mt-4 rounded-xl bg-yellow-500/20 border border-yellow-500 p-4 text-yellow-300 font-semibold">
              <p className="text-yellow-400 text-sm font-medium">
                🔮 Prediction: {getPrediction()}
              </p>
            </div>
          )}

          <div className="mt-1"></div>
        </footer>
      </div> */}
    </main>
  );
};

export default Index;
