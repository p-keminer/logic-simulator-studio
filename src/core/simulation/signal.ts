/**
 * Central signal model: 0 = LOW, 1 = HIGH, 2 = Hi-Z, 3 = UNKNOWN/X.
 *
 * Bus resolution and IEEE 1164-style logic helpers.
 * All gate evaluate functions should use these helpers instead of raw
 * bitwise operators so that Z/X are handled correctly.
 */
import type { SignalValue } from '../types';

// ── Bus/Wired resolution ──────────────────────────────────────────────────────

/**
 * Resolves multiple simultaneously active driver values on a shared net.
 * IEEE 1164 resolution rules:
 *   - No drivers              → 0  (pull-down default)
 *   - All Z                   → Z
 *   - One active (0|1), rest Z → that value
 *   - Same active value × N   → that value
 *   - Conflicting 0 + 1       → X  (bus fight)
 *   - Any X in inputs         → X
 */
export function resolveWiredValues(values: SignalValue[]): SignalValue {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  let hasZero = false;
  let hasOne  = false;
  let hasX    = false;
  for (const v of values) {
    if      (v === 3) { hasX    = true; break; }
    else if (v === 0) hasZero = true;
    else if (v === 1) hasOne  = true;
    // v === 2 (Z): not driving — ignored
  }
  if (hasX)              return 3;  // X propagates
  if (hasZero && hasOne) return 3;  // conflict → X
  if (hasZero)           return 0;
  if (hasOne)            return 1;
  return 2;                          // all Z
}

// ── IEEE 1164-style logic helpers ─────────────────────────────────────────────

/** AND: 0 dominates; any Z/X input (without a dominating 0) → X */
export function logicAND(values: SignalValue[]): SignalValue {
  if (values.some(v => v === 0)) return 0;
  if (values.some(v => v === 2 || v === 3)) return 3;
  return 1;
}

/** OR: 1 dominates; any Z/X input (without a dominating 1) → X */
export function logicOR(values: SignalValue[]): SignalValue {
  if (values.some(v => v === 1)) return 1;
  if (values.some(v => v === 2 || v === 3)) return 3;
  return 0;
}

/** NOT: Z or X → X */
export function logicNOT(v: SignalValue): SignalValue {
  if (v === 0) return 1;
  if (v === 1) return 0;
  return 3;
}

export function logicNAND(values: SignalValue[]): SignalValue {
  return logicNOT(logicAND(values));
}

export function logicNOR(values: SignalValue[]): SignalValue {
  return logicNOT(logicOR(values));
}

/** XOR: any Z/X input → X */
export function logicXOR(a: SignalValue, b: SignalValue): SignalValue {
  if (a === 2 || a === 3 || b === 2 || b === 3) return 3;
  return (a ^ b) as 0 | 1;
}

export function logicXNOR(a: SignalValue, b: SignalValue): SignalValue {
  return logicNOT(logicXOR(a, b));
}
