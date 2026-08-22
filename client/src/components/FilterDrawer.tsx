import { useEffect } from 'react';

import { FilterSidebar, type FilterSidebarProps } from './FilterSidebar.tsx';
import { CloseIcon } from './Icon.tsx';

interface FilterDrawerProps extends FilterSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function FilterDrawer({ open, onClose, ...sidebar }: FilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-ink/35"
      />
      <div
        role="dialog"
        aria-label="Filters"
        className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-surface shadow-[8px_0_32px_-12px_rgb(0_0_0/0.25)]"
        style={{ animation: 'record-in 240ms var(--ease-out-expo) both' }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex size-8 items-center justify-center rounded-card text-muted transition-colors duration-150 hover:bg-sunk hover:text-ink"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <FilterSidebar {...sidebar} />
        </div>
      </div>
    </div>
  );
}
