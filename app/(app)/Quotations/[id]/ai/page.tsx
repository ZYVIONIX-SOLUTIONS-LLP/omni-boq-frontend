"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Sparkles, Loader2, Bot, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgGridReact } from "ag-grid-react";
import { appGridTheme } from "@/components/ui/ag-grid-theme";
import type { ColDef } from "ag-grid-community";
import { getQuotation, Quotation } from "@/app/lib/api/quotations";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AIWorkspacePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Mock data for the grid
  const [rowData, setRowData] = useState<any[]>([]);

  useEffect(() => {
    // Load quotation details just for the header
    getQuotation(id).then(data => {
      setQuotation(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  const columnDefs: ColDef[] = [
    { field: "slNo", headerName: "Sl No", width: 80, cellClass: "text-center font-medium" },
    { field: "description", headerName: "Description", flex: 1, minWidth: 200, 
      cellClassRules: {
        'italic text-muted-foreground': (p) => p.value?.trim().startsWith('↳'),
        'font-medium text-foreground': (p) => !p.value?.trim().startsWith('↳')
      }
    },
    { field: "unit", headerName: "Unit", width: 100, cellClass: "text-center" },
    { field: "qty", headerName: "Qty", width: 100, cellClass: "text-center" },
    { field: "rate", headerName: "Rate", width: 120, cellClass: "text-right" },
    { field: "amount", headerName: "Amount", width: 140, cellClass: "text-right font-semibold text-indigo-700" },
  ];

  const handleSendPrompt = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    
    try {
      const items = await import('@/app/lib/api/quotations').then(m => m.generateQuotationDraft(id, prompt));
      
      let slCount = 1;
      const formattedData = items.map((item: any) => {
        let currentSl = "";
        if (item.isActivity) {
          currentSl = String(slCount++);
        }
        
        return {
          slNo: currentSl,
          description: item.isActivity ? item.description : `  ↳ ${item.description}`,
          unit: item.unit,
          qty: item.qty,
          rate: item.rate,
          amount: (Number(item.qty || 0) * Number(item.rate || 0)).toFixed(2)
        };
      });
      
      setRowData(formattedData);
      setPrompt("");
    } catch (error) {
      console.error("Failed to generate draft", error);
      // fallback mock data for testing UI if backend fails
      setRowData([
        { slNo: "1", description: "Point wiring for light point (MOCK)", unit: "NOS", qty: "10", rate: "1200", amount: "12000" },
        { slNo: "", description: "  ↳ 1.5 sqmm Wire", unit: "MTR", qty: "150", rate: "15", amount: "2250" },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-0rem)] items-center justify-center bg-slate-50/50">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0rem)] w-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/Quotations")}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              AI Enhanced Quotation
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {quotation?.code} — {quotation?.customer?.name} ({quotation?.project?.name})
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" className="rounded-xl h-9 text-xs font-semibold shadow-sm border-slate-200" onClick={() => router.push(`/Quotations/${id}`)}>
            Open in Manual Editor
          </Button>
          <Button className="rounded-xl h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm transition-all">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve & Save
          </Button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANEL: Chat / Prompt Area */}
        <div className="w-[380px] min-w-[320px] max-w-[500px] flex flex-col bg-white border-r border-border shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-10">
          <div className="p-4 border-b border-border bg-slate-50/80">
            <h2 className="text-sm font-bold text-slate-800 mb-1">AI Assistant</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">Describe your project requirements in plain text, and I will generate the BOQ draft.</p>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {/* Chat history */}
            <div className="flex flex-col gap-4 pb-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                  <Bot className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-none p-3.5 text-[13px] text-slate-700 leading-relaxed shadow-sm">
                  Hi! I'm ready to build this quotation. What kind of work are we doing for <span className="font-semibold text-slate-900">{quotation?.customer?.name}</span>? You can paste rough notes or describe it naturally.
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Prompt Input */}
          <div className="p-4 bg-white border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
            <div className="relative flex flex-col gap-2">
              <Textarea
                placeholder="e.g., 10 light points, 2 fans, and 3 power points..."
                className="min-h-[110px] resize-none rounded-xl border-slate-200 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 text-[13px] p-3 pb-12 shadow-sm transition-all"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
              />
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                <Button 
                  size="icon" 
                  className="h-8 w-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all"
                  onClick={handleSendPrompt}
                  disabled={isProcessing || !prompt.trim()}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2.5 font-medium tracking-wide">PRESS ENTER TO SEND &middot; SHIFT+ENTER FOR NEW LINE</p>
          </div>
        </div>

        {/* RIGHT PANEL: Live Draft Grid */}
        <div className="flex-1 flex flex-col bg-slate-50/50 relative">
          
          {/* Action Bar */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-white shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <h3 className="text-[13px] font-semibold text-slate-700">Live Draft Preview</h3>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg gap-1.5 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-sm transition-colors">
                <AlertTriangle className="h-3.5 w-3.5" />
                Audit Quote
              </Button>
            </div>
          </div>

          {/* Grid Container */}
          <div className="flex-1 p-5 relative">
            {isProcessing ? (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                    <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Analyzing requirements...</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 text-center max-w-[200px]">Cross-referencing with your Master Data</p>
                </div>
              </div>
            ) : null}
            
            <Card className="h-full w-full rounded-xl border-border shadow-sm overflow-hidden bg-white flex flex-col">
              {rowData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/30">
                  <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center mb-5 border border-slate-200 shadow-sm">
                    <Sparkles className="h-8 w-8 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No data generated yet</h3>
                  <p className="text-[13px] text-muted-foreground mt-2 max-w-[280px] leading-relaxed">
                    Send a message to the AI Assistant on the left to start building your quotation draft.
                  </p>
                </div>
              ) : (
                <div className="flex-1 w-full p-0">
                  <AgGridReact
                    theme={appGridTheme}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    headerHeight={40}
                    rowHeight={40}
                    suppressCellFocus
                    animateRows
                  />
                </div>
              )}
            </Card>
          </div>
          
        </div>
      </div>
    </div>
  );
}
