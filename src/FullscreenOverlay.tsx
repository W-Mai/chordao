import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

interface FullscreenOverlayProps {
  active: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function FullscreenOverlay({ active, onClose, children }: FullscreenOverlayProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [rotated, setRotated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Open: mount then animate in
  useEffect(() => {
    if (active) {
      setAnimating(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else if (visible) {
      setVisible(false);
      const t = setTimeout(() => setAnimating(false), 250);
      return () => clearTimeout(t);
    }
  }, [active]);

  useEffect(() => {
    if (!animating) return;

    const update = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setRotated(isPortrait);
    };
    update();

    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    window.addEventListener('resize', update);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handler);
      window.removeEventListener('resize', update);
      document.body.style.overflow = '';
    };
  }, [animating, onClose]);

  if (!animating && !active) return null;

  const containerStyle = rotated
    ? {
        width: '100vh',
        height: '100vw',
        transform: `rotate(90deg) scale(${visible ? 1 : 0.9})`,
        transformOrigin: 'top left',
        left: '100vw',
        position: 'fixed' as const,
        top: 0,
        zIndex: 50,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }
    : {
        position: 'fixed' as const,
        inset: 0,
        zIndex: 50,
        opacity: visible ? 1 : 0,
        transform: `scale(${visible ? 1 : 0.92})`,
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      };

  return (
    <div
      style={containerStyle}
      className="flex items-center justify-center bg-bp-bg/95 [body.light_&]:bg-lt-bg/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={contentRef}
        className="p-4 overflow-auto w-full"
        style={{
          maxWidth: rotated ? 'calc(100vh - 2rem)' : 'calc(100vw - 2rem)',
          maxHeight: rotated ? 'calc(100vw - 2rem)' : 'calc(100vh - 2rem)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-bp-muted hover:text-bp-text text-2xl cursor-pointer
                   [body.light_&]:text-lt-muted [body.light_&]:hover:text-lt-text"
      >✕</button>
    </div>
  );
}

export function useOverlayFullscreen(): [boolean, () => void, () => void] {
  const [active, setActive] = useState(false);
  const open = useCallback(() => setActive(true), []);
  const close = useCallback(() => setActive(false), []);
  return [active, open, close];
}
