"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText, Clock, CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  ].filter(d => d.value > 0);

  // Generate Bar Chart Data by grouping existing quotations by month
  const currentYear = new Date().getFullYear();
  const barDataMap: Record<string, any> = {};
  
  // Initialize last 6 months
  const currentMonthIdx = new Date().getMonth();
  for (let i = 5; i >= 0; i--) {
    let mIdx = currentMonthIdx - i;
    if (mIdx < 0) mIdx += 12;
    barDataMap[MONTHS[mIdx]] = { name: MONTHS[mIdx], Draft: 0, Sent: 0, Completed: 0 };
  }

  quotations.forEach(q => {
    if (!q.createdAt) return;
    const d = new Date(q.createdAt);
    if (d.getFullYear() === currentYear || d.getFullYear() === currentYear - 1) {
      const mName = MONTHS[d.getMonth()];
      if (barDataMap[mName]) {
        if (q.status === "DRAFT" || q.status === "FINAL") barDataMap[mName].Draft += 1;
        else if (q.status === "SENT") barDataMap[mName].Sent += 1;
        else barDataMap[mName].Completed += 1;
      }
    }
  });
  
  const barData = Object.values(barDataMap);
  // Fallback mock data if completely empty so chart doesn't look broken
  if (totalQuotations === 0) {
    barData[0] = { name: MONTHS[(currentMonthIdx - 5 + 12) % 12], Draft: 2, Sent: 1, Completed: 0 };
    barData[2] = { name: MONTHS[(currentMonthIdx - 3 + 12) % 12], Draft: 5, Sent: 3, Completed: 2 };
    barData[5] = { name: MONTHS[currentMonthIdx], Draft: 8, Sent: 4, Completed: 1 };
  }

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
      case "FINAL": return "bg-slate-100 text-slate-700";
      case "SENT": return "bg-blue-100 text-blue-700";
      case "ACCEPTED": return "bg-emerald-100 text-emerald-700";
      case "REJECTED": return "bg-red-100 text-red-700";
      case "EXPIRED": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
  const today = new Date().toLocaleDateString("en-US", dateOptions);

  return (
    <div className="min-h-screen w-full bg-[#FAFBFC] p-4 sm:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-start md:items-end flex-col md:flex-row gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Here's what's happening with your quotations today.</p>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {today}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { icon: FileText, label: "Total Quotations", val: loading ? "..." : totalQuotations, color: "text-blue-500", bg: "bg-blue-50" },
            { icon: FileSpreadsheet, label: "Total Value", val: loading ? "..." : inr(totalValue), color: "text-emerald-500", bg: "bg-emerald-50" },
            { icon: Clock, label: "In Progress", val: loading ? "..." : inProgress, color: "text-orange-400", bg: "bg-orange-50" },
            { icon: CheckCircle2, label: "Completed", val: loading ? "..." : completed, color: "text-purple-500", bg: "bg-purple-50" }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                 <span className="text-xs font-semibold text-slate-500">{stat.label}</span>
                 <div className="text-2xl font-bold text-slate-900 mt-0.5">{stat.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Middle Row: Bar Chart & Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col min-h-[350px]">
            <h2 className="text-base font-bold text-slate-900 mb-6">Quotation Overview</h2>
            <div className="flex-1 w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <RechartsTooltip cursor={{ fill: "#f8fafc" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", top: -30, right: 0 }} />
                  <Bar dataKey="Draft" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Sent" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Completed" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col min-h-[350px]">
            <h2 className="text-base font-bold text-slate-900 mb-6">Status Distribution</h2>
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
              {loading ? (
                <div className="w-full flex justify-center text-sm font-medium text-slate-400">Loading chart...</div>
              ) : totalQuotations === 0 ? (
                <div className="w-full flex justify-center text-sm font-medium text-slate-400">No data available</div>
              ) : (
                <>
                  <div className="w-[180px] h-[180px] relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
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
                      <span className="text-3xl font-bold text-slate-900">{totalQuotations}</span>
                      <span className="text-xs font-semibold text-slate-500">Total</span>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-4 w-full">
                    {[
                      { label: "Draft", val: draftCount, color: "#94A3B8" },
                      { label: "Sent", val: sentCount, color: "#3B82F6" },
                      { label: "Completed", val: completedCount, color: "#10B981" }
                    ].map((entry, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                          <span className="text-xs font-semibold text-slate-600">{entry.label}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{entry.val}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Recent Quotations & Promo Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Quotations Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col min-h-[300px]">
            <h2 className="text-base font-bold text-slate-900 mb-6">Recent Quotations</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 rounded-l-lg border-b border-slate-100">#</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 border-b border-slate-100">Client</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 border-b border-slate-100">Amount</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 border-b border-slate-100">Status</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 rounded-r-lg border-b border-slate-100">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQuotations.map((q, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-xs font-semibold text-slate-500 border-b border-slate-50">{q.code}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-slate-800 border-b border-slate-50">{q.customer?.name || "Unknown"}</td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-800 border-b border-slate-50">{inr(Number(q.grandTotal || 0))}</td>
                      <td className="py-4 px-4 border-b border-slate-50">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${getStatusBg(q.status)}`}>
                          {getStatusLabel(q.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-slate-500 border-b border-slate-50">
                        {q.createdAt ? new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
                      </td>
                    </tr>
                  ))}
                  {recentQuotations.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-400">No recent quotations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Promotional / Action Card */}
          <div className="lg:col-span-1 bg-emerald-50 rounded-2xl p-8 shadow-sm border border-emerald-100 flex flex-col items-center justify-center text-center min-h-[300px]">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 relative">
               <FileText className="w-8 h-8 text-emerald-400" />
               <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-1 border-2 border-emerald-50">
                 <CheckCircle2 className="w-4 h-4" />
               </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">Turn your projects<br/>into success</h3>
            <p className="text-sm font-medium text-slate-600 mb-8 px-4">
              Create accurate quotations<br/>in minutes.
            </p>
            <Link 
              href="/Quotations" 
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-3 px-8 rounded-xl shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
            >
              Create Quotation
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
