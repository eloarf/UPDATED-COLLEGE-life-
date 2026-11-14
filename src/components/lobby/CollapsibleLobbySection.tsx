import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleLobbySectionProps {
  id: string;
  title: string;
  summary?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: string) => void;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
}

export const CollapsibleLobbySection: React.FC<CollapsibleLobbySectionProps> = ({
  id,
  title,
  summary,
  icon,
  isOpen,
  onToggle,
  actionButton,
  children,
}) => {
  return (
    <section className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl shadow-xs overflow-hidden transition-colors">
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-[rgb(var(--c-surface))]">
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={isOpen}
          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
        >
          <span className="p-1 rounded-lg bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] group-hover:text-[rgb(var(--c-primary))] transition shrink-0">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="font-heading text-xs sm:text-sm font-bold text-[rgb(var(--c-text))] truncate">
            {title}
          </span>
          {summary && (
            <span className="text-[11px] text-[rgb(var(--c-muted))] font-flourish truncate hidden xs:inline sm:inline">
              • {summary}
            </span>
          )}
        </button>

        {actionButton && <div className="shrink-0">{actionButton}</div>}
      </div>

      {isOpen && (
        <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-[rgb(var(--c-border))]/60 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </section>
  );
};
