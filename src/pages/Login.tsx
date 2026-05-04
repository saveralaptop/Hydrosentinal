import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Lock, User, Eye, EyeOff, CheckCircle2, Info } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

type UserRole = "user" | "admin";

interface ValidationState {
  email: boolean;
  password: boolean;
}

const DEMO_ACCOUNTS = [
  { email: "user@demo.com", password: "password", role: "user" as UserRole },
  { email: "admin@demo.com", password: "password", role: "admin" as UserRole },
];

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Partial<ValidationState>>({});
  const [showDemoHint, setShowDemoHint] = useState(false);
  const { login, signup, user, role } = useAuth();
  const navigate = useNavigate();

  // Validation helpers
  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= (isLogin ? 1 : 6);
  };

  const isValidEmail = email.length > 0 && validateEmail(email);
  const isValidPassword = validatePassword(password);
  const isFormValid = isValidEmail && isValidPassword;

  // Reset form when toggling login/signup
  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setTouched({});
  };

  // Reset form when changing role
  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    setError("");
    setTouched({});
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    navigate(role === "admin" ? "/admin" : "/dashboard", { replace: true });
  }, [navigate, role, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Mark all fields as touched for validation display
    setTouched({ email: true, password: true });

    if (!isFormValid) {
      setError("Please fill in all fields correctly");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password, selectedRole);
      } else {
        await signup(email, password, selectedRole);
      }

      // Redirect based on role
      if (selectedRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (demoRole: UserRole) => {
    const demo = DEMO_ACCOUNTS.find((acc) => acc.role === demoRole);
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
      setSelectedRole(demoRole);
      setTouched({ email: true, password: true });
      setShowDemoHint(false);
    }
  };


  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 to-blue-50 px-4 py-8 flex items-center justify-center dark:from-slate-950 dark:to-slate-900">
      {/* Light mode background with subtle gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none dark:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/30 via-transparent to-blue-100/20" />
        <div className="absolute left-1/4 top-1/3 h-96 w-96 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl" />
      </div>

      {/* Dark mode tech background with grid and lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden dark:block">
        {/* Animated grid pattern */}
        <svg
          className="absolute inset-0 h-full w-full opacity-25"
          preserveAspectRatio="none"
          viewBox="0 0 1200 1200"
        >
          <defs>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="rgba(34, 211, 238, 0.15)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="1200" height="1200" fill="url(#grid)" />
        </svg>

        {/* Glowing cyan wavy lines */}
        <div className="absolute inset-0">
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="line1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(6, 182, 212, 0.35)" />
                <stop offset="50%" stopColor="rgba(6, 182, 212, 0.08)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
              </linearGradient>
              <linearGradient id="line2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(34, 211, 238, 0.3)" />
                <stop offset="50%" stopColor="rgba(34, 211, 238, 0.05)" />
                <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
              </linearGradient>
            </defs>
            <path d="M 0 0 Q 300 150 600 200 T 1200 300" stroke="url(#line1)" strokeWidth="2" fill="none" />
            <path d="M 0 400 Q 300 350 600 300 T 1200 200" stroke="url(#line2)" strokeWidth="2" fill="none" />
            <path d="M 1200 600 Q 900 650 600 700 T 0 800" stroke="url(#line1)" strokeWidth="2" fill="none" />
            <path d="M 0 1000 Q 300 900 600 800 T 1200 600" stroke="url(#line2)" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Glowing cyan blur orbs */}
        <div className="absolute top-1/4 left-1/4 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 h-36 w-36 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 h-28 w-28 rounded-full bg-cyan-500/12 blur-3xl" />

        {/* Floating glowing particles */}
        <div className="absolute top-20 left-20 h-2 w-2 rounded-full bg-cyan-400 opacity-70 shadow-lg shadow-cyan-400/50" />
        <div className="absolute top-1/3 right-32 h-1.5 w-1.5 rounded-full bg-cyan-300 opacity-60 shadow-lg shadow-cyan-300/50" />
        <div className="absolute bottom-32 left-1/4 h-2 w-2 rounded-full bg-cyan-400 opacity-70 shadow-lg shadow-cyan-400/50" />
        <div className="absolute bottom-20 right-1/4 h-1.5 w-1.5 rounded-full bg-cyan-300 opacity-50" />
        <div className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-cyan-400 opacity-60 shadow-lg shadow-cyan-400/50" />
        <div className="absolute top-2/3 right-1/3 h-1 w-1 rounded-full bg-cyan-300 opacity-40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/40 bg-white/95 px-6 py-7 shadow-[0_24px_80px_-36px_rgba(6,182,212,0.15)] backdrop-blur-xl dark:border-cyan-500/30 dark:bg-slate-900/80 dark:shadow-[0_24px_80px_-36px_rgba(6,182,212,0.25)]">
          <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-r from-cyan-100/60 via-cyan-50/40 to-transparent dark:from-cyan-500/20 dark:via-cyan-500/10 dark:to-transparent" />

          {/* Theme toggle */}
          <div className="absolute right-4 top-4 z-20">
            <ThemeToggle />
          </div>

          <div className="relative pt-3">
            {/* Header */}
            <p className="text-center text-[0.68rem] font-medium tracking-[0.42em] text-slate-600 dark:text-cyan-300">
              HYDROSENTINEL
            </p>

            <div className="mt-4 text-center">
              <h1 className="text-[2.35rem] leading-[0.98] font-black tracking-tight text-slate-800 dark:text-white">
                Monitor Water.
                <br />
                Protect Life.
              </h1>
              <p className="mx-auto mt-5 max-w-[18rem] text-sm leading-6 text-slate-600 dark:text-slate-300">
                Smart water quality analytics with a clean, premium dashboard experience.
              </p>
            </div>

            {/* Role selector with enhanced styling */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 rounded-[1.2rem] bg-slate-100/60 p-1.5 dark:bg-slate-800/50 dark:ring-1 dark:ring-cyan-500/20">
              <button
                type="button"
                onClick={() => handleRoleChange("user")}
                aria-pressed={selectedRole === "user"}
                aria-label="Select user role"
                className={`inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  selectedRole === "user"
                    ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-[0_12px_26px_-14px_rgba(8,145,178,0.9)]"
                    : "bg-transparent text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/70"
                }`}
              >
                <User className="h-4 w-4" />
                User
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("admin")}
                aria-pressed={selectedRole === "admin"}
                aria-label="Select admin role"
                className={`inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  selectedRole === "admin"
                    ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-[0_12px_26px_-14px_rgba(8,145,178,0.9)]"
                    : "bg-transparent text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/70"
                }`}
              >
                <Lock className="h-4 w-4" />
                Admin
              </button>
            </div>

            {/* Demo credentials hint */}
            <AnimatePresence>
              {isLogin && (
                <motion.button
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  type="button"
                  onClick={() => setShowDemoHint(!showDemoHint)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-50/60 px-3 py-2 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100/70 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/15"
                >
                  <Info className="h-3.5 w-3.5" />
                  <span>Demo accounts available</span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Demo credentials dropdown */}
            <AnimatePresence>
              {isLogin && showDemoHint && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-2 space-y-2 rounded-lg border border-slate-300/60 bg-slate-50/80 p-3 dark:border-slate-700/60 dark:bg-slate-800/60"
                >
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quick login:</p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => fillDemoCredentials("user")}
                      className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700/60"
                    >
                      <code className="font-mono text-[0.7rem] text-cyan-700 dark:text-cyan-400">user@demo.com</code>
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoCredentials("admin")}
                      className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700/60"
                    >
                      <code className="font-mono text-[0.7rem] text-cyan-700 dark:text-cyan-400">admin@demo.com</code>
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Password: <code className="font-mono text-cyan-700 dark:text-cyan-400">password</code></p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              {/* Email field with validation feedback */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched({ ...touched, email: true })}
                    required
                    autoComplete="email"
                    aria-invalid={touched.email && !isValidEmail}
                    aria-describedby={touched.email && !isValidEmail ? "email-error" : undefined}
                    className={`h-12 w-full rounded-2xl border bg-slate-50 px-4 text-slate-700 shadow-inner shadow-slate-100 placeholder:text-slate-400 transition-all focus:ring-2 dark:bg-slate-900/80 dark:text-white dark:shadow-none dark:placeholder:text-slate-500 ${
                      touched.email
                        ? isValidEmail
                          ? "border-green-500/50 focus:border-green-500 focus:ring-green-500/20"
                          : "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20 dark:border-slate-700"
                    }`}
                  />
                  {touched.email && isValidEmail && (
                    <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                  )}
                </div>
                {touched.email && !isValidEmail && (
                  <p id="email-error" className="text-xs text-red-600 dark:text-red-400">
                    Please enter a valid email address
                  </p>
                )}
              </div>

              {/* Password field with show/hide toggle */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Password {!isLogin && <span className="text-xs text-slate-500 dark:text-slate-400">(min. 6 chars)</span>}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched({ ...touched, password: true })}
                    required
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    aria-invalid={touched.password && !isValidPassword}
                    aria-describedby={touched.password && !isValidPassword ? "password-error" : undefined}
                    className={`h-12 w-full rounded-2xl border bg-slate-50 px-4 pr-12 text-slate-700 shadow-inner shadow-slate-100 placeholder:text-slate-400 transition-all focus:ring-2 dark:bg-slate-900/80 dark:text-white dark:shadow-none dark:placeholder:text-slate-500 ${
                      touched.password
                        ? isValidPassword
                          ? "border-green-500/50 focus:border-green-500 focus:ring-green-500/20"
                          : "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20 dark:border-slate-700"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-200/50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {touched.password && isValidPassword && (
                    <CheckCircle2 className="absolute right-11 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                  )}
                </div>
                {touched.password && !isValidPassword && (
                  <p id="password-error" className="text-xs text-red-600 dark:text-red-400">
                    {isLogin ? "Password is required" : "Password must be at least 6 characters"}
                  </p>
                )}
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-emerald-500 text-base font-semibold text-white shadow-[0_14px_30px_-18px_rgba(8,145,178,0.95)] transition hover:from-cyan-700 hover:to-emerald-600 disabled:opacity-60 dark:shadow-[0_14px_30px_-18px_rgba(6,182,212,0.5)]"
              >
                {loading && (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2 inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                  />
                )}
                {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
              </Button>
            </form>

            {/* Toggle between login and signup */}
            <div className="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={handleToggleMode}
                className="font-semibold text-cyan-700 transition hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
              >
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </div>

            {/* Forgot password link */}
            {isLogin && (
              <button
                type="button"
                className="mt-3 block w-full text-center text-sm font-semibold text-cyan-700 transition hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
};

export default Login;
