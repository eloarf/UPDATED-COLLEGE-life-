import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { THEMES, applyTheme, ThemeDefinition } from '../theme/themeUtils';
import { Palette, Check, RotateCcw, Sparkles, Flame, Shield, Layers } from 'lucide-react';

export const ThemesPage: React.FC = () => {
  const { showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const currentThemeId = settings?.theme || 'pink-lobby';
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const handleSelectTheme = async (themeId: string) => {
    applyTheme(themeId);
    await db.settings.update('current_user', { theme: themeId });
    const selected = THEMES.find((t) => t.id === themeId);
    showToast(`Applied theme: ${selected?.name || themeId}!`, 'success');
  };

  const handleResetToDefault = async () => {
    applyTheme('pink-lobby');
    await db.settings.update('current_user', { theme: 'pink-lobby', pageAccents: {} });
    showToast('Reset palette to default Pink Lobby theme.', 'info');
  };

  const categories = [
    { id: 'all', label: `All Palettes (${THEMES.length})` },
    { id: 'cyberpunk', label: `Cyberpunk Neon (${THEMES.filter(t => t.category === 'cyberpunk').length})` },
    { id: 'dark-wood', label: `Dark Wood & Timber (${THEMES.filter(t => t.category === 'dark-wood').length})` },
    { id: 'daring-brights', label: `Daring Brights (${THEMES.filter(t => t.category === 'daring-brights').length})` },
    { id: 'classic', label: `Classic Storybook (${THEMES.filter(t => t.category === 'classic').length})` },
  ];

  const filteredThemes = activeCategory === 'all'
    ? THEMES
    : THEMES.filter((t) => t.category === activeCategory);

  const activeThemeObj = THEMES.find((t) => t.id === currentThemeId) || THEMES[0];

  return (
    <div className="space-y-5 pb-24 animate-pop">
      {/* Header Banner */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-heading tracking-widest text-[rgb(var(--c-primary))] font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Atmospheric Color Schemes
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] font-heading font-bold text-[rgb(var(--c-text))]">
                15 Total Styles
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              Storybook &amp; Daring Palettes
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5 max-w-xl">
              From Wes Anderson pastels and rich dark wood grain to electrifying neon-blue cyberpunk rigs.
              Featuring daring 3 and 4 color combos with zero purple.
            </p>
          </div>

          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-primary))] hover:text-[rgb(var(--c-on-primary))] transition shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Pink Lobby</span>
          </button>
        </div>

        {/* Active Theme Highlight Strip */}
        <div className="mt-4 pt-4 border-t border-[rgb(var(--c-border))] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-heading text-[rgb(var(--c-muted))] uppercase font-bold">Currently Active:</span>
            <span className="font-heading font-bold text-[rgb(var(--c-text))] px-2.5 py-1 rounded-lg bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]">
              {activeThemeObj.name}
            </span>
            <div className="flex items-center -space-x-1.5">
              {activeThemeObj.swatches.map((color, idx) => (
                <span
                  key={idx}
                  className="w-5 h-5 rounded-full border border-black/20 shadow-xs"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
            Instant live preview across all schedules, quests &amp; ledger
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
