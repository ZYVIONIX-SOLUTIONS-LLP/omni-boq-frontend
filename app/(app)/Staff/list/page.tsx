"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/app/lib/auth-storage";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Shield } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";

export default function StaffListPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/users?status=APPROVED`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter to only show STAFF created by this ADMIN
        setStaffList(data.filter((u: any) => u.role === "STAFF"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This staff member will be permanently deleted.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#098b67',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/users/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getAccessToken()}` }
        });
        if (res.ok) {
          Swal.fire({ title: 'Deleted!', text: 'Staff member removed.', icon: 'success', confirmButtonColor: '#098b67' });
          fetchStaff();
        } else {
          Swal.fire({ title: 'Error', text: 'Failed to delete staff member.', icon: 'error', confirmButtonColor: '#098b67' });
        }
      } catch (err: any) {
        Swal.fire({ title: 'Error', text: 'Network error.', icon: 'error', confirmButtonColor: '#098b67' });
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff List</h1>
          <p className="text-sm text-slate-500">Manage your staff members and their access levels.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/Staff/create">
            <Button className="bg-[#098b67] text-white hover:bg-[#077053] shadow-sm rounded-lg h-10 px-5">
              <Plus className="h-4 w-4 mr-2" />
              Create New Staff
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : staffList.length === 0 ? (
          <div className="text-center p-12 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900">No staff members found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">You haven't added any staff members to your organization yet.</p>
            <Link href="/Staff/create">
              <Button variant="outline" className="rounded-lg h-9">
                <Plus className="h-4 w-4 mr-2" /> Add your first staff
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Username</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold text-center">Priority</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{staff.firstName} {staff.lastName}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{staff.username}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{staff.email || "-"}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{staff.phone || ""}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border
                          ${staff.priorityLevel === 1 ? 'bg-red-50 text-red-700 border-red-200' : 
                            staff.priorityLevel === 2 ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            'bg-emerald-50 text-emerald-700 border-emerald-200'}
                        `}>
                          <Shield className="h-3 w-3" />
                          Level {staff.priorityLevel || 3}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 rounded-md"
                        onClick={() => handleDelete(staff.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
