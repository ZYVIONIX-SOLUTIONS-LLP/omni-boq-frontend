"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, File, Image as ImageIcon, Loader2, RefreshCw, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { getAccessToken } from "@/app/lib/auth-storage";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface CompanyDocument {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

export default function CompanyDocumentsPage() {
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customName, setCustomName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/company-documents`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!customName) {
        setCustomName(file.name.split('.')[0]); // Pre-fill with filename
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !customName) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", customName);

      const res = await fetch(`${API_URL}/company-documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: formData,
      });
      if (res.ok) {
        setUploadOpen(false);
        setCustomName("");
        setSelectedFile(null);
        fetchDocuments();
        alert("Document uploaded successfully");
      } else {
        const errData = await res.text();
        alert("Upload failed: " + res.status + "\n" + errData);
        console.error("Upload failed", res.status, errData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await fetch(`${API_URL}/company-documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      });
      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (type.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-slate-500" />;
  };

  return (
    <div className="p-6 space-y-6 font-sans bg-slate-50/60 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Company Documents</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and store important company files securely.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="icon" onClick={fetchDocuments} className="rounded-md bg-white">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setUploadOpen(true)} className="rounded-md shadow-md bg-[#163848] text-white hover:bg-[#112a36]">
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-md border border-slate-200 shadow-xs">
          <File className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No documents uploaded</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">You haven't uploaded any company documents yet.</p>
          <Button onClick={() => setUploadOpen(true)} className="bg-[#163848] text-white hover:bg-[#112a36] rounded-md">
            Upload First Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4 rounded-md shadow-sm hover:shadow-md transition-shadow border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-slate-50 rounded-md shrink-0">
                    {getFileIcon(doc.fileType || '')}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate" title={doc.name}>{doc.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <a 
                  href={doc.fileUrl ? (doc.fileUrl.startsWith('http') ? doc.fileUrl : `${API_URL}${doc.fileUrl}`) : '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 text-xs h-8 rounded-md inline-flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
                >
                  View
                </a>
                <Button variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md shrink-0" onClick={() => handleDelete(doc.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-md font-sans">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Custom Document Name</label>
              <Input
                placeholder="e.g. Trade License 2026"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="rounded-md border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">File</label>
              <Input
                type="file"
                onChange={handleFileChange}
                className="rounded-md border-slate-200 cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} className="rounded-md">Cancel</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || !customName || uploading} className="rounded-md bg-[#163848] text-white hover:bg-[#112a36]">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}