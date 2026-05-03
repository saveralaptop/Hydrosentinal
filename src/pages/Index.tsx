import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

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
  const [expandedFeature, setExpandedFeature] = useState(0);
  const [selectedMember, setSelectedMember] = useState<(typeof TEAM)[number] | null>(null);

  return (
    <main className="min-h-screen bg-transparent text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#062733]/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold">💧 HydroSentinel</h1>
          <Button
            onClick={() => navigate("/login")}
            className="bg-gradient-to-r from-cyan-500 to-green-500 font-semibold text-white hover:from-cyan-600 hover:to-green-600"
          >
            🔐 Login
          </Button>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold md:text-6xl"
          >
            💧 HydroSentinel
          </motion.h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-300">
            Real-time AI-powered water quality monitoring system for safer communities.
          </p>
        </section>

        <section id="team" className="mt-14">
          <h2 className="text-center text-2xl font-bold">👨‍💻 Our Team</h2>
          <h3 className="mt-6 text-center text-xl font-semibold text-cyan-300">
            🚀 Team HYDROSENTINAL
          </h3>

          <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <motion.div
                key={member.name}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMember(member)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setSelectedMember(member);
                  }
                }}
                whileHover={{ y: -10, scale: 1.025 }}
                className="group cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-xl backdrop-blur-md transition-all duration-300 hover:border-cyan-400/70 hover:bg-cyan-500/10 hover:shadow-[0_0_45px_rgba(34,211,238,0.22)]"
              >
                <div className="relative mx-auto h-28 w-28">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-green-500 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-80" />
                  <img
                    src={member.img}
                    alt={member.name}
                    className="relative h-28 w-28 rounded-full border-2 border-white/20 object-cover transition-all duration-300 group-hover:border-cyan-300"
                  />
                </div>
                <p className="mt-5 inline-block rounded-full bg-cyan-500/20 px-4 py-1 text-sm font-semibold text-cyan-300">
                  {member.role}
                </p>
                <h4 className="mt-5 text-xl font-bold">{member.name}</h4>
              </motion.div>
            ))}
          </div>

          {selectedMember && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
              onClick={() => setSelectedMember(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#061d28] p-7 text-center shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedMember(null)}
                  className="absolute right-4 top-4 rounded-lg bg-red-500/20 px-3 py-1 text-2xl leading-none text-red-200 hover:bg-red-500/40"
                  aria-label="Close member details"
                >
                  ×
                </button>

                <img
                  src={selectedMember.img}
                  alt={selectedMember.name}
                  className="mx-auto h-32 w-32 rounded-full border-4 border-cyan-400 object-cover shadow-[0_0_35px_rgba(34,211,238,0.35)]"
                />
                <h3 className="mt-5 text-3xl font-bold">{selectedMember.name}</h3>
                <p className="mt-1 font-semibold text-cyan-300">{selectedMember.role}</p>
                <p className="mt-6 leading-relaxed text-gray-300">{selectedMember.intro}</p>

                <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-left">
                  <p className="font-semibold text-white">Complete Details</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMember.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-medium text-cyan-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {(selectedMember.github || selectedMember.linkedin) && (
                  <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                    {selectedMember.github && (
                      <a
                        href={selectedMember.github}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-300 hover:text-blue-200"
                      >
                        🔗 GitHub
                      </a>
                    )}
                    {selectedMember.github && selectedMember.linkedin && <span className="px-3">|</span>}
                    {selectedMember.linkedin && (
                      <a
                        href={selectedMember.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-300 hover:text-blue-200"
                      >
                        🔗 LinkedIn
                      </a>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          )}

          <p className="mx-auto mt-8 max-w-3xl text-center text-gray-300">
            We built HydroSentinel to solve real-world water safety issues faced in rural areas.
            Our mission is to make clean and safe water accessible, understandable, and actionable
            for everyone using real-time data and AI.
          </p>
        </section>

        <section id="project" className="mt-20">
          <h2 className="text-center text-3xl font-bold">🚨 Problem & 💡 Solution</h2>

          <div className="mt-9 grid gap-7 md:grid-cols-2">
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6">
              <h3 className="text-xl font-bold text-red-300">🚨 Problem</h3>
              <p className="mt-4 leading-relaxed text-gray-300">
                Many communities lack real-time access to water quality data. People often consume
                contaminated water unknowingly, leading to serious health issues. There is no simple
                system to monitor and understand water safety instantly.
              </p>
            </div>

            <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-6">
              <h3 className="text-xl font-bold text-green-300">💡 Solution</h3>
              <p className="mt-4 leading-relaxed text-gray-300">
                HydroSentinel provides real-time monitoring of water quality using IoT sensors. It
                analyzes pH, TDS, turbidity, and temperature, then gives instant feedback with AI
                insights so users know whether water is safe.
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20 pb-16">
          <h2 className="text-center text-xl font-bold">⚡ Key Features</h2>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
            <div className="space-y-5">
              {FEATURES.map((feature, index) => (
                <motion.button
                  key={feature.title}
                  type="button"
                  onClick={() => setExpandedFeature(expandedFeature === index ? -1 : index)}
                  whileHover={{ scale: 1.01 }}
                  className={`w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center transition ${
                    expandedFeature === index
                      ? "md:flex md:items-center md:justify-center md:gap-10"
                      : ""
                  }`}
                >
                  <div className={expandedFeature === index ? "md:w-56" : ""}>
                    <div className="text-4xl">{feature.icon}</div>
                    <h3 className="mt-3 text-xl font-bold">{feature.title}</h3>
                    <p className="mt-1 text-sm text-gray-400">{feature.short}</p>
                  </div>

                  {expandedFeature === index && (
                    <div className="mx-auto mt-5 max-w-lg rounded-xl border border-white/10 bg-white/10 p-4 text-left text-gray-300 md:mx-0 md:mt-0">
                      <p>{feature.detail}</p>
                      <p className="mt-4 font-semibold text-cyan-300">⚙️ How it works:</p>
                      <ul className="mt-2 space-y-1 text-sm text-gray-400">
                        {feature.steps.map((step) => (
                          <li key={step}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Index;
