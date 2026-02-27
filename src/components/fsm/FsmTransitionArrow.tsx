import type React from 'react';
import type { FsmStateNode, FsmTransition, FsmMachine } from '../../fsm/types';
import { STATE_R } from './FsmStateNode';
import { conditionLabel } from '../../fsm/conditionParser';

interface Props {
  transition:    FsmTransition;
  fromState:     FsmStateNode;
  toState:       FsmStateNode;
  fsm:           FsmMachine;
  isSelected:    boolean;
  onClick:       (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

/** Determine curvature for this transition to avoid overlapping arrows. */
function getCurvature(fsm: FsmMachine, t: FsmTransition): number {
  if (t.fromId === t.toId) return 0;
  const hasReverse = fsm.transitions.some(
    o => o.fromId === t.toId && o.toId === t.fromId && o.id !== t.id
  );
  const siblingIdx = fsm.transitions
    .filter(o => o.fromId === t.fromId && o.toId === t.toId)
    .findIndex(o => o.id === t.id);
  const offsets = [50, -70, 90, -90];
  if (siblingIdx > 0) return offsets[siblingIdx] ?? 50;
  return hasReverse ? 50 : 0;
}

/** Quadratic bezier point at t=0.5 */
function qbez(sx:number,sy:number,cx:number,cy:number,ex:number,ey:number) {
  return {
    x: 0.25*sx + 0.5*cx + 0.25*ex,
    y: 0.25*sy + 0.5*cy + 0.25*ey,
  };
}

/** Estimate label background width based on character count */
function labelBgWidth(text: string): number {
  return Math.max(32, text.length * 6.5 + 10);
}

export function FsmTransitionArrow({ transition, fromState, toState, fsm, isSelected, onClick, onDoubleClick }: Props) {
  const color    = isSelected ? '#60a5fa' : '#94a3b8';
  const markerId = isSelected ? 'fsm-arrow-blue' : 'fsm-arrow-gray';
  const label    = conditionLabel(transition.conditionText)
    + (fsm.archType === 'mealy' ? ` / ${transition.mealyOutput}` : '');
  const bgW = labelBgWidth(label);

  // ── Self-loop ──────────────────────────────────────────────────────────────
  if (transition.fromId === transition.toId) {
    const { x, y } = fromState;
    const d = `M ${x-8} ${y-STATE_R+4} C ${x-65} ${y-STATE_R-70} ${x+65} ${y-STATE_R-70} ${x+8} ${y-STATE_R+4}`;
    const lx = x, ly = y - STATE_R - 52;
    return (
      <g onClick={onClick} onDoubleClick={onDoubleClick}
        onPointerDown={e => e.stopPropagation()} style={{ cursor: 'pointer' }}>
        <path d={d} stroke={color} strokeWidth={isSelected?2.5:1.5}
          fill="none" markerEnd={`url(#${markerId})`}
          style={{ transition:'stroke 120ms' }} />
        <rect x={lx - bgW/2} y={ly-8} width={bgW} height={15} rx={3} fill="#0f172a" opacity={0.85}/>
        <text x={lx} y={ly+2} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" pointerEvents="none">
          {label}
        </text>
      </g>
    );
  }

  // ── Regular transition ────────────────────────────────────────────────────
  const dx = toState.x - fromState.x, dy = toState.y - fromState.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const nx = dx/len, ny = dy/len;
  const sx = fromState.x + nx * STATE_R, sy = fromState.y + ny * STATE_R;
  const ex = toState.x  - nx * (STATE_R + 2), ey = toState.y - ny * (STATE_R + 2);

  const curv = getCurvature(fsm, transition);
  const px = -ny, py = nx;
  const cpx = (sx+ex)/2 + px*curv, cpy = (sy+ey)/2 + py*curv;

  const d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  const mid = qbez(sx,sy,cpx,cpy,ex,ey);

  return (
    <g onClick={onClick} onDoubleClick={onDoubleClick}
      onPointerDown={e => e.stopPropagation()} style={{ cursor: 'pointer' }}>
      <path d={d} stroke="transparent" strokeWidth={14} fill="none"/>
      <path d={d} stroke={color} strokeWidth={isSelected?2.5:1.5}
        fill="none" markerEnd={`url(#${markerId})`}
        style={{ transition:'stroke 120ms' }} />
      <rect x={mid.x - bgW/2} y={mid.y-10} width={bgW} height={16} rx={3} fill="#0f172a" opacity={0.85}/>
      <text x={mid.x} y={mid.y+2} textAnchor="middle" fontSize={10} fill={color} fontFamily="monospace" pointerEvents="none">
        {label}
      </text>
    </g>
  );
}

/** Preview arrow while user is drawing a new transition */
export function FsmPreviewArrow({ fromState, toX, toY }: { fromState: FsmStateNode; toX: number; toY: number }) {
  const dx = toX-fromState.x, dy = toY-fromState.y;
  const len = Math.hypot(dx,dy);
  if (len < 5) return null;
  const nx = dx/len, ny = dy/len;
  const sx = fromState.x + nx*STATE_R, sy = fromState.y + ny*STATE_R;
  return (
    <line x1={sx} y1={sy} x2={toX} y2={toY}
      stroke="#facc15" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.7}
      markerEnd="url(#fsm-arrow-yellow)" style={{ pointerEvents:'none' }} />
  );
}
