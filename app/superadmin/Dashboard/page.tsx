"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText, Clock, CheckCircle2, Plus, 
  Package, Users, FileStack, Bell, ChevronRight
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { listQuotations, Quotation } from "@/app/lib/api/quotations";

function inr(value: number | null | undefined): string {
  if (value === null || value === undefined) return "?0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Dashboard() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listQuotations({ limit: 1000 }).then(res => {
      setQuotations(res.items || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const totalQuotations = quotations.length;
  const totalValue = quotations.reduce((sum, q) => sum + Number(q.grandTotal || 0), 0);
  const inProgress = quotations.filter(q => ["DRAFT", "FINAL", "SENT"].includes(q.status)).length;
  const completed = quotations.filter(q => ["ACCEPTED", "REJECTED", "EXPIRED"].includes(q.status)).length;
  const recentQuotations = [...quotations].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);

  const draftCount = quotations.filter(q => q.status === "DRAFT" || q.status === "FINAL").length;
  const sentCount = quotations.filter(q => q.status === "SENT").length;
  const completedCount = completed;

  const pieData = [
    { name: "Draft", value: draftCount, color: "#94A3B8" },
    { name: "Sent", value: sentCount, color: "#3B82F6" },
    { name: "Completed", value: completedCount, color: "#10B981" }
  ];

  const getStatusLabel = (status: string) => {
    switch(status) {
      case "DRAFT": return "Draft";
      case "FINAL": return "Final";
      case "SENT": return "Sent";
      case "ACCEPTED": return "Accepted";
      case "REJECTED": return "Rejected";
      case "EXPIRED": return "Expired";
      default: return status;
    }
  };

  const getStatusBg = (status: string) => {
    switch(status) {
      case "DRAFT": return "bg-slate-100 text-slate-700";
      case "FINAL": return "bg-sky-100 text-sky-700";
      case "SENT": return "bg-blue-100 text-blue-700";
      case "ACCEPTED": return "bg-emerald-100 text-emerald-700";
      case "REJECTED": return "bg-red-100 text-red-700";
      case "EXPIRED": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const dateOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const today = new Date().toLocaleDateString("en-US", dateOptions);

  return (
    <div className="min-h-screen w-full relative overflow-y-auto overflow-x-hidden font-sans">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[#F4F7FE]">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[50%] rounded-full bg-blue-100/40 blur-3xl"></div>
        <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-100/40 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/30 blur-3xl"></div>
      </div>

      <div className="relative z-10 p-4 sm:p-8 max-w-[1400px] mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-black text-xl italic shadow-lg shadow-blue-500/30">Z</div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Good to see you again! Keep building great quotations.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-500">{today}</span>
            <button className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center shadow-sm">
              VP
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { icon: FileText, label: "Total Quotations", val: loading ? "..." : totalQuotations, color: "text-blue-500", bg: "bg-blue-50" },
            { icon: CheckCircle2, label: "Total Value", val: loading ? "..." : inr(totalValue), color: "text-emerald-500", bg: "bg-emerald-50" },
            { icon: Clock, label: "In Progress", val: loading ? "..." : inProgress, color: "text-amber-500", bg: "bg-amber-50" },
            { icon: CheckCircle2, label: "Completed", val: loading ? "..." : completed, color: "text-purple-500", bg: "bg-purple-50" }
          ].map((stat, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-white flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                 <span className="text-xs font-bold text-slate-500">{stat.label}</span>
                 <div className="text-xl font-black text-slate-900 mt-1">{stat.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart & Recent Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pie Chart */}
          <div className="lg:col-span-5 bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-white flex flex-col min-h-[320px]">
            <h2 className="text-base font-black text-slate-900 mb-6">Quotations by Status</h2>
            <div className="flex-1 flex items-center">
              {loading ? (
                <div className="w-full flex justify-center text-sm font-medium text-slate-400">Loading chart...</div>
              ) : totalQuotations === 0 ? (
                <div className="w-full flex justify-center text-sm font-medium text-slate-400">No data available</div>
              ) : (
                <>
                  <div className="w-1/2 h-[200px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-slate-900">{totalQuotations}</span>
                      <span className="text-xs font-bold text-slate-500">Total</span>
                    </div>
                  </div>
                  <div className="w-1/2 pl-4 flex flex-col justify-center gap-4">
                    {pieData.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                          <span className="text-sm font-bold text-slate-600">{entry.name}</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">
                          {totalQuotations > 0 ? Math.round((entry.value / totalQuotations) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Quotations */}
          <div className="lg:col-span-7 bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-white flex flex-col min-h-[320px]">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-base font-black text-slate-900">Recent Quotations</h2>
               <Link href="/superadmin/Quotations" className="text-sm font-bold text-blue-600 hover:text-blue-700">View All</Link>
            </div>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
              {loading ? (
                 <div className="text-sm font-medium text-slate-400">Loading...</div>
              ) : recentQuotations.length === 0 ? (
                 <div className="text-sm font-medium text-slate-400">No recent quotations</div>
              ) : (
                recentQuotations.map((q, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-2xl hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 truncate">{q.code || "N/A"}</div>
                        <div className="text-[11px] font-bold text-slate-500 truncate mt-0.5">{q.customer?.name || "Unknown"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-sm font-black text-slate-900">{inr(Number(q.grandTotal || 0))}</div>
                      <div className={`text-xs font-bold px-3 py-1.5 rounded-lg w-20 text-center ${getStatusBg(q.status)}`}>
                        {getStatusLabel(q.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-base font-black text-slate-900 mb-4 ml-1">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Plus, title: "New Quotation", desc: "Create a new quotation", href: "/superadmin/Quotations", color: "text-blue-500", bg: "bg-blue-50", iconBg: "bg-blue-500" },
              { icon: Package, title: "Add Material", desc: "Add new material to database", href: "/superadmin/Materials", color: "text-emerald-500", bg: "bg-emerald-50", iconBg: "bg-emerald-500" },
              { icon: Users, title: "Employees", desc: "Manage your team", href: "/superadmin/Staff", color: "text-orange-500", bg: "bg-orange-50", iconBg: "bg-orange-500" },
              { icon: FileStack, title: "Activity Template", desc: "Create or edit templates", href: "/superadmin/Activities", color: "text-purple-500", bg: "bg-purple-50", iconBg: "bg-purple-500" },
            ].map((action, i) => (
              <Link key={i} href={action.href} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-white flex items-center justify-between group hover:shadow-md transition-all">
                 <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-full ${action.iconBg} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                     <action.icon className="w-5 h-5" />
                   </div>
                   <div className="flex flex-col text-left">
                     <div className="text-sm font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{action.title}</div>
                     <div className="text-[10px] font-bold text-slate-500 leading-tight mt-1">{action.desc}</div>
                   </div>
                 </div>
                 <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
