"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {  ArrowLeft, LogOut, PanelLeftClose, PanelLeftOpen , Layers, Factory, Plus } from "lucide-react"; // force reload

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AuthUser, getUser, isLoggedIn } from "@/app/lib/auth-storage";
import { logout } from "@/app/lib/api/auth";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification } from "@/app/lib/api/notifications";

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
  { label: "Quotations", href: "/Quotations", icon: <QuotationsIcon /> },
  // { label: "Projects", href: "/Projects", icon: <ProjectsIcon /> },
  { label: "Staff", href: "/Staff/list", icon: <UsersIcon /> },
  { label: "Company", href: "/Company/information", icon: <SettingsIcon /> },
];

// Contextual sub-menu items when inside Projects / Quotations workspace

const STAFF_NAV_ITEMS = [
  { label: "Staff List", href: "/Staff/list", icon: <UsersIcon /> },
  { label: "Create New Staff", href: "/Staff/create", icon: <Plus size={16} /> },
];

const COMPANY_NAV_ITEMS = [
  { label: "Company Information", href: "/Company/information", icon: <SettingsIcon /> },
  { label: "Documents", href: "/Company/documents", icon: <Layers size={16} /> },
];

const WORKSPACE_NAV_ITEMS = [
  { label: "Quotations", href: "/Quotations", icon: <QuotationsIcon /> },
  { label: "Materials", href: "/Materials", icon: <MaterialsIcon /> },
  { label: "Activities", href: "/Activities", icon: <ActivitiesIcon /> },
  { label: "Categories", href: "/Materials/categories", icon: <Layers size={16} /> },
  { label: "Manufacturers", href: "/Materials/manufacturers", icon: <Factory size={16} /> },
];

function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors outline-none">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto p-0 rounded-lg shadow-xl border-slate-200">
        <div className="sticky top-0 bg-white border-b border-slate-100 p-3 flex items-center justify-between z-10">
          <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
          {unreadCount > 0 && (
            <button onClick={handleReadAll} className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 uppercase tracking-wide">
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-medium">No notifications yet</div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) handleRead(n.id);
                }}
                className={`p-3 border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${
                  n.isRead ? "bg-white opacity-60 hover:bg-slate-50" : "bg-blue-50/40 hover:bg-blue-50/80"
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h5 className={`text-xs font-bold ${n.isRead ? "text-slate-700" : "text-blue-900"}`}>{n.title}</h5>
                  {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1" />}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{n.message}</p>
                <span className="text-[9px] text-slate-400 mt-1.5 block font-medium uppercase">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isEditorPage = /^\/(Quotations|Activities|Materials)\/[^/]+$/.test(pathname);

  // Check if we are inside the Workspace context
  const isWorkspaceContext = /^\/(Quotations|Projects|Materials|Activities)($|\/)/.test(pathname);
  const isCompanyContext = /^\/(Company)($|\/)/.test(pathname);
  const isStaffContext = /^\/(Staff)($|\/)/.test(pathname);

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
    if (isCompanyContext) {
      return COMPANY_NAV_ITEMS;
    }
    if (isStaffContext) {
      return STAFF_NAV_ITEMS;
    }

    if (role === "ADMIN") {
      return MAIN_NAV_ITEMS;
    }
    // Staff sees Dashboard, Quotations & Projects
    return MAIN_NAV_ITEMS.filter((item) => item.label !== "Staff" && item.label !== "Company");
  }, [user, isWorkspaceContext, isCompanyContext, isStaffContext]);

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
          backgroundColor: "#163848", borderRight: "none",
          display: isFullscreen ? "none" : undefined,
        }}
      >
        {/* Brand + collapse toggle */}
        <div className={`flex items-center mb-4 px-4 ${collapsed ? "flex-col gap-2" : "justify-between gap-2"}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
      <img
  src="/logo.png"
  alt="Omni Logo"
  className="w-full h-full object-contain rounded-full"
/>
            </div>
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <p className="text-sm font-bold truncate text-white">
                  Omni
                </p>
                <p className="text-[10px] font-semibold truncate text-[#D4B86A]">
                  Electrics
                </p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-7 w-7 rounded-lg flex-shrink-0 text-slate-300"
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

        {/* Section Heading Badge & Back Button */}
        {!collapsed && (
          <div className="px-4 mb-2 flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {(isWorkspaceContext || isCompanyContext || isStaffContext) ? "Sub Menu" : "Main Navigation"}
            </p>
          </div>
        )}
        
        {/* Back to Main Menu Button */}
        {(isWorkspaceContext || isCompanyContext || isStaffContext) && (
          <div className="px-3 mb-4">
            <Link
              href="/Dashboard"
              title={collapsed ? "Back to Main Menu" : undefined}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all rounded-md"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Back to Main Menu</span>}
            </Link>
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
                    ? "font-bold rounded-md border-transparent"
                    : "font-medium rounded-md border border-transparent"
                } ${collapsed ? "justify-center" : ""}`}
                style={
                  isActive
                    ? { backgroundColor: "transparent", color: "#D4B86A" }
                    : { color: "#FFFFFF" }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
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
          style={{ borderTop: `1px solid rgba(255,255,255,0.1)` }}
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
                <p className="text-[11px] leading-none mb-0.5" className="text-slate-300">
                  Welcome back,
                </p>
                <p className="text-sm font-bold leading-none truncate" className="text-white">
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
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "#ffffff" }}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* ═══ CONTENT AREA ═══ */}
      
      {/* Top Navbar */}
      {!isFullscreen && (
        <header
          className="fixed top-0 right-0 h-[70px] z-20 flex items-center justify-between px-8 shadow-sm transition-[left] duration-200"
          style={{
            left: sidebarWidth,
            backgroundColor: "#163848",
          }}
        >
          <h1 className="text-xl font-bold text-white tracking-tight">{pathname === "/Dashboard" ? "Dashboard" : visibleNavItems.find(i => pathname.startsWith(i.href))?.label || "Workspace"}</h1>
          <NotificationBell />
        </header>
      )}
      <main
        className="min-h-screen pt-[100px] pb-8 transition-[padding] duration-200 print:!px-0 print:!pt-0"
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