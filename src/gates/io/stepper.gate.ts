import { gateRegistry } from '../../core/registry/GateRegistry';
import { StepperShape } from '../shapes/StepperShape';

// CW step sequence: each key→value is a valid clockwise transition
const CW_NEXT: Record<string, string> = {
  '1000': '0100',
  '0100': '0010',
  '0010': '0001',
  '0001': '1000',
};

// CCW: reverse of CW
const CCW_NEXT: Record<string, string> = {
  '0100': '1000',
  '0010': '0100',
  '0001': '0010',
  '1000': '0001',
};

gateRegistry.register({
  typeId: 'STEPPER_VIZ',
  label: 'Stepper',
  category: 'io',
  width: 120,
  height: 120,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.2 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.4 },
    { id: 'c', label: 'C', relativeX: 0, relativeY: 0.6 },
    { id: 'd', label: 'D', relativeX: 0, relativeY: 0.8 },
  ],
  outputs: [],
  isSynchronous: true,
  evaluate: () => ({}),
  stateUpdate(inputs, _outputs, customState) {
    const angle    = (customState?.angle    as number) ?? 0;
    const prevABCD = (customState?.prevABCD as string) ?? '0000';
    const a = inputs['a'] ?? 0;
    const b = inputs['b'] ?? 0;
    const c = inputs['c'] ?? 0;
    const d = inputs['d'] ?? 0;
    const curr = `${a}${b}${c}${d}`;
    let newAngle = angle;
    if (CW_NEXT[prevABCD] === curr)  newAngle = (angle + 45) % 360;
    else if (CCW_NEXT[prevABCD] === curr) newAngle = ((angle - 45) + 360) % 360;
    return { angle: newAngle, prevABCD: curr };
  },
  shapeComponent: StepperShape,
  description: 'Schrittmotor-Visualisierung: Erkennt Vollschritt-Sequenzen (A→B→C→D) und dreht den Zeiger.',
});
