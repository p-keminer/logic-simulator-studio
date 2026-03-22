import type { GateTypeId } from '../types';

export function toCustomIcTypeId(name: string): GateTypeId {
  return `CIC_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
}
