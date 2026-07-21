"use client";

// Entry point for the ported Excel-clone spreadsheet. Adapted from the
// original standalone App.tsx: instead of filling the whole browser viewport
// (h-screen w-screen), it fills whatever container the caller gives it, so it
// can sit inside the app's normal page chrome. A single addition on top of
// the original — a fullscreen toggle button — lets the user expand it to
// cover the entire display via the native Fullscreen API.

import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import Toolbar from './Toolbar/Toolbar';
import FormulaBar from './FormulaBar/FormulaBar';
import Grid from './Grid/Grid';
import ContextMenu from './ContextMenu/ContextMenu';
import FindReplaceDialog from './Dialogs/FindReplaceDialog';
import StatusBar from './StatusBar/StatusBar';
import { useSpreadsheetStore } from './store/spreadsheetStore';

export interface SpreadsheetProps {
  fullscreenElementRef?: React.RefObject<HTMLElement | null>;
}

export default function Spreadsheet({ fullscreenElementRef }: SpreadsheetProps) {
  const loading = useSpreadsheetStore((s) => s.loading);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const target = fullscreenElementRef?.current || containerRef.current;
      setIsFullscreen(document.fullscreenElement === target);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [fullscreenElementRef]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const target = fullscreenElementRef?.current || containerRef.current;
      target?.requestFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex flex-col overflow-hidden bg-white relative"
    >
      <Toolbar />
      <FormulaBar />
      <div className="flex-1 relative overflow-hidden">
        <Grid />
        <FindReplaceDialog />
        <ContextMenu />

        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-excel-green border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">Loading sheet…</span>
            </div>
          </div>
        )}
      </div>
      <StatusBar />

      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        className="absolute top-1.5 right-2 z-50 flex items-center justify-center w-7 h-7 rounded text-white hover:bg-white/20"
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  );
}
