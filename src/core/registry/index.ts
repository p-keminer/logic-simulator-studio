// ─── Basic logic gates ───────────────────────────────────────────────────────
import '../../gates/definitions/and.gate';
import '../../gates/definitions/or.gate';
import '../../gates/definitions/not.gate';
import '../../gates/definitions/nand.gate';
import '../../gates/definitions/nor.gate';
import '../../gates/definitions/xor.gate';
import '../../gates/definitions/xnor.gate';
import '../../gates/definitions/buffer.gate';
// ─── Multi-input gates ───────────────────────────────────────────────────────
import '../../gates/definitions/multiInput.gates';
// ─── Complementary output gates ──────────────────────────────────────────────
import '../../gates/definitions/complementary.gates';
// ─── I/O components ──────────────────────────────────────────────────────────
import '../../gates/io/inputSwitch.gate';
import '../../gates/io/outputLed.gate';
import '../../gates/io/textNote.gate';
import '../../gates/io/const.gates';
import '../../gates/io/clock.gate';
import '../../gates/io/sevenseg.gate';
// ─── Multiplexers + Demultiplexers ────────────────────────────────────────────
import '../../gates/definitions/mux.gates';
// ─── Sequential: flip-flops + registers ──────────────────────────────────────
import '../../gates/sequential/flipflops.gates';
import '../../gates/sequential/flipflopsAsync.gates';
import '../../gates/sequential/registers.gates';
import '../../gates/sequential/parallelReg.gates';
// ─── Schmitt Trigger + Tri-State ──────────────────────────────────────────────
import '../../gates/definitions/schmitt.gate';
import '../../gates/definitions/tristate.gate';
// ─── Comparators & ALU ───────────────────────────────────────────────────────
import '../../gates/definitions/comparator.gates';
import '../../gates/definitions/alu.gate';
// ─── Bus Splitter / Merger ────────────────────────────────────────────────────
import '../../gates/definitions/busHelper.gates';
// ─── Master-Slave FF + Edge SR-FF ────────────────────────────────────────────
import '../../gates/sequential/masterSlaveFF.gates';
// ─── Push Button ─────────────────────────────────────────────────────────────
import '../../gates/io/pushButton.gate';
// ─── Memory: ROM + RAM ───────────────────────────────────────────────────────
import '../../gates/sequential/rom.gate';
import '../../gates/sequential/ram.gate';
// ─── Junction node (internal, not shown in palette) ──────────────────────────
import '../../gates/definitions/junction.gate';
// ─── Phase 6: Dot Matrix + Binary Counter + Stepper + ADC ────────────────────
import '../../gates/io/dotMatrix.gate';
import '../../gates/io/stepper.gate';
import '../../gates/io/adc.gate';
import '../../gates/sequential/binCounter.gate';
// ─── 74xx IC library ─────────────────────────────────────────────────────────
import '../../gates/ic74xx/ic74xx.gates';

export { gateRegistry } from './GateRegistry';