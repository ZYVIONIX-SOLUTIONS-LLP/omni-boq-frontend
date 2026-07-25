"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// API
import { listUsers, User } from "@/app/lib/api/auth";
import { listProducts } from "@/app/lib/catalog/api";
import { listActivities } from "@/app/lib/api/activities";

// ── Icons ──────────────────────────────────────────────────────────────────
import { Users, ShieldCheck, Package, Hammer, Plus, RefreshCw } from "lucide-react";

// ── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ admins, staff }: { admins: number; staff: number }) {
  const total = admins + staff;
  const adminPct = total === 0 ? 0 : (admins / total) * 100;
  const staffPct = total === 0 ? 0 : (staff / total) * 100;

  const segments = [
    { pct: adminPct, color: "#6c63ff", label: "Admins (Vendors)" },
    { pct: staffPct, color: "#00C8FF", label: "Staff (Users)" },
  ];

  const r = 58;
  const cx = 75;
  const cy = 75;
  const circ = 2 * Math.PI * r;
  const gap = total > 0 && admins > 0 && staff > 0 ? 2 : 0;
  let offset = 0;

  const arcs = segments.map((seg, i) => {
    if (seg.pct === 0) return null;
    const dash = (seg.pct / 100) * circ - gap;
    const space = circ - dash;
    const node = (
      <circle
        key={i}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={24}
        strokeDasharray={`${dash} ${space}`}
        strokeDashoffset={-offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`, transition: "all 1s ease-out" }}
      />
    );
    offset += (seg.pct / 100) * circ;
    return node;
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={150} height={150} viewBox="0 0 150 150">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={24} />
        ) : (
          arcs
        )}
        <circle cx={cx} cy={cy} r={46} fill="white" />
      </svg>
      <div className="grid grid-cols-1 gap-x-5 gap-y-2 w-full px-4 mt-2">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);

  // Recent Users
  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, productsRes, activitiesRes] = await Promise.all([
        listUsers(),
        listProducts({ limit: 1 }), // Just need meta.totalItems
        listActivities({ limit: 1 }), // Just need meta.totalItems
      ]);

      const admins = usersRes.filter(u => u.role === "ADMIN");
      const staff = usersRes.filter(u => u.role === "STAFF");

      setTotalAdmins(admins.length);
      setTotalStaff(staff.length);
      setTotalMaterials(productsRes.meta?.totalItems || 0);
      setTotalActivities(activitiesRes.meta?.totalItems || 0);

      // Get 5 most recent admins
      const sortedAdmins = [...admins].sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setRecentUsers(sortedAdmins.slice(0, 5));

    } catch (err) {
      console.error("Failed to load superadmin dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-0rem)] bg-[#f8f7ff]">
      <div className="px-7 py-5 space-y-5 flex-1">
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">System Overview</h1>
          <Button onClick={loadData} variant="outline" size="sm" className="gap-2 rounded-xl bg-white h-9 shadow-sm">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* ── Stat Cards ─────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">

          <Card className="rounded-2xl shadow-sm border-border bg-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-16 h-16 text-[#6c63ff]" />
            </div>
            <CardHeader className="pb-0 pt-5 relative z-10">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Admins
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-6 relative z-10">
              <p className="text-4xl font-extrabold text-foreground leading-none">{loading ? "..." : totalAdmins}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Registered Companies</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-border bg-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <Users className="w-16 h-16 text-[#00C8FF]" />
            </div>
            <CardHeader className="pb-0 pt-5 relative z-10">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Staff
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-6 relative z-10">
              <p className="text-4xl font-extrabold text-foreground leading-none">{loading ? "..." : totalStaff}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">System Estimators</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-border bg-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <Package className="w-16 h-16 text-emerald-500" />
            </div>
            <CardHeader className="pb-0 pt-5 relative z-10">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Master Materials
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-6 relative z-10">
              <p className="text-4xl font-extrabold text-foreground leading-none">{loading ? "..." : totalMaterials}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Products in catalog</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-border bg-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <Hammer className="w-16 h-16 text-amber-500" />
            </div>
            <CardHeader className="pb-0 pt-5 relative z-10">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Master Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-6 relative z-10">
              <p className="text-4xl font-extrabold text-foreground leading-none">{loading ? "..." : totalActivities}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Standard assemblies</p>
            </CardContent>
          </Card>

        </div>

        {/* ── Bottom section ───────────────────────────────────── */}
        <div className="flex gap-4 items-start">

          {/* Recent Users Table */}
          <Card className="flex-1 min-w-0 rounded-2xl shadow-sm border-border bg-white overflow-hidden">
            <CardHeader className="flex-row items-center justify-between pb-3 pt-5 border-b border-border/50">
              <CardTitle className="text-base font-bold text-zinc-800">Recently Added Admins</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-border/50">
                    <TableHead className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-[120px]">
                      Date
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Name
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Username / ID
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                        Loading recent admins...
                      </TableCell>
                    </TableRow>
                  ) : recentUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                        No admins found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentUsers.map((u) => (
                      <TableRow
                        key={u.id}
                        className="hover:bg-accent/40 transition-colors border-b border-border/50"
                      >
                        <TableCell className="px-5 py-3 text-xs font-medium text-muted-foreground">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "System"}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-semibold text-zinc-800">
                          {u.firstName} {u.lastName}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">
                          {u.username}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Right panel */}
          <div className="w-[280px] flex-shrink-0 flex flex-col gap-4">

            {/* Users Breakdown */}
            <Card className="rounded-2xl shadow-sm border-border bg-white">
              <CardHeader className="pb-4 pt-5">
                <CardTitle className="text-sm font-bold text-zinc-800">Users Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <DonutChart admins={totalAdmins} staff={totalStaff} />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="rounded-2xl shadow-sm border-border bg-white">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-sm font-bold text-zinc-800">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                <Button
                  onClick={() => router.push("/superadmin/Admins")}
                  variant="outline"
                  className="w-full h-auto py-3 px-4 rounded-xl justify-start gap-3 hover:bg-[#6c63ff]/5 hover:border-[#6c63ff]/30 hover:text-[#6c63ff] transition-all text-zinc-700 shadow-sm"
                >
                  <div className="p-2 bg-[#6c63ff]/10 rounded-lg text-[#6c63ff]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">Manage Admins</span>
                </Button>

                <Button
                  onClick={() => router.push("/superadmin/Materials")}
                  variant="outline"
                  className="w-full h-auto py-3 px-4 rounded-xl justify-start gap-3 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all text-zinc-700 shadow-sm"
                >
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Package className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">Manage Materials</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Separator className="bg-border/60" />
      <footer className="text-center py-4 text-xs font-medium text-muted-foreground flex-shrink-0 bg-white">
        Zyvionix Solutions © 2026. All Rights Reserved.
      </footer>
    </div>
  );
}
