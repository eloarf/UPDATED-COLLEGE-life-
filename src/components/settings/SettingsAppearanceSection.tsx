import React from 'react';
import {
  Sparkles,
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
  Bookmark,
  Feather,
  Cpu,
  ZapOff,
} from 'lucide-react';
import {
  APPEARANCE_MODES,
  DESIGN_STYLES,
  AppearanceMode,
  DesignStyle,
} from '../../theme/themeUtils';

interface SettingsAppearanceSectionProps {
  currentAppearanceMode: AppearanceMode;
  onSelectAppearanceMode: (mode: AppearanceMode) => void;
  currentDesignStyle: DesignStyle;
  onSelectDesignStyle: (style: DesignStyle) => void;
  reduceAnimations: boolean;
  onToggleReduceAnimations: () => void;
}

export const SettingsAppearanceSection: React.FC<SettingsAppearanceSectionProps> = ({
  currentAppearanceMode,
  onSelectAppearanceMode,
  currentDesignStyle,
  onSelectDesignStyle,
  reduceAnimations,
  onToggleReduceAnimations,
}) => {
  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[rgb(var(--c-border))]">
        <div>
          <div className="text-[10px] uppercase font-heading tracking-widest text-[rgb(var(--c-primary))] font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Visual Architecture
          </div>
          <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
            Appearance Mode &amp; Design Style
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Customize brightness (Theme A) and aesthetic design language (Theme B) independently.
          </p>
        </div>

        <a
          href="#/themes"
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[rgb(var(--c-primary))] active:scale-95 transition"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>All 27 Color Themes &rarr;</span>
        </a>
      </div>

      {/* Theme A: Appearance Mode */}
      <div className="space-y-2">
        <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
          Theme A — Brightness &amp; Luminance
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {APPEARANCE_MODES.map((mode) => {
            const isSelected = currentAppearanceMode === mode.id;
            const Icon = mode.id === 'light' ? Sun : mode.id === 'dark' ? Moon : Laptop;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectAppearanceMode(mode.id)}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] ring-2 ring-[rgb(var(--c-primary)/0.3)] shadow-xs'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary)/0.5)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]' : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))]'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      {mode.name}
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">
                      {mode.id}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme B: Design Style */}
      <div className="space-y-2 pt-2 border-t border-[rgb(var(--c-border))]">
        <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
          Theme B — Design Style Architecture
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {DESIGN_STYLES.map((style) => {
            const isSelected = currentDesignStyle === style.id;
            const Icon = style.id === 'editorial-retro' ? Bookmark : style.id === 'quiet-minimal' ? Feather : Cpu;

            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onSelectDesignStyle(style.id)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] ring-2 ring-[rgb(var(--c-primary)/0.3)] shadow-xs'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary)/0.5)]'
                }`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                      <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                        {style.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[rgb(var(--c-muted))] font-flourish line-clamp-2">
                    {style.subtitle}
                  </p>
                </div>
                <div className="mt-2 text-[9px] font-mono text-[rgb(var(--c-primary))] font-bold uppercase">
                  {style.badge}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reduce Animations / Motion Toggle */}
      <div className="pt-3 border-t border-[rgb(var(--c-border))] flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <ZapOff className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
            <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              Reduce Animations &amp; Transitions
            </span>
          </div>
          <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
            Disables decorative animations and transitions for improved performance on low-power devices and comfort.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={reduceAnimations}
          onClick={onToggleReduceAnimations}
          className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold border transition active:scale-95 shrink-0 cursor-pointer ${
            reduceAnimations
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
          }`}
        >
          {reduceAnimations ? '✓ Reduced Motion On' : 'Standard Motion'}
        </button>
      </div>
    </div>
  );
};
