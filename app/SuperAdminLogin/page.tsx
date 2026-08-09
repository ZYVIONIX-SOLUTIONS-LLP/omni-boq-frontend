"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Sun, Moon, Eye, EyeOff, ChevronRight, Crown } from "lucide-react";
import { login } from "../lib/api/auth";

export default function SuperAdminLogin() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const isDark = false;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ username, password, role: "SUPERADMIN" });
      router.push("/superadmin/Dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
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

        {/* ---------- Left: Branding Panel (Always Dark/Luxury) ---------- */}
        <div className="relative hidden md:flex w-[42%] shrink-0 flex-col items-center justify-center px-10 py-12 text-center bg-gradient-to-br from-[#050B1E] via-[#081A3A] to-[#0D2B6B] overflow-hidden">
          {/* Subtle glowing particles & grid */}
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
          
          <div className="w-full max-w-[380px] z-10">
            <div className="mb-6 flex flex-col items-start text-left">
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                Super Admin Login
              </h1>
              <p className={`mt-1 text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Sign in to the system owner portal.
              </p>
            </div>

            {/* Form */}
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div>
                <div className={`flex items-center gap-2.5 rounded-xl border px-4 h-[52px] transition-all ${isDark ? "border-white/10 bg-[#12182B] focus-within:border-[#1E88FF] focus-within:bg-[#1A2235]" : "border-zinc-300 bg-white focus-within:border-[#1E88FF] focus-within:ring-2 focus-within:ring-[#1E88FF]/20"}`}>
                  <Mail className={`h-4.5 w-4.5 shrink-0 ${isDark ? "text-zinc-500" : "text-zinc-400"}`} />
                  <input
                    type="text"
                    placeholder="User Name"
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

              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E88FF] to-[#00C8FF] text-[15px] font-bold text-white transition-all hover:shadow-[0_0_16px_rgba(0,200,255,0.4)] disabled:opacity-50"
              >
                {loading ? "AUTHENTICATING..." : "LOGIN AS SUPER ADMIN"}
                {!loading && <ChevronRight className="h-4.5 w-4.5" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
