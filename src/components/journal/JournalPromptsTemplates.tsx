import React from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import {
  PromptCategory,
  PromptItem,
  QUICK_REFLECTION_TEMPLATES,
  ReflectionTemplate,
} from '../../utils/journalEngine';

interface JournalPromptsTemplatesProps {
  showPromptsPanel: boolean;
  onToggleShowPromptsPanel: (show: boolean) => void;
  selectedPromptCategory: PromptCategory;
  onSelectPromptCategory: (cat: PromptCategory) => void;
  onShufflePrompt: () => void;
  activePrompt: PromptItem;
  onApplyPrompt: () => void;
  onApplyQuickTemplate: (tpl: ReflectionTemplate) => void;
}

export const JournalPromptsTemplates: React.FC<JournalPromptsTemplatesProps> = ({
  showPromptsPanel,
  onToggleShowPromptsPanel,
  selectedPromptCategory,
  onSelectPromptCategory,
  onShufflePrompt,
  activePrompt,
  onApplyPrompt,
  onApplyQuickTemplate,
}) => {
  return (
    <>
      {/* Optional Prompt Carousel Header */}
      {showPromptsPanel ? (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {(
                [
                  'reflection',
                  'gratitude',
                  'university',
                  'creativity',
                  'relationships',
                  'ambitions',
                  'difficult_days',
                ] as PromptCategory[]
              ).map((cat) => {
                const isSel = selectedPromptCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectPromptCategory(cat)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-heading font-bold whitespace-nowrap transition cursor-pointer ${
                      isSel
                        ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                        : 'bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                    }`}
                  >
                    {cat.replace('_', ' ').toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={onShufflePrompt}
                className="text-[11px] font-heading font-bold text-[rgb(var(--c-primary))] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Shuffle</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleShowPromptsPanel(false)}
                className="text-[11px] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] ml-1 cursor-pointer"
              >
                Hide
              </button>
            </div>
          </div>

          {/* Prompt Text & Action */}
          <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))] block">
                  {activePrompt.categoryLabel} Prompt
                </span>
                <p className="font-flourish italic text-[rgb(var(--c-text))] text-sm">
                  “{activePrompt.prompt}”
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onApplyPrompt}
              className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))] hover:bg-[rgb(var(--c-primary))] hover:text-white font-heading text-xs font-bold transition shrink-0 self-start sm:self-auto cursor-pointer"
            >
              Use as Topic
            </button>
          </div>
        </div>
      ) : (
        <div className="text-right">
          <button
            type="button"
            onClick={() => onToggleShowPromptsPanel(true)}
            className="text-xs text-[rgb(var(--c-primary))] font-heading font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" /> Show Writing Prompts
          </button>
        </div>
      )}

      {/* Quick Reflection Templates Strip */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3 sm:p-4 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
            <span>Quick Reflection Templates</span>
          </span>
          <span className="text-[10px] text-[rgb(var(--c-muted))]">
            Click to insert into entry
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_REFLECTION_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onApplyQuickTemplate(tpl)}
              className="p-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:bg-[rgb(var(--c-surface2))] hover:border-[rgb(var(--c-primary))] text-left transition active:scale-95 group cursor-pointer"
            >
              <div className="font-heading font-bold text-xs text-[rgb(var(--c-text))] group-hover:text-[rgb(var(--c-primary))]">
                {tpl.name}
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))] line-clamp-1 mt-0.5">
                {tpl.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
