import { useRef, useCallback, useState, useEffect } from 'react';
import type { ChordVoicing, NoteName } from './chordData';
import { NOTE_DISPLAY } from './chordData';
import { ChordDiagram } from './ChordDiagram';
import { ShapeGrid } from './ShapeGrid';
import { generateQR } from './qr';

interface ExportViewProps {
  selectedKey: NoteName;
  voicings: ChordVoicing[];
  optimal: ChordVoicing[];
  optimalSet: Set<string>;
  grouped: Map<number, ChordVoicing[]>;
  showBarre: boolean;
}

export function useExportImage({ selectedKey, voicings, optimal, optimalSet, grouped, showBarre }: ExportViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewMounted, setPreviewMounted] = useState(false);
  const [qrChordao, setQrChordao] = useState<string>('');
  const [qrBlog, setQrBlog] = useState<string>('');

  // Generate QR codes once
  useEffect(() => {
    const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}logo.svg`;
    generateQR('https://w-mai.github.io/chordao/', 200, logoUrl).then(setQrChordao);
    generateQR('https://benign.host', 200).then(setQrBlog);
  }, []);

  const exportImage = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    el.style.display = 'block';
    await new Promise(r => setTimeout(r, 100));
    const { default: html2canvas } = await import('html2canvas-pro');
    const canvas = await html2canvas(el, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--crust').trim(),
      scale: 2,
    });
    el.style.display = 'none';
    setPreviewUrl(canvas.toDataURL('image/png'));
    setPreviewMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setPreviewVisible(true)));
  }, []);

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
    setTimeout(() => setPreviewMounted(false), 250);
  }, []);

  const downloadImage = useCallback(() => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `chordao-${NOTE_DISPLAY[selectedKey]}.png`;
    a.click();
  }, [previewUrl, selectedKey]);

  const copyImage = useCallback(async () => {
    if (!previewUrl) return;
    const res = await fetch(previewUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }, [previewUrl]);

  const ExportContainer = (
    <div
      ref={containerRef}
      style={{ display: 'none', position: 'fixed', left: '-9999px', top: 0, width: 1200, zIndex: -1 }}
    >
      <div style={{ padding: 32, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          {/* Large key badge */}
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'var(--blue)', color: 'var(--crust)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 'bold', flexShrink: 0,
            boxShadow: '0 0 20px var(--blue)',
          }}>{NOTE_DISPLAY[selectedKey]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--text)' }}>Chordao</div>
            <div style={{ fontSize: 12, color: 'var(--overlay1)' }}>Key of {NOTE_DISPLAY[selectedKey]} · E/Em/A/Am shape derivation</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {qrChordao && (
              <div style={{ textAlign: 'center' }}>
                <img src={qrChordao} alt="Chordao" style={{ width: 56, height: 56, borderRadius: 4 }} />
                <div style={{ fontSize: 7, color: 'var(--overlay0)', marginTop: 2 }}>Chordao</div>
              </div>
            )}
            {qrBlog && (
              <div style={{ textAlign: 'center' }}>
                <img src={qrBlog} alt="Blog" style={{ width: 56, height: 56, borderRadius: 4 }} />
                <div style={{ fontSize: 7, color: 'var(--overlay0)', marginTop: 2 }}>benign.host</div>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginBottom: 20, border: '1px solid var(--panel-border)', borderRadius: 'var(--ui-radius)', background: 'var(--panel-bg)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--panel-border)', background: 'var(--mantle)', fontSize: 11, fontWeight: 600, color: 'var(--subtext1)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Shape Grid</div>
          <div style={{ padding: 12 }}>
            <ShapeGrid voicings={voicings} optimal={optimal} light={document.documentElement.getAttribute('data-theme') === 'light'} />
          </div>
        </div>
        <div style={{ border: '1px solid var(--panel-border)', borderRadius: 'var(--ui-radius)', background: 'var(--panel-bg)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--panel-border)', background: 'var(--mantle)', fontSize: 11, fontWeight: 600, color: 'var(--subtext1)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Chord Diagrams</div>
          <div style={{ padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
              {[1, 2, 3, 4, 5, 6].map(degree => {
                const dv = grouped.get(degree) ?? [];
                return dv.map(v => (
                  <ChordDiagram key={`${v.name}-${v.shapeOrigin}`} voicing={v} highlighted={optimalSet.has(`${v.name}-${v.shapeOrigin}`)} light={document.documentElement.getAttribute('data-theme') === 'light'} showBarre={showBarre} className="w-full" />
                ));
              })}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--surface0)', fontSize: 10, color: 'var(--overlay0)', textAlign: 'center' }}>
          Generated by Chordao · github.com/W-Mai/chordao · MIT
        </div>
      </div>
    </div>
  );

  const PreviewModal = previewMounted ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-crust/90 backdrop-blur-sm"
      style={{ opacity: previewVisible ? 1 : 0, transition: 'opacity 0.25s ease' }}
      onClick={closePreview}
    >
      <div
        className="flex flex-col items-center gap-4 max-w-[90vw] max-h-[90vh]"
        style={{ opacity: previewVisible ? 1 : 0, transform: previewVisible ? 'scale(1)' : 'scale(0.92)', transition: 'opacity 0.25s ease, transform 0.25s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Preview image - long press to save on mobile */}
        <img src={previewUrl!} alt="Export preview"
          className="max-w-full max-h-[70vh] rounded-xl border border-surface0 shadow-2xl" />

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={copyImage}
            className="px-4 py-2 rounded-lg bg-blue text-crust font-semibold text-sm cursor-pointer hover:opacity-90"
            style={{ transition: 'all var(--transition)' }}
          >📋 Copy</button>
          <button onClick={downloadImage}
            className="px-4 py-2 rounded-lg bg-green text-crust font-semibold text-sm cursor-pointer hover:opacity-90"
            style={{ transition: 'all var(--transition)' }}
          >💾 Download</button>
          <button onClick={closePreview}
            className="px-4 py-2 rounded-lg bg-surface0 text-subtext1 font-semibold text-sm cursor-pointer hover:bg-surface1"
            style={{ transition: 'all var(--transition)' }}
          >✕ Close</button>
        </div>
      </div>
    </div>
  ) : null;

  return { exportImage, ExportContainer, PreviewModal };
}
