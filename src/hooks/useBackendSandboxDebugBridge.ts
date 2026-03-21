import { useEffect, useMemo, useRef } from 'react';
import {
  createBackendSandboxCurrentCircuitSnapshot,
  summarizeBackendSandboxCurrentCircuitSnapshot,
  type BackendSandboxCurrentCircuitSnapshot,
  type BackendSandboxCurrentCircuitSnapshotSummary,
} from '../core/io/backendSandboxSnapshot';
import { useCircuitContext } from '../store/CircuitContext';

export interface BackendSandboxDebugBridgeHandle {
  getCurrentCircuitSnapshot: () => BackendSandboxCurrentCircuitSnapshot;
  getCurrentCircuitSnapshotSummary:
    () => BackendSandboxCurrentCircuitSnapshotSummary;
}

declare global {
  interface Window {
    __LGSIM_BACKEND_SANDBOX__?: BackendSandboxDebugBridgeHandle;
  }
}

const logSnapshotSummary = (
  message: string,
  summary: BackendSandboxCurrentCircuitSnapshotSummary,
) => {
  console.debug(`[backend-sandbox-bridge] ${message}`, {
    bridgeVersion: summary.bridgeVersion,
    circuitId: summary.circuitId,
    gateCount: summary.gateCount,
    nodeCount: summary.nodeCount,
    selectedElementCount: summary.selectedElementCount,
    snapshotFingerprint: summary.snapshotFingerprint,
    unresolvedGateTypeCount: summary.unresolvedGateTypeCount,
    wireCount: summary.wireCount,
  });
};

export function useBackendSandboxDebugBridge(): void {
  const { circuit } = useCircuitContext();
  const snapshot = useMemo(
    () => createBackendSandboxCurrentCircuitSnapshot(circuit),
    [circuit],
  );
  const summary = useMemo(
    () => summarizeBackendSandboxCurrentCircuitSnapshot(snapshot),
    [snapshot],
  );
  const snapshotRef = useRef(snapshot);
  const summaryRef = useRef(summary);

  snapshotRef.current = snapshot;
  summaryRef.current = summary;

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    const handle: BackendSandboxDebugBridgeHandle = {
      getCurrentCircuitSnapshot: () => snapshotRef.current,
      getCurrentCircuitSnapshotSummary: () => summaryRef.current,
    };

    window.__LGSIM_BACKEND_SANDBOX__ = handle;
    logSnapshotSummary('debug handle attached', summaryRef.current);

    return () => {
      if (window.__LGSIM_BACKEND_SANDBOX__ === handle) {
        delete window.__LGSIM_BACKEND_SANDBOX__;
      }

      console.debug('[backend-sandbox-bridge] debug handle detached');
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    logSnapshotSummary('current circuit snapshot updated', summary);
  }, [summary.snapshotFingerprint]);
}
