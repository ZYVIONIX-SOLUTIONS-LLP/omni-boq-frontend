"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Loader2 } from "lucide-react";
import { login } from "../lib/api/auth";

export default function StaffLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login({ username, password, role: "STAFF" });
      router.push("/Dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-[url('/Login.png')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-[#000814]/30 mix-blend-multiply pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-[360px] px-6 py-8 flex flex-col items-center">
        <h1 className="text-white text-[28px] font-bold mb-8 tracking-wide">
          Access Your Account
        </h1>

        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          
          <div className="flex items-center border border-slate-400/60 rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm focus-within:border-white transition-all h-[52px]">
            <div className="w-[50px] flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-white/80" strokeWidth={1.5} />
            </div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full h-full bg-transparent text-[15px] outline-none text-white placeholder-white/60 font-medium"
            />
          </div>

          <div className="flex items-center border border-slate-400/60 rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm focus-within:border-white transition-all h-[52px]">
            <div className="w-[50px] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-white/80" strokeWidth={1.5} />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-full bg-transparent text-[15px] outline-none text-white placeholder-white/60 font-medium"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-100 font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-[52px] w-full rounded-lg bg-[#FFC107] text-[15px] font-black text-black transition-all hover:bg-[#FFB300] disabled:opacity-50 flex items-center justify-center shadow-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "LOG IN"}
          </button>
        </form>
      </div>
    </div>
  );
}
