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
      className="premium-button  inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 p-2 text-slate-700 shadow-sm shadow-slate-900/10 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800/80"
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
