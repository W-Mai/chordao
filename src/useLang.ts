import { useState, useEffect } from 'react';
import { getLang } from './i18n';

let listeners: (() => void)[] = [];

export function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(f => f !== fn); };
}

export function notify() { listeners.forEach(fn => fn()); }

export function useLang(): string {
  const [, forceUpdate] = useState(0);
  useEffect(() => subscribe(() => forceUpdate(n => n + 1)), []);
  return getLang();
}
