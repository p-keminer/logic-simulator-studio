import { useCallback, useRef, useState } from 'react';
import { useCircuitContext } from '../store/CircuitContext';
import { gateRegistry } from '../core/registry/GateRegistry';
import { screenToSVG } from './useViewport';

interface DragState {
  active: boolean;
  gateId: string | null;
  lastX: number;
  lastY: number;
}

/** Pan sensitivity: higher = faster panning (pixels per viewport unit) */
const PAN_SENSITIVITY = 2.5;
/** Lasso activation threshold in SVG units */
const LASSO_THRESHOLD = 4;

export interface LassoRect { x1: number; y1: number; x2: number; y2: number; }

export function useDrag(svgRef: React.RefObject<SVGSVGElement | null>, isDrawingWire: boolean) {
  const { circuit, dispatch } = useCircuitContext();
  const drag = useRef<DragState>({ active: false, gateId: null, lastX: 0, lastY: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lassoOrigin = useRef<{ x: number; y: number } | null>(null);
  const [lassoRect, setLassoRect] = useState<LassoRect | null>(null);

  const onGatePointerDown = useCallback(
    (e: React.PointerEvent, gateId: string) => {
      if ((e.target as SVGElement).dataset.port) return;
      e.stopPropagation();
      if (!svgRef.current) return;
      const { x, y } = screenToSVG(svgRef.current, e.clientX, e.clientY);
      drag.current = { active: true, gateId, lastX: x, lastY: y };
      (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
      dispatch({ type: 'GATE_SELECT', payload: { gateId, multi: e.shiftKey } });
    },
    [dispatch, svgRef]
  );

  const onCanvasPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      if (e.button === 0 && !isDrawingWire) {
        // Don't start lasso when clicking on a port circle or a gate body
        if ((e.target as SVGElement).dataset.port) return;
        if ((e.target as SVGElement).closest?.('[data-gate-id]')) return;
        if (!svgRef.current) return;
        const { x, y } = screenToSVG(svgRef.current, e.clientX, e.clientY);
        lassoOrigin.current = { x, y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [isDrawingWire, svgRef]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (isPanning.current) {
        const dx = (e.clientX - panStart.current.x) * PAN_SENSITIVITY;
        const dy = (e.clientY - panStart.current.y) * PAN_SENSITIVITY;
        panStart.current = { x: e.clientX, y: e.clientY };
        dispatch({ type: 'VIEWPORT_PAN', payload: { dx, dy } });
        return;
      }

      if (drag.current.active && drag.current.gateId && svgRef.current) {
        const { x, y } = screenToSVG(svgRef.current, e.clientX, e.clientY);
        const dx = x - drag.current.lastX;
        const dy = y - drag.current.lastY;
        drag.current.lastX = x;
        drag.current.lastY = y;
        dispatch({ type: 'GATE_MOVE', payload: { gateId: drag.current.gateId, dx, dy } });
        return;
      }

      if (lassoOrigin.current && svgRef.current) {
        const { x, y } = screenToSVG(svgRef.current, e.clientX, e.clientY);
        const dx = x - lassoOrigin.current.x;
        const dy = y - lassoOrigin.current.y;
        if (Math.abs(dx) > LASSO_THRESHOLD || Math.abs(dy) > LASSO_THRESHOLD) {
          setLassoRect({
            x1: Math.min(lassoOrigin.current.x, x),
            y1: Math.min(lassoOrigin.current.y, y),
            x2: Math.max(lassoOrigin.current.x, x),
            y2: Math.max(lassoOrigin.current.y, y),
          });
        }
      }
    },
    [dispatch, svgRef]
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent<SVGSVGElement>) => {
      drag.current.active = false;
      drag.current.gateId = null;
      isPanning.current = false;

      if (lassoOrigin.current) {
        if (lassoRect && svgRef.current) {
          const { x1, y1, x2, y2 } = lassoRect;
          const selected = Object.values(circuit.gates).filter((gate) => {
            try {
              const def = gateRegistry.get(gate.typeId);
              return gate.x < x2 && gate.x + def.width > x1 && gate.y < y2 && gate.y + def.height > y1;
            } catch { return false; }
          }).map((g) => g.id);
          dispatch({ type: 'GATES_SELECT_SET', payload: { gateIds: selected } });
        } else {
          dispatch({ type: 'SELECTION_CLEAR' });
        }
        lassoOrigin.current = null;
        setLassoRect(null);
      }
    },
    [dispatch, lassoRect, circuit.gates, svgRef]
  );

  return { onGatePointerDown, onCanvasPointerDown, onPointerMove, onPointerUp, lassoRect };
}