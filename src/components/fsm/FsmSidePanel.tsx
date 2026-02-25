import { FsmConfig } from './FsmConfig';
import { FsmStateTable } from './FsmStateTable';

export function FsmSidePanel() {
  return (
    <div style={{
      width: 320, flexShrink: 0,
      background: '#0f172a', borderLeft: '1px solid #1e293b',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      <FsmConfig />
      <FsmStateTable />
    </div>
  );
}
