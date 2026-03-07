import { useEffect, useRef } from 'react';
import { useCircuitContext } from '../store/CircuitContext';
import { ZOOM_FACTOR, MIN_ZOOM, MAX_ZOOM } from '../utils/constants';

/**
 * Registriert einen NON-PASSIVE Wheel-Listener direkt am SVG-Element,
 * damit e.preventDefault() greift und der Browser nicht statt des Canvas zoomt.
 * svgRef muss übergeben werden (wird nach dem ersten Mount gesetzt).
 */
export function useViewport(svgRef: React.RefObject<SVGSVGElement | null>) {
  const { circuit, dispatch } = useCircuitContext();

  // Immer-aktueller Viewport-Ref – verhindert stale closures im Wheel-Handler
  const vpRef = useRef(circuit.viewport);

  useEffect(() => {
    vpRef.current = circuit.viewport;
  }, [circuit.viewport]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();                            // klappt nur bei passive:false
      const vp      = vpRef.current;
      const rect    = el.getBoundingClientRect();
      const centerX = (e.clientX - rect.left) / vp.zoom + vp.panX;
      const centerY = (e.clientY - rect.top)  / vp.zoom + vp.panY;
      const factor  = e.deltaY < 0 ? 1 + ZOOM_FACTOR : 1 - ZOOM_FACTOR;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vp.zoom * factor));
      dispatch({ type: 'VIEWPORT_ZOOM', payload: { zoom: newZoom, centerX, centerY } });
    };

    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [svgRef, dispatch]); // stabile Refs → läuft einmal nach Mount

  return { viewport: circuit.viewport };
}

/** Convert screen coordinates to SVG world coordinates */
export function screenToSVG(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const transformed = pt.matrixTransform(matrix.inverse());
  return { x: transformed.x, y: transformed.y };
}
