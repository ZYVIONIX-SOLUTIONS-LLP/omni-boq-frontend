"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Search, RefreshCw, X } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appGridTheme } from "@/components/ui/ag-grid-theme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listUsers, approveUser, deleteUser, User } from "@/app/lib/api/auth";

export default function PendingAdminsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [approving, setApproving] = useState<User | null>(null);
  const [approveBusy, setApproveBusy] = useState(false);

  const [rejecting, setRejecting] = useState<User | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listUsers({ status: "PENDING" });
      setUsers(data.filter((u) => u.role === "ADMIN"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async () => {
    if (!approving) return;
    setApproveBusy(true);
    setError("");
    try {
      await approveUser(approving.id);
      setApproving(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
      setApproving(null);
    } finally {
      setApproveBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    setRejectBusy(true);
    setError("");
    try {
      await deleteUser(rejecting.id);
      setRejecting(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request");
      setRejecting(null);
    } finally {
      setRejectBusy(false);
    }
  };

  const columnDefs = useMemo<ColDef<User>[]>(
    () => [
      {
        headerName: "Company",
        field: "companyName",
        flex: 1.2,
        minWidth: 150,
        cellClass: "font-semibold",
        valueFormatter: (p) => p.value || "—",
      },
      {
        headerName: "Name",
        flex: 1.2,
        minWidth: 150,
        valueGetter: (p) => (p.data ? `${p.data.firstName} ${p.data.lastName}` : "—"),
      },
      {
        field: "username",
        headerName: "Email",
        flex: 1.4,
        minWidth: 170,
        cellClass: "font-mono text-xs",
      },
      {
        headerName: "Requested",
        field: "createdAt",
        width: 140,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString("en-IN") : "—"),
      },
      {
        headerName: "",
        width: 130,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<User>) => {
          if (!p.data) return null;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-emerald-600"
                onClick={() => p.data && setApproving(p.data)}
                aria-label="Approve request"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
                onClick={() => p.data && setRejecting(p.data)}
                aria-label="Reject request"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="px-7 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/superadmin/Admins">
          <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Back to Admins">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-bold">Pending Requests</h2>
          <p className="text-xs text-muted-foreground">Admin sign-ups waiting for review.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search pending requests"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-white border-border focus-visible:ring-primary/30"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={load}
          className="rounded-xl border-border h-10 w-10 bg-white"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">{error}</p>}

      <Card className="rounded-2xl shadow-sm border-border overflow-hidden bg-white p-0">
        {loading ? (
          <p className="text-center py-14 text-sm text-muted-foreground">Loading pending requests...</p>
        ) : users.length === 0 ? (
          <p className="text-center py-14 text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="p-2">
            <AgGridReact
              theme={appGridTheme}
              rowData={users}
              columnDefs={columnDefs}
              quickFilterText={search}
              domLayout="autoHeight"
              rowHeight={44}
              headerHeight={38}
              animateRows
              suppressCellFocus
            />
          </div>
        )}
      </Card>

      {/* Approve confirmation */}
      <Dialog open={Boolean(approving)} onOpenChange={(open) => !open && setApproving(null)}>
        <DialogContent className="max-w-sm rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Approve Account</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Approve <span className="font-semibold text-foreground">{approving?.firstName} {approving?.lastName}</span>
              {approving?.companyName ? ` (${approving.companyName})` : ""}? They will be able to log in immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setApproving(null)}
              disabled={approveBusy}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
              disabled={approveBusy}
            >
              {approveBusy ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject confirmation */}
      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="max-w-sm rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Reject Account</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Reject and permanently delete the request from{" "}
              <span className="font-semibold text-foreground">{rejecting?.firstName} {rejecting?.lastName}</span>?
              They would need to sign up again if reconsidered.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setRejecting(null)}
              disabled={rejectBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={handleReject}
              disabled={rejectBusy}
            >
              {rejectBusy ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
