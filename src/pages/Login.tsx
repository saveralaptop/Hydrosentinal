import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";

type UserRole = "user" | "admin";
type AuthMode = "login" | "signup" | "forgot";

const ORGANIZATION_OPTIONS = [
  "Government",
  "Household",
  "School / College",
  "Hospital / Clinic",
  "Industry",
  "NGO",
  "Apartment / Society",
  "Farm / Agriculture",
  "Water Supplier",
  "Other",
];

export const Login = () => {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState(ORGANIZATION_OPTIONS[0]);
  const [resetCode, setResetCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup, resetPassword, user, role } = useAuth();
  const navigate = useNavigate();

  const isLogin = authMode === "login";
  const isSignup = authMode === "signup";
  const isForgot = authMode === "forgot";

  const selectRole = (nextRole: UserRole) => {
    setSelectedRole(nextRole);
    setError("");
    setSuccess("");

    if (nextRole === "admin") {
      setAuthMode("login");
    }
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
    setSuccess("");
    setLoading(true);

    try {
      if (isForgot) {
        await resetPassword(email, resetCode, password);
        setSuccess("Password reset ho gaya. Ab new password se login karein.");
        setAuthMode("login");
        setPassword("");
        setResetCode("");
        return;
      }

      if (isLogin || selectedRole === "admin") {
        await login(email, password, selectedRole);
      } else {
        await signup(email, password, selectedRole, { name, organization, resetCode });
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

  return (
    <main className="min-h-screen bg-transparent flex items-center justify-center px-4">

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {/* Title */}
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            💧 HydroSentinel
          </h1>
          <p className="text-center text-gray-400 text-sm mb-6">
            Water Quality Monitoring System
          </p>

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => selectRole("user")}
              className={`py-3 rounded-lg font-semibold transition-all ${
                selectedRole === "user"
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/50"
                  : "bg-slate-700 text-gray-300 hover:bg-slate-600"
              }`}
            >
              👤 User
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => selectRole("admin")}
              className={`py-3 rounded-lg font-semibold transition-all ${
                selectedRole === "admin"
                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/50"
                  : "bg-slate-700 text-gray-300 hover:bg-slate-600"
              }`}
            >
              🔐 Admin
            </motion.button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && selectedRole === "user" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Organization Type
                  </label>
                  <select
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
                  >
                    {ORGANIZATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    4 Digit Recovery Code
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    placeholder="1234"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {isForgot ? "New Password" : "Password"}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
              />
            </div>

            {isForgot && selectedRole === "user" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  4 Digit Recovery Code
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  placeholder="1234"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
                />
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-sm text-green-300">{success}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 text-white font-semibold rounded-lg transition-all"
            >
              {loading
                ? "Loading..."
                : isForgot
                ? "Reset Password"
                : isLogin || selectedRole === "admin"
                ? "Login"
                : "Sign Up"}
            </Button>
          </form>

          {/* Toggle between login and signup */}
          {selectedRole === "user" && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                {isLogin
                  ? "Don't have an account? "
                  : isForgot
                  ? "Remember password? "
                  : "Already have an account? "}
                <button
                  onClick={() => {
                    setAuthMode(isLogin ? "signup" : "login");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                >
                  {isLogin ? "Sign Up" : "Login"}
                </button>
              </p>
              {isLogin && (
                <button
                  onClick={() => {
                    setAuthMode("forgot");
                    setError("");
                    setSuccess("");
                  }}
                  className="mt-3 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </main>
  );
};

export default Login;
