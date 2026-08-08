"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity } from "@/app/lib/api/activities";

interface ActivitySelectionSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  onAddSelected: (selectedActivities: Activity[]) => void;
  categoryName: string;
}

export function ActivitySelectionSidebar({
  open,
  onOpenChange,
  activities,
  onAddSelected,
  categoryName,
}: ActivitySelectionSidebarProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Clear selections when closed
  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearchQuery("");
    }
  }, [open]);

  const handleToggle = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleAdd = () => {
    const selected = activities.filter((a) => selectedIds.has(a.id));
    onAddSelected(selected);
    onOpenChange(false);
  };

  const filteredActivities = activities.filter((activity) =>
    activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full bg-slate-50 border-l border-slate-200 shadow-xl">
        <SheetHeader className="px-6 py-5 bg-white border-b border-slate-100 flex-shrink-0">
          <SheetTitle className="text-lg font-bold text-slate-800">Select Activities</SheetTitle>
          <SheetDescription className="text-sm font-medium text-slate-500">
            {categoryName}
          </SheetDescription>
          <div className="mt-4 relative">
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm font-medium border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-slate-50"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-500 font-medium bg-white rounded-xl border border-slate-100 border-dashed">
                {searchQuery ? "No activities match your search." : "No activities found for this category."}
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <label
                  key={activity.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedIds.has(activity.id)
                      ? "bg-blue-50/70 border-blue-200 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm hover:shadow"
                  }`}
                >
                  <div className="pt-0.5">
                    <Checkbox
                      checked={selectedIds.has(activity.id)}
                      onCheckedChange={(checked) => handleToggle(activity.id, !!checked)}
                      className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{activity.name}</p>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {activity.description || "No description provided"}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                       <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                         {activity.code}
                       </span>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0 mt-auto">
          <Button
            onClick={handleAdd}
            disabled={selectedIds.size === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold h-11 rounded-xl transition-all disabled:opacity-50 disabled:shadow-none"
          >
            Add Selected to Quotation ({selectedIds.size})
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
