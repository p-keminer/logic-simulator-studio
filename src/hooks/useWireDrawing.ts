import { useState, useCallback } from 'react';
import { useCircuitContext } from '../store/CircuitContext';
import { gateRegistry } from '../core/registry/GateRegistry';
import { screenToSVG } from './useViewport';
import type { WireEndpoint } from '../core/types';

type WireState =
  | { phase: 'idle' }
  | {
      phase: 'drawing';
      from: WireEndpoint;
      waypoints: Array<{ x: number; y: number }>;
      mouseX: number;
      mouseY: number;
    };

export function useWireDrawing(svgRef?: React.RefObject<SVGSVGElement | null>) {
  const { circuit, dispatch } = useCircuitContext();
  const [state, setState] = useState<WireState>({ phase: 'idle' });

  const onPortClick = useCallback(
    (e: React.MouseEvent, endpoint: WireEndpoint) => {
      e.stopPropagation();

      const gate = circuit.gates[endpoint.gateId];
      if (!gate) return;
      const def = gateRegistry.get(gate.typeId);

      const isOutput = def.outputs.some((p) => p.id === endpoint.portId);
      const isInput = def.inputs.some((p) => p.id === endpoint.portId);

      if (state.phase === 'idle') {
        if (!isOutput) return;
        setState({
          phase: 'drawing',
          from: endpoint,
          waypoints: [],
          mouseX: e.clientX,
          mouseY: e.clientY,
        });
      } else {
        if (isOutput) {
          // Switch source
          setState({
            phase: 'drawing',
            from: endpoint,
            waypoints: [],
            mouseX: e.clientX,
            mouseY: e.clientY,
          });
          return;
        }

        if (isInput) {
          dispatch({
            type: 'WIRE_ADD',
            payload: { from: state.from, to: endpoint, waypoints: state.waypoints },
          });
          setState({ phase: 'idle' });
        }
      }
    },
    [state, circuit, dispatch]
  );

  /** Called when clicking on the canvas background while drawing a wire.
   *  If snapTarget is provided (from snap-mode), completes the wire to that port instead. */
  const onCanvasClickWaypoint = useCallback(
    (e: React.MouseEvent<SVGSVGElement>, snapTarget?: WireEndpoint) => {
      if (state.phase !== 'drawing' || !svgRef?.current) return;
      if (snapTarget) {
        dispatch({
          type: 'WIRE_ADD',
          payload: { from: state.from, to: snapTarget, waypoints: state.waypoints },
        });
        setState({ phase: 'idle' });
        return;
      }
      const { x, y } = screenToSVG(svgRef.current, e.clientX, e.clientY);
      setState((prev) =>
        prev.phase === 'drawing'
          ? { ...prev, waypoints: [...prev.waypoints, { x, y }] }
          : prev
      );
    },
    [state, svgRef, dispatch]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (state.phase === 'drawing') {
        setState((prev) =>
          prev.phase === 'drawing'
            ? { ...prev, mouseX: e.clientX, mouseY: e.clientY }
            : prev
        );
      }
    },
    [state.phase]
  );

  const cancelWire = useCallback(() => {
    setState({ phase: 'idle' });
  }, []);

  return {
    wireDrawing: state,
    onPortClick,
    onCanvasClickWaypoint,
    onMouseMove,
    cancelWire,
  };
}
