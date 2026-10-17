import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

describe('ThemeToggle (real browser)', () => {
  it('cycles light, dark and system and updates the document', async () => {
    const screen = await render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button');

    await expect.element(button).toHaveAccessibleName(/Theme: system/);

    await button.click();
    await expect.element(button).toHaveAccessibleName(/Theme: light/);
    expect(document.documentElement).not.toHaveClass('dark');

    await button.click();
    await expect.element(button).toHaveAccessibleName(/Theme: dark/);
    expect(document.documentElement).toHaveClass('dark');
  });
});
