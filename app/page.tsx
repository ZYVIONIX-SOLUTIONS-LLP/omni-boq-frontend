"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isLoggedIn } from "./lib/auth-storage";
import { 
  Loader2, ArrowRight, Zap, Target, Clock, FileText, 
  LayoutDashboard, FileDigit, Boxes, Wrench, FileArchive, 
  Users, BarChart2, Settings, Calendar, PlusCircle, CheckSquare,
  RefreshCw, FileSpreadsheet, ShieldCheck, Calculator, Printer, ChevronDown
} from "lucide-react";
import Link from "next/link";

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
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#F8FAFC] font-sans flex flex-col">
      {/* Background Grids & Drawings */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.3] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#CBD5E1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>
      {/* Fake Background Transmission Towers drawing */}
      <svg className="absolute bottom-16 left-[-5%] w-[800px] h-[300px] opacity-[0.03] pointer-events-none" viewBox="0 0 800 300" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M100 300 L150 100 L200 300 M125 200 L175 200 M137 150 L163 150" />
        <path d="M400 300 L450 100 L500 300 M425 200 L475 200 M437 150 L463 150" />
        <path d="M150 100 Q 300 150 450 100" />
        <path d="M150 120 Q 300 170 450 120" />
        <path d="M450 100 Q 600 150 750 100" />
      </svg>
      <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-[#E0EFFF] opacity-60 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-8 py-5 w-full">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-14 items-center justify-center">
             <img src="/logo.png" alt="Zyvionix Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-[24px] tracking-tight flex items-center -ml-1">
            <span className="text-[#0F172A] font-bold">Zyvionix</span>
            <span className="text-[#0066FF] font-medium">Solutions</span>
          </h1>
        </div>
        
        <Link 
          href="/Login" 
          className="group relative inline-flex items-center gap-2 rounded-full bg-[#0066FF] px-6 py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(0,102,255,0.3)] transition-all hover:bg-[#0052CC] hover:shadow-[0_6px_20px_rgba(0,102,255,0.4)] hover:-translate-y-0.5"
        >
          Access Your Workspace
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </header>

      {/* Main Content Area - Scrollable internally if needed, but fits in viewport */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-between w-full px-8 gap-4 overflow-hidden h-[calc(100vh-160px)]">
        
        {/* Left Column */}
        <div className="flex flex-col items-start w-full lg:w-[38%] xl:w-[35%] space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-3.5 py-1.5 text-[11px] font-bold text-[#0066FF]">
            <Zap className="h-3 w-3 fill-[#0066FF]" />
            Electrical Estimation & BOQ Software
          </div>
          
          <h2 className="text-[40px] lg:text-[46px] xl:text-[54px] font-bold tracking-tight leading-[1.05]">
            <span className="text-[#0F172A] block">Simplify Electrical</span>
            <span className="text-[#0066FF] block mt-1">Estimations &</span>
            <span className="text-[#0066FF] block mt-1">Quotations</span>
          </h2>
          
          <p className="text-[16px] text-[#475569] font-medium leading-relaxed max-w-[90%]">
            Create accurate BOQs, manage materials, labour rates and generate professional quotations in minutes.
          </p>

          <div className="flex items-start gap-8 pt-2 pb-4">
            <div className="flex flex-col gap-2">
               <div className="h-10 w-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#0066FF]">
                 <Target className="h-5 w-5" />
               </div>
               <div>
                 <div className="text-[13px] font-bold text-[#0F172A]">Accurate</div>
                 <div className="text-[11px] text-[#64748B] leading-tight">Precise calculations<br/>every time</div>
               </div>
            </div>
            <div className="flex flex-col gap-2">
               <div className="h-10 w-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#0066FF]">
                 <Clock className="h-5 w-5" />
               </div>
               <div>
                 <div className="text-[13px] font-bold text-[#0F172A]">Fast</div>
                 <div className="text-[11px] text-[#64748B] leading-tight">Save hours of<br/>manual work</div>
               </div>
            </div>
            <div className="flex flex-col gap-2">
               <div className="h-10 w-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#0066FF]">
                 <FileText className="h-5 w-5" />
               </div>
               <div>
                 <div className="text-[13px] font-bold text-[#0F172A]">Professional</div>
                 <div className="text-[11px] text-[#64748B] leading-tight">Generate clean<br/>quotations</div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Large Flat Dashboard Mockup */}
        <div className="w-full lg:w-[62%] xl:w-[65%] h-[92%] relative flex justify-end">
          
          <div className="w-full max-w-[1100px] h-full bg-white rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08),_0_0_30px_0_rgba(0,102,255,0.03)] border border-[#E2E8F0] overflow-hidden flex">
            
            {/* Sidebar */}
            <div className="w-[220px] shrink-0 border-r border-[#F1F5F9] bg-[#FAFAFC] flex flex-col p-4">
              <div className="flex items-center gap-2 mb-8 px-2 mt-2">
                <div className="h-6 w-8 text-[#0066FF]">
                   <svg viewBox="0 0 40 40" fill="currentColor"><path d="M5,10 L15,10 L10,20 Z" /><path d="M20,10 L30,10 L25,20 Z" fill="#0F172A"/></svg>
                </div>
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#EFF6FF] text-[#0066FF] rounded-lg text-[13px] font-bold">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </div>
                {[
                  { icon: FileDigit, label: "Quotations" },
                  { icon: Boxes, label: "Materials" },
                  { icon: Wrench, label: "Labour Rates" },
                  { icon: FileArchive, label: "Activity Templates" },
                  { icon: Users, label: "Clients" },
                  { icon: BarChart2, label: "Reports" },
                  { icon: Settings, label: "Settings" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 text-[#64748B] rounded-lg text-[13px] font-medium transition-colors">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden p-6 pb-2">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-[20px] font-bold text-[#0F172A]">Dashboard</h3>
                 <div className="flex items-center gap-2 px-3 py-1.5 border border-[#E2E8F0] rounded-md text-[11px] font-bold text-[#64748B]">
                   <Calendar className="h-3.5 w-3.5" /> May 1 - May 31, 2024 <ChevronDown className="h-3 w-3 ml-1" />
                 </div>
              </div>
              
              {/* Stat Cards Row */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { icon: FileDigit, label: "Total Quotations", val: "24", trend: "+16%", period: "This Month" },
                  { icon: FileText, label: "Total Value", val: "₹ 18,75,200", trend: "+12%", period: "This Month" },
                  { icon: Clock, label: "In Progress", val: "12", trend: "+8%", period: "This Month" },
                  { icon: CheckSquare, label: "Completed", val: "12", trend: "+20%", period: "This Month" }
                ].map((stat, i) => (
                  <div key={i} className="border border-[#F1F5F9] rounded-xl p-4 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[#0066FF]">
                       <div className="p-1.5 bg-[#EFF6FF] rounded"><stat.icon className="h-4 w-4" /></div>
                       <span className="text-[11px] font-bold text-[#64748B]">{stat.label}</span>
                    </div>
                    <div className="flex items-end justify-between mt-1">
                      <div className="text-[20px] font-bold text-[#0F172A]">{stat.val}</div>
                      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981]">{stat.trend}</div>
                    </div>
                    <div className="text-[9px] font-medium text-[#94A3B8]">{stat.period}</div>
                  </div>
                ))}
              </div>

              {/* Chart & Recent Row */}
              <div className="flex gap-4 mb-6 flex-1 min-h-[220px]">
                {/* Chart Area */}
                <div className="flex-[1.5] border border-[#F1F5F9] rounded-xl p-4 flex flex-col shadow-sm relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[12px] font-bold text-[#0F172A]">Quotation Overview</div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#64748B] border border-slate-200 px-2 py-1 rounded">
                      This Month <ChevronDown className="h-3 w-3" />
                    </div>
                  </div>
                  {/* Fake Chart Lines */}
                  <div className="flex-1 relative mt-1 border-l border-b border-slate-100 flex items-end ml-4 mb-3">
                     {/* Y-axis labels */}
                     <div className="absolute left-[-20px] h-full flex flex-col justify-between text-[9px] text-[#94A3B8] font-medium">
                       <span>25</span><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span>
                     </div>
                     {/* X-axis labels */}
                     <div className="absolute bottom-[-20px] w-full flex justify-between text-[9px] text-[#94A3B8] font-medium px-1">
                       <span>May 1</span><span>May 8</span><span>May 15</span><span>May 22</span><span>May 31</span>
                     </div>
                     {/* SVG Area Chart */}
                     <div className="absolute inset-0">
                       <svg viewBox="0 0 400 150" className="w-full h-full overflow-hidden" preserveAspectRatio="none">
                         <defs>
                           <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#0066FF" stopOpacity="0.2"/>
                             <stop offset="100%" stopColor="#0066FF" stopOpacity="0"/>
                           </linearGradient>
                         </defs>
                         <path d="M0,120 L30,90 L60,100 L90,60 L120,70 L150,50 L180,90 L210,60 L240,70 L270,40 L300,50 L330,20 L360,40 L400,10 L400,150 L0,150 Z" fill="url(#chartGrad)" />
                       <path d="M0,120 L30,90 L60,100 L90,60 L120,70 L150,50 L180,90 L210,60 L240,70 L270,40 L300,50 L330,20 L360,40 L400,10" fill="none" stroke="#0066FF" strokeWidth="2.5" />
                       <circle cx="90" cy="60" r="2.5" fill="#fff" stroke="#0066FF" strokeWidth="2" />
                       <circle cx="150" cy="50" r="2.5" fill="#fff" stroke="#0066FF" strokeWidth="2" />
                       <circle cx="270" cy="40" r="2.5" fill="#fff" stroke="#0066FF" strokeWidth="2" />
                       <circle cx="330" cy="20" r="2.5" fill="#fff" stroke="#0066FF" strokeWidth="2" />
                       <circle cx="400" cy="10" r="2.5" fill="#fff" stroke="#0066FF" strokeWidth="2" />
                     </svg>
                  </div>
                 </div>
               </div>

                {/* Recent Quotations */}
                <div className="flex-[1] border border-[#F1F5F9] rounded-xl p-4 flex flex-col shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                     <div className="text-[12px] font-bold text-[#0F172A]">Recent Quotations</div>
                     <div className="text-[10px] font-bold text-[#0066FF]">View All</div>
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    {[
                      { id: "QTN-2024-024", name: "Residential Project - Kochi", val: "₹ 2,45,000", status: "Approved", color: "bg-[#10B981]/10 text-[#10B981]" },
                      { id: "QTN-2024-023", name: "Commercial Building - Calicut", val: "₹ 4,75,600", status: "In Progress", color: "bg-[#38BDF8]/10 text-[#38BDF8]" },
                      { id: "QTN-2024-022", name: "Office Complex - Trivandrum", val: "₹ 3,25,400", status: "Pending", color: "bg-[#F59E0B]/10 text-[#F59E0B]" },
                      { id: "QTN-2024-021", name: "Apartment Project - Kochi", val: "₹ 1,85,200", status: "Approved", color: "bg-[#10B981]/10 text-[#10B981]" }
                    ].map((q, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div>
                          <div className="text-[11px] font-bold text-[#0F172A]">{q.id}</div>
                          <div className="text-[9px] text-[#64748B]">{q.name}</div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div className="text-[11px] font-bold text-[#0F172A]">{q.val}</div>
                          <div className={`text-[9px] font-bold px-2 py-0.5 rounded ${q.color} w-16 text-center`}>{q.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions & Floating Notification */}
              <div className="flex gap-4 items-end">
                 <div className="flex-1">
                    <div className="text-[12px] font-bold text-[#0F172A] mb-3">Quick Actions</div>
                    <div className="flex gap-3">
                      {[
                        { icon: PlusCircle, title: "New Quotation", desc: "Create a new quotation" },
                        { icon: Boxes, title: "Add Material", desc: "Add new material to database" },
                        { icon: RefreshCw, title: "Update Rates", desc: "Update labour or material rates" },
                        { icon: FileArchive, title: "Activity Template", desc: "Create or edit templates" },
                      ].map((action, i) => (
                        <div key={i} className="flex-1 border border-[#F1F5F9] rounded-xl p-3 shadow-sm flex flex-col items-center text-center gap-1.5 cursor-pointer hover:border-[#0066FF]/30 transition-colors">
                           <div className="p-2 bg-[#EFF6FF] text-[#0066FF] rounded-lg">
                             <action.icon className="h-4 w-4" />
                           </div>
                           <div className="text-[10px] font-bold text-[#0F172A] mt-1 leading-tight">{action.title}</div>
                           <div className="text-[8px] font-medium text-[#64748B] leading-tight">{action.desc}</div>
                        </div>
                      ))}
                    </div>
                 </div>

                 {/* Floating price update widget */}
                 <div className="w-[240px] bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0] shadow-sm flex flex-col gap-2 relative">
                    <div className="absolute top-[-10px] left-4 bg-[#10B981]/10 text-[#10B981] p-1 rounded">
                       <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div className="ml-10">
                       <div className="text-[11px] font-bold text-[#0F172A]">Materials Price Update</div>
                       <div className="text-[9px] text-[#64748B] mt-0.5">Schneider Electric price list updated on 28 May, 2024</div>
                    </div>
                    <div className="text-right mt-1">
                       <button className="text-[9px] font-bold text-[#0066FF] border border-[#E2E8F0] px-2 py-1 rounded bg-white hover:bg-slate-50">View Details →</button>
                    </div>
                 </div>
              </div>

            </div>
          </div>
          
        </div>
      </main>

      {/* Footer Feature Callouts */}
      <div className="relative z-10 border-t border-[#E2E8F0] bg-white w-full py-4 flex items-center justify-center gap-12 shrink-0 h-[80px]">
        {[
          { icon: FileText, title: "BOQ Made Easy", desc: "Prepare detailed BOQs with materials, labour & overheads" },
          { icon: ShieldCheck, title: "Real-time Costing", desc: "Always up-to-date rates for accurate estimations" },
          { icon: Calculator, title: "Smart Calculations", desc: "Auto calculations for totals, taxes & margins" },
          { icon: Printer, title: "Professional Output", desc: "Generate quotation & BOQ in professional format" },
        ].map((feat, i) => (
          <div key={i} className="flex items-center gap-3 max-w-[220px]">
            <div className="h-8 w-8 shrink-0 rounded-xl border border-[#E2E8F0] text-[#0066FF] flex items-center justify-center bg-white shadow-sm">
               <feat.icon className="h-4 w-4" />
            </div>
            <div>
               <div className="text-[11px] font-bold text-[#0F172A]">{feat.title}</div>
               <div className="text-[9px] font-medium text-[#64748B] leading-[1.3] mt-0.5">{feat.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
