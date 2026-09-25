import AppShell from "@/components/layout/app-shell";
import { MonitorX } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Mobile Block Screen */}
      <div className="flex lg:hidden flex-col items-center justify-center min-h-screen bg-slate-900 p-8 text-center">
        <div className="bg-white/10 p-6 rounded-full mb-6">
          <MonitorX className="w-16 h-16 text-amber-400" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-wide mb-3">Device Not Supported</h2>
        <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
          This software is highly complex and is not available in mobile view. Please access the admin and staff panel from a desktop or laptop device.
        </p>
      </div>
      
      {/* Desktop App Shell */}
      <div className="hidden lg:block">
        <AppShell>{children}</AppShell>
      </div>
    </>
  );
}
