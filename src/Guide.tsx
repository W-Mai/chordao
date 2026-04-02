import { useState, useCallback } from 'react';

export function Guide() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);

  return (
    <>
      <button onClick={toggle}
        className="text-xs px-2 py-1 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer"
        style={{ transition: 'all var(--transition)' }}
        title="Help"
      >?</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-crust/90 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.25s ease' }}
          onClick={toggle}>
          <div className="max-w-lg w-full mx-4 rounded-2xl border border-surface0 bg-mantle p-6 text-txt"
            style={{ animation: 'scaleIn 0.25s ease' }}
            onClick={e => e.stopPropagation()}>

            <h2 className="text-lg font-bold mb-4">How to Read</h2>

            <section className="mb-4">
              <h3 className="text-sm font-semibold text-blue mb-1">Shape Grid (2 rows)</h3>
              <p className="text-xs text-subtext0 leading-relaxed">
                Each chord can be played using an <b>E/Em shape</b> or <b>A/Am shape</b> — two fundamental open chord forms moved up the neck with a barre.
                The top row shows A/Am shapes, the bottom row shows E/Em shapes. The column number is the barre fret position.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="text-sm font-semibold text-blue mb-1">Fretboard Overview</h3>
              <p className="text-xs text-subtext0 leading-relaxed">
                All chord voicings plotted on the full fretboard.
                <b> ⬤ Circle</b> = E shape, <b>◼ Square</b> = A shape.
                Hover or click any chord to highlight it across all views.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="text-sm font-semibold text-blue mb-1">Highlighted vs Dimmed</h3>
              <p className="text-xs text-subtext0 leading-relaxed">
                <b>Filled / bright</b> = recommended optimal combination (minimum hand movement).
                <b>Outlined / dim</b> = other available positions. Click to lock highlight on any voicing.
              </p>
            </section>

            <section className="mb-4">
              <h3 className="text-sm font-semibold text-blue mb-1">Chord Diagrams</h3>
              <p className="text-xs text-subtext0 leading-relaxed">
                Standard chord box notation. Vertical lines = strings (E A D G B e), horizontal lines = frets.
                Dots = finger placement. A bar across strings = barre. × = muted string, ○ = open string.
                The number on the left indicates the starting fret.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-blue mb-1">Colors</h3>
              <div className="flex flex-wrap gap-3 text-xs mt-1">
                {['I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'].map((label, i) => (
                  <span key={label} className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: `var(--color-deg-${i + 1})` }} />
                    {label}
                  </span>
                ))}
              </div>
            </section>

            <button onClick={toggle}
              className="mt-5 w-full py-2 rounded-lg bg-blue text-crust font-semibold text-sm cursor-pointer hover:opacity-90"
              style={{ transition: 'all var(--transition)' }}
            >Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
