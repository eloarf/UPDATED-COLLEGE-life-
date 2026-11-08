import React from 'react';
import { Users, Plus, X } from 'lucide-react';
import { ProjectMember } from '../../types';

interface ProjectTeamSectionProps {
  members: ProjectMember[];
  onOpenAddMemberModal: () => void;
  onDeleteMember: (id: string) => void;
}

export const ProjectTeamSection: React.FC<ProjectTeamSectionProps> = ({
  members,
  onOpenAddMemberModal,
  onDeleteMember,
}) => {
  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4FA3A5]/15 text-[#4FA3A5] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
              Guild Companions &amp; Team Members
            </h3>
            <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              Assigned teammates, contacts and guild roles
            </p>
          </div>
        </div>
        <button
          onClick={onOpenAddMemberModal}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[#4FA3A5] transition shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Teammate</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {members.length === 0 ? (
          <div className="sm:col-span-3 p-4 text-center rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs text-[rgb(var(--c-muted))] font-flourish">
            Solo expedition or no comrades logged yet. Add your team members above!
          </div>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-xs text-white shrink-0"
                  style={{ backgroundColor: m.color || '#4FA3A5' }}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
                    {m.name}
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))] truncate">
                    {m.role} {m.contact ? `• ${m.contact}` : ''}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onDeleteMember(m.id)}
                className="text-[rgb(var(--c-muted))] hover:text-red-500 p-1 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
