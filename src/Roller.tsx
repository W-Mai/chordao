import { useRef, useEffect, useCallback } from 'react';

interface RollerProps<T> {
  items: T[];
  activeKey: string | null;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (key: string) => void;
  height?: number;
  itemHeight?: number;
}

export function Roller<T>({
  items,
  activeKey,
  getKey,
  getLabel,
  onSelect,
  height = 80,
  itemHeight = 28,
}: RollerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const activeRef = useRef(activeKey);
  activeRef.current = activeKey;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const padY = (height - itemHeight) / 2;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const key = (entry.target as HTMLElement).dataset.rkey ?? '';
            if (key !== activeRef.current) onSelectRef.current(key);
          }
        }
      },
      { root: container, rootMargin: `-${padY}px 0px`, threshold: 0.5 },
    );

    itemRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items, padY]);

  const handleClick = useCallback((key: string) => {
    const el = itemRefs.current.get(key);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <div
        className="absolute inset-x-0 top-0 bg-gradient-to-b from-mantle to-transparent z-10 pointer-events-none"
        style={{ height: padY }}
      />
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-mantle to-transparent z-10 pointer-events-none"
        style={{ height: padY }}
      />
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-y border-surface0 pointer-events-none z-10"
        style={{ height: itemHeight }}
      />
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory"
        style={{ paddingTop: padY, paddingBottom: padY }}
      >
        {items.map((item) => {
          const key = getKey(item);
          const isActive = activeKey === key;
          return (
            <button
              key={key}
              data-rkey={key}
              ref={(el) => {
                if (el) itemRefs.current.set(key, el);
                else itemRefs.current.delete(key);
              }}
              onClick={() => handleClick(key)}
              className={`snap-center w-full flex items-center justify-center text-[11px] cursor-pointer transition-colors ${
                isActive ? 'text-blue font-bold' : 'text-subtext0'
              }`}
              style={{ height: itemHeight }}
            >
              {getLabel(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
