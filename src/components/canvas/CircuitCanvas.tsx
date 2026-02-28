import React, { useRef, useCallback, useState } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { useViewport } from '../../hooks/useViewport';
import { useDrag } from '../../hooks/useDrag';
import { useWireDrawing } from '../../hooks/useWireDrawing';
import { CanvasBackground } from './CanvasBackground';
import { CanvasGate } from './CanvasGate';
import { CanvasWire } from './CanvasWire';
import { WireInProgress } from './WireInProgress';
import { GateContextMenu } from './GateContextMenu';
import { screenToSVG } from '../../hooks/useViewport';
import type { GateTypeId } from '../../core/types';
import { findPortAt } from '../../utils/geometry';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRID_SIZE } from '../../utils/constants';
import { setClipboard, getClipboard } from '../../store/clipboard';
import { generateId } from '../../utils/idGenerator';

const WIRE_COLORS = ['','#22c55e','#ef4444','#f59e0b','#3b82f6','#a855f7','#ec4899','#ffffff','#f97316'];
interface WireCtxMenu { wireId: string; screenX: number; screenY: number; svgX: number; svgY: number; }
interface GateCtxMenu { gateId: string; screenX: number; screenY: number; }
interface CanvasCtxMenu { screenX: number; screenY: number; svgX: number; svgY: number; }

export function CircuitCanvas() {
  const { circuit, dispatch } = useCircuitContext();
  const svgRef = useRef<SVGSVGElement>(null);
  const { viewport } = useViewport(svgRef);
  const [wireCtxMenu, setWireCtxMenu] = useState<WireCtxMenu | null>(null);
  const [gateCtxMenu, setGateCtxMenu] = useState<GateCtxMenu | null>(null);
  const [canvasCtxMenu, setCanvasCtxMenu] = useState<CanvasCtxMenu | null>(null);
  const [wireMode, setWireMode] = useState(false);
  const [snapMode, setSnapMode] = useState(false);
  const snapTargetRef = useRef<{ gateId: string; portId: string } | null>(null);

  const { wireDrawing, onPortClick, onCanvasClickWaypoint, onMouseMove, cancelWire } = useWireDrawing(svgRef);
  const isDrawingWire = wireDrawing.phase === 'drawing';
  const { onGatePointerDown, onCanvasPointerDown, onPointerMove, onPointerUp, lassoRect } = useDrag(svgRef, isDrawingWire);

  const viewBox = `${viewport.panX} ${viewport.panY} ${CANVAS_WIDTH / viewport.zoom} ${CANVAS_HEIGHT / viewport.zoom}`;

  const handleDrop = useCallback(
    (e: React.DragEvent<SVGSVGElement>) => {
      e.preventDefault();
      const typeId = e.dataTransfer.getData('application/gate-type') as GateTypeId;
      if (!typeId || !svgRef.current) return;
      const { x, y } = screenToSVG(svgRef.current, e.clientX, e.clientY);
      dispatch({ type: 'GATE_ADD', payload: { typeId, x, y } });
    },
    [dispatch]
  );

  const copySelected = useCallback(() => {
    const gates = Object.values(circuit.gates).filter((g) => g.isSelected);
    if (gates.length === 0) return;
    const selectedIds = new Set(gates.map((g) => g.id));
    const wires = Object.values(circuit.wires).filter(
      (w) => selectedIds.has(w.from.gateId) && selectedIds.has(w.to.gateId)
    );
    setClipboard({ gates, wires });
  }, [circuit.gates, circuit.wires]);

  const pasteClipboard = useCallback((svgX?: number, svgY?: number) => {
    const cb = getClipboard();
    if (!cb || cb.gates.length === 0) return;
    const minX = Math.min(...cb.gates.map((g) => g.x));
    const minY = Math.min(...cb.gates.map((g) => g.y));
    const idMap = new Map<string, string>();
    for (const g of cb.gates) idMap.set(g.id, generateId());
    const offsetX = svgX !== undefined ? svgX - minX : 24;
    const offsetY = svgY !== undefined ? svgY - minY : 24;
    const newGates = cb.gates.map((g) => ({
      ...g,
      id: idMap.get(g.id)!,
      x: g.x + offsetX,
      y: g.y + offsetY,
      isSelected: true,
      outputSignals: Object.fromEntries(Object.keys(g.outputSignals).map((k) => [k, { value: 0 as 0|1, version: 0, lastChangedAt: 0 }])),
    }));
    const newWires = cb.wires.map((w) => ({
      ...w,
      id: generateId(),
      from: { ...w.from, gateId: idMap.get(w.from.gateId) ?? w.from.gateId },
      to:   { ...w.to,   gateId: idMap.get(w.to.gateId)   ?? w.to.gateId },
      isSelected: false,
    }));
    dispatch({ type: 'GATES_PASTE', payload: { gates: newGates, wires: newWires } });
  }, [dispatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { cancelWire(); setWireCtxMenu(null); setGateCtxMenu(null); setCanvasCtxMenu(null); setWireMode(false); }
      if (e.key === 'w' || e.key === 'W') setWireMode((m) => !m);
      if (e.key === 'x' || e.key === 'X') setSnapMode((m) => !m);
      if (e.key === 'Delete' || e.key === 'Backspace') dispatch({ type: 'DELETE_SELECTED' });
      if (e.key === 'r' || e.key === 'R') {
        const selected = Object.values(circuit.gates).filter((g) => g.isSelected);
        for (const gate of selected) dispatch({ type: 'GATE_ROTATE', payload: { gateId: gate.id } });
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        copySelected();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        pasteClipboard();
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const hasSelection = Object.values(circuit.gates).some((g) => g.isSelected);
        if (hasSelection) {
          e.preventDefault();
          const step = GRID_SIZE * (e.shiftKey ? 5 : 1);
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0;
          dispatch({ type: 'GATES_MOVE_STEP', payload: { dx, dy } });
        }
      }
    },
    [cancelWire, dispatch, circuit.gates, copySelected, pasteClipboard]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      onPointerMove(e);
      onMouseMove(e);
      if (snapMode && wireDrawing.phase === 'drawing' && svgRef.current) {
        const { x, y } = screenToSVG(svgRef.current, e.clientX, e.clientY);
        const found = findPortAt(x, y, circuit, 40);
        snapTargetRef.current = (found?.direction === 'input')
          ? { gateId: found.gateId, portId: found.portId }
          : null;
      } else {
        snapTargetRef.current = null;
      }
    },
    [onPointerMove, onMouseMove, snapMode, wireDrawing.phase, circuit]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (wireCtxMenu) { setWireCtxMenu(null); return; }
      if (gateCtxMenu) { setGateCtxMenu(null); return; }
      if (canvasCtxMenu) { setCanvasCtxMenu(null); return; }
      if (wireDrawing.phase === 'drawing') {
        if (snapMode && snapTargetRef.current) {
          onCanvasClickWaypoint(e, snapTargetRef.current);
        } else {
          onCanvasClickWaypoint(e);
        }
      }
    },
    [wireDrawing.phase, onCanvasClickWaypoint, wireCtxMenu, gateCtxMenu, canvasCtxMenu, snapMode]
  );

  const handleWireContextMenu = useCallback(
    (wireId: string, e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      setGateCtxMenu(null);
      const svgPos = svgRef.current ? screenToSVG(svgRef.current, e.clientX, e.clientY) : { x: 0, y: 0 };
      setWireCtxMenu({ wireId, screenX: e.clientX, screenY: e.clientY, svgX: svgPos.x, svgY: svgPos.y });
    },
    []
  );

  const handleGateContextMenu = useCallback(
    (gateId: string, e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      setWireCtxMenu(null);
      setGateCtxMenu({ gateId, screenX: e.clientX, screenY: e.clientY });
    },
    []
  );

  const gateCtxGate = gateCtxMenu ? circuit.gates[gateCtxMenu.gateId] : null;

  return (
    <>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={viewBox}
        tabIndex={0}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={onPointerUp}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
        onClick={handleCanvasClick}
        onContextMenu={(e) => {
          e.preventDefault();
          if (getClipboard() !== null && svgRef.current) {
            const svgPos = screenToSVG(svgRef.current, e.clientX, e.clientY);
            setWireCtxMenu(null); setGateCtxMenu(null);
            setCanvasCtxMenu({ screenX: e.clientX, screenY: e.clientY, svgX: svgPos.x, svgY: svgPos.y });
          }
        }}
        style={{
          outline: snapMode ? '2px solid #facc15' : (wireMode && !isDrawingWire) ? '2px solid #3b82f6' : 'none',
          outlineOffset: '-2px',
          cursor: (isDrawingWire || wireMode) ? 'crosshair' : 'default',
          background: '#0f172a',
        }}
      >
        <defs>
          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CanvasBackground panX={viewport.panX} panY={viewport.panY} zoom={viewport.zoom} />
        <g id="wires-layer">
          {Object.values(circuit.wires).map((wire) => (
            <CanvasWire key={wire.id} wire={wire} onContextMenu={handleWireContextMenu} />
          ))}
          {isDrawingWire && (
            <WireInProgress
              from={wireDrawing.from}
              waypoints={wireDrawing.waypoints}
              mouseX={wireDrawing.mouseX}
              mouseY={wireDrawing.mouseY}
              svgRef={svgRef}
              snapMode={snapMode}
            />
          )}
        </g>
        <g id="gates-layer">
          {Object.values(circuit.gates).map((gate) => (
            <CanvasGate
              key={gate.id}
              gate={gate}
              onGatePointerDown={onGatePointerDown}
              onPortClick={onPortClick}
              onGateContextMenu={handleGateContextMenu}
            />
          ))}
        </g>
        {lassoRect && (
          <rect
            x={lassoRect.x1} y={lassoRect.y1}
            width={lassoRect.x2 - lassoRect.x1}
            height={lassoRect.y2 - lassoRect.y1}
            fill="rgba(59,130,246,0.08)"
            stroke="#3b82f6"
            strokeWidth={1 / viewport.zoom}
            strokeDasharray={`${4 / viewport.zoom} ${3 / viewport.zoom}`}
            pointerEvents="none"
          />
        )}
      </svg>

      {wireCtxMenu && (
        <div style={{ position:'fixed', top:wireCtxMenu.screenY, left:wireCtxMenu.screenX, background:'#0f172a', border:'1px solid #334155', borderRadius:8, padding:'8px', zIndex:2000, boxShadow:'0 8px 32px rgba(0,0,0,0.7)' }}>
          <div style={{ color:'#94a3b8', fontSize:11, marginBottom:6, fontFamily:'monospace' }}>Kabelfarbe</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', maxWidth:180 }}>
            {WIRE_COLORS.map((color) => (
              <button key={color||'default'} title={color||'Standard'}
                onClick={() => { dispatch({ type:'WIRE_SET_COLOR', payload:{ wireId:wireCtxMenu.wireId, color } }); setWireCtxMenu(null); }}
                style={{ width:24, height:24, borderRadius:4, border:'2px solid #475569', background:color||'#475569', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff' }}>
                {!color && '×'}
              </button>
            ))}
          </div>
          <button onClick={() => { dispatch({ type:'WIRE_INSERT_JUNCTION', payload:{ wireId:wireCtxMenu.wireId, x:wireCtxMenu.svgX, y:wireCtxMenu.svgY } }); setWireCtxMenu(null); }}
            style={{ marginTop:6, width:'100%', background:'none', color:'#94a3b8', border:'1px solid #334155', borderRadius:4, padding:'3px 0', cursor:'pointer', fontSize:11, fontFamily:'monospace' }}>
            ⬤ Knotenpunkt einfügen
          </button>
          <button onClick={() => { dispatch({ type:'WIRE_DELETE', payload:{ wireId:wireCtxMenu.wireId } }); setWireCtxMenu(null); }}
            style={{ marginTop:4, width:'100%', background:'#7f1d1d', color:'#fca5a5', border:'1px solid #ef4444', borderRadius:4, padding:'3px 0', cursor:'pointer', fontSize:11, fontFamily:'monospace' }}>
            Kabel löschen
          </button>
          <div style={{ position:'fixed', inset:0, zIndex:-1 }} onMouseDown={() => setWireCtxMenu(null)} />
        </div>
      )}

      {gateCtxMenu && gateCtxGate && (
        <GateContextMenu
          gate={gateCtxGate}
          screenX={gateCtxMenu.screenX}
          screenY={gateCtxMenu.screenY}
          onClose={() => setGateCtxMenu(null)}
        />
      )}

      {canvasCtxMenu && (
        <div style={{ position:'fixed', top:canvasCtxMenu.screenY, left:canvasCtxMenu.screenX, background:'#0f172a', border:'1px solid #334155', borderRadius:8, padding:'4px 0', zIndex:2000, boxShadow:'0 8px 32px rgba(0,0,0,0.7)', minWidth:160 }}>
          <div style={{ position:'fixed', inset:0, zIndex:-1 }} onMouseDown={() => setCanvasCtxMenu(null)} />
          <button
            style={{ display:'block', width:'100%', background:'none', border:'none', color:'#cbd5e1', fontSize:12, fontFamily:'monospace', textAlign:'left', padding:'5px 12px', cursor:'pointer', borderRadius:4, whiteSpace:'nowrap' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
            onClick={() => { pasteClipboard(canvasCtxMenu.svgX, canvasCtxMenu.svgY); setCanvasCtxMenu(null); }}
          >
            📋 Einfügen (Strg+V)
          </button>
        </div>
      )}
    </>
  );
}