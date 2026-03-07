import { useState, useRef, useCallback, useEffect } from 'react';
import { useFsm } from '../../fsm/FsmContext';
import { FsmStateNode as FsmStateNodeComp, STATE_R } from './FsmStateNode';
import { FsmTransitionArrow, FsmPreviewArrow } from './FsmTransitionArrow';
import { FsmStateEditor } from './FsmStateEditor';
import { FsmTransitionEditor } from './FsmTransitionEditor';

export type CanvasMode = 'select' | 'connect';

const VB_W      = 1400;
const VB_H      = 780;
const STEP      = 10;     // Pfeiltasten-Schrittweite (px in World-Koordinaten)
const MIN_ZOOM  = 0.15;
const MAX_ZOOM  = 5;

// ── Koordinaten-Helfer ────────────────────────────────────────────────────────

function clientToSvg(svg: SVGSVGElement, cx: number, cy: number) {
  const pt = svg.createSVGPoint();
  pt.x = cx; pt.y = cy;
  return pt.matrixTransform(svg.getScreenCTM()!.inverse());
}

function svgToWorld(svgX: number, svgY: number, zoom: number, panX: number, panY: number) {
  return { x: (svgX - panX) / zoom, y: (svgY - panY) / zoom };
}

/** Gibt die ID des Zustands zurück, auf den (wx,wy) trifft, sonst null. */
function hitState(
  wx: number, wy: number,
  states: Record<string, { id: string; x: number; y: number }>,
) {
  for (const s of Object.values(states)) {
    // Haupt-Kreis
    if (Math.hypot(s.x - wx, s.y - wy) <= STATE_R + 6) return s.id;
    // Self-loop-Badge (erscheint wenn Zustand Connect-Quelle ist)
    const badgeCY = s.y - STATE_R - 22;
    if (Math.hypot(s.x - wx, badgeCY - wy) <= 16) return s.id;
  }
  return null;
}

/** Prüft ob Zustandsmittelpunkt (cx,cy) im Lasso-Rechteck liegt. */
function lassoHits(lx: number, ly: number, lw: number, lh: number, cx: number, cy: number) {
  const left   = Math.min(lx, lx + lw);
  const right  = Math.max(lx, lx + lw);
  const top    = Math.min(ly, ly + lh);
  const bottom = Math.max(ly, ly + lh);
  return cx >= left && cx <= right && cy >= top && cy <= bottom;
}

// ── Typen für den Interaktions-Zustand ───────────────────────────────────────

interface LassoRect { x: number; y: number; w: number; h: number }

type Interaction =
  | { kind: 'states'; startWX: number; startWY: number;
      origins: Record<string, { x: number; y: number }>;
      moved: boolean; hitId: string }
  | { kind: 'lasso';  originX: number; originY: number }
  | { kind: 'pan';    startSvgX: number; startSvgY: number;
      startPanX: number; startPanY: number };

// ── Hauptkomponente ───────────────────────────────────────────────────────────

interface Props { mode: CanvasMode; onModeChange: (m: CanvasMode) => void }

export function FsmCanvas({ mode, onModeChange }: Props) {
  const { fsm, dispatch } = useFsm();
  const svgRef = useRef<SVGSVGElement>(null);

  // Selektion
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [selectedTransId, setSelectedTransId] = useState<string | null>(null);

  // Connect-Modus
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [previewPt,   setPreviewPt]   = useState<{ x: number; y: number } | null>(null);

  // Modale
  const [stateEditorId, setStateEditorId] = useState<string | null>(null);
  const [transAddData,  setTransAddData]  = useState<{ fromId: string; toId: string } | null>(null);
  const [transEditId,   setTransEditId]   = useState<string | null>(null);

  // Zoom / Pan (State für Rendering, Refs für Event-Handler ohne stale closures)
  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });

  // Lasso-Rechteck (nur zum Zeichnen; Berechnung in PointerUp aus Ref-Daten)
  const [lasso, setLasso] = useState<LassoRect | null>(null);

  // ── Immer-aktuelle Refs (kein stale-closure-Problem in useCallback) ─────────
  const zoomRef          = useRef(zoom);
  const panRef           = useRef(pan);
  const modeRef          = useRef(mode);
  const connectFromRef   = useRef(connectFrom);
  const selectedIdsRef   = useRef(selectedIds);
  const fsmRef           = useRef(fsm);
  const interactionRef   = useRef<Interaction | null>(null);

  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
    modeRef.current = mode;
    connectFromRef.current = connectFrom;
    selectedIdsRef.current = selectedIds;
    fsmRef.current = fsm;
  }, [zoom, pan, mode, connectFrom, selectedIds, fsm]);

  // ── Nicht-passiver Wheel-Listener für Zoom ───────────────────────────────────
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor   = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const curZoom  = zoomRef.current;
      const curPan   = panRef.current;
      const newZoom  = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, curZoom * factor));
      const svgP     = clientToSvg(el, e.clientX, e.clientY);
      // Zoom zentriert auf Mausposition
      const newPanX  = svgP.x - (svgP.x - curPan.x) * (newZoom / curZoom);
      const newPanY  = svgP.y - (svgP.y - curPan.y) * (newZoom / curZoom);
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Tastatur ──────────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'Escape') {
      setConnectFrom(null); setPreviewPt(null); onModeChange('select');
      setSelectedIds(new Set()); setSelectedTransId(null);
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') &&
        !stateEditorId && !transAddData && !transEditId) {
      selectedIdsRef.current.forEach(id =>
        dispatch({ type: 'DELETE_STATE', payload: { id } }));
      if (selectedTransId)
        dispatch({ type: 'DELETE_TRANSITION', payload: { id: selectedTransId } });
      setSelectedIds(new Set()); setSelectedTransId(null);
      return;
    }

    // Pfeiltasten: ausgewählte Zustände verschieben
    const step = e.shiftKey ? 50 : STEP;
    let dx = 0, dy = 0;
    if      (e.key === 'ArrowLeft')  dx = -step;
    else if (e.key === 'ArrowRight') dx =  step;
    else if (e.key === 'ArrowUp')    dy = -step;
    else if (e.key === 'ArrowDown')  dy =  step;
    else return;

    e.preventDefault();
    const ids = selectedIdsRef.current;
    if (ids.size === 0) return;

    const deltas: Record<string, { x: number; y: number }> = {};
    ids.forEach(id => {
      const s = fsmRef.current.states[id];
      if (s) deltas[id] = { x: s.x + dx, y: s.y + dy };
    });
    dispatch({ type: 'MOVE_STATES', payload: { deltas } });
  }, [selectedTransId, stateEditorId, transAddData, transEditId, dispatch, onModeChange]);

  // ── Pointer-Down ──────────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const svgP = clientToSvg(svgRef.current, e.clientX, e.clientY);

    // Mitteltaste ODER Alt+Linktaste → Panning (identisch zum Schaltungs-Canvas)
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      interactionRef.current = {
        kind: 'pan',
        startSvgX: svgP.x, startSvgY: svgP.y,
        startPanX: panRef.current.x, startPanY: panRef.current.y,
      };
      try { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }
    if (e.button !== 0) return;

    const worldP = svgToWorld(svgP.x, svgP.y, zoomRef.current, panRef.current.x, panRef.current.y);
    const hitId  = hitState(worldP.x, worldP.y, fsmRef.current.states);

    if (hitId) {
      // ── Treffer auf Zustand ──
      if (modeRef.current === 'connect') {
        // Im Connect-Modus nur klick aufzeichnen, keine Drag-Origins
        interactionRef.current = {
          kind: 'states', startWX: worldP.x, startWY: worldP.y,
          origins: {}, moved: false, hitId,
        };
        try { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
        return;
      }

      // Selektion aktualisieren
      let newSel: Set<string>;
      if (e.shiftKey) {
        newSel = new Set(selectedIdsRef.current);
        if (newSel.has(hitId)) newSel.delete(hitId);
        else newSel.add(hitId);
      } else {
        newSel = selectedIdsRef.current.has(hitId)
          ? new Set(selectedIdsRef.current)
          : new Set([hitId]);
      }
      setSelectedIds(newSel);
      setSelectedTransId(null);

      // Drag-Origins für alle selektierten Zustände speichern
      const origins: Record<string, { x: number; y: number }> = {};
      newSel.forEach(id => {
        const s = fsmRef.current.states[id];
        if (s) origins[id] = { x: s.x, y: s.y };
      });
      interactionRef.current = {
        kind: 'states', startWX: worldP.x, startWY: worldP.y,
        origins, moved: false, hitId,
      };
      try { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }

    } else {
      // ── Hintergrund-Klick → Lasso starten ──
      if (!e.shiftKey) { setSelectedIds(new Set()); setSelectedTransId(null); }
      if (modeRef.current === 'connect') {
        setConnectFrom(null); setPreviewPt(null); return;
      }
      interactionRef.current = { kind: 'lasso', originX: worldP.x, originY: worldP.y };
      setLasso({ x: worldP.x, y: worldP.y, w: 0, h: 0 });
      try { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  }, []);

  // ── Pointer-Move ─────────────────────────────────────────────────────────────
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const svgP   = clientToSvg(svgRef.current, e.clientX, e.clientY);
    const worldP = svgToWorld(svgP.x, svgP.y, zoomRef.current, panRef.current.x, panRef.current.y);

    // Vorschau-Pfeil im Connect-Modus aktualisieren
    if (modeRef.current === 'connect' && connectFromRef.current) {
      setPreviewPt(worldP);
    }

    const ia = interactionRef.current;
    if (!ia) return;

    if (ia.kind === 'pan') {
      setPan({
        x: ia.startPanX + (svgP.x - ia.startSvgX),
        y: ia.startPanY + (svgP.y - ia.startSvgY),
      });
      return;
    }

    if (ia.kind === 'states' && Object.keys(ia.origins).length > 0) {
      const dx = worldP.x - ia.startWX;
      const dy = worldP.y - ia.startWY;
      // Kleinen Tote-Zone-Bereich ignorieren (Klick vs. Drag)
      if (!ia.moved && Math.hypot(dx, dy) < 4 / zoomRef.current) return;
      ia.moved = true;
      const deltas: Record<string, { x: number; y: number }> = {};
      Object.entries(ia.origins).forEach(([id, orig]) => {
        deltas[id] = { x: orig.x + dx, y: orig.y + dy };
      });
      dispatch({ type: 'MOVE_STATES', payload: { deltas } });
    }

    if (ia.kind === 'lasso') {
      setLasso({
        x: ia.originX, y: ia.originY,
        w: worldP.x - ia.originX,
        h: worldP.y - ia.originY,
      });
    }
  }, [dispatch]);

  // ── Pointer-Up ───────────────────────────────────────────────────────────────
  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    try {
      (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore cases where the pointer capture is already released.
    }
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const svgP   = clientToSvg(svgRef.current, e.clientX, e.clientY);
    const worldP = svgToWorld(svgP.x, svgP.y, zoomRef.current, panRef.current.x, panRef.current.y);
    const ia = interactionRef.current;
    interactionRef.current = null;
    if (!ia) return;

    // Klick auf Zustand (kein Drag)
    if (ia.kind === 'states' && !ia.moved && modeRef.current === 'connect') {
      const cf = connectFromRef.current;
      if (!cf) {
        setConnectFrom(ia.hitId);
        setPreviewPt(worldP);
      } else {
        setTransAddData({ fromId: cf, toId: ia.hitId });
        setConnectFrom(null); setPreviewPt(null);
      }
    }

    // Lasso auswerten
    if (ia.kind === 'lasso') {
      const lw = worldP.x - ia.originX;
      const lh = worldP.y - ia.originY;
      if (Math.abs(lw) > 5 || Math.abs(lh) > 5) {
        const lassoIds = new Set<string>();
        Object.values(fsmRef.current.states).forEach(s => {
          if (lassoHits(ia.originX, ia.originY, lw, lh, s.x, s.y)) lassoIds.add(s.id);
        });
        if (lassoIds.size > 0) {
          setSelectedTransId(null); // Clear transition selection on lasso
          // V3-L6: Shift+lasso extends existing selection instead of replacing
          if (e.shiftKey) {
            const merged = new Set(selectedIdsRef.current);
            lassoIds.forEach(id => merged.add(id));
            setSelectedIds(merged);
          } else {
            setSelectedIds(lassoIds);
          }
        }
      }
      setLasso(null);
    }
  }, []);

  // ── Doppelklick: Zustand bearbeiten ──────────────────────────────────────────
  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    if (modeRef.current === 'connect') return;  // V3-M6: no modal in connect mode
    const svgP   = clientToSvg(svgRef.current, e.clientX, e.clientY);
    const worldP = svgToWorld(svgP.x, svgP.y, zoomRef.current, panRef.current.x, panRef.current.y);
    const hitId  = hitState(worldP.x, worldP.y, fsmRef.current.states);
    if (hitId) setStateEditorId(hitId);
  }, []);

  // ── Übergang anklicken ───────────────────────────────────────────────────────
  const handleTransClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTransId(id);
    setSelectedIds(new Set());
  }, []);

  // ── Übergang doppelklicken → direkt öffnen ───────────────────────────────────
  const handleTransDoubleClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTransId(id);
    setSelectedIds(new Set());
    setTransEditId(id);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  const stateList    = Object.values(fsm.states);
  const connectSrc   = connectFrom ? fsm.states[connectFrom] : null;
  const transformStr = `translate(${pan.x.toFixed(1)},${pan.y.toFixed(1)}) scale(${zoom.toFixed(4)})`;
  const sw           = 1 / zoom; // stroke-width für Lasso skaliert gegenmäßig

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* ── SVG-Canvas ─────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        width="100%" height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{
          background: '#060d1a',
          outline: 'none',
          cursor: mode === 'connect' ? 'crosshair' : 'default',
        }}
      >
        <defs>
          {[
            { id: 'fsm-arrow-gray',   fill: '#94a3b8' },
            { id: 'fsm-arrow-blue',   fill: '#60a5fa' },
            { id: 'fsm-arrow-yellow', fill: '#facc15' },
          ].map(({ id, fill }) => (
            <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5"
              markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto">
              <path d="M0,1 L9,5 L0,9 Z" fill={fill} />
            </marker>
          ))}
          {/* Grid pattern moves with pan/zoom via patternTransform */}
          <pattern id="fsm-grid" width="40" height="40" patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x.toFixed(1)},${pan.y.toFixed(1)}) scale(${zoom.toFixed(4)})`}>
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f172a" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Hintergrund-Gitter (skaliert und verschoben mit Pan/Zoom) */}
        <rect width={VB_W} height={VB_H} fill="url(#fsm-grid)" />

        {/* ── World-space-Gruppe (Zoom + Pan) ───────────────────────────── */}
        <g transform={transformStr}>

          {/* Übergänge */}
          {fsm.transitions.map(t => {
            const from = fsm.states[t.fromId], to = fsm.states[t.toId];
            if (!from || !to) return null;
            return (
              <FsmTransitionArrow
                key={t.id}
                transition={t} fromState={from} toState={to}
                fsm={fsm}
                isSelected={selectedTransId === t.id}
                onClick={e => handleTransClick(t.id, e)}
                onDoubleClick={e => handleTransDoubleClick(t.id, e)}
              />
            );
          })}

          {/* Vorschau-Pfeil beim Verbinden */}
          {mode === 'connect' && connectSrc && previewPt && (
            <FsmPreviewArrow fromState={connectSrc} toX={previewPt.x} toY={previewPt.y} />
          )}

          {/* Zustände */}
          {stateList.map(s => (
            <FsmStateNodeComp
              key={s.id}
              state={s}
              isSelected={selectedIds.has(s.id)}
              isConnectSource={connectFrom === s.id}
              archType={fsm.archType}
              outputNames={fsm.outputNames}
            />
          ))}

          {/* Lasso-Rechteck */}
          {lasso && (
            <rect
              x={lasso.w >= 0 ? lasso.x : lasso.x + lasso.w}
              y={lasso.h >= 0 ? lasso.y : lasso.y + lasso.h}
              width={Math.abs(lasso.w)}
              height={Math.abs(lasso.h)}
              fill="rgba(59,130,246,0.08)"
              stroke="#3b82f6"
              strokeWidth={sw}
              strokeDasharray={`${4 * sw} ${2 * sw}`}
              pointerEvents="none"
            />
          )}
        </g>

        {/* ── HUD-Hinweise (außerhalb der Transformationsgruppe) ────────── */}
        {mode === 'connect' && (
          <text x={12} y={VB_H - 12} fontSize={11} fill="#facc15" fontFamily="monospace" opacity={0.7}>
            {connectFrom
              ? '→ Zielzustand klicken  |  ↺-Badge = Selbstübergang  |  Esc = Abbrechen'
              : '→ Quellzustand klicken  |  Esc = Abbrechen'}
          </text>
        )}
        {selectedIds.size > 0 && mode === 'select' && (
          <text x={12} y={VB_H - 12} fontSize={10} fill="#475569" fontFamily="monospace">
            {selectedIds.size > 1
              ? `${selectedIds.size} Zustände  |  Pfeiltasten = Bewegen  |  Shift+Pfeil = Grob  |  Entf = Löschen`
              : 'Doppelklick = Bearbeiten  |  Pfeiltasten = Bewegen  |  Shift+Pfeil = Grob  |  Entf = Löschen'}
          </text>
        )}
        {selectedTransId && mode === 'select' && (
          <text x={12} y={VB_H - 12} fontSize={10} fill="#475569" fontFamily="monospace">
            Doppelklick = Bearbeiten  |  Entf = Löschen
          </text>
        )}
        {mode === 'select' && selectedIds.size === 0 && !selectedTransId && (
          <text x={12} y={VB_H - 12} fontSize={10} fill="#1e3a5f" fontFamily="monospace">
            Ziehen = Lasso-Auswahl  |  Mausrad = Zoom  |  Alt+Ziehen = Panning  |  Doppelklick = Bearbeiten
          </text>
        )}
      </svg>

      {/* Übergang-Bearbeiten-Button */}
      {selectedTransId && !transEditId && (
        <div
          style={{
            position: 'absolute', bottom: 36, left: 12,
            background: '#1e293b', border: '1px solid #334155', borderRadius: 4,
            padding: '2px 8px', fontSize: 10, color: '#94a3b8',
            fontFamily: 'monospace', cursor: 'pointer', userSelect: 'none',
          }}
          onClick={() => setTransEditId(selectedTransId)}
        >
          ✎ Übergang bearbeiten
        </div>
      )}

      {/* Modale */}
      {stateEditorId && fsm.states[stateEditorId] && (
        <FsmStateEditor state={fsm.states[stateEditorId]} onClose={() => setStateEditorId(null)} />
      )}
      {transAddData && (
        <FsmTransitionEditor mode="add"
          fromId={transAddData.fromId} toId={transAddData.toId}
          onClose={() => setTransAddData(null)} />
      )}
      {transEditId && fsm.transitions.find(t => t.id === transEditId) && (
        <FsmTransitionEditor mode="edit"
          transition={fsm.transitions.find(t => t.id === transEditId)!}
          onClose={() => setTransEditId(null)} />
      )}
    </div>
  );
}
