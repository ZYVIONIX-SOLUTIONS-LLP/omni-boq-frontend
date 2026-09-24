"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Loader2, Users, ArrowRight, Eye, EyeOff } from "lucide-react";
import { login } from "../lib/api/auth";

export default function StaffLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="staff-auth min-h-screen w-full flex bg-[#0A0E1A]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap");
        .staff-auth { font-family: "Inter", ui-sans-serif, system-ui, sans-serif; }
        .staff-auth .font-display { font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; }
        .staff-auth .font-mono-label { font-family: "IBM Plex Mono", ui-monospace, monospace; }
        .staff-auth input:-webkit-autofill {
          -webkit-text-fill-color: #F4F6FA;
          -webkit-box-shadow: 0 0 0px 1000px #161F38 inset;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Left rail — brand + context */}
      <aside className="hidden lg:flex lg:w-[42%] xl:w-[38%] relative flex-col justify-between overflow-hidden bg-[#0A0E1A] border-r border-[#1D2740] px-12 py-12">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#5B8DEF 1px, transparent 1px), linear-gradient(90deg, #5B8DEF 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div
          className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(233,168,37,0.14) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-[#5B8DEF] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#0A0E1A]" strokeWidth={2.5} />
          </div>
     <span className="font-display text-white text-[17px] font-semibold tracking-tight">
            Powered by Zyvionix <span className="text-[#E9A825]">Solutions</span>
          </span>         </div>

        <div className="relative z-10">
          <p className="font-mono-label text-[11px] uppercase tracking-[0.18em] text-[#5B8DEF] mb-4">
            Staff Access
          </p>
          <h2 className="font-display text-white text-[32px] leading-[1.15] font-semibold tracking-tight mb-4">
            Your site work,
            <br />
            organized.
          </h2>
          <p className="text-[#8B96AC] text-[15px] leading-relaxed max-w-[340px]">
            Build BOQs, log activity, and keep track of every quotation assigned to you, all from
            one workspace.
          </p>
        </div>

        <p className="relative z-10 text-[#4A5468] text-[12.5px]">Secured session · Encrypted in transit</p>
      </aside>

      {/* Right — form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-md bg-[#5B8DEF] flex items-center justify-center shrink-0">
              <Users className="w-[18px] h-[18px] text-[#0A0E1A]" strokeWidth={2.5} />
            </div>
     <span className="font-display text-white text-[17px] font-semibold tracking-tight">
            Powered by Zyvionix <span className="text-[#E9A825]">Solutions</span>
          </span>           </div>

          <h1 className="font-display text-white text-[26px] font-semibold tracking-tight mb-1.5">
            Sign in to Console
          </h1>
          <p className="text-[#6B7690] text-[14px] mb-8">Enter your credentials to access your workspace.</p>

          <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
            <Field icon={<User className="w-[17px] h-[17px]" strokeWidth={1.75} />}>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="auth-input"
              />
            </Field>

            <Field icon={<Lock className="w-[17px] h-[17px]" strokeWidth={1.75} />}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pr-3.5 text-[#5B6478] hover:text-[#8B96AC] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
              </button>
            </Field>

            {error && (
              <div className="rounded-md border border-red-500/25 bg-red-500/[0.08] px-3.5 py-2.5 text-[13px] text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group mt-2.5 h-[46px] w-full rounded-md bg-[#5B8DEF] text-[14px] font-semibold text-[#0A0E1A] transition-all hover:bg-[#71A0F6] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-[15px] h-[15px] transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 text-[13.5px] text-[#6B7690]">
            Not staff?{" "}
            <button onClick={() => router.push("/Login")} className="text-[#5B8DEF] font-medium hover:underline">
              Go to admin sign in
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        .auth-input {
          width: 100%;
          height: 100%;
          background: transparent;
          outline: none;
          color: #f4f6fa;
          font-size: 14.5px;
          font-weight: 450;
        }
        .auth-input::placeholder {
          color: #5b6478;
        }
      `}</style>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center h-[46px] rounded-md border border-[#26304C] bg-[#0F1424] focus-within:border-[#5B8DEF] focus-within:ring-1 focus-within:ring-[#5B8DEF]/30 transition-colors">
      <div className="flex items-center justify-center shrink-0 w-[46px] text-[#5B6478]">{icon}</div>
      {children}
    </div>
  );
}