import type { JSX } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import type { Theme } from '@/lib/theme';

const NEXT_THEME: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme];

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Theme: ${theme}. Switch to ${NEXT_THEME[theme]}`}
      onClick={() => setTheme(NEXT_THEME[theme])}
    >
      <Icon />
    </Button>
  );
}
