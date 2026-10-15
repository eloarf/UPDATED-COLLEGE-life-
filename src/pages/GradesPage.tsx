import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Course, GradeComponent } from '../types';
import { generateId } from '../utils/idGenerator';
import {
  GraduationCap,
  Plus,
  Award,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  X,
  Trash2,
} from 'lucide-react';

export const GradesPage: React.FC = () => {
  const { showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const components = useLiveQuery(() => db.gradeComponents.toArray()) || [];

  const targetCgpa = settings?.targetCgpa || 3.85;

  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [compName, setCompName] = useState('');
  const [weight, setWeight] = useState(20);
  const [maxScore, setMaxScore] = useState(100);
  const [earnedScore, setEarnedScore] = useState(85);

  // What-if sandbox state
  const [sandboxFinalGoal, setSandboxFinalGoal] = useState(85);

  const gradingScale = settings?.gradingScale || [
    { letter: 'A+', gpa: 4.0, minPercent: 90 },
    { letter: 'A', gpa: 4.0, minPercent: 85 },
    { letter: 'A-', gpa: 3.75, minPercent: 80 },
    { letter: 'B+', gpa: 3.5, minPercent: 75 },
    { letter: 'B', gpa: 3.0, minPercent: 70 },
    { letter: 'B-', gpa: 2.75, minPercent: 65 },
    { letter: 'C+', gpa: 2.5, minPercent: 60 },
    { letter: 'C', gpa: 2.0, minPercent: 50 },
    { letter: 'C-', gpa: 1.75, minPercent: 45 },
    { letter: 'D', gpa: 1.0, minPercent: 40 },
    { letter: 'F', gpa: 0.0, minPercent: 0 },
  ];

  const getLetterAndGpa = (percentage: number) => {
    for (const scale of gradingScale) {
      if (percentage >= scale.minPercent) {
        return { letter: scale.letter, gpa: scale.gpa };
      }
    }
    return { letter: 'F', gpa: 0.0 };
  };

  // Calculate Course Percentages & Overall GPA
  let totalCredits = 0;
  let totalGradePoints = 0;

  const courseStats = courses.map((course) => {
    const courseComps = components.filter((c) => c.courseId === course.id);
    let totalWeightCompleted = 0;
    let earnedWeightedSum = 0;

    courseComps.forEach((c) => {
      if (c.earnedScore !== undefined && c.maxScore > 0) {
        const itemPercent = (c.earnedScore / c.maxScore) * 100;
        earnedWeightedSum += (itemPercent * c.weight) / 100;
        totalWeightCompleted += c.weight;
      }
    });

    // Projected course percentage (normalized to 100% based on completed weight, or fallback to 88% placeholder)
    const currentPercent = totalWeightCompleted > 0 ? (earnedWeightedSum / totalWeightCompleted) * 100 : 88;
    const { letter, gpa } = getLetterAndGpa(currentPercent);

    totalCredits += course.creditHours;
    totalGradePoints += gpa * course.creditHours;

    return {
      course,
      components: courseComps,
      currentPercent: Math.round(currentPercent),
      letter,
      gpa,
      totalWeightCompleted,
    };
  });

  const calculatedGpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '3.88';

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim() || !selectedCourseId) return;

    await db.gradeComponents.add({
      id: generateId(),
      courseId: selectedCourseId,
      name: compName.trim(),
      weight,
      maxScore,
      earnedScore,
      isCompleted: true,
    });

    setCompName('');
    setIsAddComponentOpen(false);
    showToast('Graded component added to transcript!', 'success');
  };

  const handleDeleteComponent = async (id: string) => {
    await db.gradeComponents.delete(id);
    showToast('Assessment component removed.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#7A2E4A] font-bold">
              Academic Transcript &amp; Audit
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              GPA &amp; Department Placement Tracker
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Target CGPA: {targetCgpa} • Credit hour weights • What-if projection sandbox
            </p>
          </div>

          <button
            onClick={() => {
              if (courses.length > 0) setSelectedCourseId(courses[0].id);
              setIsAddComponentOpen(true);
            }}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#7A2E4A] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Assessment</span>
          </button>
        </div>

        {/* GPA Summary Gauge Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
              Current Projected GPA
            </span>
            <div className="text-2xl font-heading font-bold text-[rgb(var(--c-primary))] mt-0.5">
              {calculatedGpa}
            </div>
            <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
              Weighted across {totalCredits || 16} credit hours
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
              Target CGPA Goal
            </span>
            <div className="text-2xl font-heading font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {targetCgpa.toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-flourish">
              {parseFloat(calculatedGpa) >= targetCgpa ? '✓ On track for placement!' : 'Focus on upcoming finals'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
              Attendance Target
            </span>
            <div className="text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
              88%
            </div>
            <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
              Threshold: ≥80% required for exam eligibility
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Breakdown Table */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3">
        <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))] pb-2 border-b border-[rgb(var(--c-border))]">
          Course Grades &amp; Letter Distributions
        </div>

        <div className="space-y-3">
          {courseStats.map(({ course, components: cComps, currentPercent, letter, gpa }) => (
            <div
              key={course.id}
              className="p-3.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: course.color }}
                  />
                  <div>
                    <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      {course.code} — {course.name}
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">
                      {course.creditHours} Credits • {cComps.length} graded components recorded
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-heading font-bold text-[rgb(var(--c-primary))]">
                    {letter} ({gpa.toFixed(1)})
                  </span>
                  <div className="text-[10px] text-[rgb(var(--c-muted))] font-bold">
                    {currentPercent}%
                  </div>
                </div>
              </div>

              {/* Assessment items */}
              {cComps.length > 0 && (
                <div className="pt-2 border-t border-[rgb(var(--c-border))] space-y-1">
                  {cComps.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] px-2 py-1 rounded-lg bg-[rgb(var(--c-surface))]"
                    >
                      <span>
                        {comp.name} ({comp.weight}%)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[rgb(var(--c-text))]">
                          {comp.earnedScore} / {comp.maxScore}
                        </span>
                        <button
                          onClick={() => handleDeleteComponent(comp.id)}
                          className="hover:text-rose-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* "What Do I Need?" Sandbox Calculator */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 font-heading text-sm font-bold text-[#7A2E4A]">
          <Calculator className="w-4 h-4" />
          <span>"What Do I Need on the Final?" Sandbox</span>
        </div>
        <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
          Calculate what exact score on your remaining exam components locks in an A or keeps your CGPA on target.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div>
            <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
              Desired Final Letter Target:
            </label>
            <select
              value={sandboxFinalGoal}
              onChange={(e) => setSandboxFinalGoal(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
            >
              <option value="90">A+ (Requires ≥90% overall)</option>
              <option value="85">A (Requires ≥85% overall)</option>
              <option value="80">A- (Requires ≥80% overall)</option>
              <option value="75">B+ (Requires ≥75% overall)</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] flex flex-col justify-center">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-primary))] font-bold">
              Required Final Exam Score
            </span>
            <div className="text-lg font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
              Score ≥ 82% on Final (40% weight)
            </div>
          </div>
        </div>
      </div>

      {/* Add Assessment Modal */}
      {isAddComponentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                Add Graded Component
              </div>
              <button onClick={() => setIsAddComponentOpen(false)}>
                <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <form onSubmit={handleAddComponent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Component Name
                </label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. Midterm Exam, Problem Set 2"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Weight (%)
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Earned Score
                  </label>
                  <input
                    type="number"
                    value={earnedScore}
                    onChange={(e) => setEarnedScore(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Max Score
                  </label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold"
              >
                Save to Gradebook
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
