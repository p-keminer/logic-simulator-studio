import type { Circuit, GateTypeId, SimulationResult, WireEndpoint } from '../core/types';

export type CircuitAction =
  | { type: 'GATE_ADD'; payload: { typeId: GateTypeId; x: number; y: number } }
  | { type: 'GATE_MOVE'; payload: { gateId: string; dx: number; dy: number } }
  | { type: 'GATE_MOVE_TO'; payload: { gateId: string; x: number; y: number } }
  | { type: 'GATE_DELETE'; payload: { gateId: string } }
  | { type: 'GATE_SELECT'; payload: { gateId: string; multi: boolean } }
  | { type: 'GATES_SELECT_SET'; payload: { gateIds: string[] } }
  | { type: 'GATE_TOGGLE_SWITCH'; payload: { gateId: string } }
  | { type: 'GATE_BTN_PULSE'; payload: { gateId: string } }
  | { type: 'GATE_BTN_RELEASE'; payload: { gateId: string } }
  | { type: 'GATE_ROM_LOAD'; payload: { gateId: string; data: number[] } }
  | { type: 'GATE_SET_LABEL'; payload: { gateId: string; label: string } }
  | { type: 'GATE_SET_TEXT'; payload: { gateId: string; text: string } }
  | { type: 'GATE_ROTATE'; payload: { gateId: string } }
  | { type: 'GATE_SET_FREQ'; payload: { gateId: string; frequency: number } }
  | { type: 'GATE_SET_LED_COLOR'; payload: { gateId: string; color: string } }
  | { type: 'GATE_CLOCK_TICK'; payload: { gateId: string } }
  | { type: 'WIRE_ADD'; payload: { from: WireEndpoint; to: WireEndpoint; waypoints?: Array<{ x: number; y: number }> } }
  | { type: 'WIRE_DELETE'; payload: { wireId: string } }
  | { type: 'WIRE_SELECT'; payload: { wireId: string } }
  | { type: 'WIRE_SET_COLOR'; payload: { wireId: string; color: string } }
  | { type: 'WIRE_SET_WAYPOINTS'; payload: { wireId: string; waypoints: Array<{ x: number; y: number }> } }
  | { type: 'WIRE_MOVE_WAYPOINT'; payload: { wireId: string; index: number; x: number; y: number } }
  | { type: 'WIRE_REMOVE_WAYPOINT'; payload: { wireId: string; index: number } }
  | { type: 'WIRE_INSERT_JUNCTION'; payload: { wireId: string; x: number; y: number } }
  | { type: 'SIMULATION_APPLY'; payload: SimulationResult }
  | { type: 'VIEWPORT_PAN'; payload: { dx: number; dy: number } }
  | { type: 'VIEWPORT_ZOOM'; payload: { zoom: number; centerX: number; centerY: number } }
  | { type: 'VIEWPORT_SET'; payload: { panX: number; panY: number; zoom: number } }
  | { type: 'CIRCUIT_LOAD'; payload: { circuit: Circuit } }
  | { type: 'CIRCUIT_RESET' }
  | { type: 'SELECTION_CLEAR' }
  | { type: 'DELETE_SELECTED' }
  | { type: 'GATE_SET_ADC_VALUE'; payload: { gateId: string; value: number } }
  | { type: 'GATES_MOVE_STEP'; payload: { dx: number; dy: number } };