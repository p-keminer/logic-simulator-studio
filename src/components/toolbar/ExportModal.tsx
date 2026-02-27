import { useState, useEffect } from 'react';
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

  const code = lang === 'verilog' ? generateVerilog(circuit) : generateVHDL(circuit);
  const ext = lang === 'verilog' ? '.v' : '.vhd';
  const baseName = circuit.name.replace(/\s+/g, '_') || 'circuit';

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
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg w-[800px] max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-sm font-bold text-slate-200 font-mono">HDL Export</h2>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
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
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 ml-1 text-lg leading-none">×</button>
          </div>
        </div>

        {/* Code view */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs font-mono text-green-300 leading-relaxed whitespace-pre">{code}</pre>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-800 text-xs text-slate-600">
          Tipp: INPUT_SWITCH = Eingangsport · OUTPUT_LED = Ausgangsport · Flip-Flops als Behavioral-Block
        </div>
      </div>
    </div>
  );
}
