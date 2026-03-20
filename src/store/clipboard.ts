import type { GateInstance, Wire } from '../core/types';

export type ClipboardProjectionBatchPolicy = 'regenerate' | 'drop';

export interface ClipboardData {
  gates: GateInstance[];
  wires: Wire[];
  fsmProjectionBatchPolicies?: Record<string, ClipboardProjectionBatchPolicy>;
}

let clipboard: ClipboardData | null = null;

export function setClipboard(data: ClipboardData): void {
  clipboard = data;
}

export function getClipboard(): ClipboardData | null {
  return clipboard;
}
