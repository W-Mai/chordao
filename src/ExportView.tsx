import { useRef, useCallback, useState, useEffect } from 'react';
import { voicingKey, NOTE_DISPLAY, PROGRESSIONS, type ChordVoicing, type NoteName } from './chordData';
import { useTranslation } from 'react-i18next';
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
  activeProg?: string | null;
  filteredVoicings: ChordVoicing[];
  filteredOptimal: ChordVoicing[];
}

export function useExportImage({ selectedKey, voicings: _voicings, optimal: _optimal, optimalSet, grouped, showBarre, activeProg, filteredVoicings, filteredOptimal }: ExportViewProps) {
  const { t } = useTranslation();
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
            minWidth: 64, height: 64, padding: '0 12px', borderRadius: 16,
            background: 'var(--blue)', color: 'var(--crust)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 'bold', flexShrink: 0,
            boxShadow: '0 0 20px var(--blue)',
          }}>{NOTE_DISPLAY[selectedKey]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--text)' }}>Chordao</div>
            <div style={{ fontSize: 12, color: 'var(--overlay1)' }}>
              {t('keyOf')} {NOTE_DISPLAY[selectedKey]} · {t('derivation')}
            </div>
          </div>
          {activeProg && (
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--blue)' }}>♪ {t(activeProg as string)}</div>
              <div style={{ fontSize: 11, color: 'var(--overlay1)', marginTop: 2 }}>
                {PROGRESSIONS.find(p => p.name === activeProg)?.degrees.join(' → ')}
              </div>
            </div>
          )}
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
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--panel-border)', background: 'var(--mantle)', fontSize: 11, fontWeight: 600, color: 'var(--subtext1)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('shapeGrid')}</div>
          <div style={{ padding: 12 }}>
            <ShapeGrid voicings={filteredVoicings} optimal={filteredOptimal} light={document.documentElement.getAttribute('data-theme') === 'light'} />
          </div>
        </div>
        <div style={{ border: '1px solid var(--panel-border)', borderRadius: 'var(--ui-radius)', background: 'var(--panel-bg)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--panel-border)', background: 'var(--mantle)', fontSize: 11, fontWeight: 600, color: 'var(--subtext1)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('chordDiagrams')}</div>
          <div style={{ padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 12 }}>
              {(activeProg ? filteredVoicings : [1, 2, 3, 4, 5, 6].flatMap(d => grouped.get(d) ?? [])).map(v => (
                <ChordDiagram key={voicingKey(v)} voicing={v} highlighted={optimalSet.has(voicingKey(v))} light={document.documentElement.getAttribute('data-theme') === 'light'} showBarre={showBarre} className="w-full" />
              ))}
            </div>
          </div>
        </div>
        {/* Legend */}
        <div style={{ marginTop: 20, padding: '10px 16px', border: '1px solid var(--panel-border)', borderRadius: 'var(--ui-radius)', background: 'var(--panel-bg)', display: 'flex', justifyContent: 'center', gap: 24, fontSize: 10, color: 'var(--overlay1)', flexWrap: 'wrap' }}>
          <span>{t('legendFilled')}</span>
          <span>{t('legendOutlined')}</span>
          <span>{t('legendCircle')}</span>
          <span>{t('legendSquare')}</span>
          <span>{t('legendBar')}</span>
          <span>{t('legendMuted')}</span>
          <span>{t('legendOpen')}</span>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--surface0)', fontSize: 10, color: 'var(--overlay0)', textAlign: 'center' }}>
          {t('generatedBy')} · github.com/W-Mai/chordao · MIT
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
        <img src={previewUrl!} alt={t("export")}
          className="max-w-full max-h-[70vh] rounded-xl border border-surface0 shadow-2xl" />

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={copyImage}
            className="px-4 py-2 rounded-lg bg-blue text-crust font-semibold text-sm cursor-pointer hover:opacity-90"
            style={{ transition: 'all var(--transition)' }}
          >📋 {t("copy")}</button>
          <button onClick={downloadImage}
            className="px-4 py-2 rounded-lg bg-green text-crust font-semibold text-sm cursor-pointer hover:opacity-90"
            style={{ transition: 'all var(--transition)' }}
          >💾 {t("download")}</button>
          <button onClick={closePreview}
            className="px-4 py-2 rounded-lg bg-surface0 text-subtext1 font-semibold text-sm cursor-pointer hover:bg-surface1"
            style={{ transition: 'all var(--transition)' }}
          >✕ {t("close")}</button>
        </div>
      </div>
    </div>
  ) : null;

  return { exportImage, ExportContainer, PreviewModal };
}
