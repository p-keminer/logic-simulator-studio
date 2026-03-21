import type {
  AppBridgeSnapshot,
  AppBridgeVersion,
} from '../../contracts/app-bridge';

export type CurrentCircuitSnapshotProviderMode =
  | 'fixture'
  | 'adapter'
  | 'unconfigured';

export interface CurrentCircuitSnapshotProviderDescription {
  readonly providerId: string;
  readonly providerMode: CurrentCircuitSnapshotProviderMode;
  readonly bridgeVersion: AppBridgeVersion;
  readonly supportsCurrentCircuit: boolean;
}

export interface CurrentCircuitSnapshotProvider {
  describe(): CurrentCircuitSnapshotProviderDescription;
  getCurrentCircuit(): Promise<AppBridgeSnapshot | null>;
}
