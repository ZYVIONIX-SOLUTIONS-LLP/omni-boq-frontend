"use client";

import React, { memo } from 'react';
import type { CellFormat } from '@/components/spreadsheet/types';

export interface GridCellProps {
  left: number;
  top: number;
  width: number;
  height: number;
  display: string;
  format?: CellFormat;
  isError?: boolean;
  isActive: boolean;
  isSelected: boolean;
  isFrozenEdge?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function borderCss(format?: CellFormat) {
  const b = format?.borders;
  if (!b) return {};
  const side = (s?: { style: string; color: string }) =>
    s ? `${s.style === 'thick' ? '2.5px' : s.style === 'medium' ? '1.5px' : '1px'} ${s.style === 'dashed' ? 'dashed' : s.style === 'dotted' ? 'dotted' : s.style === 'double' ? 'double' : 'solid'} ${s.color}` : undefined;
  return {
    borderTop: side(b.top),
    borderRight: side(b.right),
    borderBottom: side(b.bottom),
    borderLeft: side(b.left),
  };
}

export const GridCell = memo(function GridCell(props: GridCellProps) {
  const { left, top, width, height, display, format, isError, isActive, isSelected, onMouseDown, onDoubleClick, onContextMenu } = props;

  const style: React.CSSProperties = {
    position: 'absolute',
    left,
    top,
    width,
    height,
    boxSizing: 'border-box',
    borderRight: '1px solid #e2e3e3',
    borderBottom: '1px solid #e2e3e3',
    ...borderCss(format),
    background: isSelected ? 'rgba(15,108,189,0.08)' : format?.bgColor || '#fff',
    color: isError ? '#d13438' : format?.color || '#000',
    fontWeight: format?.bold ? 700 : 400,
    fontStyle: format?.italic ? 'italic' : 'normal',
    textDecoration: [format?.underline ? 'underline' : '', format?.strikethrough ? 'line-through' : '']
      .filter(Boolean)
      .join(' ') || 'none',
    fontFamily: format?.fontFamily || 'Calibri, Segoe UI, Arial, sans-serif',
    fontSize: format?.fontSize ? `${format.fontSize}px` : '13px',
    display: 'flex',
    alignItems: format?.vAlign === 'top' ? 'flex-start' : format?.vAlign === 'bottom' ? 'flex-end' : 'center',
    justifyContent: format?.hAlign === 'center' ? 'center' : format?.hAlign === 'right' ? 'flex-end' : 'flex-start',
    padding: '0 3px',
    whiteSpace: format?.wrap ? 'normal' : 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.3,
    transform: format?.rotation ? `rotate(${-format.rotation}deg)` : undefined,
    cursor: 'cell',
    userSelect: 'none',
  };

  return (
    <div
      style={style}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      data-cell="1"
    >
      {display}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid #0f6cbd',
            pointerEvents: 'none',
            boxShadow: '0 0 0 0.5px #0f6cbd',
          }}
        />
      )}
    </div>
  );
});
