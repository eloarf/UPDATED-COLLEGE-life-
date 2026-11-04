import { describe, it, expect } from 'vitest';
import { calculateGoalProgress, calculateGoalsSummary, GOAL_CATEGORIES } from './goalsEngine';
import { AcademicGoal } from '../types';

describe('goalsEngine', () => {
  it('correctly calculates progress based on milestones', () => {
    expect(calculateGoalProgress([])).toBe(0);
    expect(calculateGoalProgress([], 'completed')).toBe(100);

    const milestones = [
      { id: '1', title: 'Outline literature review', isCompleted: true },
      { id: '2', title: 'Write methodology draft', isCompleted: false },
      { id: '3', title: 'Submit draft to professor', isCompleted: false },
      { id: '4', title: 'Final revisions', isCompleted: false },
    ];

    expect(calculateGoalProgress(milestones)).toBe(25);

    milestones[1].isCompleted = true;
    expect(calculateGoalProgress(milestones)).toBe(50);

    milestones[2].isCompleted = true;
    milestones[3].isCompleted = true;
    expect(calculateGoalProgress(milestones)).toBe(100);
  });

  it('correctly calculates goals summary metrics', () => {
    const goals: AcademicGoal[] = [
      {
        id: 'g1',
        title: 'Maintain 3.8+ GPA this semester',
        category: 'academic',
        progressPercent: 50,
        status: 'active',
        milestones: [
          { id: 'm1', title: 'Midterm exams prep', isCompleted: true },
          { id: 'm2', title: 'Final exams review', isCompleted: false },
        ],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'g2',
        title: 'Complete Software Engineering Internship Application',
        category: 'career',
        progressPercent: 100,
        status: 'completed',
        milestones: [
          { id: 'm3', title: 'Revise resume', isCompleted: true },
          { id: 'm4', title: 'Submit 20 applications', isCompleted: true },
          { id: 'm5', title: 'Technical interview practice', isCompleted: true },
        ],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const summary = calculateGoalsSummary(goals);
    expect(summary.totalGoals).toBe(2);
    expect(summary.activeGoals).toBe(1);
    expect(summary.completedGoals).toBe(1);
    expect(summary.totalMilestones).toBe(5);
    expect(summary.completedMilestones).toBe(4);
    expect(summary.averageProgressPercent).toBe(75);
  });

  it('provides all 5 core goal categories', () => {
    expect(GOAL_CATEGORIES).toHaveLength(5);
    const ids = GOAL_CATEGORIES.map((c) => c.id);
    expect(ids).toContain('academic');
    expect(ids).toContain('career');
    expect(ids).toContain('personal');
    expect(ids).toContain('health');
    expect(ids).toContain('creative');
  });
});
