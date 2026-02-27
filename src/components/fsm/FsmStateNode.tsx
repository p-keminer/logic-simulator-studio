import type { FsmStateNode as FsmStateNodeType } from '../../fsm/types';

export const STATE_R = 38; // circle radius in SVG units

interface Props {
  state:            FsmStateNodeType;
  isSelected:       boolean;
  isConnectSource:  boolean;
  archType:         'moore' | 'mealy';
  outputNames:      string[];
}

export function FsmStateNode({ state, isSelected, isConnectSource, archType, outputNames }: Props) {
  const stroke      = isSelected ? '#60a5fa' : isConnectSource ? '#facc15' : '#64748b';
  const strokeW     = (isSelected || isConnectSource) ? 2.5 : 1.5;
  const fill        = isSelected ? '#1e3a5f' : '#0f172a';
  // outputNames[0] = LSB (bit 0), outputNames[n-1] = MSB → display MSB-first (left to right)
  const outputLabel = archType === 'moore'
    ? `/ ${outputNames.map((_, i) => ((state.output >> (outputNames.length - 1 - i)) & 1)).join('')}`
    : '';

  // Self-loop badge – shown above the state when it is the connect source
  const BADGE_CY = state.y - STATE_R - 22;

  return (
    <>
      {/* ── Main state group (no pointer events – handled by canvas) ─── */}
      <g pointerEvents="none">
        {state.isInitial && (
          <circle cx={state.x} cy={state.y} r={STATE_R + 7}
            fill="none" stroke={stroke} strokeWidth={1} opacity={0.5} />
        )}
        <circle cx={state.x} cy={state.y} r={STATE_R}
          fill={fill} stroke={stroke} strokeWidth={strokeW}
          style={{ transition: 'stroke 150ms, fill 150ms' }}
        />

        {/* State label */}
        <text x={state.x} y={state.y + (outputLabel ? -6 : 4)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={13} fontWeight={600} fill="#f1f5f9" fontFamily="monospace"
        >
          {state.label}
        </text>

        {/* Moore output below label */}
        {outputLabel && (
          <text x={state.x} y={state.y + 11}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fill="#22c55e" fontFamily="monospace"
          >
            {outputLabel}
          </text>
        )}

        {/* Initial-state arrow indicator */}
        {state.isInitial && (
          <g>
            <line x1={state.x - STATE_R - 30} y1={state.y}
                  x2={state.x - STATE_R - 6}  y2={state.y}
              stroke="#64748b" strokeWidth={1.5} markerEnd="url(#fsm-arrow-gray)" />
            <text x={state.x - STATE_R - 20} y={state.y - 8}
              fontSize={8} fill="#475569" fontFamily="monospace" textAnchor="middle">
              Start
            </text>
          </g>
        )}
      </g>

      {/* ── Self-loop badge (visual only – click captured by canvas hit-test) ── */}
      {isConnectSource && (
        <g pointerEvents="none" style={{ cursor: 'pointer' }}>
          <title>Selbstübergang erstellen</title>
          <line
            x1={state.x} y1={BADGE_CY + 12}
            x2={state.x} y2={state.y - STATE_R - (state.isInitial ? 8 : 1)}
            stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 2" opacity={0.5}
          />
          <circle cx={state.x} cy={BADGE_CY} r={13}
            fill="#1e3a8a" stroke="#60a5fa" strokeWidth={1.5} />
          <text x={state.x} y={BADGE_CY + 5} textAnchor="middle"
            fontSize={16} fill="#93c5fd" fontFamily="sans-serif"
          >
            ↺
          </text>
        </g>
      )}
    </>
  );
}
