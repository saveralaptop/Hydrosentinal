import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="premium-button inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-slate-700 shadow-sm shadow-slate-900/10 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800/80"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400" />
        ) : (
          <Moon className="h-4 w-4 text-slate-700" />
        )}
      </motion.div>
      <span className="hidden sm:inline text-sm font-medium">
        {isDark ? "Dark" : "Light"}
      </span>
      <span className="sr-only">Toggle theme</span>
    </motion.button>
  );
};

export default ThemeToggle;
