import type { FsmStateNode as FsmStateNodeType } from '../../fsm/types';

export const STATE_R = 38; // circle radius in SVG units

interface Props {
  state: FsmStateNodeType;
  isSelected: boolean;
  isConnectSource: boolean;
  isUnreachable: boolean;
  archType: 'moore' | 'mealy';
  outputNames: string[];
}

export function FsmStateNode({
  state,
  isSelected,
  isConnectSource,
  isUnreachable,
  archType,
  outputNames,
}: Props) {
  const stroke = isSelected ? '#60a5fa' : isConnectSource ? '#facc15' : isUnreachable ? '#f59e0b' : '#64748b';
  const strokeW = (isSelected || isConnectSource) ? 2.5 : 1.5;
  const fill = isSelected ? '#1e3a5f' : isUnreachable ? '#1c1204' : '#0f172a';
  const outputLabel = archType === 'moore'
    ? `/ ${outputNames.map((_, i) => ((state.output >> (outputNames.length - 1 - i)) & 1)).join('')}`
    : '';
  const badgeCY = state.y - STATE_R - 22;

  return (
    <>
      <g pointerEvents="none">
        {state.isInitial && (
          <circle
            cx={state.x}
            cy={state.y}
            r={STATE_R + 7}
            fill="none"
            stroke={stroke}
            strokeWidth={1}
            opacity={0.5}
          />
        )}
        <circle
          cx={state.x}
          cy={state.y}
          r={STATE_R}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeDasharray={isUnreachable ? '6 4' : undefined}
          style={{ transition: 'stroke 150ms, fill 150ms' }}
        />

        <text
          x={state.x}
          y={state.y + (outputLabel ? -6 : 4)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={13}
          fontWeight={600}
          fill="#f1f5f9"
          fontFamily="monospace"
        >
          {state.label}
        </text>

        {outputLabel && (
          <text
            x={state.x}
            y={state.y + 11}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="#22c55e"
            fontFamily="monospace"
          >
            {outputLabel}
          </text>
        )}

        {state.isInitial && (
          <g>
            <line
              x1={state.x - STATE_R - 30}
              y1={state.y}
              x2={state.x - STATE_R - 6}
              y2={state.y}
              stroke="#64748b"
              strokeWidth={1.5}
              markerEnd="url(#fsm-arrow-gray)"
            />
            <text
              x={state.x - STATE_R - 20}
              y={state.y - 8}
              fontSize={8}
              fill="#475569"
              fontFamily="monospace"
              textAnchor="middle"
            >
              Start
            </text>
          </g>
        )}

        {isUnreachable && (
          <g>
            <circle
              cx={state.x + STATE_R - 5}
              cy={state.y - STATE_R + 5}
              r={8}
              fill="#451a03"
              stroke="#f59e0b"
              strokeWidth={1.25}
            />
            <text
              x={state.x + STATE_R - 5}
              y={state.y - STATE_R + 9}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="#fdba74"
              fontFamily="monospace"
            >
              !
            </text>
          </g>
        )}
      </g>

      {isConnectSource && (
        <g pointerEvents="none" style={{ cursor: 'pointer' }}>
          <title>Selbstuebergang erstellen</title>
          <line
            x1={state.x}
            y1={badgeCY + 12}
            x2={state.x}
            y2={state.y - STATE_R - (state.isInitial ? 8 : 1)}
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.5}
          />
          <circle cx={state.x} cy={badgeCY} r={13} fill="#1e3a8a" stroke="#60a5fa" strokeWidth={1.5} />
          <text
            x={state.x}
            y={badgeCY + 5}
            textAnchor="middle"
            fontSize={16}
            fill="#93c5fd"
            fontFamily="sans-serif"
          >
            ↺
          </text>
        </g>
      )}
    </>
  );
}
