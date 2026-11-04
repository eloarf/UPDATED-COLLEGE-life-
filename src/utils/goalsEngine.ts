import { AcademicGoal, GoalMilestone } from '../types';

export const GOAL_CATEGORIES: {
  id: AcademicGoal['category'];
  label: string;
  iconName: string;
  badgeClass: string;
}[] = [
  { id: 'academic', label: 'Academic & Courses', iconName: 'GraduationCap', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  { id: 'career', label: 'Career & Internships', iconName: 'Briefcase', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { id: 'personal', label: 'Personal Growth', iconName: 'Compass', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { id: 'health', label: 'Health & Wellness', iconName: 'Heart', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { id: 'creative', label: 'Creative & Projects', iconName: 'Palette', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
];

/**
 * Calculates percentage completion (0 - 100) based on completed milestones.
 * If no milestones exist, returns 0 if in_progress or 100 if marked completed.
 */
export function calculateGoalProgress(
  milestones: GoalMilestone[] | undefined,
  status?: AcademicGoal['status']
): number {
  if (!milestones || milestones.length === 0) {
    return status === 'completed' ? 100 : 0;
  }
  const completedCount = milestones.filter((m) => m.isCompleted || m.completed).length;
  return Math.round((completedCount / milestones.length) * 100);
}

export interface GoalsSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalMilestones: number;
  completedMilestones: number;
  averageProgressPercent: number;
}

export function calculateGoalsSummary(goals: AcademicGoal[]): GoalsSummary {
  if (!goals || goals.length === 0) {
    return {
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      totalMilestones: 0,
      completedMilestones: 0,
      averageProgressPercent: 0,
    };
  }

  const activeGoals = goals.filter((g) => g.status !== 'completed').length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;

  let totalMilestones = 0;
  let completedMilestones = 0;
  let progressSum = 0;

  for (const g of goals) {
    const p = calculateGoalProgress(g.milestones, g.status);
    progressSum += p;
    if (g.milestones) {
      totalMilestones += g.milestones.length;
      completedMilestones += g.milestones.filter((m) => m.isCompleted || m.completed).length;
    }
  }

  const averageProgressPercent = Math.round(progressSum / goals.length);

  return {
    totalGoals: goals.length,
    activeGoals,
    completedGoals,
    totalMilestones,
    completedMilestones,
    averageProgressPercent,
  };
}
