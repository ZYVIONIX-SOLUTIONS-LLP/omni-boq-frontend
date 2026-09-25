"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAccessToken } from "@/app/lib/auth-storage";
import { Loader2, Save } from "lucide-react";
import Swal from "sweetalert2";

export default function CreateStaffPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    priorityLevel: "1"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "email") {
        next.username = value; // Auto-fill username with email
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.email || !formData.password || !formData.priorityLevel) {
      Swal.fire({ title: 'Missing Fields', text: 'Please fill out all required fields.', icon: 'warning', confirmButtonColor: '#098b67' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/users`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}` 
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: "STAFF",
          priorityLevel: parseInt(formData.priorityLevel)
        }),
      });

      if (res.ok) {
        Swal.fire({ title: 'Created!', text: 'Staff member created successfully.', icon: 'success', confirmButtonColor: '#098b67' });
        router.push("/Staff/list");
      } else {
        const errData = await res.json();
        Swal.fire({ title: 'Error', text: errData.message || 'Failed to create staff', icon: 'error', confirmButtonColor: '#098b67' });
      }
    } catch (err: any) {
      Swal.fire({ title: 'Error', text: err.message || 'Network error', icon: 'error', confirmButtonColor: '#098b67' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Staff</h1>
          <p className="text-sm text-slate-500">Add a new staff member and assign their priority level.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[#098b67] text-white hover:bg-[#077053] shadow-sm rounded-lg h-10 px-5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Staff
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">First Name <span className="text-red-500">*</span></label>
            <Input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" className="bg-white border-slate-200 rounded-lg h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Last Name</label>
            <Input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" className="bg-white border-slate-200 rounded-lg h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Email (Username) <span className="text-red-500">*</span></label>
            <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className="bg-white border-slate-200 rounded-lg h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 opacity-60">Username (Auto-generated)</label>
            <Input name="username" value={formData.username} disabled className="bg-slate-50 border-slate-200 rounded-lg h-10 text-slate-500 cursor-not-allowed" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Mobile Number</label>
            <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="1234567890" className="bg-white border-slate-200 rounded-lg h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Password <span className="text-red-500">*</span></label>
            <Input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" className="bg-white border-slate-200 rounded-lg h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Priority Level <span className="text-red-500">*</span></label>
            <select 
              name="priorityLevel" 
              value={formData.priorityLevel} 
              onChange={handleChange}
              className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="1">Priority 1 (Highest Access)</option>
              <option value="2">Priority 2 (Medium Access)</option>
              <option value="3">Priority 3 (Lowest Access)</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Priority levels determine what parts of the staff panel this user can access.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
