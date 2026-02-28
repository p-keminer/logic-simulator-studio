import type { GateInstance, Wire } from '../core/types';

interface ClipboardData {
  gates: GateInstance[];
  wires: Wire[];
}

let clipboard: ClipboardData | null = null;

export function setClipboard(data: ClipboardData): void {
  clipboard = data;
}

export function getClipboard(): ClipboardData | null {
  return clipboard;
}
