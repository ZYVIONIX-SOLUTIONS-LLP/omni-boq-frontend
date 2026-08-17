"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AuthUser, getUser, isLoggedIn } from "@/app/lib/auth-storage";
import { logout } from "@/app/lib/api/auth";

const SIDEBAR_WIDTH = 200;
const SIDEBAR_WIDTH_COLLAPSED = 64;
const SIDEBAR_COLLAPSE_KEY = "omni.sidebarCollapsed";

const THEME = {
  canvas: "#F8F7FA",
  surface: "#FFFFFF",
  ink: "#1D1929",
  muted: "#6A6282",
  deepwater: "#7C3AED",
  deepwaterDark: "#5B21B6",
  voltage: "#F59E0B",
  hairline: "#E9E5F2",
  hoverTint: "#F3F0FA",
};

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function QuotationsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
function ProjectsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function MaterialsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function ActivitiesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Top-level main menu items
const MAIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/Dashboard", icon: <DashboardIcon /> },
  { label: "Projects & Quatations", href: "/Quotations", icon: <QuotationsIcon /> },
  // { label: "Projects", href: "/Projects", icon: <ProjectsIcon /> },
  { label: "Staff", href: "/Staff", icon: <UsersIcon /> },
  { label: "Settings", href: "/Settings", icon: <SettingsIcon /> },
];

// Contextual sub-menu items when inside Projects / Quotations workspace
const WORKSPACE_NAV_ITEMS = [
  { label: "Quotations", href: "/Quotations", icon: <QuotationsIcon /> },
  { label: "Projects", href: "/Projects", icon: <ProjectsIcon /> },
  { label: "Materials", href: "/Materials", icon: <MaterialsIcon /> },
  { label: "Activities", href: "/Activities", icon: <ActivitiesIcon /> },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isEditorPage = /^\/(Quotations|Activities|Materials)\/[^/]+$/.test(pathname);

  // Check if we are inside the Workspace context
  const isWorkspaceContext = /^\/(Quotations|Projects|Materials|Activities)($|\/)/.test(pathname);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/Login");
      return;
    }
    const currentUser = getUser();
    if (!currentUser || currentUser.roles.includes("SUPERADMIN")) {
      router.replace("/SuperAdminLogin");
      return;
    }
    setUser(currentUser);
    setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1");
    setChecked(true);

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
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
    router.replace("/Login");
  };

  // Determine current active nav items based on mode
  const visibleNavItems = useMemo(() => {
    if (!user) return [];
    const role = user.roles && user.roles[0] ? user.roles[0] : "";

    if (isWorkspaceContext) {
      return WORKSPACE_NAV_ITEMS;
    }

    if (role === "ADMIN") {
      return MAIN_NAV_ITEMS;
    }
    // Staff sees Dashboard, Quotations & Projects
    return MAIN_NAV_ITEMS.filter((item) => item.label !== "Staff" && item.label !== "Settings");
  }, [user, isWorkspaceContext]);

  const displayName = user ? user.firstName || user.username : "";
  const initial = (displayName[0] ?? "U").toUpperCase();

  if (!checked) {
    return <div className="min-h-screen" style={{ backgroundColor: THEME.canvas }} />;
  }

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.canvas }}>
      {/* ═══ FIXED SIDEBAR ═══ */}
      <aside
        className={`fixed left-0 top-0 z-30 h-screen flex flex-col py-5 transition-[width] duration-200 print:hidden ${
          isFullscreen ? "!hidden" : ""
        }`}
        style={{
          width: sidebarWidth,
          backgroundColor: THEME.surface,
          borderRight: `1px solid ${THEME.hairline}`,
          display: isFullscreen ? "none" : undefined,
        }}
      >
        {/* Brand + collapse toggle */}
        <div className={`flex items-center mb-4 px-4 ${collapsed ? "flex-col gap-2" : "justify-between gap-2"}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <img
                src="/Untitled - July 10, 2026 at 16.11.37.png"
                alt="Zyvionix Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: THEME.ink }}>
                  Zyvionix
                </p>
                <p className="text-[10px] font-semibold truncate" style={{ color: THEME.deepwater }}>
                  Solutions
                </p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-7 w-7 rounded-lg flex-shrink-0"
            style={{ color: THEME.muted }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {/* Back to Main button if in Workspace Context */}
        {isWorkspaceContext && (
          <div className="px-3 mb-3">
            <Link
              href="/Dashboard"
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold rounded-lg border border-purple-200/80 bg-purple-50/80 text-purple-700 hover:bg-purple-100 transition-colors shadow-2xs"
              title="Return to Main Menu"
            >
              <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
              {!collapsed && <span>Main Menu</span>}
            </Link>
          </div>
        )}

        {/* Section Heading Badge */}
        {!collapsed && (
          <div className="px-4 mb-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {isWorkspaceContext ? "Workspace Menu" : "Main Navigation"}
            </p>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex flex-col gap-0.5 flex-1 px-3">
          {visibleNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-xs transition-all ${
                  isActive
                    ? "font-bold rounded-md border border-purple-200"
                    : "font-medium rounded-md border border-transparent"
                } ${collapsed ? "justify-center" : ""}`}
                style={
                  isActive
                    ? { backgroundColor: "#faf5ff", color: "#7e22ce" }
                    : { color: THEME.muted }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = THEME.hoverTint;
                    e.currentTarget.style.color = THEME.deepwater;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = THEME.muted;
                  }
                }}
              >
                {item.icon}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User profile + logout */}
        <div
          className={`pt-4 px-3 flex ${collapsed ? "flex-col items-center gap-2" : "items-center gap-2.5"}`}
          style={{ borderTop: `1px solid ${THEME.hairline}` }}
        >
          <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "" : "flex-1"}`}>
            <Avatar className="w-9 h-9 shadow-sm flex-shrink-0" style={{ border: `1px solid THEME.hairline` }}>
              <AvatarFallback
                className="text-xs font-bold"
                style={{ backgroundColor: `${THEME.deepwater}14`, color: THEME.deepwater }}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <p className="text-[11px] leading-none mb-0.5" style={{ color: THEME.muted }}>
                  Welcome back,
                </p>
                <p className="text-sm font-bold leading-none truncate" style={{ color: THEME.ink }}>
                  {displayName}!
                </p>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl h-9 w-9 flex-shrink-0 hover:text-red-500 hover:bg-red-50/50"
            style={{ borderColor: THEME.hairline, color: THEME.muted }}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* ═══ CONTENT AREA ═══ */}
      <main
        className="min-h-screen py-0 transition-[padding] duration-200 print:!px-0 print:!pt-0"
        style={{
          paddingLeft: isFullscreen ? 0 : isEditorPage ? sidebarWidth : `calc(${sidebarWidth}px + 1.75rem)`,
          paddingRight: isFullscreen ? 0 : isEditorPage ? 0 : "1.75rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}