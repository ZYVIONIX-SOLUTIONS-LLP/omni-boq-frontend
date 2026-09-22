"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isLoggedIn } from "./lib/auth-storage";
import {
  Loader2,
  ArrowRight,
  ShieldCheck,
  Users,
  FileText,
  Calculator,
  Printer,
  Target,
  Clock,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoggedIn()) {
      const user = getUser();
      if (user?.roles?.includes("SUPERADMIN")) {
        router.replace("/superadmin/Dashboard");
      } else {
        router.replace("/Dashboard");
      }
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0E1A]">
        <Loader2 className="h-8 w-8 animate-spin text-[#E9A825]" />
      </div>
    );
  }

  return (
    <div className="landing min-h-screen w-full bg-[#0A0E1A] flex flex-col">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap");
        .landing { font-family: "Inter", ui-sans-serif, system-ui, sans-serif; }
        .landing .font-display { font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; }
        .landing .font-mono-label { font-family: "IBM Plex Mono", ui-monospace, monospace; }
      `}</style>

      {/* Background texture, shared with the login screen */}
      <div
        className="fixed inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#E9A825 1px, transparent 1px), linear-gradient(90deg, #E9A825 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div
        className="fixed -top-32 -right-32 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(91,141,239,0.14) 0%, transparent 70%)" }}
      />
      <div
        className="fixed bottom-[-10%] left-[-8%] w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(233,168,37,0.08) 0%, transparent 70%)" }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-6 w-full border-b border-[#1D2740]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-[#E9A825] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#0A0E1A]" strokeWidth={2.5} />
          </div>
          <span className="font-display text-white text-[17px] font-semibold tracking-tight">
            Powered by Zyvionix <span className="text-[#E9A825]">Solutions</span>
          </span>
        </div>
        <p className="hidden sm:block font-mono-label text-[11px] uppercase tracking-[0.18em] text-[#5B8DEF]">
          Electrical Estimation & BOQ Platform
        </p>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-stretch w-full">
        {/* Left: pitch */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-14 lg:py-0 lg:w-[52%]">
          <p className="font-mono-label text-[11px] uppercase tracking-[0.18em] text-[#5B8DEF] mb-4">
            Built for contractors & estimators
          </p>
          <h1 className="font-display text-white text-[38px] lg:text-[48px] font-semibold tracking-tight leading-[1.12] mb-5">
            Estimate faster.
            <br />
            Quote with confidence.
          </h1>
          <p className="text-[#8B96AC] text-[15.5px] leading-relaxed max-w-[420px] mb-10">
            Build accurate BOQs, keep materials and labour rates current, and turn them into
            professional quotations — all in one workspace built for how electrical projects
            actually get costed.
          </p>

          <div className="flex flex-wrap gap-8">
            {[
              { icon: Target, title: "Accurate", desc: "Precise costing, every time" },
              { icon: Clock, title: "Fast", desc: "Minutes, not hours" },
              { icon: FileText, title: "Professional", desc: "Client-ready quotations" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 max-w-[160px]">
                <div className="w-9 h-9 rounded-md bg-[#0F1424] border border-[#26304C] flex items-center justify-center shrink-0 text-[#E9A825]">
                  <item.icon className="w-4 h-4" strokeWidth={1.9} />
                </div>
                <div>
                  <p className="text-white text-[13px] font-semibold">{item.title}</p>
                  <p className="text-[#6B7690] text-[12px] leading-snug mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: two access paths */}
        <div className="flex flex-col justify-center gap-5 px-8 lg:px-16 py-14 lg:py-0 lg:w-[48%] bg-[#0A0E1A] lg:border-l border-[#1D2740]">
          <p className="font-mono-label text-[11px] uppercase tracking-[0.18em] text-[#5B6478] mb-1">
            Sign in as
          </p>

          <AccessCard
            icon={<ShieldCheck className="w-5 h-5" strokeWidth={2} />}
            title="Admin"
            desc="Manage quotations, materials, rates, and your organization's workspace."
            accent="amber"
            onClick={() => router.push("/Login")}
          />

          <AccessCard
            icon={<Users className="w-5 h-5" strokeWidth={2} />}
            title="Staff"
            desc="Build BOQs, log site activity, and track assigned quotations."
            accent="blue"
            onClick={() => router.push("/StaffLogin")}
          />

          {/* <p className="text-[#4A5468] text-[12.5px] mt-2">
            New organization?{" "}
            <button
              onClick={() => router.push("/Login")}
              className="text-[#E9A825] font-medium hover:underline"
            >
              Register for review
            </button>
          </p> */}
        </div>
      </main>

      {/* Footer feature callouts */}
      <footer className="relative z-10 border-t border-[#1D2740] w-full py-6 px-8 lg:px-12 flex flex-wrap items-start justify-center gap-x-10 gap-y-5">
        {[
          { icon: FileText, title: "BOQ made easy", desc: "Materials, labour & overheads in one place" },
          { icon: ShieldCheck, title: "Real-time costing", desc: "Rates stay current across every quote" },
          { icon: Calculator, title: "Smart calculations", desc: "Totals, taxes & margins, handled" },
          { icon: Printer, title: "Client-ready output", desc: "Export a polished quotation in one click" },
        ].map((feat) => (
          <div key={feat.title} className="flex items-start gap-3 max-w-[220px]">
            <div className="w-8 h-8 shrink-0 rounded-md border border-[#26304C] bg-[#0F1424] text-[#5B8DEF] flex items-center justify-center">
              <feat.icon className="h-4 w-4" strokeWidth={1.9} />
            </div>
            <div>
              <p className="text-white text-[12px] font-semibold">{feat.title}</p>
              <p className="text-[#6B7690] text-[11px] leading-snug mt-0.5">{feat.desc}</p>
            </div>
          </div>
        ))}
      </footer>
    </div>
  );
}

function AccessCard({
  icon,
  title,
  desc,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: "amber" | "blue";
  onClick: () => void;
}) {
  const accentColor = accent === "amber" ? "#E9A825" : "#5B8DEF";
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 w-full text-left rounded-lg border border-[#26304C] bg-[#0F1424] px-5 py-5 transition-colors hover:border-[color:var(--ac)]"
      style={{ "--ac": accentColor } as React.CSSProperties}
    >
      <div
        className="w-11 h-11 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-display text-white text-[15px] font-semibold tracking-tight">{title}</p>
        <p className="text-[#6B7690] text-[12.5px] leading-snug mt-0.5">{desc}</p>
      </div>
      <ArrowRight
        className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1"
        style={{ color: accentColor }}
      />
    </button>
  );
}