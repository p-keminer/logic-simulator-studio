import React from 'react';
import type { GateDefinition } from '../../core/types';

interface Props {
  definition: GateDefinition;
}

export function GatePaletteItem({ definition }: Props) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/gate-type', definition.typeId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      title={definition.description}
      className="
        group flex items-center gap-2 px-3 py-2 rounded-lg
        bg-slate-800 hover:bg-slate-700
        border border-slate-700 hover:border-slate-500
        cursor-grab active:cursor-grabbing
        transition-colors duration-150 select-none
      "
    >
      <span className="font-mono text-sm font-bold text-slate-200 w-12 shrink-0">
        {definition.label}
      </span>
      <span className="text-xs text-slate-500 truncate">
        {definition.description}
      </span>
    </div>
  );
}
