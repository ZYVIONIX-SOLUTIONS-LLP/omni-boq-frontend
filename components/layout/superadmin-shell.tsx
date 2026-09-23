"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUser, AuthUser, logout } from "@/app/lib/auth-storage";
import { LogOut, LayoutDashboard, Package, Briefcase, FileText, Activity, Users, ShieldCheck, Settings, Search, Bell, Moon, Sun } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/superadmin/Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Materials", href: "/superadmin/Materials", icon: <Package className="w-4 h-4" /> },
  { label: "Projects", href: "/Projects", icon: <Briefcase className="w-4 h-4" /> },
  { label: "Quotations", href: "/Quotations", icon: <FileText className="w-4 h-4" /> },
  { label: "Activities", href: "/superadmin/Activities", icon: <Activity className="w-4 h-4" /> },
  { label: "Staff", href: "/superadmin/Staff", icon: <Users className="w-4 h-4" /> },
  { label: "Admins", href: "/superadmin/Admins", icon: <ShieldCheck className="w-4 h-4" /> },
  { label: "Settings", href: "/Settings", icon: <Settings className="w-4 h-4" /> },
];

export default function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
       router.replace("/SuperAdminLogin");
       return;
    }
    setUser(currentUser);
    setChecked(true);
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.replace("/SuperAdminLogin");
  };

  const activeItem = NAV_ITEMS.find((item) => pathname.startsWith(item.href)) ?? NAV_ITEMS[0];
  const displayName = user ? user.firstName || user.username : "";
  const initial = (displayName[0] ?? "S").toUpperCase();
  const email = user?.email || "admin@zyvionix.com";

  if (!checked) {
    return <div className="min-h-screen bg-[#F0F5F9]" />;
  }

  return (
    <div className="min-h-screen bg-[#F0F5F9] flex font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-[260px] h-screen bg-[#2A465B] flex flex-col relative z-20 flex-shrink-0 rounded-r-[32px] py-8">
        
        {/* Profile Section */}
        <div className="flex flex-col items-center justify-center mb-8 px-4 text-center">
          <div className="w-20 h-20 rounded-full border-[3px] border-[#395D73] bg-[#2A465B] p-1 mb-3">
             <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                 <span className="text-2xl font-bold text-slate-600">{initial}</span>
             </div>
          </div>
          <h2 className="text-white text-sm font-semibold truncate w-full">{displayName}</h2>
          <p className="text-[#89A5B7] text-[10px] truncate w-full mt-1">{email}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col w-full relative">
          <style dangerouslySetInnerHTML={{__html: `
             .nav-item-active {
                 background-color: #F0F5F9;
                 color: #2A465B;
                 border-top-left-radius: 24px;
                 border-bottom-left-radius: 24px;
                 position: relative;
             }
             .nav-item-active::before {
                 content: "";
                 position: absolute;
                 top: -20px;
                 right: 0;
                 width: 20px;
                 height: 20px;
                 border-bottom-right-radius: 20px;
                 box-shadow: 10px 10px 0 10px #F0F5F9;
                 z-index: 10;
                 pointer-events: none;
             }
             .nav-item-active::after {
                 content: "";
                 position: absolute;
                 bottom: -20px;
                 right: 0;
                 width: 20px;
                 height: 20px;
                 border-top-right-radius: 20px;
                 box-shadow: 10px -10px 0 10px #F0F5F9;
                 z-index: 10;
                 pointer-events: none;
             }
          `}} />
          
          <div className="pl-6 flex flex-col gap-1 w-full">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === activeItem.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`
                    flex items-center gap-3 py-3 pl-4 pr-6 transition-colors w-full
                    ${isActive ? "nav-item-active font-bold" : "text-[#89A5B7] hover:text-white font-medium"}
                  `}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="px-6 mt-auto">
           <button 
             onClick={handleLogout}
             disabled={loggingOut}
             className="flex items-center gap-3 py-3 pl-4 text-[#89A5B7] hover:text-white font-medium w-full text-sm transition-colors"
           >
             <LogOut className="w-4 h-4" />
             <span>Logout</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-[80px] flex items-center justify-between px-8 shrink-0 relative z-10">
           <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome {displayName} !</h1>
           </div>
           
           <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Search" 
                   className="pl-9 pr-4 py-2 rounded-full border-none bg-white shadow-sm text-sm w-[280px] focus:outline-none focus:ring-2 focus:ring-slate-200"
                 />
              </div>

              {/* Theme Toggle placeholder */}
              <div className="bg-[#2A465B] rounded-full p-1 flex items-center gap-2 shadow-sm ml-2">
                 <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#2A465B]">
                    <Sun className="w-3.5 h-3.5" />
                 </div>
                 <div className="w-6 h-6 rounded-full flex items-center justify-center text-[#89A5B7]">
                    <Moon className="w-3.5 h-3.5" />
                 </div>
              </div>

              {/* Notification */}
              <button className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-500 hover:text-slate-700 ml-2">
                 <Bell className="w-4 h-4" />
              </button>
           </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
           <style dangerouslySetInnerHTML={{__html: `
              .custom-scrollbar::-webkit-scrollbar { width: 6px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
           `}} />
           {children}
        </main>
      </div>

    </div>
  );
}
