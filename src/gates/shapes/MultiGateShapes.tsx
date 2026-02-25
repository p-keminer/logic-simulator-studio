/**
 * Reusable shapes for multi-input AND/OR/XOR and their complements.
 * Factory functions return typed React components.
 */
import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

// ─── Multi-input AND / NAND ──────────────────────────────────────────────────

function makeAndShape(inverted: boolean, complementary: boolean) {
  return function MultiAndShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
    const W = definition.width;
    const H = definition.height;
    const bodyW = inverted || complementary ? W - 14 : W;
    const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;
    const body = `M 0,0 L ${bodyW * 0.55},0 Q ${bodyW},0 ${bodyW},${H / 2} Q ${bodyW},${H} ${bodyW * 0.55},${H} L 0,${H} Z`;

    return (
      <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
        <path d={body} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
        {inverted && (
          <circle cx={bodyW + 5} cy={H / 2} r={5} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
        )}
        {complementary && (
          <>
            <circle cx={bodyW + 5} cy={H * 0.33} r={5} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
            <line x1={bodyW} y1={H * 0.67} x2={W + 12} y2={H * 0.67} stroke={GATE_STROKE} strokeWidth={1.5} />
            <line x1={bodyW + 10} y1={H * 0.33} x2={W + 12} y2={H * 0.33} stroke={GATE_STROKE} strokeWidth={1.5} />
          </>
        )}
        {!complementary && (
          <line x1={inverted ? bodyW + 10 : bodyW} y1={H * 0.5} x2={W + 12} y2={H * 0.5} stroke={GATE_STROKE} strokeWidth={1.5} />
        )}
        {/* Input lines */}
        {definition.inputs.map((p) => (
          <line key={p.id} x1={-12} y1={p.relativeY * H} x2={0} y2={p.relativeY * H} stroke={GATE_STROKE} strokeWidth={1.5} />
        ))}
        <text x={bodyW / 2} y={H / 2 + 5} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#94a3b8" pointerEvents="none" fontFamily="monospace">&amp;</text>
        <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
      </g>
    );
  };
}

// ─── Multi-input OR / NOR ───────────────────────────────────────────────────

function makeOrShape(inverted: boolean, complementary: boolean) {
  return function MultiOrShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
    const W = definition.width;
    const H = definition.height;
    const bodyW = inverted || complementary ? W - 14 : W;
    const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;
    const body = `M 10,0 Q ${bodyW * 0.4},0 ${bodyW},${H / 2} Q ${bodyW * 0.4},${H} 10,${H} Q ${bodyW * 0.3},${H / 2} 10,0 Z`;

    return (
      <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
        <path d={body} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
        {inverted && (
          <circle cx={bodyW + 5} cy={H / 2} r={5} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
        )}
        {complementary && (
          <>
            <circle cx={bodyW + 5} cy={H * 0.33} r={5} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
            <line x1={bodyW} y1={H * 0.67} x2={W + 12} y2={H * 0.67} stroke={GATE_STROKE} strokeWidth={1.5} />
            <line x1={bodyW + 10} y1={H * 0.33} x2={W + 12} y2={H * 0.33} stroke={GATE_STROKE} strokeWidth={1.5} />
          </>
        )}
        {!complementary && (
          <line x1={inverted ? bodyW + 10 : bodyW} y1={H * 0.5} x2={W + 12} y2={H * 0.5} stroke={GATE_STROKE} strokeWidth={1.5} />
        )}
        {definition.inputs.map((p) => {
          const inX = p.relativeX * W + (p.relativeX === 0 ? 14 : 0);
          return <line key={p.id} x1={-12} y1={p.relativeY * H} x2={inX} y2={p.relativeY * H} stroke={GATE_STROKE} strokeWidth={1.5} />;
        })}
        <text x={bodyW * 0.45} y={H / 2 + 5} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#94a3b8" pointerEvents="none" fontFamily="monospace">≥1</text>
        <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
      </g>
    );
  };
}

// ─── Multi-input XOR ────────────────────────────────────────────────────────

function makeXorShape(complementary: boolean) {
  return function MultiXorShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
    const W = definition.width;
    const H = definition.height;
    const bodyW = complementary ? W - 14 : W;
    const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;
    const body = `M 14,0 Q ${bodyW * 0.4},0 ${bodyW},${H / 2} Q ${bodyW * 0.4},${H} 14,${H} Q ${bodyW * 0.32},${H / 2} 14,0 Z`;
    const extra = `M 6,0 Q ${bodyW * 0.24},${H / 2} 6,${H}`;

    return (
      <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
        <path d={body} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
        <path d={extra} fill="none" stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
        {complementary && (
          <>
            <circle cx={bodyW + 5} cy={H * 0.33} r={5} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
            <line x1={bodyW} y1={H * 0.67} x2={W + 12} y2={H * 0.67} stroke={GATE_STROKE} strokeWidth={1.5} />
            <line x1={bodyW + 10} y1={H * 0.33} x2={W + 12} y2={H * 0.33} stroke={GATE_STROKE} strokeWidth={1.5} />
          </>
        )}
        {!complementary && (
          <line x1={bodyW} y1={H * 0.5} x2={W + 12} y2={H * 0.5} stroke={GATE_STROKE} strokeWidth={1.5} />
        )}
        {definition.inputs.map((p) => (
          <line key={p.id} x1={-12} y1={p.relativeY * H} x2={16} y2={p.relativeY * H} stroke={GATE_STROKE} strokeWidth={1.5} />
        ))}
        <text x={bodyW * 0.48} y={H / 2 + 5} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#94a3b8" pointerEvents="none" fontFamily="monospace">=1</text>
        <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
      </g>
    );
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const And3Shape = makeAndShape(false, false);
export const And4Shape = makeAndShape(false, false);
export const Nand3Shape = makeAndShape(true, false);
export const Nand4Shape = makeAndShape(true, false);
export const AndCShape = makeAndShape(false, true);   // AND with Q + Q̄

export const Or3Shape = makeOrShape(false, false);
export const Or4Shape = makeOrShape(false, false);
export const Nor3Shape = makeOrShape(true, false);
export const Nor4Shape = makeOrShape(true, false);
export const OrCShape = makeOrShape(false, true);     // OR with Q + Q̄

export const Xor3Shape = makeXorShape(false);
export const XorCShape = makeXorShape(true);          // XOR with Q + Q̄
