import type { GateDefinition, SignalValue } from '../../core/types';
import { BinCounter7SegShape } from '../shapes/BinCounter7SegShape';
import { gateRegistry } from '../../core/registry/GateRegistry';

const binCounterDef: GateDefinition = {
  typeId: 'BIN_CTR7S',
  label: 'BIN-CTR',
  category: 'sequential',
  width: 100,
  height: 220,
  propagationDelay: 5,
  inputs: [
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.25 },
    { id: 'rst', label: 'RST', relativeX: 0, relativeY: 0.50 },
    { id: 'en',  label: 'EN',  relativeX: 0, relativeY: 0.75 },
  ],
  outputs: [
    { id: 'q0',  label: 'Q0',  relativeX: 1, relativeY: 0.30 },
    { id: 'q1',  label: 'Q1',  relativeX: 1, relativeY: 0.43 },
    { id: 'q2',  label: 'Q2',  relativeX: 1, relativeY: 0.57 },
    { id: 'q3',  label: 'Q3',  relativeX: 1, relativeY: 0.70 },
    { id: 'rco', label: 'RCO', relativeX: 1, relativeY: 0.85 },
  ],
  isSynchronous: true,
  evaluate(_inputs, customState) {
    const count = Math.max(0, Math.min(15, (customState?.count as number) ?? 0));
    return {
      q0:  ((count >> 0) & 1) as SignalValue,
      q1:  ((count >> 1) & 1) as SignalValue,
      q2:  ((count >> 2) & 1) as SignalValue,
      q3:  ((count >> 3) & 1) as SignalValue,
      rco: (count === 15 ? 1 : 0) as SignalValue,
    };
  },
  stateUpdate(inputs, _outputs, customState) {
    const count   = (customState?.count   as number) ?? 0;
    const prevClk = (customState?.prevClk as number) ?? 0;
    const clk = inputs['clk'] ?? 0;
    const rst = inputs['rst'] ?? 0;
    const en  = inputs['en']  ?? 1;
    if (rst === 1) return { count: 0, prevClk: clk };
    if (prevClk === 0 && clk === 1 && en === 1) return { count: (count + 1) % 16, prevClk: 1 };
    return { count, prevClk: clk };
  },
  shapeComponent: BinCounter7SegShape,
  description: 'Binärzähler 0-15 mit integrierter Hex-7-Segment-Anzeige. CLK↑+EN=1 → Zählen; RST=1 → Zurücksetzen.',
};

gateRegistry.register(binCounterDef);
