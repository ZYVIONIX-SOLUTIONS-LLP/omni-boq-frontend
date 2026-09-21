"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileDigit, FileText, Clock, CheckSquare, PlusCircle, 
  Boxes, Users, FileArchive
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
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

const STATUS_COLORS = {
  DRAFT: "#94A3B8",
  FINAL: "#0284C7",
  SENT: "#3B82F6",
  ACCEPTED: "#10B981",
  REJECTED: "#EF4444",
  EXPIRED: "#F59E0B"
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

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

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
      case "DRAFT": return "bg-slate-100 text-slate-600";
      case "FINAL": return "bg-sky-100 text-sky-700";
      case "SENT": return "bg-blue-100 text-blue-700";
      case "ACCEPTED": return "bg-emerald-100 text-emerald-700";
      case "REJECTED": return "bg-red-100 text-red-700";
      case "EXPIRED": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] w-full overflow-hidden bg-slate-50 p-6 font-sans flex flex-col">
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: FileDigit, label: "Total Quotations", val: loading ? "..." : totalQuotations, color: "text-indigo-600", bg: "bg-indigo-50" },
          { icon: FileText, label: "Total Value", val: loading ? "..." : inr(totalValue), color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: Clock, label: "In Progress", val: loading ? "..." : inProgress, color: "text-blue-600", bg: "bg-blue-50" },
          { icon: CheckSquare, label: "Completed", val: loading ? "..." : completed, color: "text-violet-600", bg: "bg-violet-50" }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3 transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center gap-3">
               <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
                 <stat.icon className="h-5 w-5" />
               </div>
               <span className="text-sm font-bold text-slate-500">{stat.label}</span>
            </div>
            <div className="text-2xl font-black text-slate-800">{stat.val}</div>
          </div>
        ))}
      </div>

      {/* Chart & Recent Row */}
      <div className="flex gap-4 mb-6 flex-1 min-h-[250px]">
        {/* Pie Chart Area */}
        <div className="flex-[1.5] bg-white rounded-xl p-5 flex flex-col shadow-sm border border-slate-100">
          <div className="text-sm font-bold text-slate-800 mb-2">Quotations by Status</div>
          <div className="flex-1 relative">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">Loading chart...</div>
            ) : pieData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${getStatusLabel(name)} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || "#cbd5e1"} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value, name) => [value, getStatusLabel(name as string)]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="flex-[1] bg-white rounded-xl p-5 flex flex-col shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
             <div className="text-sm font-bold text-slate-800">Recent Quotations</div>
             <Link href="/superadmin/Quotations" className="text-xs font-bold text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2">
            {loading ? (
               <div className="text-sm text-slate-400">Loading...</div>
            ) : recentQuotations.length === 0 ? (
               <div className="text-sm text-slate-400">No recent quotations</div>
            ) : (
              recentQuotations.map((q, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="text-xs font-bold text-slate-800 truncate">{q.code || "N/A"}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{q.customer?.name || "Unknown Customer"}</div>
                  </div>
                  <div className="text-right flex items-center gap-3 shrink-0">
                    <div className="text-xs font-bold text-slate-800">{inr(Number(q.grandTotal || 0))}</div>
                    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-md w-16 text-center ${getStatusBg(q.status)}`}>
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
      <div className="flex gap-4 items-end mt-auto shrink-0">
         <div className="flex-1">
            <div className="text-sm font-bold text-slate-800 mb-3">Quick Actions</div>
            <div className="flex gap-3">
              {[
                { icon: PlusCircle, title: "New Quotation", desc: "Create a new quotation", href: "/superadmin/Quotations" },
                { icon: Boxes, title: "Add Material", desc: "Add new material to database", href: "/superadmin/Materials" },
                { icon: Users, title: "Employees", desc: "Manage your team", href: "/superadmin/Staff" },
                { icon: FileArchive, title: "Activity Template", desc: "Create or edit templates", href: "/superadmin/Activities" },
              ].map((action, i) => (
                <Link key={i} href={action.href} className="flex-1 bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center gap-4 hover:border-blue-200 hover:shadow-md transition-all group">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                     <action.icon className="h-5 w-5" />
                   </div>
                   <div className="flex flex-col text-left">
                     <div className="text-xs font-bold text-slate-800 leading-tight">{action.title}</div>
                     <div className="text-[10px] font-medium text-slate-500 leading-tight mt-1">{action.desc}</div>
                   </div>
                </Link>
              ))}
            </div>
         </div>
      </div>
    </div>
  );
}
