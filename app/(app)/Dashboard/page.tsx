"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FileDigit, FileText, Clock, CheckSquare, ChevronDown, 
  PlusCircle, Boxes, Users, FileArchive, FileSpreadsheet,
  Calendar
} from "lucide-react";

// API
import { listQuotations, Quotation } from "@/app/lib/api/quotations";

function inr(value: number | null | undefined): string {
  if (value == null) return "₹0";
  return `₹ ${value.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function Dashboard() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const qRes = await listQuotations({ limit: 100 });
        setQuotations(qRes.items);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalQuotations = quotations.length;
  const totalValue = quotations.reduce((acc, q) => acc + Number(q.grandTotal || 0), 0);
  const inProgress = quotations.filter(q => q.status === "DRAFT" || q.status === "SENT").length;
  const completed = quotations.filter(q => q.status === "ACCEPTED").length;

  const recentQuotations = [...quotations]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 4);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACCEPTED": return "bg-[#10B981]/10 text-[#10B981]";
      case "SENT":
      case "DRAFT": return "bg-[#38BDF8]/10 text-[#38BDF8]";
      case "REJECTED":
      case "EXPIRED": return "bg-[#F59E0B]/10 text-[#F59E0B]";
      default: return "bg-[#64748B]/10 text-[#64748B]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACCEPTED": return "Approved";
      case "SENT":
      case "DRAFT": return "In Progress";
      case "REJECTED": return "Rejected";
      case "EXPIRED": return "Expired";
      default: return "Pending";
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] w-full overflow-hidden bg-[#F8FAFC] p-6 font-sans flex flex-col">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6">
         <h3 className="text-[20px] font-bold text-[#0F172A]">Dashboard</h3>
         <div className="flex items-center gap-2 px-3 py-1.5 border border-[#E2E8F0] bg-white rounded-md text-[11px] font-bold text-[#64748B]">
           <Calendar className="h-3.5 w-3.5" /> This Month <ChevronDown className="h-3 w-3 ml-1" />
         </div>
      </div>
      
      {/* Stat Cards Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: FileDigit, label: "Total Quotations", val: loading ? "..." : totalQuotations, trend: "+16%", period: "This Month" },
          { icon: FileText, label: "Total Value", val: loading ? "..." : inr(totalValue), trend: "+12%", period: "This Month" },
          { icon: Clock, label: "In Progress", val: loading ? "..." : inProgress, trend: "+8%", period: "This Month" },
          { icon: CheckSquare, label: "Completed", val: loading ? "..." : completed, trend: "+20%", period: "This Month" }
        ].map((stat, i) => (
          <div key={i} className="border border-[#F1F5F9] bg-white rounded-xl p-4 shadow-sm flex flex-col gap-2">
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
        <div className="flex-[1.5] border border-[#F1F5F9] bg-white rounded-xl p-4 flex flex-col shadow-sm relative">
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
               <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
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
        <div className="flex-[1] border border-[#F1F5F9] bg-white rounded-xl p-4 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <div className="text-[12px] font-bold text-[#0F172A]">Recent Quotations</div>
             <Link href="/Quotations" className="text-[10px] font-bold text-[#0066FF] hover:underline">View All</Link>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2">
            {loading ? (
               <div className="text-xs text-muted-foreground">Loading...</div>
            ) : recentQuotations.length === 0 ? (
               <div className="text-xs text-muted-foreground">No recent quotations</div>
            ) : (
              recentQuotations.map((q, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-[11px] font-bold text-[#0F172A] truncate" title={q.code}>{q.code || "N/A"}</div>
                    <div className="text-[9px] text-[#64748B] truncate" title={q.customer?.name}>{q.customer?.name || "Unknown"}</div>
                  </div>
                  <div className="text-right flex items-center gap-2 shrink-0">
                    <div className="text-[11px] font-bold text-[#0F172A]">{inr(Number(q.grandTotal || 0))}</div>
                    <div className={`text-[9px] font-bold px-2 py-0.5 rounded ${getStatusColor(q.status)} w-16 text-center`}>{getStatusLabel(q.status)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions & Floating Notification */}
      <div className="flex gap-4 items-end mt-auto shrink-0">
         <div className="flex-1">
            <div className="text-[12px] font-bold text-[#0F172A] mb-3">Quick Actions</div>
            <div className="flex gap-3">
              {[
                { icon: PlusCircle, title: "New Quotation", desc: "Create a new quotation", href: "/Quotations" },
                { icon: Boxes, title: "Add Material", desc: "Add new material to database", href: "/Materials" },
                { icon: Users, title: "Employees", desc: "Manage your team", href: "/Staff" },
                { icon: FileArchive, title: "Activity Template", desc: "Create or edit templates", href: "/Activities" },
              ].map((action, i) => (
                <Link key={i} href={action.href} className="flex-1 bg-white border border-[#F1F5F9] rounded-xl p-3 shadow-sm flex flex-col items-center text-center gap-1.5 hover:border-[#0066FF]/30 transition-colors">
                   <div className="p-2 bg-[#EFF6FF] text-[#0066FF] rounded-lg">
                     <action.icon className="h-4 w-4" />
                   </div>
                   <div className="text-[10px] font-bold text-[#0F172A] mt-1 leading-tight">{action.title}</div>
                   <div className="text-[8px] font-medium text-[#64748B] leading-tight">{action.desc}</div>
                </Link>
              ))}
            </div>
         </div>

         {/* Floating price update widget */}
         <div className="w-[240px] bg-white rounded-xl p-3 border border-[#E2E8F0] shadow-sm flex flex-col gap-2 relative">
            <div className="absolute top-[-10px] left-4 bg-[#10B981]/10 text-[#10B981] p-1 rounded">
               <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="ml-10">
               <div className="text-[11px] font-bold text-[#0F172A]">Materials Price Update</div>
               <div className="text-[9px] text-[#64748B] mt-0.5">Schneider Electric price list updated on 28 May, 2024</div>
            </div>
            <div className="text-right mt-1">
               <Link href="/Materials" className="text-[9px] font-bold text-[#0066FF] border border-[#E2E8F0] px-2 py-1 rounded bg-white hover:bg-slate-50">View Details →</Link>
            </div>
         </div>
      </div>
    </div>
  );
}
