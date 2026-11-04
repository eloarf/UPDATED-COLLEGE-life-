import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  THEMES,
  applyTheme,
  applyAppearanceStyles,
  applyAppearanceMode,
  applyDesignStyle,
  APPEARANCE_MODES,
  DESIGN_STYLES,
  AppearanceMode,
  DesignStyle,
} from '../theme/themeUtils';
import {
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Flame,
  Shield,
  Layers,
  Type,
  LayoutGrid,
  Sun,
  Moon,
  Laptop,
  Compass,
  Feather,
  Cpu,
  Bookmark,
} from 'lucide-react';

export const ThemesPage: React.FC = () => {
  const { showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const currentThemeId = settings?.theme || 'pink-lobby';
  const currentAppearanceMode: AppearanceMode = settings?.appearanceMode || 'light';
  const currentDesignStyle: DesignStyle = settings?.designStyle || 'editorial-retro';
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const handleSelectAppearanceMode = async (mode: AppearanceMode) => {
    applyAppearanceMode(mode);
    await db.settings.update('current_user', { appearanceMode: mode });
    const match = APPEARANCE_MODES.find((m) => m.id === mode);
    showToast(`Appearance Mode: ${match?.name || mode}`, 'info');
  };

  const handleSelectDesignStyle = async (style: DesignStyle) => {
    applyDesignStyle(style);
    await db.settings.update('current_user', { designStyle: style });
    const match = DESIGN_STYLES.find((s) => s.id === style);
    showToast(`Design Style: ${match?.name || style}`, 'success');
  };

  const handleSelectTheme = async (themeId: string) => {
    applyTheme(themeId);
    await db.settings.update('current_user', { theme: themeId });
    const selected = THEMES.find((t) => t.id === themeId);
    showToast(`Applied theme: ${selected?.name || themeId}!`, 'success');
  };

  const handleResetToDefault = async () => {
    applyTheme('pink-lobby');
    applyAppearanceMode('light');
    applyDesignStyle('editorial-retro');
    await db.settings.update('current_user', {
      theme: 'pink-lobby',
      appearanceMode: 'light',
      designStyle: 'editorial-retro',
      pageAccents: {},
    });
    showToast('Reset all visual identities to default Pink Lobby & Editorial Retro.', 'info');
  };

  const currentFontStyle = settings?.fontStyle || 'serif';
  const currentDensity = settings?.layoutDensity || 'comfortable';
  const currentCardGlow = !!settings?.cardBorderGlow;

  const handleSetFontStyle = async (style: 'serif' | 'sans') => {
    applyAppearanceStyles({
      fontStyle: style,
      layoutDensity: currentDensity,
      cardBorderGlow: currentCardGlow,
    });
    await db.settings.update('current_user', { fontStyle: style });
    showToast(`Typography set to ${style === 'serif' ? 'Editorial Serif' : 'Clean Geometric Sans'}!`, 'info');
  };

  const handleSetDensity = async (density: 'comfortable' | 'compact') => {
    applyAppearanceStyles({
      fontStyle: currentFontStyle,
      layoutDensity: density,
      cardBorderGlow: currentCardGlow,
    });
    await db.settings.update('current_user', { layoutDensity: density });
    showToast(`Layout density switched to ${density}!`, 'info');
  };

  const handleToggleGlow = async () => {
    const nextGlow = !currentCardGlow;
    applyAppearanceStyles({
      fontStyle: currentFontStyle,
      layoutDensity: currentDensity,
      cardBorderGlow: nextGlow,
    });
    await db.settings.update('current_user', { cardBorderGlow: nextGlow });
    showToast(nextGlow ? 'Theme card border glow enabled.' : 'Card border glow disabled.', 'info');
  };

  const categories = [
    { id: 'all', label: `All Palettes (${THEMES.length})` },
    { id: 'premier', label: `12 New Themes (${THEMES.filter((t) => t.category === 'premier').length})` },
    { id: 'cyberpunk', label: `Cyberpunk Neon (${THEMES.filter((t) => t.category === 'cyberpunk').length})` },
    { id: 'dark-wood', label: `Dark Wood & Timber (${THEMES.filter((t) => t.category === 'dark-wood').length})` },
    { id: 'daring-brights', label: `Daring Brights (${THEMES.filter((t) => t.category === 'daring-brights').length})` },
    { id: 'classic', label: `Classic Storybook (${THEMES.filter((t) => t.category === 'classic').length})` },
  ];

  const filteredThemes = activeCategory === 'all'
    ? THEMES
    : THEMES.filter((t) => t.category === activeCategory);

  const activeThemeObj = THEMES.find((t) => t.id === currentThemeId) || THEMES[0];
  const activeStyleObj = DESIGN_STYLES.find((s) => s.id === currentDesignStyle) || DESIGN_STYLES[0];

  return (
    <div className="space-y-6 pb-24 animate-pop">
      {/* Header Banner */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-heading tracking-widest text-[rgb(var(--c-primary))] font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Two-Layer Visual System
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] font-heading font-bold text-[rgb(var(--c-text))]">
                Orthogonal &amp; Independent
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              College Life OS Visual Identity
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5 max-w-xl">
              A hybrid of Wes Anderson-inspired editorial composition, retro-futurism, and Japanese stationery minimalism. Designed to feel like a vintage personal computer combined with an elegant physical journal.
            </p>
          </div>

          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-primary))] hover:text-[rgb(var(--c-on-primary))] transition shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Active Theme Highlight Strip */}
        <div className="mt-4 pt-4 border-t border-[rgb(var(--c-border))] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-heading text-[rgb(var(--c-muted))] uppercase font-bold">Active Setup:</span>
            <span className="font-heading font-bold text-[rgb(var(--c-text))] px-2.5 py-1 rounded-lg bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]">
              {currentAppearanceMode.toUpperCase()}
            </span>
            <span className="font-heading font-bold text-[rgb(var(--c-text))] px-2.5 py-1 rounded-lg bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]">
              {activeStyleObj.name}
            </span>
            <span className="font-heading font-bold text-[rgb(var(--c-primary))] px-2.5 py-1 rounded-lg bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]">
              {activeThemeObj.name}
            </span>
            <div className="flex items-center -space-x-1.5 ml-1">
              {activeThemeObj.swatches.map((color, idx) => (
                <span
                  key={idx}
                  className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
            Changes take effect immediately without resetting other preferences
          </div>
        </div>
      </div>

      {/* =========================================================================
          THEME A — APPEARANCE MODE
          ========================================================================= */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[rgb(var(--c-primary)/0.15)] text-[rgb(var(--c-primary))] font-bold">
                Theme A
              </span>
              <h3 className="text-sm sm:text-base font-heading font-bold text-[rgb(var(--c-text))]">
                Appearance Mode (Brightness &amp; Luminance)
              </h3>
            </div>
            <p className="text-[11px] text-[rgb(var(--c-muted))] mt-0.5">
              Controls brightness and surface contrast independently without altering your selected design style or color palette.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {APPEARANCE_MODES.map((mode) => {
            const isSelected = currentAppearanceMode === mode.id;
            const Icon = mode.id === 'light' ? Sun : mode.id === 'dark' ? Moon : Laptop;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleSelectAppearanceMode(mode.id)}
                className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] ring-2 ring-[rgb(var(--c-primary)/0.35)] shadow-sm'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary)/0.5)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]' : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))]'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                        {mode.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[rgb(var(--c-muted))] line-clamp-2">
                    {mode.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[rgb(var(--c-border)/0.5)] flex items-center justify-between text-[10px] font-mono text-[rgb(var(--c-muted))]">
                  <span>data-appearance: {mode.id}</span>
                  <span className="font-bold uppercase text-[rgb(var(--c-primary))]">
                    {isSelected ? 'Active' : 'Select'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          THEME B — DESIGN STYLE
          ========================================================================= */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[rgb(var(--c-primary)/0.15)] text-[rgb(var(--c-primary))] font-bold">
                Theme B
              </span>
              <h3 className="text-sm sm:text-base font-heading font-bold text-[rgb(var(--c-text))]">
                Design Style (Visual Architecture &amp; Typography)
              </h3>
            </div>
            <p className="text-[11px] text-[rgb(var(--c-muted))] mt-0.5">
              Changes the aesthetic soul, typography hierarchy, card geometry, borders, and tactile details across the entire OS.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {DESIGN_STYLES.map((style) => {
            const isSelected = currentDesignStyle === style.id;
            const Icon = style.id === 'editorial-retro' ? Bookmark : style.id === 'quiet-minimal' ? Feather : Cpu;

            return (
              <div
                key={style.id}
                onClick={() => handleSelectDesignStyle(style.id)}
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] ring-2 ring-[rgb(var(--c-primary)/0.4)] shadow-md'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary)/0.5)]'
                }`}
              >
                <div>
                  {/* Top Badge & Title */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-primary))]">
                          {style.badge}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-heading font-bold text-[rgb(var(--c-text))] flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-[rgb(var(--c-primary))]" />
                        <span>{style.name}</span>
                      </h4>
                      <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
                        {style.subtitle}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[rgb(var(--c-muted))] mt-2 leading-relaxed">
                    {style.description}
                  </p>

                  {/* Visual Specimen Preview Box */}
                  <div className="my-3.5 p-3 rounded-xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-2">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-[rgb(var(--c-muted))] font-bold flex items-center justify-between">
                      <span>Live Specimen</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[rgb(var(--c-surface2))]">
                        Preview
                      </span>
                    </div>

                    {/* Specimen Card Simulated inside */}
                    <div
                      className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                        style.id === 'editorial-retro'
                          ? 'border-[1.5px] border-[rgb(var(--c-border))] shadow-[inset_0_0_0_1px_rgba(217,164,65,0.25)]'
                          : style.id === 'quiet-minimal'
                          ? 'border-[1px] border-[rgb(var(--c-border)/0.6)] shadow-none'
                          : 'border-[2px] border-[rgb(var(--c-border))] shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                          {style.id === 'editorial-retro'
                            ? 'THE GRAND AUDIT // 09:30'
                            : style.id === 'quiet-minimal'
                            ? 'Morning Study • Room 204'
                            : 'MOD_TASK // ID: 8810-ALPHA'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-[rgb(var(--c-primary)/0.15)] text-[rgb(var(--c-primary))] font-bold">
                          {style.id === 'editorial-retro' ? 'TICKET #42' : style.id === 'quiet-minimal' ? 'zen' : 'ACK_OK'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish italic line-clamp-1">
                        {style.sampleQuote}
                      </div>
                    </div>
                  </div>

                  {/* Key Characteristics Checklist */}
                  <div className="space-y-1 pt-1">
                    {style.characteristics.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--c-text))]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--c-primary))]" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Strip */}
                <div className="mt-4 pt-3 border-t border-[rgb(var(--c-border)/0.6)] flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-[rgb(var(--c-muted))]">
                    data-design-style=&quot;{style.id}&quot;
                  </span>
                  <span className={`text-[11px] font-heading font-bold ${isSelected ? 'text-[rgb(var(--c-primary))]' : 'text-[rgb(var(--c-muted))]'}`}>
                    {isSelected ? '✓ Current Architecture' : 'Click to Apply'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Typography & Layout Density Controls */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div>
            <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))] flex items-center gap-1.5">
              <Type className="w-4 h-4 text-[rgb(var(--c-primary))]" />
              <span>Fine-Tuning: Typography &amp; Layout Density</span>
            </h3>
            <p className="text-[11px] text-[rgb(var(--c-muted))] mt-0.5">
              Refined orthogonal controls for typeface pairing and vertical compacting.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Font Style */}
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
            <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
              Font Style
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleSetFontStyle('serif')}
                className={`py-2 px-2.5 rounded-xl text-xs font-heading font-bold border transition ${
                  currentFontStyle === 'serif'
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] border-[rgb(var(--c-primary))] shadow-xs'
                    : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] border-[rgb(var(--c-border))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                Editorial Serif
              </button>
              <button
                type="button"
                onClick={() => handleSetFontStyle('sans')}
                className={`py-2 px-2.5 rounded-xl text-xs font-heading font-bold border transition ${
                  currentFontStyle === 'sans'
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] border-[rgb(var(--c-primary))] shadow-xs'
                    : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] border-[rgb(var(--c-border))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                Clean Sans
              </button>
            </div>
          </div>

          {/* Layout Density */}
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
            <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
              Layout Density
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleSetDensity('comfortable')}
                className={`py-2 px-2.5 rounded-xl text-xs font-heading font-bold border transition ${
                  currentDensity === 'comfortable'
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] border-[rgb(var(--c-primary))] shadow-xs'
                    : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] border-[rgb(var(--c-border))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => handleSetDensity('compact')}
                className={`py-2 px-2.5 rounded-xl text-xs font-heading font-bold border transition ${
                  currentDensity === 'compact'
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] border-[rgb(var(--c-primary))] shadow-xs'
                    : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] border-[rgb(var(--c-border))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                Compact
              </button>
            </div>
          </div>

          {/* Card Border Glow */}
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
            <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
              Card Hover Glow
            </span>
            <button
              type="button"
              onClick={handleToggleGlow}
              className={`w-full py-2 px-2.5 rounded-xl text-xs font-heading font-bold border transition flex items-center justify-center gap-1.5 ${
                currentCardGlow
                  ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] border-[rgb(var(--c-primary))] shadow-xs'
                  : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] border-[rgb(var(--c-border))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentCardGlow ? 'Hover Glow Active' : 'Hover Glow Off'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold border transition whitespace-nowrap ${
                isActive
                  ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] border-[rgb(var(--c-primary))] shadow-xs'
                  : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] border-[rgb(var(--c-border))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredThemes.map((theme) => {
          const isSelected = currentThemeId === theme.id;
          const comboCount = theme.swatches?.length || 4;

          return (
            <div
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
              className={`ticket-border rounded-2xl p-4.5 cursor-pointer transition active:scale-98 flex flex-col justify-between space-y-3.5 bg-[rgb(var(--c-surface))] relative ${
                isSelected
                  ? 'border-[rgb(var(--c-primary))] ring-2 ring-[rgb(var(--c-primary))] shadow-lg'
                  : 'hover:border-[rgb(var(--c-primary))]'
              }`}
            >
              <div>
                {/* Header Swatch Strip with 3 or 4 Color Combo */}
                <div
                  className="w-full h-14 rounded-xl border border-white/20 p-2.5 flex items-center justify-between shadow-xs mb-3 relative overflow-hidden"
                  style={{ backgroundColor: theme.bgHex }}
                >
                  {/* Swatches showing the 3 or 4 color combo */}
                  <div className="flex items-center -space-x-2 relative z-10">
                    {theme.swatches.map((hex, i) => (
                      <span
                        key={i}
                        className="w-7 h-7 rounded-full border-2 border-white/50 shadow-md transform hover:scale-110 transition shrink-0"
                        style={{ backgroundColor: hex }}
                        title={`Color ${i + 1}: ${hex}`}
                      />
                    ))}
                  </div>

                  {/* Combo Badge & Mode Badge */}
                  <div className="flex items-center gap-1.5 relative z-10">
                    <span
                      className="text-[9px] font-heading font-bold px-2 py-0.5 rounded-full border border-white/30 backdrop-blur-xs"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        color: '#ffffff',
                      }}
                    >
                      {comboCount}-Color Combo
                    </span>
                    <span
                      className="text-[9px] font-heading font-bold px-2 py-0.5 rounded-full border border-white/30 backdrop-blur-xs"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        color: '#ffffff',
                      }}
                    >
                      {theme.isDark ? 'Dark' : 'Light'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                      {theme.name}
                    </h3>
                    {theme.category === 'cyberpunk' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-heading font-bold bg-cyan-900/30 text-cyan-400 border border-cyan-500/30">
                        Cyber
                      </span>
                    )}
                    {theme.category === 'dark-wood' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-heading font-bold bg-amber-900/30 text-amber-300 border border-amber-500/30">
                        Timber
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </span>
                  )}
                </div>

                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1.5 leading-relaxed">
                  {theme.description}
                </p>

                {/* Micro palette pill bar */}
                <div className="flex items-center gap-1 mt-3">
                  {theme.swatches.map((hex, i) => (
                    <div
                      key={i}
                      className="h-2 flex-1 rounded-sm border border-black/10"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                className={`w-full py-2 rounded-xl font-heading text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-xs'
                    : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-primary))] hover:text-[rgb(var(--c-on-primary))]'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Currently Applied</span>
                  </>
                ) : (
                  <>
                    <Palette className="w-3.5 h-3.5" />
                    <span>Apply Theme</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
