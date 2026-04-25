import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { parseSongSheetText, serializeSongSheet } from '../data/songSheetText';
import { encodeSheetForUrl } from '../data/songShare';
import type { SongSheet } from '../data/songSheet';
import { VisualSongEditor } from './VisualSongEditor';

interface SongEditorProps {
  open: boolean;
  initialSheet: SongSheet | null; // null = start blank
  isExistingUserSong: boolean;
  onSave: (sheet: SongSheet) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const BLANK_TEMPLATE: SongSheet = {
  id: 'draft',
  title: '',
  key: 'C',
  strum: '↑ ↑↓↑↓↑↓',
  sections: [
    {
      name: 'section 1',
      lines: [
        {
          bars: [
            { chords: [{ degree: 1, source: '' }] },
            { chords: [{ degree: 3, source: '' }] },
            { chords: [{ degree: 6, source: '' }] },
            { chords: [{ degree: 4, source: '' }] },
          ],
        },
      ],
    },
  ],
};

export function SongEditor({ open, initialSheet, isExistingUserSong, onSave, onDelete, onClose }: SongEditorProps) {
  const { t } = useTranslation();

  // The live edited sheet, driven by VisualSongEditor.
  const [sheet, setSheet] = useState<SongSheet>(BLANK_TEMPLATE);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset when the editor is opened.
  useEffect(() => {
    if (open) {
      setSheet(initialSheet ?? BLANK_TEMPLATE);
      setSourceMode(false);
      setCopied(false);
    }
  }, [open, initialSheet]);

  // Keep sourceText in sync with the visual sheet whenever we enter source mode.
  useEffect(() => {
    if (sourceMode) setSourceText(serializeSongSheet(sheet));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMode]);

  // When in source mode, try to parse back into `sheet` on every keystroke.
  const sourceParse = useMemo(() => (sourceMode ? parseSongSheetText(sourceText) : null), [sourceMode, sourceText]);

  useEffect(() => {
    if (sourceParse?.sheet) {
      // Preserve the current id so saving doesn't fork the archive entry.
      setSheet({ ...sourceParse.sheet, id: sheet.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceParse?.sheet]);

  const canSave = sheet.title.trim().length > 0 && sheet.sections.length > 0;

  const handleSave = useCallback(() => {
    if (!canSave) return;
    onSave(sheet);
  }, [sheet, canSave, onSave]);

  const handleShare = useCallback(async () => {
    if (!canSave) return;
    const payload = encodeSheetForUrl(sheet);
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    hashParams.delete('song');
    hashParams.set('sheet', payload);
    url.hash = hashParams.toString();
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [sheet, canSave]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-crust/95 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div
        className="flex-1 min-h-0 flex flex-col m-4 rounded-xl border border-surface0 bg-mantle overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-surface0 bg-base shrink-0 flex-wrap">
          <span className="text-sm font-semibold text-txt flex-1 min-w-[120px]">
            {'🎼'} {t('songEditorTitle')}
          </span>
          <button
            onClick={() => setSourceMode((v) => !v)}
            className={`text-xs px-2 py-1 rounded border cursor-pointer ${
              sourceMode ? 'border-blue text-blue' : 'border-surface0 text-overlay1 hover:text-blue hover:border-blue'
            }`}
            style={{ transition: 'all var(--transition)' }}
            title={t('songEditorSourceTitle')}
          >
            {sourceMode ? t('songEditorSourceOn') : t('songEditorSourceOff')}
          </button>
          <button
            onClick={handleShare}
            disabled={!canSave}
            className="text-xs px-2 py-1 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ transition: 'all var(--transition)' }}
            title={t('songEditorShareTitle')}
          >
            {copied ? t('songEditorCopied') : t('songEditorShare')}
          </button>
          {isExistingUserSong && onDelete && (
            <button
              onClick={onDelete}
              className="text-xs px-2 py-1 rounded border border-surface0 text-red hover:border-red cursor-pointer"
              style={{ transition: 'all var(--transition)' }}
            >
              {t('songEditorDelete')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="text-xs px-3 py-1 rounded bg-blue text-crust font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ transition: 'all var(--transition)' }}
          >
            {t('songEditorSave')}
          </button>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded border border-surface0 text-overlay1 hover:text-txt cursor-pointer"
            style={{ transition: 'all var(--transition)' }}
          >
            {t('close')}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto">
          {sourceMode ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full min-h-0">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                spellCheck={false}
                className="font-mono text-sm p-3 bg-base text-txt outline-none resize-none border-r border-surface0 h-full min-h-[40vh]"
              />
              <div className="p-3 overflow-auto bg-crust">
                {sourceParse?.sheet ? (
                  <VisualSongEditor sheet={sourceParse.sheet} onChange={() => {}} />
                ) : (
                  <div className="text-sm text-overlay0">{t('songEditorNoValid')}</div>
                )}
              </div>
            </div>
          ) : (
            <VisualSongEditor sheet={sheet} onChange={setSheet} />
          )}
        </div>

        {/* Error bar — only relevant in source mode */}
        {sourceMode && (
          <div className="px-4 py-2 border-t border-surface0 bg-base text-xs shrink-0 max-h-24 overflow-auto">
            {sourceParse?.errors.length === 0 ? (
              <span className="text-green">{t('songEditorOk')}</span>
            ) : (
              <ul className="text-red">
                {sourceParse?.errors.map((err, i) => (
                  <li key={i}>
                    {err.line > 0 ? `L${err.line}: ` : ''}
                    {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
