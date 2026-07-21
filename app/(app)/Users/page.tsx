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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUser, AuthUser } from "@/app/lib/auth-storage";
import { listUsers, createUser, deleteUser, User } from "@/app/lib/api/auth";

export default function UsersPage() {
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
  const [role, setRole] = useState<"STAFF" | "ADMIN">("STAFF");

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
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
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
        role,
      });
      // Clear fields
      setFirstName("");
      setLastName("");
      setUsername("");
      setPassword("");
      setRole("STAFF");
      setCreateOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
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
      setError(err instanceof Error ? err.message : "Failed to delete user");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  // Check if current user is SUPERADMIN
  const isSuper = useMemo(() => {
    return currentUser?.roles?.includes("SUPERADMIN") || false;
  }, [currentUser]);

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
        field: "role",
        headerName: "Role",
        width: 130,
        cellRenderer: (p: ICellRendererParams<User>) => {
          if (!p.value) return null;
          const bg =
            p.value === "SUPERADMIN"
              ? "bg-purple-100 text-purple-700 border-purple-200"
              : p.value === "ADMIN"
              ? "bg-blue-100 text-blue-700 border-blue-200"
              : "bg-slate-100 text-slate-700 border-slate-200";
          return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${bg}`}>
              {p.value}
            </span>
          );
        },
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
          const isSelf = p.data.id === currentUser?.id;
          const isSuperUser = p.data.role === "SUPERADMIN";

          // Prevent deleting self, and protect other Superadmins from deletion unless you are one
          if (isSelf || isSuperUser) return null;

          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
              onClick={() => p.data && setDeleting(p.data)}
              aria-label="Delete user"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          );
        },
      },
    ],
    [currentUser]
  );

  return (
    <div className="px-7 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search username, name, role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-white border-border focus-visible:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={load}
            className="rounded-xl border-border h-10 w-10 bg-white"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white hover:bg-primary/95 transition-all animate-all"
          >
            <Plus className="h-4 w-4" />
            Register User
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">{error}</p>}

      <Card className="rounded-2xl shadow-sm border-border overflow-hidden bg-white p-0">
        {loading ? (
          <p className="text-center py-14 text-sm text-muted-foreground">Loading user directory...</p>
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
        <DialogContent className="max-w-md rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Register User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new staff or admin login to your organization database.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">First Name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-xl border-border bg-slate-50 focus-visible:ring-primary/20 h-9.5 text-xs font-semibold"
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Last Name</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-xl border-border bg-slate-50 focus-visible:ring-primary/20 h-9.5 text-xs font-semibold"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Username / Login ID
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-xl border-border bg-slate-50 focus-visible:ring-primary/20 h-9.5 text-xs font-semibold"
                placeholder="johndoe"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border-border bg-slate-50 focus-visible:ring-primary/20 h-9.5 text-xs font-semibold"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Role</label>
              <Select
                value={role}
                onValueChange={(val) => setRole(val as "STAFF" | "ADMIN")}
              >
                <SelectTrigger className="rounded-xl border-border bg-slate-50 focus:ring-primary/20 h-9.5 text-xs font-semibold">
                  <SelectValue placeholder="Select user role" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-xs">
                  <SelectItem value="STAFF">Staff (Estimator)</SelectItem>
                  {isSuper && <SelectItem value="ADMIN">Admin (Manager)</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-9.5"
                onClick={() => setCreateOpen(false)}
                disabled={createBusy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBusy}
                className="rounded-xl h-9.5 bg-primary text-white hover:bg-primary/95 shadow-md shadow-primary/25 px-5 font-semibold"
              >
                {createBusy ? "Registering..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Account</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete account <span className="font-semibold text-foreground">{deleting?.firstName} {deleting?.lastName}</span>? This user will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
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
