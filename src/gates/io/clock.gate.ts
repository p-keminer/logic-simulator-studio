import { gateRegistry } from '../../core/registry/GateRegistry';
import { ClockShape } from '../shapes/ClockShape';
import { SIM_TICKS_PER_SEC } from '../../core/simulation/tickEngine';

gateRegistry.register({
  typeId: 'CLOCK',
  label: 'Taktgenerator',
  category: 'input',
  width: 80,
  height: 50,
  inputs: [],
  outputs: [{ id: 'clk', label: 'CLK', relativeX: 1, relativeY: 0.5 }],
  evaluate: (_inputs, customState) => ({
    clk: (customState?.value as 0 | 1) ?? 0,
  }),
  // Tick-basierter Zähler: togglet das Clock-Signal exakt alle toggleInterval Ticks.
  // Keinerlei Abhängigkeit von Echtzeit oder Framerate — reiner Integer-Zähler.
  // _paused wird von runOneTick injiziert (isClockPaused) und verhindert Advance
  // während der Settle-Phase und bei pausiertem Takt.
  stateUpdate: (_inputs, _outputs, cs) => {
    if (cs?._paused) return { ...cs };

    const freq           = Math.max(0.1, Math.min(100, (cs?.frequency as number) ?? 1));
    const toggleInterval = Math.max(1, Math.round(SIM_TICKS_PER_SEC / (freq * 2)));
    const tickCounter    = ((cs?.tickCounter as number) ?? 0) + 1;

    if (tickCounter >= toggleInterval) {
      const cur = (cs?.value as 0 | 1) ?? 0;
      return { ...cs, tickCounter: 0, value: (cur ^ 1) as 0 | 1 };
    }
    return { ...cs, tickCounter };
  },
  shapeComponent: ClockShape,
  description: 'Taktgenerator — Doppelklick zum Einstellen der Frequenz (0.1–100 Hz)',
});