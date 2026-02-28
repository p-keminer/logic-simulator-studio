import type React from 'react';

// ─── Signal ──────────────────────────────────────────────────────────────────

export type SignalValue = 0 | 1;

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

export interface GateDefinition {
  typeId: GateTypeId;
  label: string;
  category:
    | 'logic'
    | 'logic_mi'
    | 'logic_comp'
    | 'sequential'
    | 'register'
    | 'io'
    | 'annotation'
    | 'ic74'
    | 'custom'
    | 'memory'
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
  toVerilog?: (gate: GateInstance, wireNames: Record<string, string>) => string;
  toVHDL?: (gate: GateInstance, wireNames: Record<string, string>) => string;
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
