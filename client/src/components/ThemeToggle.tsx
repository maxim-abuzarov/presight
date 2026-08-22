import { THEMES, type Theme } from '../hooks/useTheme.ts';
import { MoonIcon, SunIcon } from './Icon.tsx';

const OPTIONS: Record<Theme, { label: string; Icon: typeof SunIcon }> = {
  light: { label: 'Light', Icon: SunIcon },
  dark: { label: 'Dark', Icon: MoonIcon },
};

interface ThemeToggleProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-card border border-line bg-ground p-0.5"
    >
      {THEMES.map((option) => {
        const { label, Icon } = OPTIONS[option];
        const isActive = theme === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => onChange(option)}
            className={`flex size-7 items-center justify-center rounded-sm transition-colors duration-150 ${
              isActive
                ? 'bg-surface text-ink shadow-[0_1px_2px_-1px_rgb(0_0_0/0.18)]'
                : 'text-faint hover:text-ink'
            }`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
