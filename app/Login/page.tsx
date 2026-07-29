"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Sun, Moon, Eye, EyeOff, ChevronRight, User, ShieldCheck, Building2 } from "lucide-react";
import { login, register } from "../lib/api/auth";

const ROLES = [
  {
    id: "staff",
    label: "Staff",
    icon: User,
    tagline: "Access your daily tasks and schedule.",
  },
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    tagline: "Manage teams, projects, and permissions.",
  },
];

export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState("staff");
  const [theme, setTheme] = useState("light");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const isDark = theme === "dark";
  const activeRole = ROLES.find((r) => r.id === role) ?? ROLES[0];
  const ActiveIcon = activeRole.icon;

  const [username, setUsername] = useState(""); // Also used for email in signup
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) {
      setTheme("dark");
    }
  }, []);

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted. isSignUp:", isSignUp);
    setLoading(true);
    setError("");
    setSuccess("");

    if (isSignUp) {
      // Handle Sign Up
      console.log("Attempting to register with:", { username, firstName, lastName, companyName });
      try {
        await register({ username, password, firstName, lastName, companyName });
        console.log("Registration successful");
        setSuccess("Registration submitted! A Super Admin will review and verify your account shortly.");
        setLoading(false);
        setIsSignUp(false);
        setUsername("");
        setPassword("");
        setCompanyName("");
        setFirstName("");
        setLastName("");
      } catch (err: any) {
        console.error("Registration error:", err);
        setError(err.message || "Registration failed");
        setLoading(false);
      }
      return;
    }

    // Handle Login
    console.log("Attempting to login with role:", role);
    try {
      await login({ username, password, role: role.toUpperCase() as "STAFF" | "ADMIN" });
      console.log("Login successful");
      router.push("/Dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 md:p-8 transition-colors duration-300 ${isDark ? "bg-[#050B14]" : "bg-zinc-100"}`}>
      <div
        className={`relative w-full max-w-5xl overflow-hidden rounded-[36px] shadow-2xl flex flex-col md:flex-row transition-colors duration-300 ${isDark ? "bg-[#0A1020] border border-white/5" : "bg-white border border-zinc-200/50"}`}
        style={{ minHeight: "640px" }}
      >
        {/* Intense Cyan glowing edge on the left */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#1E88FF]/0 via-[#00C8FF] to-[#1E88FF]/0 shadow-[0_0_20px_4px_rgba(0,200,255,0.7)] z-20 pointer-events-none" />

        {/* ---------- Left: Branding Panel ---------- */}
        <div className="relative hidden md:flex w-[42%] shrink-0 flex-col items-center justify-center px-10 py-12 text-center bg-gradient-to-br from-[#050B1E] via-[#081A3A] to-[#0D2B6B] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,136,255,0.1)_0%,transparent_70%)]" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Custom Logo Image */}
          <div className="relative mb-8 flex h-32 w-48 items-center justify-center z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
             <img src="/logo.png" alt="Zyvionix Logo" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>

          <h2 className="text-[28px] font-sans tracking-tight flex items-center justify-center whitespace-nowrap z-10">
            <span className="text-white font-extrabold tracking-tight">Zyvionix</span>
            <span className="text-[#00C8FF] font-light tracking-tight">Solutions</span>
          </h2>
          
          <p className="mt-4 max-w-[260px] text-[13px] leading-relaxed text-[#8BA4D5] font-medium z-10">
            One workspace to plan, track, and run every team. Built for the way you work.
          </p>
        </div>

        {/* ---------- Right: Login Form Panel ---------- */}
        <div className="relative flex flex-1 items-center justify-center px-8 py-10 md:px-14">
          
          <div className="absolute top-6 right-6 z-20">
            <div className={`flex items-center rounded-full p-1 text-[11px] font-semibold shadow-sm transition-colors ${isDark ? "bg-[#1E1B33]/80 border border-white/5" : "bg-zinc-200/60 border border-zinc-300"}`}>
              <button
                type="button"
                onClick={() => toggleTheme("light")}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all ${!isDark ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-white"}`}
              >
                <Sun className="h-3.5 w-3.5" /> Light
              </button>
              <button
                type="button"
                onClick={() => toggleTheme("dark")}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all ${isDark ? "bg-[#2A2552] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
              >
                <Moon className="h-3.5 w-3.5" /> Dark
              </button>
            </div>
          </div>

          <div className="w-full max-w-[380px] z-10">
            <div className="mb-6 flex flex-col items-start text-left">
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                {isSignUp ? "Create Admin Account" : "Welcome back"}
              </h1>
              <p className={`mt-1 text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                {isSignUp ? "Register your company to get started." : "Sign in to continue to your workspace."}
              </p>
            </div>

            {/* Role selector (Hide on Sign Up) */}
            {!isSignUp && (
              <>
                <div className={`grid grid-cols-2 gap-1.5 rounded-xl p-1 mb-2 ${isDark ? "bg-[#1E1B33]/50" : "bg-zinc-100"}`}>
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const active = role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg py-3 text-[12px] font-bold leading-tight transition-all ${
                          active
                            ? "bg-gradient-to-br from-[#1E88FF] to-[#00C8FF] text-white shadow-[0_4px_12px_rgba(0,200,255,0.25)]"
                            : isDark
                              ? "text-zinc-400 hover:text-white hover:bg-white/5"
                              : "text-zinc-500 hover:text-zinc-900 hover:bg-white"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                <p className={`mb-6 flex items-center gap-1 text-[11px] font-medium ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                  <ActiveIcon className="h-3 w-3" />
                  {activeRole.tagline}
                </p>
              </>
            )}

            {/* Form */}
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              
              {isSignUp && (
                <div>
                  <div className={`flex items-center gap-2.5 rounded-xl border px-4 h-[52px] transition-all ${isDark ? "border-white/10 bg-[#12182B] focus-within:border-[#1E88FF] focus-within:bg-[#1A2235]" : "border-zinc-300 bg-white focus-within:border-[#1E88FF] focus-within:ring-2 focus-within:ring-[#1E88FF]/20"}`}>
                    <Building2 className={`h-4.5 w-4.5 shrink-0 ${isDark ? "text-zinc-500" : "text-zinc-400"}`} />
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      className={`w-full bg-transparent text-[15px] outline-none font-medium ${isDark ? "text-white placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"}`}
                    />
                  </div>
                </div>
              )}

              {isSignUp && (
                <div className="grid grid-cols-2 gap-3">
                  <div className={`flex items-center gap-2.5 rounded-xl border px-4 h-[52px] transition-all ${isDark ? "border-white/10 bg-[#12182B] focus-within:border-[#1E88FF] focus-within:bg-[#1A2235]" : "border-zinc-300 bg-white focus-within:border-[#1E88FF] focus-within:ring-2 focus-within:ring-[#1E88FF]/20"}`}>
                    <User className={`h-4.5 w-4.5 shrink-0 ${isDark ? "text-zinc-500" : "text-zinc-400"}`} />
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className={`w-full bg-transparent text-[15px] outline-none font-medium ${isDark ? "text-white placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"}`}
                    />
                  </div>
                  <div className={`flex items-center gap-2.5 rounded-xl border px-4 h-[52px] transition-all ${isDark ? "border-white/10 bg-[#12182B] focus-within:border-[#1E88FF] focus-within:bg-[#1A2235]" : "border-zinc-300 bg-white focus-within:border-[#1E88FF] focus-within:ring-2 focus-within:ring-[#1E88FF]/20"}`}>
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className={`w-full bg-transparent text-[15px] outline-none font-medium ${isDark ? "text-white placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"}`}
                    />
                  </div>
                </div>
              )}

              <div>
                <div className={`flex items-center gap-2.5 rounded-xl border px-4 h-[52px] transition-all ${isDark ? "border-white/10 bg-[#12182B] focus-within:border-[#1E88FF] focus-within:bg-[#1A2235]" : "border-zinc-300 bg-white focus-within:border-[#1E88FF] focus-within:ring-2 focus-within:ring-[#1E88FF]/20"}`}>
                  <Mail className={`h-4.5 w-4.5 shrink-0 ${isDark ? "text-zinc-500" : "text-zinc-400"}`} />
                  <input
                    type="text"
                    placeholder={isSignUp ? "Email Address" : "User Name"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={`w-full bg-transparent text-[15px] outline-none font-medium ${isDark ? "text-white placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"}`}
                  />
                </div>
              </div>

              <div>
                <div className={`flex items-center gap-2.5 rounded-xl border px-4 h-[52px] transition-all ${isDark ? "border-white/10 bg-[#12182B] focus-within:border-[#1E88FF] focus-within:bg-[#1A2235]" : "border-zinc-300 bg-white focus-within:border-[#1E88FF] focus-within:ring-2 focus-within:ring-[#1E88FF]/20"}`}>
                  <Lock className={`h-4.5 w-4.5 shrink-0 ${isDark ? "text-zinc-500" : "text-zinc-400"}`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`w-full bg-transparent text-[15px] outline-none font-medium ${isDark ? "text-white placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className={`${isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"} transition-colors`}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500 font-medium">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500 font-medium">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E88FF] to-[#00C8FF] text-[15px] font-bold text-white transition-all hover:shadow-[0_0_16px_rgba(0,200,255,0.4)] disabled:opacity-50"
              >
                {loading ? (isSignUp ? "SUBMITTING..." : "AUTHENTICATING...") : (isSignUp ? "REQUEST ACCESS" : `LOGIN AS ${activeRole.label.toUpperCase()}`)}
                {!loading && <ChevronRight className="h-4.5 w-4.5" />}
              </button>
            </form>

            {/* Admin Signup Toggle */}
            <div className="mt-6 flex justify-center text-[13px] font-medium">
              {isSignUp ? (
                <span className={isDark ? "text-zinc-400" : "text-zinc-500"}>
                  Already registered?{" "}
                  <button onClick={() => setIsSignUp(false)} className="text-[#1E88FF] hover:underline">
                    Sign in here
                  </button>
                </span>
              ) : role === "admin" && (
                <span className={isDark ? "text-zinc-400" : "text-zinc-500"}>
                  Don't have an account?{" "}
                  <button onClick={() => setIsSignUp(true)} className="text-[#1E88FF] hover:underline">
                    Sign up as Admin
                  </button>
                </span>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}