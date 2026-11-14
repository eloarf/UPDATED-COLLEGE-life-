import React from 'react';
import { TimelineBlock } from '../../utils/timelineEngine';
import { Clock, ArrowRight, Sparkles } from 'lucide-react';

interface LobbyTopTimelinePreviewProps {
  items: TimelineBlock[];
  isAllDone: boolean;
  onNavigate: (route: string) => void;
}

export const LobbyTopTimelinePreview: React.FC<LobbyTopTimelinePreviewProps> = ({
  items,
  isAllDone,
  onNavigate,
}) => {
  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-wider text-[rgb(var(--c-text))]">
          <Clock className="w-4 h-4 text-[rgb(var(--c-primary))]" />
          <span>Next on Today&apos;s Timeline</span>
        </div>
        <button
          onClick={() => onNavigate('#/today')}
          className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Full Timeline</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-[rgb(var(--c-muted))] font-flourish">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {isAllDone
                ? 'All done for today — your evening schedule is calm and open.'
                : 'No remaining scheduled blocks for today.'}
            </span>
          </div>
          <button
            onClick={() => onNavigate('#/today')}
            className="text-[11px] font-heading font-bold text-[rgb(var(--c-primary))] shrink-0 hover:underline cursor-pointer"
          >
            Plan Day →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((block) => (
            <button
              key={block.id}
              onClick={() => onNavigate('#/today')}
              className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))] transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: block.colour }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
                    {block.title}
                  </div>
                  <div className="text-[11px] text-[rgb(var(--c-muted))] truncate font-flourish">
                    {block.subtitle || block.kind}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold text-[rgb(var(--c-text))]">
                  {block.startTime}
                </div>
                <div className="text-[10px] text-[rgb(var(--c-muted))]">
                  {block.endTime}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
