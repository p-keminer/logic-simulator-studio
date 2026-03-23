import {
  appBridgeSnapshotSchema,
  type AppBridgeSnapshot,
} from '../../contracts/app-bridge.js';
import {
  type CurrentCircuitSnapshotProvider,
  type CurrentCircuitSnapshotProviderDescription,
} from './current-circuit-snapshot-provider.js';
import { createFixtureCurrentCircuitSnapshot } from './fixture-current-circuit-snapshot.js';

export interface FixtureCurrentCircuitSnapshotProviderOptions {
  readonly providerId?: string;
  readonly snapshot?: AppBridgeSnapshot;
}

export class FixtureCurrentCircuitSnapshotProvider
  implements CurrentCircuitSnapshotProvider
{
  private readonly providerId: string;
  private readonly snapshot: AppBridgeSnapshot;

  constructor(options: FixtureCurrentCircuitSnapshotProviderOptions = {}) {
    this.providerId =
      options.providerId ?? 'fixture-current-circuit-snapshot-provider';
    this.snapshot = appBridgeSnapshotSchema.parse(
      options.snapshot ?? createFixtureCurrentCircuitSnapshot(),
    );
  }

  describe(): CurrentCircuitSnapshotProviderDescription {
    return {
      providerId: this.providerId,
      providerMode: 'fixture',
      bridgeVersion: this.snapshot.bridgeVersion,
      supportsCurrentCircuit: true,
    };
  }

  async getCurrentCircuit(): Promise<AppBridgeSnapshot | null> {
    return appBridgeSnapshotSchema.parse(this.snapshot);
  }
}
