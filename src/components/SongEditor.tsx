import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { parseSongSheetText, serializeSongSheet } from '../data/songSheetText';
import { encodeSheetForUrl } from '../data/songShare';
import type { SongSheet } from '../data/songSheet';

interface SongEditorProps {
  open: boolean;
  initialSheet: SongSheet | null; // null = start blank
  isExistingUserSong: boolean;
  onSave: (sheet: SongSheet) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const BLANK_TEMPLATE = `title:
key: C
strum: ↑ ↑↓↑↓↑↓

--- section 1 ---
[a]bc | [d]ef | [g]hi | [j]kl @ 1 3m 6m 4
`;

export function SongEditor({ open, initialSheet, isExistingUserSong, onSave, onDelete, onClose }: SongEditorProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setText(initialSheet ? serializeSongSheet(initialSheet) : BLANK_TEMPLATE);
      setCopied(false);
    }
  }, [open, initialSheet]);

  const { sheet, errors } = useMemo(() => parseSongSheetText(text), [text]);

  const canSave = sheet !== null;

  const handleSave = useCallback(() => {
    if (!sheet) return;
    onSave(sheet);
  }, [sheet, onSave]);

  const handleShare = useCallback(async () => {
    if (!sheet) return;
    const payload = encodeSheetForUrl(sheet);
    const url = new URL(window.location.href);
    // Strip existing sheet= and song= so the link unambiguously loads this one
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    hashParams.delete('song');
    hashParams.set('sheet', payload);
    url.hash = hashParams.toString();
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [sheet]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-crust/95 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div
        className="flex-1 min-h-0 flex flex-col m-4 rounded-xl border border-surface0 bg-mantle overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-surface0 bg-base shrink-0">
          <span className="text-sm font-semibold text-txt flex-1">
            {'🎼'} {t('songEditorTitle')}
          </span>
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

        {/* Body: textarea + preview side by side on lg+, stacked on sm */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="font-mono text-sm p-3 bg-base text-txt outline-none resize-none border-r border-surface0 min-h-0"
          />
          <div className="p-3 overflow-auto min-h-0 bg-crust">
            {sheet ? (
              <EditorPreview sheet={sheet} />
            ) : (
              <div className="text-sm text-overlay0">{t('songEditorNoValid')}</div>
            )}
          </div>
        </div>

        {/* Error bar */}
        <div className="px-4 py-2 border-t border-surface0 bg-base text-xs shrink-0 max-h-24 overflow-auto">
          {errors.length === 0 ? (
            <span className="text-green">{t('songEditorOk')}</span>
          ) : (
            <ul className="text-red">
              {errors.map((err, i) => (
                <li key={i}>
                  {err.line > 0 ? `L${err.line}: ` : ''}
                  {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EditorPreview({ sheet }: { sheet: SongSheet }) {
  return (
    <div>
      <div className="text-base font-semibold mb-1">{sheet.title}</div>
      <div className="text-xs text-overlay0 mb-3">
        {sheet.key}
        {sheet.strum ? ` · ${sheet.strum}` : ''}
      </div>
      {sheet.sections.map((section, si) => (
        <div key={si} className="mb-3">
          {section.name && (
            <div className="text-[10px] uppercase tracking-wide text-overlay0 mb-1">[{section.name}]</div>
          )}
          {section.lines.map((line, li) => (
            <div
              key={li}
              className="grid gap-0.5 mb-1.5"
              style={{ gridTemplateColumns: `repeat(${line.bars.length}, minmax(0, 1fr))` }}
            >
              {line.bars.map((bar, bi) => {
                const color = `var(--color-deg-${bar.degree})`;
                return (
                  <div
                    key={`h-${bi}`}
                    className="text-[10px] font-mono px-1 rounded"
                    style={{
                      background: `color-mix(in srgb, ${color} 20%, transparent)`,
                      color,
                    }}
                  >
                    {bar.degree}
                    {[2, 3, 6].includes(bar.degree) ? 'm' : ''}
                  </div>
                );
              })}
              {line.bars.map((bar, bi) => {
                const color = `var(--color-deg-${bar.degree})`;
                const chars: Array<{ ch: string; accent: boolean }> = [];
                let inBracket = false;
                for (const ch of bar.source) {
                  if (ch === '[') {
                    inBracket = true;
                    continue;
                  }
                  if (ch === ']') {
                    inBracket = false;
                    continue;
                  }
                  chars.push({ ch, accent: inBracket });
                }
                return (
                  <div key={`l-${bi}`} className="text-sm">
                    {chars.map((c, ci) => (
                      <span
                        key={ci}
                        style={
                          c.accent
                            ? {
                                background: `color-mix(in srgb, ${color} 30%, transparent)`,
                                color,
                                fontWeight: 700,
                                padding: '0 1px',
                                borderRadius: 2,
                              }
                            : {}
                        }
                      >
                        {c.ch}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
