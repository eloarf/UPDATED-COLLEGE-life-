import React from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { THEMES, applyTheme } from '../theme/themeUtils';
import { Palette, Check, Sun, Moon, RotateCcw } from 'lucide-react';

export const ThemesPage: React.FC = () => {
  const { showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const currentTheme = settings?.theme || 'pink-lobby';

  const handleSelectTheme = async (themeId: string) => {
    applyTheme(themeId);
    await db.settings.update('current_user', { theme: themeId });
    showToast(`Storybook theme set to ${THEMES.find((t) => t.id === themeId)?.name}!`, 'success');
  };

  const handleResetToDefault = async () => {
    applyTheme('pink-lobby');
    await db.settings.update('current_user', { theme: 'pink-lobby', pageAccents: {} });
    showToast('Reset palette to default Pink Lobby theme.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#F6A8BE] font-bold">
              Atmospheric Design &amp; Palettes
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Storybook Color Themes
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Grand-Budapest-inspired pastel blocking • Pre-loaded without locks • Zero theme flashing
            </p>
          </div>

          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgb(var(--c-border))] text-xs font-heading hover:bg-[rgb(var(--c-surface2))]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
        </div>
      </div>

      {/* Theme Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {THEMES.map((theme) => {
          const isSelected = currentTheme === theme.id;

          return (
            <div
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
              className={`ticket-border rounded-2xl p-4 cursor-pointer transition active:scale-98 flex flex-col justify-between space-y-3 bg-[rgb(var(--c-surface))] ${
                isSelected
                  ? 'border-[rgb(var(--c-primary))] ring-2 ring-[rgb(var(--c-primary))] shadow-md'
                  : 'hover:border-[rgb(var(--c-primary))]'
              }`}
            >
              <div>
                {/* Header Swatch Strip */}
                <div
                  className="w-full h-12 rounded-xl border border-white/20 p-2 flex items-center justify-between shadow-xs mb-3"
                  style={{ backgroundColor: theme.bgHex }}
                >
                  <div className="flex -space-x-2">
                    <span
                      className="w-7 h-7 rounded-full border-2 border-white/40 shadow-xs"
                      style={{ backgroundColor: theme.primaryHex }}
                    />
                    <span
                      className="w-7 h-7 rounded-full border-2 border-white/40 shadow-xs"
                      style={{ backgroundColor: theme.accentHex }}
                    />
                  </div>

                  <span
                    className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full border border-black/10"
                    style={{ color: theme.isDark ? '#fff' : '#000' }}
                  >
                    {theme.isDark ? 'Dark Theme' : 'Light Theme'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                    {theme.name}
                  </h3>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  )}
                </div>

                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
                  {theme.description}
                </p>
              </div>

              <button
                type="button"
                className={`w-full py-1.5 rounded-xl font-heading text-xs font-bold transition ${
                  isSelected
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                    : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-primary))] hover:text-[rgb(var(--c-on-primary))]'
                }`}
              >
                {isSelected ? 'Currently Applied' : 'Apply Palette'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
