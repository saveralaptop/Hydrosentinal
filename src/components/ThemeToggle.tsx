import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm shadow-slate-900/10 transition hover:bg-white dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:shadow-none dark:hover:bg-slate-900"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700" />
      )}
      <span className="hidden sm:inline">{isDark ? "Dark Mode" : "Light Mode"}</span>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};
