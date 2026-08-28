export type CircuitSource = {
  id: string;
  name?: string;
  nodes?: CircuitNodeSource[];
  gates?: GateSource[];
  connections?: ConnectionSource[];
  selectedElementIds?: string[];
  notes?: string;
};

export type CircuitNodeSource = {
  id: string;
  kind: string;
  label?: string;
  [key: string]: unknown;
};

export type GateSource = {
  id: string;
  type: string;
  label?: string;
  inputs?: PortSource[];
  outputs?: PortSource[];
  [key: string]: unknown;
};

export type PortSource = {
  gateId: string;
  port: string;
  [key: string]: unknown;
};

export type ConnectionSource = {
  from: PortSource;
  to: PortSource;
  [key: string]: unknown;
};

export type CircuitContextLimits = {
  maxNodes: number;
  maxGates: number;
  maxConnections: number;
  maxSelectedElementIds: number;
  maxCircuitNameLength: number;
  maxLabelLength: number;
  maxNotesLength: number;
  maxSerializedBytes: number;
};

export type CircuitContextBuildOptions = {
  version: string;
  limits: CircuitContextLimits;
};

export type CircuitCountSummary = {
  selectedElementIds: number;
  nodes: number;
  gates: number;
  connections: number;
};
