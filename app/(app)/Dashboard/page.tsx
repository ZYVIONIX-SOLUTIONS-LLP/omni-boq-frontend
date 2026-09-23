"use client";

import { useState, useEffect } from "react";
import { FileText, Clock, CheckCircle2, FileSpreadsheet, Users, Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";
import { listQuotations, Quotation } from "@/app/lib/api/quotations";
import { listUsers } from "@/app/lib/api/auth";

function inr(value: number | null | undefined): string {
  if (value === null || value === undefined) return "?0";
  if (value > 1000000) return (value / 1000000).toFixed(2) + "M";
  if (value > 1000) return (value / 1000).toFixed(1) + "k";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#7793A6",
  FINAL: "#89A5B7",
  SENT: "#5C7E92",
  ACCEPTED: "#395D73",
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
  const [staffCount, setStaffCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listQuotations({ limit: 1000 }),
      listUsers()
    ]).then(([resQ, resU]) => {
      setQuotations(resQ.items || []);
      const staff = (resU || []).filter(u => u.roles?.includes("STAFF") || u.roles?.includes("ADMIN") || u.roles?.includes("SUPERADMIN")).length;
      setStaffCount(staff);
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

  const statusCounts = quotations.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts)
    .map(([status, count]) => ({
      name: getStatusLabel(status),
      value: count,
      color: STATUS_COLORS[status] || "#7793A6"
    }))
    .filter(d => d.value > 0);

  // Top 10 by value
  const topQuotations = [...quotations]
    .sort((a, b) => Number(b.grandTotal || 0) - Number(a.grandTotal || 0))
    .slice(0, 10);

  // Bar Chart Data (Expense vs Profit mapped to existing diagram)
  const currentYear = new Date().getFullYear();
  const barDataMap: Record<string, any> = {};
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

  return (
    <div className="w-full flex flex-col gap-6">

      
      {/* Over View Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-base font-bold text-slate-800 mb-5">Over View</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Quotations", val: loading ? "..." : totalQuotations, bg: "bg-[#E2F1ED]", icon: <FileText className="w-4 h-4 text-[#2C6E5A]" /> },
            { label: "Total Value", val: loading ? "..." : (totalValue > 1000 ? (totalValue/1000).toFixed(0)+"k" : totalValue), bg: "bg-[#E2F1ED]", icon: <FileSpreadsheet className="w-4 h-4 text-[#2C6E5A]" /> },
            { label: "In Progress", val: loading ? "..." : inProgress, bg: "bg-[#E2F1ED]", icon: <Clock className="w-4 h-4 text-[#2C6E5A]" /> },
            { label: "Completed", val: loading ? "..." : completed, bg: "bg-[#F7EBE1]", icon: <CheckCircle2 className="w-4 h-4 text-[#9D543B]" />, border: "border border-[#EACBBF]", hasInfo: true }
          ].map((stat, i) => (
            <div key={i} className={`rounded-xl p-4 flex flex-col justify-center items-center relative ${stat.bg} ${stat.border || ""}`}>
              {stat.hasInfo && <Info className="w-3.5 h-3.5 text-[#9D543B]/60 absolute bottom-2 right-2" />}
              <div className="flex items-center gap-2 mb-1">
                 <div className="w-6 h-6 rounded-md bg-white/50 flex items-center justify-center">
                    {stat.icon}
                 </div>
                 <span className="text-xl font-bold text-slate-800">{stat.val}</span>
              </div>
              <span className="text-xs font-semibold text-slate-600">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid below Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         
         {/* Left Column (No of users & Inventory Values) */}
         <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* No of users */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col">
                  <h2 className="text-base font-bold text-slate-800 mb-6">No of staff</h2>
                  <div className="flex-1 flex flex-col justify-center gap-3">
                     <div className="w-12 h-10 rounded-xl bg-[#CAE0EB] flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#2A465B]" />
                     </div>
                     <div>
                        <div className="text-2xl font-bold text-slate-800">{loading ? "..." : staffCount}</div>
                        <div className="text-xs font-medium text-slate-500 mt-1">Total Active Staff</div>
                     </div>
                  </div>
               </div>

               {/* Inventory Values (Donut Chart) */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col">
                  <h2 className="text-base font-bold text-slate-800 mb-4">Existing Status Distribution</h2>
                  <div className="flex-1 flex items-center gap-4">
                     <div className="w-28 h-28 relative shrink-0">
                        {loading || totalQuotations === 0 ? (
                           <div className="w-full h-full bg-slate-50 rounded-full" />
                        ) : (
                           <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                               <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2} dataKey="value" stroke="none">
                                 {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                               </Pie>
                             </PieChart>
                           </ResponsiveContainer>
                        )}
                     </div>
                     <div className="flex-1 flex flex-col gap-2">
                        {pieData.map((entry, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }}></div>
                            <span className="text-xs font-semibold text-slate-600 flex-1 truncate">{entry.name}</span>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* Expense vs Profit (Bar Chart) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col flex-1">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-base font-bold text-slate-800">Quotation Overview</h2>
                 <span className="text-xs font-semibold text-slate-500">Last 6 months</span>
               </div>
               <div className="flex-1 w-full min-h-[220px]">
                  {loading || totalQuotations === 0 ? (
                     <div className="w-full h-full flex justify-center items-center text-xs text-slate-400">Loading...</div>
                  ) : (
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={barData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} dy={10} />
                         <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                         <RechartsTooltip cursor={{ fill: "#f8fafc" }} />
                         {Object.entries(STATUS_COLORS).map(([status, color]) => {
                            const hasData = barData.some(d => d[getStatusLabel(status)] > 0);
                            if (!hasData) return null;
                            return <Bar key={status} dataKey={getStatusLabel(status)} fill={color} radius={[2, 2, 0, 0]} maxBarSize={15} />;
                         })}
                       </BarChart>
                     </ResponsiveContainer>
                  )}
               </div>
            </div>
         </div>

         {/* Right Column (Top 10 Stores / Quotations) */}
         <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col">
            <h2 className="text-base font-bold text-slate-800 mb-6">Top 10 Quotations</h2>
            <div className="flex flex-col gap-4 flex-1">
               {loading ? (
                  <div className="text-xs text-slate-400">Loading...</div>
               ) : topQuotations.length === 0 ? (
                  <div className="text-xs text-slate-400">No quotations found</div>
               ) : topQuotations.map((q, i) => {
                  // Calculate width percentage relative to max
                  const maxTotal = Number(topQuotations[0].grandTotal || 1);
                  const qTotal = Number(q.grandTotal || 0);
                  const pct = Math.max(5, (qTotal / maxTotal) * 100);
                  return (
                     <div key={i} className="flex items-center gap-3 w-full">
                        <div className="w-[100px] text-xs font-semibold text-slate-600 truncate" title={q.customer?.name || q.code}>
                           {q.customer?.name || q.code}
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                           <div className="h-4 rounded-full bg-[#5C7E92]" style={{ width: `${pct}%` }} />
                           <span className="text-[10px] font-bold text-slate-500 min-w-[28px]">{inr(qTotal)}</span>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>

      </div>
    </div>
  );
}
