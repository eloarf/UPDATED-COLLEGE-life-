import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { THEMES, applyTheme } from '../../theme/themeUtils';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Check } from 'lucide-react';

export const ThemeSwitcherModal: React.FC = () => {
  const { isThemeSwitcherOpen, setThemeSwitcherOpen, showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const currentTheme = settings?.theme || 'pink-lobby';

  if (!isThemeSwitcherOpen) return null;

  const handleSelectTheme = async (themeId: string) => {
    applyTheme(themeId);
    await db.settings.update('current_user', { theme: themeId });
    showToast(`Switched palette to ${THEMES.find((t) => t.id === themeId)?.name}!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
      <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[rgb(var(--c-border))] mb-3">
          <div>
            <div className="text-[10px] font-heading uppercase text-[rgb(var(--c-primary))] font-bold">
              Color Suite
            </div>
            <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
              Select Storybook Theme
            </h3>
          </div>
          <button
            onClick={() => setThemeSwitcherOpen(false)}
            className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-98 ${
                  isSelected
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] shadow-xs font-bold'
                    : 'border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Swatches preview showing 3 or 4 color combo */}
                  <div className="flex -space-x-1.5 shrink-0">
                    {theme.swatches.map((hex, sIdx) => (
                      <span
                        key={sIdx}
                        className="w-5 h-5 rounded-full border border-white/30 shadow-xs"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                  <div>
                    <div className="text-xs font-heading text-[rgb(var(--c-text))] flex items-center gap-1.5">
                      <span>{theme.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))]">
                        {theme.isDark ? 'Dark' : 'Light'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish truncate max-w-[170px]">
                      {theme.description}
                    </div>
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-[rgb(var(--c-primary))] shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
