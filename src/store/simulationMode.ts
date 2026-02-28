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
export enum SimulationMode {
  ZERO_DELAY = 'ZERO_DELAY',
  GATE_DELAY  = 'GATE_DELAY',
}
