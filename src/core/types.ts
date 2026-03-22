import type React from 'react';

// ─── Signal ──────────────────────────────────────────────────────────────────

export type SignalValue = 0 | 1 | 2 | 3;

/** High-impedance value (tri-state output when OE is inactive). */
export const HI_Z: SignalValue = 2;

/** Unknown/conflict value (X): produced by Z/X inputs to logic gates or bus fights. */
export const UNKNOWN: SignalValue = 3;

export interface SignalState {
  value: SignalValue;
  version: number;
  lastChangedAt: number;
}

// ─── Port ────────────────────────────────────────────────────────────────────

export type PortDirection = 'input' | 'output';

export interface PortDefinition {
  id: string;
  direction: PortDirection;
  label?: string;
  relativeX: number;
  relativeY: number;
}

// ─── Gate ────────────────────────────────────────────────────────────────────

export type GateTypeId = string;

export interface GateShapeProps {
  gate: GateInstance;
  definition: GateDefinition;
  isSelected: boolean;
  inputSignals: Record<string, SignalState>;
  onPointerDown: (e: React.PointerEvent, gateId: string) => void;
  onPortClick: (e: React.MouseEvent, endpoint: WireEndpoint) => void;
}

export interface CustomICExportMetadata {
  subcircuit: Circuit;
  inputGateIds: string[];
  outputGateIds: string[];
}

export interface SerializedCustomICDefinition {
  name: string;
  typeId: GateTypeId;
  circuit: Circuit;
  portNames?: string[];
}

export type ProjectionSourceSystem = 'fsm_synth';

export type ProjectionSignalRole =
  | 'state'
  | 'state_inverted'
  | 'output'
  | 'input'
  | 'clock'
  | 'reset'
  | 'display_mirror'
  | 'internal_helper';

export type ProjectionVisibility = 'canonical' | 'derived' | 'debug';

export interface GateProjectionMetadata {
  sourceSystem: ProjectionSourceSystem;
  projectionBatchId: string;
  role: ProjectionSignalRole;
  visibility: ProjectionVisibility;
  signalLabel: string;
  groupKey: string;
  signalPortId?: string;
}

export interface GateDefinition {
  typeId: GateTypeId;
  label: string;
  category:
    | 'logic_basic'
    | 'logic_multi'
    | 'logic_special'
    | 'logic_comp_out'
    | 'mux'
    | 'bus'
    | 'arith'
    | 'flipflop'
    | 'register'
    | 'memory'
    | 'input'
    | 'output'
    | 'annotation'
    | 'ic74'
    | 'custom'
    | 'internal';
  inputs: Omit<PortDefinition, 'direction'>[];
  outputs: Omit<PortDefinition, 'direction'>[];
  width: number;
  height: number;
  /** Propagation delay in nanoseconds (for timing analysis) */
  propagationDelay?: number;
  /**
   * Pure combinational evaluate. Returns output signal values.
   * For stateful gates, reads previous state from customState.
   */
  evaluate: (
    inputs: Record<string, SignalValue>,
    customState?: Record<string, unknown>
  ) => Record<string, SignalValue>;
  /**
   * Optional: called after evaluate() for stateful gates (flip-flops, registers).
   * Returns updated customState. The engine stores this and passes it next cycle.
   */
  stateUpdate?: (
    inputs: Record<string, SignalValue>,
    outputs: Record<string, SignalValue>,
    customState?: Record<string, unknown>
  ) => Record<string, unknown>;
  toVerilog?: (gate: GateInstance, wireNames: Record<string, string>, constMap?: Record<string, 0 | 1>) => string;
  toVHDL?: (gate: GateInstance, wireNames: Record<string, string>, constMap?: Record<string, 0 | 1>) => string;
  /**
   * Optional: extra internal VHDL signals/constants that must be declared in the
   * architecture declarative region.
   * - Without depth: `signal name : STD_LOGIC_VECTOR(width-1 downto 0)`
   * - With depth + initData: `constant name` (ROM array with actual data)
   * - With depth, no initData: `signal name` (RAM array, zeroed)
   */
  vhdlExtraSignals?: (gate: GateInstance) => { name: string; width: number; depth?: number; initData?: number[] }[];
  /**
   * Optional: extra internal Verilog regs that must be declared at module scope.
   * - Without depth: `reg [width-1:0] name;`
   * - With depth: `reg [width-1:0] name [0:depth-1];` + optional `initial begin` block
   */
  verilogExtraRegs?: (gate: GateInstance) => { name: string; width: number; depth?: number; initData?: number[] }[];
  shapeComponent: React.ComponentType<GateShapeProps>;
  description?: string;
  isSynchronous?: boolean;
  /**
   * True for gates whose toVerilog uses always @(*) with blocking assignments.
   * Causes their output signals to be declared as `reg` instead of `wire`.
   */
  verilogAlwaysComb?: boolean;
  /**
   * Port IDs of outputs that are driven by continuous assignment ('assign') in Verilog,
   * even when the gate also has isSynchronous=true or verilogAlwaysComb=true for other
   * outputs. Those outputs must be declared as 'wire' (not 'reg').
   * Example: D-FF drives q via always @(posedge) → reg, but q_n via assign → wire.
   */
  verilogWireOutputs?: string[];
  /**
   * When true, Pass 2 of the Verilog generator does NOT emit a fallback wire
   * declaration for unconnected outputs. Set only for gates whose toVerilog()
   * handles missing outputs gracefully (returns a comment, not a reference).
   * Gates without this flag always get a fallback `w_<id>_<port>` declaration
   * so their internal emitter references are never left undeclared.
   */
  verilogSkipUnconnectedOutputs?: true;
  /**
   * Same for VHDL: Pass 1B skips signal declaration for unconnected outputs.
   * Set only for gates whose toVHDL() handles missing outputs gracefully.
   */
  vhdlSkipUnconnectedOutputs?: true;
  /**
   * Input port ID of the clock pin, used by the race-mode scheduler for
   * setup / hold risk detection (TASK 3). When the clock input transitions
   * 0→1 in the same simulation batch as any other data input, a 'timing'
   * severity race is emitted.
   * Not applicable to latches (level-sensitive) or async gates.
   */
  clockInputId?: string;
  /**
   * Default input values for disconnected pins. Used by the simulation engines
   * when an input has no upstream wire. Active-low control pins (e.g. /PRE, /CLR)
   * should default to 1 (inactive) instead of the global default of 0.
   */
  defaultInputValues?: Record<string, SignalValue>;
  /**
   * Which customState keys hold this gate's user-visible state.
   * Used by the State Transition Table to force / read state correctly.
   * Default when not specified: ['q'] (works for standard D/JK/T/SR flip-flops).
   * Examples: MS_JK_FF → ['qS'], REG4 → ['q0','q1','q2','q3'],
   *           BIN_CTR7S → ['count'].
   */
  stateKeys?: string[];
  /**
   * CustomState keys that are internal implementation details (not shown in STT).
   * Example: 'prevClk' for edge detection in flip-flops, 'qM' for MS_JK_FF master.
   * These keys exist in customState but are intentionally hidden from the user.
   * Tools can inspect this array to understand the full state space without
   * exposing it in educational/UI contexts.
   */
  hiddenStateKeys?: string[];
  /**
   * Initial values for ALL customState keys (visible + hidden).
   * Used by simulation init, STT enumeration, and reset logic.
   * Example: D_FF → { q: 0, prevClk: 0 }
   */
  stateInit?: Record<string, unknown>;
  /**
   * Optional structural metadata for user-defined custom ICs.
   * The HDL exporters use this to flatten a custom IC into its proven
   * subcircuit before generating Verilog/VHDL.
   */
  customIC?: CustomICExportMetadata;
}

export interface GateInstance {
  id: string;
  typeId: GateTypeId;
  x: number;
  y: number;
  /** Rotation in degrees (0, 90, 180, 270) */
  rotation?: number;
  /** User-defined instance name shown below gate and used in HDL */
  label?: string;
  outputSignals: Record<string, SignalState>;
  customState?: Record<string, unknown>;
  projection?: GateProjectionMetadata;
  isSelected: boolean;
}

// ─── Wire ────────────────────────────────────────────────────────────────────

export interface WireEndpoint {
  gateId: string;
  portId: string;
}

export interface Wire {
  id: string;
  from: WireEndpoint;
  to: WireEndpoint;
  signal: SignalState;
  waypoints?: Array<{ x: number; y: number }>;
  /** Custom wire color (CSS color string). If undefined, uses signal-based default. */
  color?: string;
  isSelected: boolean;
}

// ─── Circuit ─────────────────────────────────────────────────────────────────

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface CircuitMetadata {
  createdAt: string;
  updatedAt: string;
  description?: string;
  author?: string;
}

export interface Circuit {
  id: string;
  name: string;
  version: string;
  gates: Record<string, GateInstance>;
  wires: Record<string, Wire>;
  viewport: ViewportState;
  metadata: CircuitMetadata;
  customIcLibrary?: SerializedCustomICDefinition[];
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export interface SimulationResult {
  gateSignals: Record<string, Record<string, SignalState>>;
  wireSignals: Record<string, SignalState>;
  /** Updated customState per gateId — applied by reducer to circuit.gates */
  customStateUpdates: Record<string, Record<string, unknown>>;
  /** Accumulated propagation delays per gateId (ns) */
  propagationDelays?: Record<string, number>;
  cycles: string[][];
  evaluationOrder: string[];
}

// ─── Race Condition ────────────────────────────────────────────────────────────

/**
 * Severity of a detected race or hazard:
 *  critical — conflicting values on the same net at the same time (bus fight / logic error)
 *  warning  — same value from multiple drivers simultaneously (harmless but suspicious)
 *  glitch   — net changed polarity >1 time in one advance() step (reconvergent fan-out hazard
 *             or latch race-through)
 *  timing   — clock edge and data input changed in the same simulation tick for a FF
 *             (setup / hold window violation risk)
 *  loop     — event budget exhausted; circuit has a likely combinational oscillation loop
 */
export type RaceSeverity = 'critical' | 'warning' | 'glitch' | 'loop' | 'timing';

/** Machine-readable sub-classification of a race / hazard event. */
export type RaceType =
  | 'value_conflict'      // critical: two drivers, different values
  | 'multi_source'        // warning:  two drivers, same value
  | 'reconvergent_glitch' // glitch:   combinatorial net toggled >1×
  | 'latch_race_through'  // glitch:   latch output oscillated while transparent
  | 'setup_hold_risk'     // timing:   CLK edge + data change in same tick
  | 'loop_overflow';      // loop:     event counter exceeded MAX_EVENTS_PER_ADVANCE

/**
 * Describes a detected race condition in GATE_DELAY simulation mode.
 * A race occurs when two or more events target the same netId at the same time
 * but originate from different source gates or carry conflicting values.
 */
export interface RaceInfo {
  /** Unique identifier for this race event (time:netId) */
  raceId: string;
  /** Simulation time (tick) when the race occurs */
  time: number;
  /** Affected net: 'gateId:portId' of the output driving the net */
  netId: string;
  /** Gate IDs of all competing drivers */
  gateIds: string[];
  /** Signal values attempted by the competing drivers */
  values: SignalValue[];
  /** How severe this race is — drives display priority and wire colour. */
  severity: RaceSeverity;
  /** Fine-grained classification used for filtering and tooltips. */
  type?: RaceType;
}

/**
 * Store-level incident view of recurring race events.
 * `time` remains the latest occurrence time for backward-compatible sorting.
 */
export interface RaceIncident extends RaceInfo {
  /** Time of the first observed occurrence for this incident signature. */
  firstSeenTime: number;
  /** Time of the most recent observed occurrence for this incident signature. */
  lastSeenTime: number;
  /** Number of coalesced occurrences for the same incident signature. */
  occurrenceCount: number;
  /**
   * Deterministic local structural fingerprint of the incident cause.
   * Used to prune incidents when the observed net still exists but the relevant
   * upstream structure has changed in the meantime.
   */
  structuralSignature?: string;
}

// ─── Timing Diagram ───────────────────────────────────────────────────────────

export interface TimingSnapshot {
  /** Monotonic step counter (snapshot index) */
  step: number;
  /** Absolute simulation tick when this snapshot was taken */
  tick: number;
  /** Signal value per wire id */
  wireValues: Record<string, SignalValue>;
  /** Signal value per gate output (gateId:portId) */
  gateValues: Record<string, SignalValue>;
}
