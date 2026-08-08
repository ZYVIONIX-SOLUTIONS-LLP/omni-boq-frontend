"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, UserPlus, Search, RefreshCw, Trash2, KeyRound } from "lucide-react";
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
import { getUser, AuthUser } from "@/app/lib/auth-storage";
import { listUsers, createUser, deleteUser, User } from "@/app/lib/api/auth";

export default function StaffPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Delete state
  const [deleting, setDeleting] = useState<User | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setCurrentUser(getUser());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listUsers();
      // Only show STAFF for this admin
      const staffOnly = data.filter((u) => u.role === "STAFF");
      setUsers(staffOnly);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !username || !password) {
      setError("All fields are required");
      return;
    }
    setCreateBusy(true);
    setError("");
    try {
      await createUser({
        firstName,
        lastName,
        username,
        password,
        role: "STAFF",
      });
      // Clear fields
      setFirstName("");
      setLastName("");
      setUsername("");
      setPassword("");
      setCreateOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create staff");
    } finally {
      setCreateBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setError("");
    try {
      await deleteUser(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete staff");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const columnDefs = useMemo<ColDef<User>[]>(
    () => [
      {
        headerName: "Name",
        flex: 1.5,
        minWidth: 160,
        cellClass: "font-semibold",
        valueGetter: (p) => p.data ? `${p.data.firstName} ${p.data.lastName}` : "—",
      },
      {
        field: "username",
        headerName: "Username",
        flex: 1.2,
        minWidth: 140,
        cellClass: "font-mono text-xs",
      },
      {
        headerName: "Created",
        field: "createdAt",
        width: 140,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString("en-IN") : "Seed User"),
      },
      {
        headerName: "",
        width: 110,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<User>) => {
          if (!p.data) return null;
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-none text-slate-400 hover:text-red-600 hover:bg-red-50"
              onClick={() => p.data && setDeleting(p.data)}
              aria-label="Delete user"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="p-6 space-y-5 bg-slate-50/60 min-h-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.12),rgba(255,255,255,0))]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search staff"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-none bg-white/80 backdrop-blur-xs border-purple-200/80 focus-visible:ring-purple-500 shadow-xs text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={load}
            className="rounded-none border-purple-200/80 bg-white/80 backdrop-blur-xs hover:bg-purple-50 text-slate-700 h-10 w-10 shadow-xs"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-none h-10 px-4 font-semibold shadow-md bg-purple-700 text-white hover:bg-purple-800 transition-all"
          >
            <Plus className="h-4 w-4" />
            Register Staff
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-none px-4 py-3 border border-red-200 font-medium">{error}</p>}

      <Card className="rounded-none border border-purple-300/80 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(124,58,237,0.12)] overflow-hidden p-0">
        {loading ? (
          <p className="text-center py-14 text-sm text-muted-foreground">Loading staff directory...</p>
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

      {/* Register User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-none border border-purple-200 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <UserPlus className="h-5 w-5 text-purple-700" />
              Register Staff Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a new staff estimator to your organization.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">First Name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-none border-purple-200 bg-white focus-visible:ring-purple-500 h-9.5 text-xs font-semibold"
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Last Name</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-none border-purple-200 bg-white focus-visible:ring-purple-500 h-9.5 text-xs font-semibold"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-purple-600" /> Username / Login ID
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-none border-purple-200 bg-white focus-visible:ring-purple-500 h-9.5 text-xs font-semibold"
                placeholder="johndoe"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-none border-purple-200 bg-white focus-visible:ring-purple-500 h-9.5 text-xs font-semibold"
                placeholder="••••••••"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-purple-200 h-9.5"
                onClick={() => setCreateOpen(false)}
                disabled={createBusy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBusy}
                className="rounded-none h-9.5 bg-purple-700 text-white hover:bg-purple-800 shadow-md px-5 font-semibold"
              >
                {createBusy ? "Registering..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-none border border-purple-200 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Account</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Delete account <span className="font-semibold text-slate-900">{deleting?.firstName} {deleting?.lastName}</span>? This user will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none border-purple-200"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-none bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
