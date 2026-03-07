/**
 * Simulation mode selector.
 *
 * GATE_DELAY  – Discrete-event scheduler.
 *               Gate outputs are committed after propagationDelay ticks.
 *               Glitches / races become visible as red wire highlights.
 */
// `enum` is disallowed by erasableSyntaxOnly — use a const-object + type alias instead.
export const SimulationMode = {
  GATE_DELAY: 'GATE_DELAY',
} as const;

export type SimulationMode = typeof SimulationMode[keyof typeof SimulationMode];
