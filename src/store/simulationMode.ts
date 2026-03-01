/**
 * Simulation mode selector.
 *
 * ZERO_DELAY  – Classic double-buffer tick engine (default).
 *               All gate outputs become effective immediately within the same tick.
 *               Identical to the existing behaviour; zero regressions.
 *
 * GATE_DELAY  – Discrete-event scheduler.
 *               Gate outputs are committed after propagationDelay ticks.
 *               Glitches / races become visible as red wire highlights.
 */
// `enum` is disallowed by erasableSyntaxOnly — use a const-object + type alias instead.
// All call sites use SimulationMode.ZERO_DELAY / GATE_DELAY identically.
export const SimulationMode = {
  ZERO_DELAY: 'ZERO_DELAY',
  GATE_DELAY:  'GATE_DELAY',
} as const;

export type SimulationMode = typeof SimulationMode[keyof typeof SimulationMode];
