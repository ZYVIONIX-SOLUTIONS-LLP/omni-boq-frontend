"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Loader2,
  Building2,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { login, register } from "../lib/api/auth";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (isSignUp) {
      try {
        await register({ username, password, firstName, lastName, companyName, email: username, phone });
        setSuccess("Registration submitted. A Super Admin will review and verify your account shortly.");
        setIsSignUp(false);
        setUsername("");
        setPassword("");
        setCompanyName("");
        setFirstName("");
        setLastName("");
        setPhone("");
      } catch (err: any) {
        console.error("Registration error:", err);
        setError(err.message || "Registration failed");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      await login({ username, password, role: "ADMIN" });
      router.push("/Dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth min-h-screen w-full flex bg-[#0A0E1A]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap");
        .admin-auth { font-family: "Inter", ui-sans-serif, system-ui, sans-serif; }
        .admin-auth .font-display { font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; }
        .admin-auth .font-mono-label { font-family: "IBM Plex Mono", ui-monospace, monospace; }
        .admin-auth input:-webkit-autofill {
          -webkit-text-fill-color: #F4F6FA;
          -webkit-box-shadow: 0 0 0px 1000px #161F38 inset;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Left rail — brand + context */}
      <aside className="hidden lg:flex lg:w-[42%] xl:w-[38%] relative flex-col justify-between overflow-hidden bg-[#0A0E1A] border-r border-[#1D2740] px-12 py-12">
        {/* subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#E9A825 1px, transparent 1px), linear-gradient(90deg, #E9A825 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div
          className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(91,141,239,0.16) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-[#E9A825] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#0A0E1A]" strokeWidth={2.5} />
          </div>
          <span className="font-display text-white text-[17px] font-semibold tracking-tight">Console</span>
        </div>

        <div className="relative z-10">
          <p className="font-mono-label text-[11px] uppercase tracking-[0.18em] text-[#5B8DEF] mb-4">
            Administrative Access
          </p>
          <h2 className="font-display text-white text-[32px] leading-[1.15] font-semibold tracking-tight mb-4">
            One workspace,
            <br />
            verified control.
          </h2>
          <p className="text-[#8B96AC] text-[15px] leading-relaxed max-w-[340px]">
            Every admin account is reviewed before activation, so only vetted operators can manage your
            organization's data.
          </p>

          {/* Signature element: verification pipeline — real, sequential content */}
          {isSignUp && (
            <div className="mt-10 flex flex-col gap-0">
              {[
                { label: "Submitted", desc: "Your details are sent for review", active: true },
                { label: "Under review", desc: "A Super Admin verifies your organization", active: false },
                { label: "Verified", desc: "Full access to the console", active: false },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${
                        step.active ? "bg-[#E9A825]" : "bg-[#26304C]"
                      }`}
                    />
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-[#1D2740] my-1" />}
                  </div>
                  <div className="pb-7">
                    <p
                      className={`font-mono-label text-[12px] uppercase tracking-wide ${
                        step.active ? "text-white" : "text-[#5B6478]"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[#6B7690] text-[13px] mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="relative z-10 text-[#4A5468] text-[12.5px]">Secured session · Encrypted in transit</p>
      </aside>

      {/* Right — form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-md bg-[#E9A825] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-[18px] h-[18px] text-[#0A0E1A]" strokeWidth={2.5} />
            </div>
            <span className="font-display text-white text-[16px] font-semibold tracking-tight">Console</span>
          </div>

          <h1 className="font-display text-white text-[26px] font-semibold tracking-tight mb-1.5">
            {isSignUp ? "Create your admin account" : "Sign in to Console"}
          </h1>
          <p className="text-[#6B7690] text-[14px] mb-8">
            {isSignUp
              ? "Register your organization for review."
              : "Enter your credentials to access the dashboard."}
          </p>

          <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
            {isSignUp && (
              <Field icon={<Building2 className="w-[17px] h-[17px]" strokeWidth={1.75} />}>
                <input
                  type="text"
                  placeholder="Company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="auth-input"
                />
              </Field>
            )}

            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <Field icon={<User className="w-[16px] h-[16px]" strokeWidth={1.75} />} compact>
                  <input
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="auth-input"
                  />
                </Field>
                <Field noIcon>
                  <input
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="auth-input px-4"
                  />
                </Field>
              </div>
            )}

            <Field icon={isSignUp ? <Mail className="w-[17px] h-[17px]" strokeWidth={1.75} /> : <User className="w-[17px] h-[17px]" strokeWidth={1.75} />}>
              <input
                type="text"
                placeholder={isSignUp ? "Email address" : "Username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="auth-input"
              />
            </Field>

            {isSignUp && (
              <Field icon={<Phone className="w-[17px] h-[17px]" strokeWidth={1.75} />}>
                <input
                  type="text"
                  placeholder="Mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="auth-input"
                />
              </Field>
            )}

            <Field icon={<Lock className="w-[17px] h-[17px]" strokeWidth={1.75} />}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
              {isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-3.5 text-[#5B6478] hover:text-[#8B96AC] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
                </button>
              )}
            </Field>

            {error && (
              <div className="rounded-md border border-red-500/25 bg-red-500/[0.08] px-3.5 py-2.5 text-[13px] text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.08] px-3.5 py-2.5 text-[13px] text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-[1px]" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group mt-2.5 h-[46px] w-full rounded-md bg-[#E9A825] text-[14px] font-semibold text-[#0A0E1A] transition-all hover:bg-[#F0B440] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Submit for review" : "Sign in"}
                  <ArrowRight className="w-[15px] h-[15px] transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 text-[13.5px] text-[#6B7690]">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button onClick={() => setIsSignUp(false)} className="text-[#E9A825] font-medium hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Need admin access?{" "}
                <button onClick={() => setIsSignUp(true)} className="text-[#E9A825] font-medium hover:underline">
                  Register your organization
                </button>
              </>
            )}
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

function Field({
  icon,
  children,
  compact,
  noIcon,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
  noIcon?: boolean;
}) {
  return (
    <div className="flex items-center h-[46px] rounded-md border border-[#26304C] bg-[#0F1424] focus-within:border-[#5B8DEF] focus-within:ring-1 focus-within:ring-[#5B8DEF]/30 transition-colors">
      {!noIcon && (
        <div className={`flex items-center justify-center shrink-0 ${compact ? "w-[40px]" : "w-[46px]"} text-[#5B6478]`}>
          {icon}
        </div>
      )}
      {children}
    </div>
  );
}