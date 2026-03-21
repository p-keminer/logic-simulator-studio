import { useState, useEffect } from 'react';
import { analyzeCircuitCustomIcExportSummary } from '../../core/analysis/customIcExportSummary';
import { useCircuitContext } from '../../store/CircuitContext';
import { generateVerilog } from '../../core/io/verilog';
import { generateVHDL } from '../../core/io/vhdl';

interface Props {
  onClose: () => void;
}

type Lang = 'verilog' | 'vhdl';

function fallbackCopy(text: string, onSuccess: () => void) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(el);
  el.select();
  try { document.execCommand('copy'); onSuccess(); } catch { /* ignore */ }
  document.body.removeChild(el);
}

function download(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportModal({ onClose }: Props) {
  const { circuit } = useCircuitContext();
  const [lang, setLang] = useState<Lang>('verilog');
  const [copied, setCopied] = useState(false);

  const customIcSummary = analyzeCircuitCustomIcExportSummary(circuit);
  const code = lang === 'verilog' ? generateVerilog(circuit) : generateVHDL(circuit);
  const ext = lang === 'verilog' ? '.v' : '.vhd';
  const baseName = circuit.name.replace(/\s+/g, '_') || 'circuit';
  const hasCustomIcHierarchy = customIcSummary.totalCustomIcInstances > 0;
  const customIcHierarchyBlocked = customIcSummary.blockedInstanceCount > 0;
  const customIcSummaryTitle = customIcHierarchyBlocked
    ? 'Custom-IC-Hierarchie blockiert den strukturellen HDL-Export'
    : 'Custom-ICs werden fuer den HDL-Export strukturell aufgeloest';
  const customIcSummaryStats = [
    `${customIcSummary.totalCustomIcInstances} Instanz(en)`,
    `${customIcSummary.combinationalInstanceCount} kombinatorisch`,
    `${customIcSummary.statefulInstanceCount} sequentiell`,
    `Tiefe ${customIcSummary.maxHierarchyDepth}`,
  ].join(' · ');
  const customIcBlockedReason = customIcSummary.blockedReasons[0];
  const customIcNestedTypes = customIcSummary.nestedCustomTypeIds.join(', ');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCopy = () => {
    const onSuccess = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(onSuccess).catch(() => fallbackCopy(code, onSuccess));
    } else {
      fallbackCopy(code, onSuccess);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2 py-3 sm:px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100vh-1.5rem)] w-[min(800px,calc(100vw-1rem))] flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:w-[min(800px,calc(100vw-2rem))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-700 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 text-sm font-bold text-slate-200 font-mono">HDL Export</h2>
            <button onClick={onClose} className="ml-1 shrink-0 text-lg leading-none text-slate-500 hover:text-slate-300">×</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex rounded border border-slate-600 overflow-hidden text-xs font-mono">
              <button
                onClick={() => setLang('verilog')}
                className={`px-3 py-1.5 transition-colors ${lang === 'verilog' ? 'bg-green-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                Verilog
              </button>
              <button
                onClick={() => setLang('vhdl')}
                className={`px-3 py-1.5 transition-colors ${lang === 'vhdl' ? 'bg-blue-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                VHDL
              </button>
            </div>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded transition-colors"
            >
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
            <button
              onClick={() => download(code, baseName + ext)}
              className="px-3 py-1.5 text-xs font-mono text-slate-900 bg-green-500 hover:bg-green-400 rounded transition-colors"
            >
              Download {ext}
            </button>
          </div>
          {hasCustomIcHierarchy && (
            <div
              className={`mt-3 rounded border px-3 py-2 text-xs font-mono ${
                customIcHierarchyBlocked
                  ? 'border-amber-700 bg-amber-950/40 text-amber-200'
                  : 'border-cyan-800 bg-cyan-950/30 text-cyan-100'
              }`}
            >
              <div className="font-semibold">{customIcSummaryTitle}</div>
              <div className={`mt-1 text-[11px] ${customIcHierarchyBlocked ? 'text-amber-300' : 'text-cyan-300'}`}>
                {customIcSummaryStats}
              </div>
              {customIcHierarchyBlocked && customIcBlockedReason && (
                <div className="mt-2 text-[11px] leading-relaxed text-amber-100">
                  {customIcBlockedReason}
                </div>
              )}
              {customIcHierarchyBlocked && customIcNestedTypes && (
                <div className="mt-1 text-[11px] text-amber-300">
                  Nested Typen: {customIcNestedTypes}
                </div>
              )}
              {!customIcHierarchyBlocked && (
                <div className="mt-2 text-[11px] leading-relaxed text-cyan-100">
                  Die aktuelle Schaltung bleibt innerhalb der kanonisch abgesicherten one-level Grenze;
                  der Export loest die Instanzen deshalb strukturell auf statt rohe `CIC_*`-Bloecke stehenzulassen.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Code view */}
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <pre className="min-w-full text-xs font-mono leading-relaxed text-green-300 whitespace-pre">{code}</pre>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-800 text-xs text-slate-600">
          Tipp: INPUT_SWITCH = Eingangsport · OUTPUT_LED = Ausgangsport · Flip-Flops als Behavioral-Block
        </div>
      </div>
    </div>
  );
}
