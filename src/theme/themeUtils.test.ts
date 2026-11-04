import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  applyAppearanceMode,
  applyDesignStyle,
  applyTheme,
  THEMES,
  APPEARANCE_MODES,
  DESIGN_STYLES,
} from './themeUtils';

describe('Two-Layer Theme System (Theme A & Theme B)', () => {
  const attributes: Record<string, string> = {};
  const classListSet = new Set<string>();

  beforeEach(() => {
    for (const key of Object.keys(attributes)) {
      delete attributes[key];
    }
    classListSet.clear();

    const mockDoc = {
      documentElement: {
        setAttribute: (k: string, v: string) => {
          attributes[k] = v;
        },
        getAttribute: (k: string) => attributes[k] ?? null,
        removeAttribute: (k: string) => {
          delete attributes[k];
        },
        classList: {
          add: (c: string) => classListSet.add(c),
          remove: (c: string) => classListSet.delete(c),
          contains: (c: string) => classListSet.has(c),
        },
      },
      querySelector: () => null,
    };

    (globalThis as any).document = mockDoc;
  });

  afterEach(() => {
    delete (globalThis as any).document;
  });

  it('contains definitions for all 3 Appearance Modes', () => {
    expect(APPEARANCE_MODES.map((m) => m.id)).toEqual(['light', 'dark', 'system']);
  });

  it('contains definitions for all 3 Design Styles', () => {
    expect(DESIGN_STYLES.map((s) => s.id)).toEqual([
      'editorial-retro',
      'quiet-minimal',
      'creative-studio',
    ]);

    for (const style of DESIGN_STYLES) {
      expect(style.name).toBeTruthy();
      expect(style.subtitle).toBeTruthy();
      expect(style.badge).toBeTruthy();
      expect(style.characteristics.length).toBeGreaterThan(0);
      expect(style.sampleQuote).toBeTruthy();
    }
  });

  it('correctly applies Theme A — Appearance Mode (Light, Dark)', () => {
    applyAppearanceMode('light');
    expect(attributes['data-appearance']).toBe('light');
    expect(attributes['data-appearance-mode']).toBe('light');
    expect(classListSet.has('dark')).toBe(false);

    applyAppearanceMode('dark');
    expect(attributes['data-appearance']).toBe('dark');
    expect(attributes['data-appearance-mode']).toBe('dark');
    expect(classListSet.has('dark')).toBe(true);
  });

  it('correctly applies Theme B — Design Style (Editorial Retro, Quiet Minimal, Creative Studio)', () => {
    applyDesignStyle('editorial-retro');
    expect(attributes['data-design-style']).toBe('editorial-retro');

    applyDesignStyle('quiet-minimal');
    expect(attributes['data-design-style']).toBe('quiet-minimal');

    applyDesignStyle('creative-studio');
    expect(attributes['data-design-style']).toBe('creative-studio');
  });

  it('verifies strict independence between Appearance Mode and Design Style', () => {
    // 1. Set Design Style to Quiet Minimal
    applyDesignStyle('quiet-minimal');
    expect(attributes['data-design-style']).toBe('quiet-minimal');

    // 2. Change Appearance Mode to Dark
    applyAppearanceMode('dark');
    expect(attributes['data-appearance']).toBe('dark');
    // Design style MUST remain Quiet Minimal!
    expect(attributes['data-design-style']).toBe('quiet-minimal');

    // 3. Switch Design Style to Creative Studio
    applyDesignStyle('creative-studio');
    expect(attributes['data-design-style']).toBe('creative-studio');
    // Appearance mode MUST remain Dark!
    expect(attributes['data-appearance']).toBe('dark');

    // 4. Change color palette to Tokyo Vaporwave
    applyTheme('tokyo-vaporwave');
    expect(attributes['data-theme']).toBe('tokyo-vaporwave');
    // Design style & Appearance mode MUST remain unchanged!
    expect(attributes['data-design-style']).toBe('creative-studio');
    expect(attributes['data-appearance']).toBe('dark');
  });

  it('preserves all 27 distinct atmospheric color themes', () => {
    expect(THEMES.length).toBe(27);
    for (const theme of THEMES) {
      expect(theme.id).toBeTruthy();
      expect(theme.name).toBeTruthy();
      expect(theme.bgHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.surfaceHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.primaryHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.swatches.length).toBeGreaterThanOrEqual(3);
    }
  });
});
