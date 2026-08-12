"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Loader2, Building2, Mail, Phone, Eye, EyeOff } from "lucide-react";
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
        setSuccess("Registration submitted! A Super Admin will review and verify your account shortly.");
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
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-[url('/Login.png')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-[#000814]/30 mix-blend-multiply pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-[380px] px-6 py-8 flex flex-col items-center">
        <h1 className="text-white text-[28px] font-bold mb-8 tracking-wide text-center">
          {isSignUp ? "Create Admin Account" : "Access Your Account"}
        </h1>

        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          
          {isSignUp && (
            <div className="flex items-center border border-slate-400/60 rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm focus-within:border-white transition-all h-[52px]">
              <div className="w-[50px] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-white/80" strokeWidth={1.5} />
              </div>
              <input
                type="text"
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full h-full bg-transparent text-[15px] outline-none text-white placeholder-white/60 font-medium"
              />
            </div>
          )}

          {isSignUp && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center border border-slate-400/60 rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm focus-within:border-white transition-all h-[52px]">
                <div className="w-[40px] flex items-center justify-center shrink-0">
                  <User className="w-[18px] h-[18px] text-white/80" strokeWidth={1.5} />
                </div>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full h-full bg-transparent text-[14px] outline-none text-white placeholder-white/60 font-medium"
                />
              </div>
              <div className="flex items-center border border-slate-400/60 rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm focus-within:border-white transition-all h-[52px]">
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full h-full bg-transparent text-[14px] outline-none text-white placeholder-white/60 font-medium px-4"
                />
              </div>
            </div>
          )}

          <div className="flex items-center border border-slate-400/60 rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm focus-within:border-white transition-all h-[52px]">
            <div className="w-[50px] flex items-center justify-center shrink-0">
              {isSignUp ? <Mail className="w-5 h-5 text-white/80" strokeWidth={1.5} /> : <User className="w-5 h-5 text-white/80" strokeWidth={1.5} />}
            </div>
            <input
              type="text"
              placeholder={isSignUp ? "Email Address" : "Username"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full h-full bg-transparent text-[15px] outline-none text-white placeholder-white/60 font-medium"
            />
          </div>

          {isSignUp && (
            <div className="flex items-center border border-slate-400/60 rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm focus-within:border-white transition-all h-[52px]">
              <div className="w-[50px] flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-white/80" strokeWidth={1.5} />
              </div>
              <input
                type="text"
                placeholder="Mobile Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full h-full bg-transparent text-[15px] outline-none text-white placeholder-white/60 font-medium"
              />
            </div>
          )}

          <div className="flex items-center border border-slate-400/60 rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm focus-within:border-white transition-all h-[52px]">
            <div className="w-[50px] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-white/80" strokeWidth={1.5} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-full bg-transparent text-[15px] outline-none text-white placeholder-white/60 font-medium"
            />
            {isSignUp && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-4 text-white/60 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-100 font-medium text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 p-3 text-sm text-emerald-100 font-medium text-center">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-[52px] w-full rounded-lg bg-[#FFC107] text-[15px] font-black text-black transition-all hover:bg-[#FFB300] disabled:opacity-50 flex items-center justify-center shadow-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isSignUp ? "REGISTER" : "LOG IN"}
          </button>
        </form>

        <div className="mt-8 text-[13.5px] font-medium text-white/70">
          {isSignUp ? (
            <>
              Already registered?{" "}
              <button onClick={() => setIsSignUp(false)} className="text-[#FFC107] font-bold hover:underline">
                Sign in here
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button onClick={() => setIsSignUp(true)} className="text-[#FFC107] font-bold hover:underline">
                Sign up as Admin
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}