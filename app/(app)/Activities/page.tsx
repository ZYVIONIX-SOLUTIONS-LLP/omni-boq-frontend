"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Activity,
  deleteActivity,
  listActivities,
  WIRING_TYPES,
  WiringType,
  wiringTypeLabel,
} from "@/app/lib/api/activities";
import ActivityFormDialog from "./activity-form-dialog";

function SegmentBadge({ segment }: { segment?: string | null }) {
  if (!segment) return null;
  const styles: Record<string, string> = {
    RESIDENTIAL: "bg-emerald-100 text-emerald-700",
    COMMERCIAL: "bg-sky-100 text-sky-700",
    INDUSTRIAL: "bg-orange-100 text-orange-700",
  };
  return (
    <Badge className={`${styles[segment]} border-0 font-semibold rounded-full px-2.5 text-[10px]`}>
      {segment.charAt(0) + segment.slice(1).toLowerCase()}
    </Badge>
  );
}

function ActivityCard({
  activity,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="rounded-2xl border-border shadow-sm bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <button
          className="flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{activity.name}</p>
            <SegmentBadge segment={activity.segment} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activity.code} · {activity.requirements.length} materials per{" "}
            {activity.unit.toLowerCase()}
          </p>
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
            aria-label="Edit activity"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500"
            aria-label="Delete activity"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded((v) => !v)}
            className="h-8 w-8 rounded-lg text-muted-foreground"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-semibold pb-1.5">Category</th>
                <th className="text-left font-semibold pb-1.5">Material (generic)</th>
                <th className="text-right font-semibold pb-1.5">Qty / {activity.unit.toLowerCase()}</th>
              </tr>
            </thead>
            <tbody>
              {activity.requirements.map((req, i) => (
                <tr key={req.id ?? i} className="border-t border-border/50">
                  <td className="py-1.5 pr-2">
                    <Badge className="bg-muted text-muted-foreground border-0 rounded-full px-2 text-[10px] font-semibold whitespace-nowrap">
                      {req.category?.name ?? "—"}
                    </Badge>
                  </td>
                  <td className="py-1.5 pr-2 text-foreground">{req.description}</td>
                  <td className="py-1.5 text-right font-semibold text-foreground whitespace-nowrap">
                    {Number(req.quantity)} {req.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function ActivitiesPage() {
  const [wiringType, setWiringType] = useState<WiringType>("POINT_WIRING");
  const [items, setItems] = useState<Activity[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listActivities({
        wiringType,
        search: debouncedSearch || undefined,
        limit: 100,
      });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setLoading(false);
    }
  }, [wiringType, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteActivity(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete activity");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="px-7 py-6 space-y-5">
      {/* ── Wiring type tabs + toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-xl bg-muted/60 p-1">
          {WIRING_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setWiringType(type)}
              className={
                wiringType === type
                  ? "px-4 py-2 rounded-lg text-sm font-semibold bg-white text-primary shadow-sm"
                  : "px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {wiringTypeLabel(type)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search activities"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-white border-border focus-visible:ring-primary/30"
            />
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white hover:bg-primary/95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Activity
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* ── Activity cards ── */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Loading activities...</p>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl border-border border-dashed bg-white p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No {wiringTypeLabel(wiringType).toLowerCase()} activities yet. Click{" "}
            <span className="font-semibold">Add Activity</span> to create the first template.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onEdit={() => {
                setEditing(activity);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(activity)}
            />
          ))}
        </div>
      )}

      {/* ── Add / Edit dialog ── */}
      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        wiringType={wiringType}
        activity={editing}
        onSaved={load}
      />

      {/* ── Delete confirmation ── */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Activity</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deleting?.name}</span>?
              Quotations already created from it are not affected.
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
              className="rounded-xl"
              onClick={confirmDelete}
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
