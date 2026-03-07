/**
 * HDL Differential Testing Pipeline — Shared Types
 */
import type { Circuit, SignalValue } from '../../src/core/types.ts';

// ── Corpus ───────────────────────────────────────────────────────────────────

export interface PortRef {
  gateId: string;
  portName: string;
}

/** Stimulus vector: maps INPUT_SWITCH gateId → value */
export type StimulusVector = Record<string, 0 | 1>;

export interface CorpusEntry {
  name: string;
  description: string;
  category: 'combinatorial' | 'sequential' | 'ic74xx' | 'tristate';
  circuit: Circuit;
  /** Ordered input switch references (gateId + expected HDL port name) */
  inputs: PortRef[];
  /** Ordered output LED references (gateId + expected HDL port name) */
  outputs: PortRef[];
  /** Deterministic stimulus sequence */
  stimuli: StimulusVector[];
}

// ── Results ──────────────────────────────────────────────────────────────────

export interface CapturedStep {
  step: number;
  /** portName → value */
  values: Record<string, number>;
}

export interface SimResult {
  name: string;
  steps: CapturedStep[];
}

export interface HdlResult {
  name: string;
  language: 'verilog' | 'vhdl';
  steps: CapturedStep[];
  compileSuccess: boolean;
  compileStderr: string;
  runSuccess: boolean;
  runStderr: string;
}

export interface Mismatch {
  step: number;
  portName: string;
  simValue: number;
  hdlValue: number;
}

export interface ComparisonResult {
  name: string;
  language: 'verilog' | 'vhdl';
  pass: boolean;
  mismatches: Mismatch[];
}

export interface SynthResult {
  name: string;
  success: boolean;
  stderr: string;
}

// ── Report ───────────────────────────────────────────────────────────────────

export interface CircuitReport {
  name: string;
  category: string;
  simSteps: number;
  verilog: ComparisonResult | null;
  vhdl: ComparisonResult | null;
  synth: SynthResult | null;
}

export interface PipelineReport {
  timestamp: string;
  totalCircuits: number;
  verilogPass: number;
  verilogFail: number;
  vhdlPass: number;
  vhdlFail: number;
  synthPass: number;
  synthFail: number;
  results: CircuitReport[];
}

export type { Circuit, SignalValue };
