"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AuthUser, getUser, isLoggedIn } from "@/app/lib/auth-storage";
import { logout } from "@/app/lib/api/auth";

const SIDEBAR_WIDTH = 190;
const NAVBAR_HEIGHT = 68;

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
    </svg>
  );
}
function DashboardIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
}
function MaterialsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
}
function QuotationsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
}
function SettingsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/Dashboard", icon: <DashboardIcon /> },
  { label: "Materials", href: "/Materials", icon: <MaterialsIcon /> },
  { label: "Quotations", href: "/Quotations", icon: <QuotationsIcon /> },
  { label: "Settings", href: "/Settings", icon: <SettingsIcon /> },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/Login");
      return;
    }
    setUser(getUser());
    setChecked(true);
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.replace("/Login");
  };

  // Avoid flashing protected content before the auth check runs
  if (!checked) {
    return <div className="min-h-screen bg-[#f8f7ff]" />;
  }

  const activeItem =
    NAV_ITEMS.find((item) => pathname.startsWith(item.href)) ?? NAV_ITEMS[0];
  const displayName = user ? user.firstName || user.username : "";
  const initial = (displayName[0] ?? "U").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      {/* ═══ FIXED SIDEBAR ═══ */}
      <aside
        className="fixed left-0 top-0 z-30 h-screen bg-white border-r border-border flex flex-col py-7 px-4"
        style={{ width: SIDEBAR_WIDTH }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8 px-1">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/30">
            <BoltIcon />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground">Zyvionix</p>
            <p className="text-xs font-semibold text-primary">solutions</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === activeItem.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={
                  isActive
                    ? "flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-sm font-semibold bg-primary text-white shadow-md shadow-primary/25 transition-all"
                    : "flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-accent font-medium transition-all"
                }
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ═══ FIXED NAVBAR ═══ */}
      <header
        className="fixed top-0 right-0 z-20 flex items-center justify-between px-7 bg-white border-b border-border gap-4"
        style={{ left: SIDEBAR_WIDTH, height: NAVBAR_HEIGHT }}
      >
        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {activeItem.label}
        </h1>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-muted-foreground leading-none mb-0.5">
              Welcome back,
            </p>
            <p className="text-sm font-bold text-foreground leading-none">
              {displayName}!
            </p>
          </div>

          <Avatar className="w-9 h-9 border-2 border-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-[#a5a0f5] to-primary text-white text-sm font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>

          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-9 h-9 rounded-full border-border text-muted-foreground hover:text-red-500 hover:border-red-300"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <main
        className="min-h-screen"
        style={{ paddingLeft: SIDEBAR_WIDTH, paddingTop: NAVBAR_HEIGHT }}
      >
        {children}
      </main>
    </div>
  );
}
