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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94A3B8",
  FINAL: "#0ea5e9",
  SENT: "#3B82F6",
  ACCEPTED: "#10B981",
  REJECTED: "#EF4444",
  EXPIRED: "#F59E0B"
};

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

  const statusCounts = quotations.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts)
    .map(([status, count]) => ({
      name: getStatusLabel(status),
      value: count,
      color: STATUS_COLORS[status] || "#94A3B8"
    }))
    .filter(d => d.value > 0);

  // Generate Bar Chart Data by grouping existing quotations by month
  const currentYear = new Date().getFullYear();
  const barDataMap: Record<string, any> = {};
  
  // Initialize last 6 months
  const currentMonthIdx = new Date().getMonth();
  for (let i = 5; i >= 0; i--) {
    let mIdx = currentMonthIdx - i;
    if (mIdx < 0) mIdx += 12;
    barDataMap[MONTHS[mIdx]] = { name: MONTHS[mIdx] };
    Object.keys(STATUS_COLORS).forEach(status => {
       barDataMap[MONTHS[mIdx]][getStatusLabel(status)] = 0;
    });
  }

  quotations.forEach(q => {
    if (!q.createdAt) return;
    const d = new Date(q.createdAt);
    if (d.getFullYear() === currentYear || d.getFullYear() === currentYear - 1) {
      const mName = MONTHS[d.getMonth()];
      if (barDataMap[mName]) {
        const label = getStatusLabel(q.status);
        barDataMap[mName][label] = (barDataMap[mName][label] || 0) + 1;
      }
    }
  });
  
  const barData = Object.values(barDataMap);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bar Chart */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col min-h-[350px]">
            <h2 className="text-base font-bold text-slate-900 mb-6">Quotation Overview</h2>
            <div className="flex-1 w-full h-[250px]">
              {loading ? (
                <div className="w-full h-full flex justify-center items-center text-sm font-medium text-slate-400">Loading chart...</div>
              ) : totalQuotations === 0 ? (
                <div className="w-full h-full flex justify-center items-center text-sm font-medium text-slate-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <RechartsTooltip cursor={{ fill: "#f8fafc" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", top: -30, right: 0 }} />
                    {Object.entries(STATUS_COLORS).map(([status, color]) => {
                       const hasData = barData.some(d => d[getStatusLabel(status)] > 0);
                       if (!hasData) return null;
                       return <Bar key={status} dataKey={getStatusLabel(status)} fill={color} radius={[4, 4, 0, 0]} maxBarSize={20} />;
                    })}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Donut Chart */}
          <div className="md:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col min-h-[350px]">
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
                    {pieData.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                          <span className="text-xs font-semibold text-slate-600">{entry.name}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Recent Quotations & Promo Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Recent Quotations Table */}
          <div className="md:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col min-h-[300px]">
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

          

        </div>
      </div>
    </div>
  );
}
