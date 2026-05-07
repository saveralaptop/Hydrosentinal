// Landing page with enhanced animations
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  getParallaxVariants,
  getStaggerContainerVariants,
  getFadeSlideUpVariants,
  get3DCardVariants,
  getHeroCardVariants,
  getSmallCardVariants,
  getScrollRevealVariants,
  usePrefersReducedMotion,
} from "@/hooks/useAnimationUtils";

// Text reveal helper
const TextReveal = ({ children }: { children: string }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-50px" }}
    variants={getStaggerContainerVariants(0.05, 0.1)}
  >
    {children.split("").map((char, index) => (
      <motion.span
        key={index}
        variants={{
          hidden: { opacity: 0, y: 20, clipPath: "inset(0 100% 0 0)" },
          visible: {
            opacity: 1,
            y: 0,
            clipPath: "inset(0 0 0 0)",
            transition: { duration: 0.4 },
          },
        }}
      >
        {char}
      </motion.span>
    ))}
  </motion.div>
);

// Custom animated sparkle SVG (small, theme-aware)
const SparkleSVG = ({ active, burst }: { active: boolean; burst: boolean }) => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke={active ? "currentColor" : "#06b6d4"}
      strokeWidth={1.2}
      initial={false}
      animate={
        burst
          ? { scale: [1, 1.6, 1], rotate: [0, 18, -18, 0], opacity: [1, 0.6, 1] }
          : active
          ? { rotate: [0, 6, -6, 0], scale: [1, 1.08, 1] }
          : { scale: 1, rotate: 0 }
      }
      transition={burst ? { duration: 0.9 } : { duration: 1.8, repeat: Infinity }}
      className="inline-block"
    >
      <path d="M12 2l1.8 4.2L18 8l-4.2 1.8L12 14l-1.8-4.2L6 8l4.2-1.8L12 2z" fill={active ? "currentColor" : "#06b6d4"} />
      <g stroke={active ? "rgba(255,255,255,0.75)" : "rgba(6,182,212,0.9)"} strokeWidth={0.9}>
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <path d="M12 3v3" />
        <path d="M12 18v3" />
      </g>
    </motion.svg>
  );
};

// Counter animation component
const CounterValue = ({ value, duration = 2 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = value / (duration * 60);
    let animationFrameId: any;

    const animate = () => {
      start += increment;
      if (start < value) {
        setDisplayValue(Math.floor(start));
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return <>{displayValue}</>;
};

const FEATURES = [
  {
    title: "Real-time Monitoring",
    short: "Live sensor data updates",
    detail: "Continuously tracks pH, TDS, turbidity, and temperature using IoT sensors.",
    icon: "📡",
    steps: [
      "Sensors collect water quality data",
      "ESP32 processes and sends readings",
      "Dashboard updates values in real time",
    ],
  },
  {
    title: "AI Insights",
    short: "Smart water analysis",
    detail: "AI explains water safety in simple language and suggests useful actions.",
    icon: "🤖",
    steps: [
      "AI checks pH, TDS, and turbidity",
      "Safe or unsafe condition is detected",
      "User gets clear guidance instantly",
    ],
  },
  {
    title: "Smart Alerts",
    short: "Instant unsafe warning",
    detail: "The system warns users when any water parameter crosses the safe range.",
    icon: "⚠️",
    steps: [
      "Thresholds are checked continuously",
      "Unsafe values trigger warning status",
      "Users can take action quickly",
    ],
  },
  {
    title: "Prediction",
    short: "Future risk detection",
    detail: "Trend analysis helps predict whether water quality may become unsafe soon.",
    icon: "📊",
    steps: [
      "Past readings are stored",
      "Trends are analyzed",
      "Future risk is shown before it becomes serious",
    ],
  },
];
const TEAM = [
  {
    name: "Nikhil Kumar",
    role: "AI + Backend",
    img: "/team1.jpg",
    intro:
      "This is Nikhil, a passionate AI developer. He is responsible for developing the AI models that analyze water quality data and provide insights to users. With a beginner's background in machine learning and data science, Nikhil ensures that HydroSentinel delivers accurate and actionable information about water safety.",
    skills: ["AI logic", "Backend flow", "Water quality analysis", "Authentication"],
    github: "https://github.com/NIKHILKUMAR-186",
    linkedin: "https://www.linkedin.com/in/nikhil-kumar-b288a7303/",
  },

  {
    name: "Savera",
    role: "Frontend + UI",
    img: "/team2.jpg",
    intro:
      "This is Savera, a talented frontend developer with a keen eye for design. He is responsible for creating an intuitive and user-friendly interface for HydroSentinel. With a strong foundation in React and UI/UX principles, Savera ensures that users can easily navigate and interact with the application.",
    skills: ["React UI", "Dashboard design", "Responsive layout", "User experience"],
    github: "https://github.com/SAVERA-123",
    linkedin: "https://www.linkedin.com/in/savera-456/",
  },
  {
    name: "Member 3",
    role: "Hardware + IoT",
    img: "/team3.jpg",
    intro:
      "This member handles the hardware and IoT side of HydroSentinel, including sensor setup, device connectivity, and reliable water data collection from the field.",
    skills: ["IoT sensors", "ESP32 setup", "Device testing", "Field data collection"],
  },
  {
    name: "Member 4",
    role: "AI + Backend",
    img: "/team1.jpg",
    intro:
      "This member supports backend architecture, data handling, and logic that keeps the HydroSentinel monitoring system stable and useful for users.",
    skills: ["Backend support", "Data structure", "API logic", "Testing"],
  },
  {
    name: "Member 5",
    role: "Frontend + UI",
    img: "/team2.jpg",
    intro:
      "This member contributes to the frontend experience, making the project details, dashboard screens, and user controls clear and easy to use.",
    skills: ["Frontend components", "UI polish", "Accessibility", "Layout"],
  },
  {
    name: "Member 6",
    role: "Hardware + IoT",
    img: "/team3.jpg",
    intro:
      "This member focuses on hardware validation, sensor reliability, and making sure readings from water quality devices are practical for real-world usage.",
    skills: ["Hardware validation", "Sensor readings", "Prototype support", "Troubleshooting"],
  },
];


const Index = () => {
  const navigate = useNavigate();
  const [expandedFeature, setExpandedFeature] = useState(-1);
  const [selectedMember, setSelectedMember] = useState<(typeof TEAM)[number] | null>(null);
  // Decorative effects are always enabled
  const showDecorative = true;
  // flash controls for blob and sparkle burst (run once on mount)
  const [flashBlob, setFlashBlob] = useState(false);
  const [sparkleBurstKey, setSparkleBurstKey] = useState(0);

  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // one-time attention burst on page load
    setFlashBlob(true);
    setSparkleBurstKey((k) => k + 1);
    const t = setTimeout(() => setFlashBlob(false), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-screen bg-transparent text-slate-950 dark:text-white">
      <motion.div
        className="light-blob"
        aria-hidden="true"
        initial={false}
        animate={flashBlob ? { scale: [1, 1.04, 1], opacity: [1, 0.6, 1] } : showDecorative ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={flashBlob ? { duration: 0.9 } : { duration: 8, repeat: Infinity, repeatType: "reverse" }}
      />
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 px-4 py-4 shadow-sm shadow-slate-950/10 backdrop-blur-xl transition-colors duration-500 dark:border-slate-700/50 dark:bg-slate-950/40 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <motion.div
            className="space-y-1"
            whileHover={{ x: 4 }}
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-300"
            >
              HydroSentinel
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-semibold text-slate-950 dark:text-white"
            >
              💧 Water safety, simplified.
            </motion.h1>
          </motion.div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ThemeToggle />
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => navigate("/login")}
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-600 hover:to-emerald-600"
              >
                🔐 Login
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.nav>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 p-8 shadow-[0_50px_120px_-65px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/65"
        >
          <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-10 h-60 w-60 rounded-full bg-emerald-400/15 blur-3xl" />

          <div className="grid gap-10 lg:grid-cols-[1.25fr_0.85fr] lg:items-center">
            <div className="space-y-6">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 dark:text-white md:text-6xl"
              >
                <TextReveal>Real-time water quality insights with elegant AI-driven intelligence.</TextReveal>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300"
              >
                HydroSentinel transforms sensor readings into instant guidance, clear warnings, and predictive safety insights so communities can act before water becomes unsafe.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => navigate("/login")}
                    className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-600 hover:to-emerald-600"
                  >
                    Explore the dashboard
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="outline" className="border-slate-200 text-slate-900 hover:border-cyan-300 dark:border-slate-700 dark:text-white">
                    Learn how it works
                  </Button>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <motion.div
                whileHover="hover"
                initial="initial"
                variants={prefersReducedMotion ? get3DCardVariants('none') : getHeroCardVariants()}
                className="surface-card p-6 highlight-card"
              >
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Sensors</p>
                <p className="mt-4 text-4xl font-bold text-cyan-500">4</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Live water metrics</p>
              </motion.div>
              <motion.div
                whileHover="hover"
                initial="initial"
                variants={prefersReducedMotion ? get3DCardVariants('none') : getHeroCardVariants()}
                className="surface-card p-6 highlight-card"
              >
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Alerts</p>
                <p className="mt-4 text-4xl font-bold text-emerald-400">Instant</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">AI-powered warning system</p>
              </motion.div>
              <motion.div
                whileHover="hover"
                initial="initial"
                variants={prefersReducedMotion ? get3DCardVariants('none') : getHeroCardVariants()}
                className="surface-card p-6 highlight-card"
              >
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Analysis</p>
                <p className="mt-4 text-4xl font-bold text-cyan-500">99%</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Confidence in water safety scoring</p>
              </motion.div>
              <motion.div
                whileHover="hover"
                initial="initial"
                variants={prefersReducedMotion ? get3DCardVariants('none') : getHeroCardVariants()}
                className="surface-card p-6 highlight-card"
              >
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Coverage</p>
                <p className="mt-4 text-4xl font-bold text-emerald-400">24/7</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Continuous monitoring</p>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mt-14 grid gap-7 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <motion.div
            variants={getScrollRevealVariants()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="rounded-[1.75rem] border border-white/10 bg-slate-950/10 p-8 shadow-xl backdrop-blur-xl dark:bg-slate-900/70"
          >
            <h2 className="text-3xl font-bold text-slate-950 dark:text-white">
              <TextReveal>🚨 Problem & 💡 Solution</TextReveal>
            </h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300"
            >
              Many communities lack instant visibility into water quality. HydroSentinel solves this with smart sensors, AI analysis, and clear actions so users can trust every drop.
            </motion.p>

            <motion.div
              className="mt-8 grid gap-5 sm:grid-cols-2"
              variants={getStaggerContainerVariants(0.15, 0.3)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <motion.article
                variants={getFadeSlideUpVariants()}
                whileHover={{ scale: 1.02, y: -4 }}
                className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-slate-950 dark:text-white transition"
              >
                <p className="font-semibold text-red-300">🚨 Problem</p>
                <p className="mt-4 text-gray-700 dark:text-slate-200">
                  Without real-time data, contaminated water often goes unnoticed. HydroSentinel gives clear visibility when every parameter changes.
                </p>
              </motion.article>
              <motion.article
                variants={getFadeSlideUpVariants()}
                whileHover={{ scale: 1.02, y: -4 }}
                className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-sm text-slate-950 dark:text-white transition"
              >
                <p className="font-semibold text-emerald-300">💡 Solution</p>
                <p className="mt-4 text-gray-700 dark:text-slate-200">
                  Our platform pairs IoT sensing with AI to deliver immediate safety insights, alerts, and future risk predictions for safer water decisions.
                </p>
              </motion.article>
            </motion.div>
          </motion.div>

          <motion.div
            variants={getScrollRevealVariants()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="rounded-[1.75rem] border border-white/10 bg-white/90 p-7 shadow-xl backdrop-blur-xl dark:bg-slate-950/65"
          >
            <h3 className="text-xl font-semibold text-slate-950 dark:text-white">⚡ Key Features</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Everything you need for bright, usable water monitoring.</p>

            <motion.div
              className="mt-6 space-y-4"
              variants={getStaggerContainerVariants(0.08, 0.1)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {FEATURES.map((feature, index) => (
                <motion.button
                  key={feature.title}
                  variants={getFadeSlideUpVariants()}
                  type="button"
                  onClick={() => setExpandedFeature(expandedFeature === index ? -1 : index)}
                  whileHover={{ y: -2, scale: 1.01 }}
                  className={`w-full rounded-3xl border border-slate-200/80 bg-slate-50/90 px-5 py-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 dark:border-slate-700/80 dark:bg-slate-950/70 dark:hover:border-cyan-400/40 highlight-card ${
                    expandedFeature === index ? "ring-2 ring-cyan-400/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <motion.div
                      className="text-3xl"
                      whileHover={{ scale: 1.2, rotate: 10 }}
                    >
                      {feature.icon}
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-lg font-semibold text-slate-950 dark:text-white">{feature.title}</h4>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{feature.short}</span>
                      </div>
                      <AnimatePresence>
                        {expandedFeature === index && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 rounded-3xl border border-slate-200/80 bg-white/70 p-4 text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300"
                          >
                            <p>{feature.detail}</p>
                            <motion.div
                              className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400"
                              variants={getStaggerContainerVariants(0.05)}
                              initial="hidden"
                              animate="visible"
                            >
                              {feature.steps.map((step) => (
                                <motion.p key={step} variants={getFadeSlideUpVariants()}>
                                  • {step}
                                </motion.p>
                              ))}
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          id="team"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mt-16"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center text-3xl font-bold text-slate-950 dark:text-white"
          >
            <TextReveal>👨‍💻 Our Team</TextReveal>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-600 dark:text-slate-300"
          >
            The people behind HydroSentinel bring design, hardware, AI, and real-world water knowledge together.
          </motion.p>

          <motion.div
            className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3"
            variants={getStaggerContainerVariants(0.12, 0.2)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {TEAM.map((member, idx) => (
              <motion.div
                key={member.name}
                variants={getFadeSlideUpVariants()}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMember(member)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setSelectedMember(member);
                  }
                }}
                whileHover="hover"
                initial="initial"
                className="group cursor-pointer rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-8 text-center shadow-xl transition-all duration-300 dark:border-slate-700/80 dark:bg-slate-950/70 dark:hover:border-cyan-500/40 dark:hover:bg-slate-900/70 highlight-card"
              >
                <motion.div
                  variants={prefersReducedMotion ? get3DCardVariants('none') : getSmallCardVariants()}
                  className="relative mx-auto h-28 w-28"
                >
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 opacity-0 blur-xl transition-opacity duration-300"
                    animate={{ opacity: 0 }}
                    whileHover={{ opacity: 0.8 }}
                  />
                  <motion.img
                    src={member.img}
                    alt={member.name}
                    className="relative h-28 w-28 rounded-full border-2 border-slate-200 object-cover transition-all duration-300"
                    whileHover={{ borderColor: "rgb(34, 211, 238)" }}
                  />
                </motion.div>
                <motion.p
                  className="mt-5 inline-block rounded-full bg-cyan-500/15 px-4 py-1 text-sm font-semibold text-cyan-700 dark:text-cyan-200"
                  whileHover={{ scale: 1.1 }}
                >
                  {member.role}
                </motion.p>
                <h4 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">{member.name}</h4>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <AnimatePresence>
          {selectedMember && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
              onClick={() => setSelectedMember(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="relative w-full max-w-xl rounded-[2rem] border border-slate-700/70 bg-white/90 p-7 shadow-2xl dark:border-slate-600/70 dark:bg-slate-950/95 highlight-card"
                onClick={(event) => event.stopPropagation()}
              >
                <motion.button
                  onClick={() => setSelectedMember(null)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute right-4 top-4 rounded-lg bg-slate-200/80 px-3 py-1 text-2xl leading-none text-slate-900 hover:bg-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
                  aria-label="Close member details"
                >
                  ×
                </motion.button>

                <motion.img
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  src={selectedMember.img}
                  alt={selectedMember.name}
                  className="mx-auto h-32 w-32 rounded-full border-4 border-cyan-400 object-cover shadow-[0_0_35px_rgba(34,211,238,0.35)]"
                />
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mt-5 text-3xl font-bold text-slate-950 dark:text-white"
                >
                  {selectedMember.name}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-1 font-semibold text-cyan-500 dark:text-cyan-300"
                >
                  {selectedMember.role}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="mt-6 leading-relaxed text-slate-700 dark:text-slate-300"
                >
                  {selectedMember.intro}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/90 p-4 text-left dark:border-slate-700/80 dark:bg-slate-900/80"
                >
                  <p className="font-semibold text-slate-950 dark:text-white">Complete Details</p>
                  <motion.div
                    className="mt-3 flex flex-wrap gap-2"
                    variants={getStaggerContainerVariants(0.06)}
                    initial="hidden"
                    animate="visible"
                  >
                    {selectedMember.skills.map((skill) => (
                      <motion.span
                        key={skill}
                        variants={getFadeSlideUpVariants()}
                        whileHover={{ scale: 1.1, y: -2 }}
                        className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-medium text-cyan-800 dark:text-cyan-200"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </motion.div>
                </motion.div>

                {(selectedMember.github || selectedMember.linkedin) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700/80 dark:bg-slate-900/80"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedMember.github && (
                        <motion.a
                          href={selectedMember.github}
                          target="_blank"
                          rel="noreferrer"
                          whileHover={{ scale: 1.1, color: "rgb(6, 182, 212)" }}
                          className="font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-300"
                        >
                          🔗 GitHub
                        </motion.a>
                      )}
                      {selectedMember.github && selectedMember.linkedin && <span className="px-3 text-slate-500 dark:text-slate-400">|</span>}
                      {selectedMember.linkedin && (
                        <motion.a
                          href={selectedMember.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          whileHover={{ scale: 1.1, color: "rgb(6, 182, 212)" }}
                          className="font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-300"
                        >
                          🔗 LinkedIn
                        </motion.a>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default Index;
