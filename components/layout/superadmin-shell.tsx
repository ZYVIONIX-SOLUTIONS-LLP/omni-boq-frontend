"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AuthUser, getUser, isLoggedIn } from "@/app/lib/auth-storage";
import { logout } from "@/app/lib/api/auth";

const SIDEBAR_WIDTH = 190;
const SIDEBAR_WIDTH_COLLAPSED = 64;
const SIDEBAR_COLLAPSE_KEY = "omni.superSidebarCollapsed";

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
function ActivitiesIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
}
function UsersIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/superadmin/Dashboard", icon: <DashboardIcon /> },
  { label: "Materials", href: "/superadmin/Materials", icon: <MaterialsIcon /> },
  { label: "Activities", href: "/superadmin/Activities", icon: <ActivitiesIcon /> },
  { label: "Admins", href: "/superadmin/Admins", icon: <UsersIcon /> },
  { label: "Staff", href: "/superadmin/Staff", icon: <UsersIcon /> },
];

export default function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Editors might need flush borders
  const isEditorPage = /^\/superadmin\/(Activities|Materials)\/[^/]+$/.test(pathname);
  
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/SuperAdminLogin");
      return;
    }
    const currentUser = getUser();
    if (!currentUser || !currentUser.roles.includes("SUPERADMIN")) {
       router.replace("/SuperAdminLogin");
       return;
    }
    setUser(currentUser);
    setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1");
    setChecked(true);
  }, [router]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.replace("/SuperAdminLogin");
  };

  const activeItem = NAV_ITEMS.find((item) => pathname.startsWith(item.href)) ?? NAV_ITEMS[0];

  const displayName = user ? user.firstName || user.username : "";
  const initial = (displayName[0] ?? "S").toUpperCase();

  // Avoid flashing protected content before the auth check runs
  if (!checked) {
    return <div className="min-h-screen bg-[#f8f7ff]" />;
  }

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      {/* ═══ FIXED SIDEBAR ═══ */}
      <aside
        className="fixed left-0 top-0 z-30 h-screen bg-white border-r border-border flex flex-col py-5 transition-[width] duration-200"
        style={{ width: sidebarWidth }}
      >
        {/* Brand + collapse toggle */}
        <div className={`flex items-center mb-6 px-4 ${collapsed ? "flex-col gap-2" : "justify-between gap-2"}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/30">
              <BoltIcon />
            </div>
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <p className="text-sm font-bold text-foreground truncate">Super Admin</p>
                <p className="text-[10px] font-semibold text-primary truncate">ZYVIONIX SOLUTIONS</p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent flex-shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === activeItem.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={
                  (isActive
                    ? "bg-[#faf5ff] text-[#7e22ce] border border-purple-200 font-bold rounded-md"
                    : "text-muted-foreground hover:text-primary hover:bg-accent font-medium rounded-md border border-transparent") +
                  ` flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-all ${
                    collapsed ? "justify-center" : ""
                  }`
                }
              >
                {item.icon}
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile + logout */}
        <div className={`border-t border-border pt-4 px-3 flex ${collapsed ? "flex-col items-center gap-2" : "items-center gap-2.5"}`}>
          <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "" : "flex-1"}`}>
            <Avatar className="w-9 h-9 border border-border shadow-sm flex-shrink-0">
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Logged in as,</p>
                <p className="text-sm font-bold text-foreground leading-none truncate">{displayName}!</p>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl border-border h-9 w-9 text-muted-foreground hover:text-red-500 hover:bg-red-50/50 flex-shrink-0"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* ═══ CONTENT AREA ═══ */}
      <main
        className="min-h-screen py-0 transition-[padding] duration-200"
        style={{
          paddingLeft: isEditorPage ? sidebarWidth : `calc(${sidebarWidth}px + 1.75rem)`,
          paddingRight: isEditorPage ? 0 : "1.75rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}
