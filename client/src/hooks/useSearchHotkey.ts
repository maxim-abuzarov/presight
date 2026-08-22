import { useEffect, type RefObject } from 'react';

const EDITABLE = ['INPUT', 'TEXTAREA', 'SELECT'];

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || EDITABLE.includes(target.tagName);
}

export function useSearchHotkey(input: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const plainSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!plainSlash || isTyping(event.target)) return;

      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [input]);
}
