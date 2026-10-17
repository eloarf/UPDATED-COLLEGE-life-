import React, { useState, useMemo } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Course, GradeComponent, DepartmentOption, DEFAULT_DEPARTMENTS } from '../types';
import { generateId } from '../utils/idGenerator';
import { CourseModal } from '../components/common/CourseModal';
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
  Edit2,
  BookOpen,
  ArrowUpDown,
  CheckCircle2,
  Sliders,
  Settings2,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const GradesPage: React.FC = () => {
  const { showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const components = useLiveQuery(() => db.gradeComponents.toArray()) || [];

  // Tab: 'gpa' | 'department' | 'sandbox'
  const [activeTab, setActiveTab] = useState<'gpa' | 'department' | 'sandbox'>('gpa');

  // Modals
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);

  // Component form state
  const [editingComponent, setEditingComponent] = useState<GradeComponent | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [compName, setCompName] = useState('');
  const [weight, setWeight] = useState<number | string>(20);
  const [maxScore, setMaxScore] = useState<number | string>(100);
  const [earnedScore, setEarnedScore] = useState<number | string>(85);

  // Department form state (add/edit)
  const [editingDept, setEditingDept] = useState<DepartmentOption | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptFaculty, setDeptFaculty] = useState('');
  const [deptCutoff, setDeptCutoff] = useState('3.75');
  const [deptSeats, setDeptSeats] = useState('60');
  const [deptNotes, setDeptNotes] = useState('');

  // What-if sandbox state
  const [sandboxFinalGoal, setSandboxFinalGoal] = useState<number>(85); // Target percentage
  const [sandboxCourseId, setSandboxCourseId] = useState<string>('');

  // Grading scale from settings
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
    { letter: 'Fx', gpa: 0.0, minPercent: 30 },
    { letter: 'F', gpa: 0.0, minPercent: 0 },
  ];

  const targetCgpa = settings?.targetCgpa ?? 3.85;
  const departmentOptions: DepartmentOption[] = useMemo(() => {
    return (
      settings?.departmentOptions && settings.departmentOptions.length > 0
        ? settings.departmentOptions
        : DEFAULT_DEPARTMENTS
    ).slice().sort((a, b) => a.preferenceRank - b.preferenceRank);
  }, [settings?.departmentOptions]);

  const getLetterAndGpa = (percentage: number) => {
    for (const scale of gradingScale) {
      if (percentage >= scale.minPercent) {
        return { letter: scale.letter, gpa: scale.gpa };
      }
    }
    return { letter: 'F', gpa: 0.0 };
  };

  // Live calculation of each course grade & cumulative CGPA
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

    // Normalized to 100% or fallback to 85% if no components yet
    const currentPercent =
      totalWeightCompleted > 0 ? (earnedWeightedSum / totalWeightCompleted) * 100 : 85;
    const { letter, gpa } = getLetterAndGpa(currentPercent);

    const credits = course.creditHours || 3;
    totalCredits += credits;
    totalGradePoints += gpa * credits;

    return {
      course,
      components: courseComps,
      currentPercent: Math.round(currentPercent * 10) / 10,
      letter,
      gpa,
      totalWeightCompleted,
    };
  });

  const calculatedGpaNumber = totalCredits > 0 ? totalGradePoints / totalCredits : 3.88;
  const calculatedGpa = calculatedGpaNumber.toFixed(2);

  // Handlers for Graded Components
  const handleOpenAddComponent = (preselectCourseId?: string) => {
    setEditingComponent(null);
    setSelectedCourseId(preselectCourseId || (courses[0]?.id ?? ''));
    setCompName('');
    setWeight(20);
    setMaxScore(100);
    setEarnedScore(85);
    setIsAddComponentOpen(true);
  };

  const handleOpenEditComponent = (comp: GradeComponent) => {
    setEditingComponent(comp);
    setSelectedCourseId(comp.courseId);
    setCompName(comp.name);
    setWeight(comp.weight);
    setMaxScore(comp.maxScore);
    setEarnedScore(comp.earnedScore ?? 0);
    setIsAddComponentOpen(true);
  };

  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim() || !selectedCourseId) {
      showToast('Please provide a component name and course.', 'warning');
      return;
    }

    if (editingComponent) {
      await db.gradeComponents.update(editingComponent.id, {
        courseId: selectedCourseId,
        name: compName.trim(),
        weight: Number(weight),
        maxScore: Number(maxScore),
        earnedScore: Number(earnedScore),
        isCompleted: true,
      });
      showToast('Assessment updated.', 'success');
    } else {
      await db.gradeComponents.add({
        id: generateId(),
        courseId: selectedCourseId,
        name: compName.trim(),
        weight: Number(weight),
        maxScore: Number(maxScore),
        earnedScore: Number(earnedScore),
        isCompleted: true,
      });
      showToast('Assessment added to transcript!', 'success');
    }

    setIsAddComponentOpen(false);
  };

  const handleDeleteComponent = async (id: string) => {
    await db.gradeComponents.delete(id);
    showToast('Assessment removed from course calculations.', 'info');
  };

  // Handlers for Target CGPA
  const handleUpdateTargetCgpa = async (val: number) => {
    await db.settings.update('current_user', { targetCgpa: val });
    showToast(`Target CGPA updated to ${val.toFixed(2)}.`, 'success');
  };

  // Handlers for Departments
  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptFaculty('Faculty of Engineering');
    setDeptCutoff('3.70');
    setDeptSeats('50');
    setDeptNotes('');
    setIsAddDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: DepartmentOption) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptFaculty(dept.faculty);
    setDeptCutoff(dept.cutoffGpa.toString());
    setDeptSeats((dept.availableSeats || 50).toString());
    setDeptNotes(dept.notes || '');
    setIsAddDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      showToast('Please enter department name and code.', 'warning');
      return;
    }

    const cutoff = parseFloat(deptCutoff) || 3.5;
    const seats = parseInt(deptSeats, 10) || 50;

    const currentList = [...departmentOptions];

    if (editingDept) {
      const idx = currentList.findIndex((d) => d.id === editingDept.id);
      if (idx !== -1) {
        currentList[idx] = {
          ...editingDept,
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase(),
          faculty: deptFaculty.trim(),
          cutoffGpa: cutoff,
          availableSeats: seats,
          notes: deptNotes.trim() || undefined,
        };
      }
    } else {
      currentList.push({
        id: generateId(),
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        faculty: deptFaculty.trim(),
        cutoffGpa: cutoff,
        availableSeats: seats,
        preferenceRank: currentList.length + 1,
        notes: deptNotes.trim() || undefined,
      });
    }

    await db.settings.update('current_user', { departmentOptions: currentList });
    showToast(editingDept ? 'Department updated.' : 'New department choice registered!', 'success');
    setIsAddDeptModalOpen(false);
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    const updated = departmentOptions
      .filter((d) => d.id !== id)
      .map((d, idx) => ({ ...d, preferenceRank: idx + 1 }));
    await db.settings.update('current_user', { departmentOptions: updated });
    showToast(`Removed “${name}” from department preferences.`, 'info');
  };

  const handleMoveDepartmentRank = async (index: number, direction: 'up' | 'down') => {
    const list = [...departmentOptions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const reordered = list.map((item, idx) => ({
      ...item,
      preferenceRank: idx + 1,
    }));

    await db.settings.update('current_user', { departmentOptions: reordered });
  };

  const handleResetDepartments = async () => {
    await db.settings.update('current_user', { departmentOptions: DEFAULT_DEPARTMENTS });
    showToast('Reset to university standard engineering departments.', 'info');
  };

  // What-if calculation
  const targetCourse = courses.find((c) => c.id === (sandboxCourseId || courses[0]?.id));
  const targetCourseComps = targetCourse ? components.filter((c) => c.courseId === targetCourse.id) : [];
  const completedWeight = targetCourseComps.reduce((acc, c) => acc + c.weight, 0);
  const completedWeightedScore = targetCourseComps.reduce((acc, c) => {
    return acc + ((c.earnedScore || 0) / c.maxScore) * c.weight;
  }, 0);
  const remainingWeight = Math.max(0, 100 - completedWeight);
  const neededScoreOnRemaining =
    remainingWeight > 0
      ? Math.max(0, Math.round(((sandboxFinalGoal - completedWeightedScore) / remainingWeight) * 100))
      : 0;

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* 1. Header Banner */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#7A2E4A] font-bold">
              Academic Transcript &amp; Placement Audit
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              GPA &amp; Department Placement Tracker
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Data-driven grading scale • Real-time weighted CGPA • Department preference rankings &amp; admissions eligibility
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleOpenAddComponent()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Assessment</span>
            </button>

            <button
              onClick={() => setIsScaleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:bg-[rgb(var(--c-surface))] active:scale-95 transition"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#7A2E4A]" />
              <span>Scale Config</span>
            </button>
          </div>
        </div>

        {/* GPA Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] shadow-2xs">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
              Projected CGPA
            </span>
            <div className="text-2xl font-heading font-bold text-[rgb(var(--c-primary))] mt-0.5">
              {calculatedGpa}
            </div>
            <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
              Weighted across {totalCredits} credit hours
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] shadow-2xs">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
              Target Placement CGPA
            </span>
            <div className="text-2xl font-heading font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {targetCgpa.toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-flourish">
              {calculatedGpaNumber >= targetCgpa ? '✓ Competitive for choice #1' : 'Keep final exam push'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] shadow-2xs">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
              Active Courses
            </span>
            <div className="text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
              {courses.length}
            </div>
            <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
              {components.length} graded components
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] shadow-2xs">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
              Top Dept Choice
            </span>
            <div className="text-base sm:text-lg font-heading font-bold text-[#7A2E4A] truncate mt-0.5">
              {departmentOptions[0]?.name || 'Software Eng.'}
            </div>
            <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
              Cutoff: {departmentOptions[0]?.cutoffGpa || '3.80'} CGPA
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[rgb(var(--c-border))] pb-2 overflow-x-auto">
        {[
          { id: 'gpa', label: 'Academic Transcript & Course Grades', icon: GraduationCap },
          { id: 'department', label: 'Department Choices & Eligibility', icon: Award },
          { id: 'sandbox', label: 'What-If Final Exam Calculator', icon: Calculator },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-heading font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-[#7A2E4A] text-white shadow-xs'
                  : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] border border-[rgb(var(--c-border))]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: GPA TRANSCRIPT ================= */}
      {activeTab === 'gpa' && (
        <div className="space-y-4">
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgb(var(--c-border))]">
              <div>
                <h3 className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
                  Course Grades &amp; Assessment Breakdown
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                  Each course score updates immediately when midterm, lab, or quiz grades are recorded.
                </p>
              </div>

              <button
                onClick={() => {
                  setCourseToEdit(null);
                  setIsCourseModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-surface2))]"
              >
                <Plus className="w-3.5 h-3.5 text-[#7A2E4A]" />
                <span>New Course</span>
              </button>
            </div>

            {/* Courses List */}
            {courseStats.length === 0 ? (
              <div className="text-center py-10 text-xs text-[rgb(var(--c-muted))] font-flourish">
                No university courses registered yet. Click “New Course” to start your transcript!
              </div>
            ) : (
              <div className="space-y-3">
                {courseStats.map(
                  ({ course, components: cComps, currentPercent, letter, gpa, totalWeightCompleted }) => (
                    <div
                      key={course.id}
                      className="p-4 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] space-y-3 shadow-2xs hover:border-[#7A2E4A]/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3 self-stretch rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: course.color }}
                          />
                          <div>
                            <div className="text-xs sm:text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                              {course.code} — {course.name}
                            </div>
                            <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                              {course.creditHours} Credits • {cComps.length} graded assessments ({totalWeightCompleted}% accounted for)
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-primary))]">
                              {letter} ({gpa.toFixed(1)})
                            </span>
                            <div className="text-[10px] text-[rgb(var(--c-muted))] font-bold">
                              {currentPercent}%
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenAddComponent(course.id)}
                            className="p-1.5 rounded-lg border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[#7A2E4A] transition"
                            title="Add assessment component"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Assessment Components List */}
                      {cComps.length > 0 && (
                        <div className="pt-2 border-t border-[rgb(var(--c-border))] space-y-1.5">
                          {cComps.map((comp) => {
                            const percent = comp.maxScore > 0 ? Math.round(((comp.earnedScore || 0) / comp.maxScore) * 100) : 0;
                            return (
                              <div
                                key={comp.id}
                                className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))]"
                              >
                                <div>
                                  <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                                    {comp.name}
                                  </span>
                                  <span className="text-[10px] text-[rgb(var(--c-muted))] ml-2">
                                    Weight: {comp.weight}%
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs font-bold text-[rgb(var(--c-text))]">
                                    {comp.earnedScore} / {comp.maxScore}{' '}
                                    <span className="text-[10px] text-[rgb(var(--c-muted))] font-normal">
                                      ({percent}%)
                                    </span>
                                  </span>

                                  <button
                                    onClick={() => handleOpenEditComponent(comp)}
                                    className="text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                                    title="Edit assessment"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComponent(comp.id)}
                                    className="text-[rgb(var(--c-muted))] hover:text-rose-500"
                                    title="Delete assessment"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: DEPARTMENT CHOICES & ELIGIBILITY ================= */}
      {activeTab === 'department' && (
        <div className="space-y-4">
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgb(var(--c-border))]">
              <div>
                <h3 className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
                  Department Placement Roster &amp; Cutoff Audits
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                  Live comparison of your projected CGPA ({calculatedGpa}) against admission thresholds for each department choice.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAddDept}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Department</span>
                </button>

                <button
                  onClick={handleResetDepartments}
                  className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] text-xs font-heading"
                  title="Reset to default engineering departments"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Department Cards */}
            <div className="space-y-3">
              {departmentOptions.map((dept, index) => {
                const isEligible = calculatedGpaNumber >= dept.cutoffGpa;
                const margin = calculatedGpaNumber - dept.cutoffGpa;
                const isClose = !isEligible && margin >= -0.15;

                return (
                  <div
                    key={dept.id}
                    className={`ticket-border rounded-2xl p-4 sm:p-5 bg-[rgb(var(--c-bg))] space-y-3 transition shadow-2xs ${
                      isEligible ? 'border-emerald-500/60' : isClose ? 'border-amber-500/60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] flex items-center justify-center font-heading font-bold text-xs text-[#7A2E4A]">
                          #{dept.preferenceRank}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))]">
                              {dept.code}
                            </span>
                            <span className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                              {dept.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                            {dept.faculty} • {dept.availableSeats ? `${dept.availableSeats} Quota Seats` : 'Open quota'}
                          </div>
                        </div>
                      </div>

                      {/* Eligibility Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isEligible ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-heading text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Eligible (+{margin.toFixed(2)})
                          </span>
                        ) : isClose ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-heading text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Close Target ({margin.toFixed(2)})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-heading text-[10px] font-bold border border-rose-500/30">
                            Cutoff Gap ({margin.toFixed(2)})
                          </span>
                        )}

                        {/* Reorder and Edit Buttons */}
                        <div className="flex items-center gap-0.5 border-l border-[rgb(var(--c-border))] pl-2 ml-1">
                          <button
                            onClick={() => handleMoveDepartmentRank(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] disabled:opacity-30"
                            title="Increase preference rank"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMoveDepartmentRank(index, 'down')}
                            disabled={index === departmentOptions.length - 1}
                            className="p-1 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] disabled:opacity-30"
                            title="Decrease preference rank"
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => handleOpenEditDept(dept)}
                            className="p-1 text-[rgb(var(--c-muted))] hover:text-[#7A2E4A]"
                            title="Edit department cutoff"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                            className="p-1 text-[rgb(var(--c-muted))] hover:text-rose-500"
                            title="Remove choice"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar toward cutoff */}
                    <div>
                      <div className="flex justify-between text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                        <span>Cutoff Threshold: {dept.cutoffGpa.toFixed(2)} CGPA</span>
                        <span>Your CGPA: {calculatedGpa}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isEligible ? 'bg-emerald-500' : isClose ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(10, (calculatedGpaNumber / dept.cutoffGpa) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {dept.notes && (
                      <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish italic pt-1">
                        “{dept.notes}”
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: WHAT-IF SANDBOX CALCULATOR ================= */}
      {activeTab === 'sandbox' && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 font-heading text-base font-bold text-[#7A2E4A]">
            <Calculator className="w-5 h-5" />
            <span>"What Score Do I Need on the Final Exam?" Sandbox</span>
          </div>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed max-w-2xl">
            Pick any enrolled course and your desired target grade. The engine computes the exact minimum score you must achieve on remaining assessments.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                Select Course
              </label>
              <select
                value={sandboxCourseId || courses[0]?.id || ''}
                onChange={(e) => setSandboxCourseId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                Target Letter Grade
              </label>
              <select
                value={isNaN(sandboxFinalGoal) ? 85 : sandboxFinalGoal}
                onChange={(e) => setSandboxFinalGoal(parseInt(e.target.value, 10) || 85)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                <option value="90">A+ (Requires ≥90% overall)</option>
                <option value="85">A (Requires ≥85% overall)</option>
                <option value="80">A- (Requires ≥80% overall)</option>
                <option value="75">B+ (Requires ≥75% overall)</option>
                <option value="70">B (Requires ≥70% overall)</option>
                <option value="60">C+ (Requires ≥60% overall)</option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] flex flex-col justify-center">
              <span className="text-[10px] uppercase font-heading font-bold text-[#7A2E4A]">
                Required on Remaining ({remainingWeight}% weight)
              </span>
              <div className="text-xl font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
                {remainingWeight === 0
                  ? 'All 100% completed!'
                  : neededScoreOnRemaining > 100
                  ? `>100% (Mathematically unreachable)`
                  : `Score ≥ ${neededScoreOnRemaining}% on remaining`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT COMPONENT ================= */}
      {isAddComponentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-4">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                {editingComponent ? 'Edit Graded Assessment' : 'Add Graded Assessment'}
              </div>
              <button onClick={() => setIsAddComponentOpen(false)}>
                <X className="w-5 h-5 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <form onSubmit={handleSaveComponent} className="space-y-4">
              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
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
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Component Name
                </label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. Midterm Examination, Lab Quiz 3, Project"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Weight (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={weight === '' || isNaN(Number(weight)) ? '' : weight}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWeight(val === '' ? '' : isNaN(parseInt(val, 10)) ? '' : parseInt(val, 10));
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Earned Score
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={earnedScore === '' || isNaN(Number(earnedScore)) ? '' : earnedScore}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEarnedScore(val === '' ? '' : isNaN(parseFloat(val)) ? '' : parseFloat(val));
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Max Score
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={maxScore === '' || isNaN(Number(maxScore)) ? '' : maxScore}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaxScore(val === '' ? '' : isNaN(parseFloat(val)) ? '' : parseFloat(val));
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition mt-2 shadow-xs"
              >
                Save to Gradebook
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT DEPARTMENT ================= */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-4">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                {editingDept ? 'Edit Department Option' : 'Add Department Option'}
              </div>
              <button onClick={() => setIsAddDeptModalOpen(false)}>
                <X className="w-5 h-5 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Software Engineering"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Code / Abbr.
                  </label>
                  <input
                    type="text"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    placeholder="e.g. SE"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Cutoff CGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.0"
                    value={deptCutoff}
                    onChange={(e) => setDeptCutoff(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Faculty / School
                  </label>
                  <input
                    type="text"
                    value={deptFaculty}
                    onChange={(e) => setDeptFaculty(e.target.value)}
                    placeholder="e.g. AAiT / School of ECE"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Available Seats
                  </label>
                  <input
                    type="number"
                    value={deptSeats}
                    onChange={(e) => setDeptSeats(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Notes / Strategy (Optional)
                </label>
                <input
                  type="text"
                  value={deptNotes}
                  onChange={(e) => setDeptNotes(e.target.value)}
                  placeholder="e.g. Requires top 5% rank in freshmen cohort"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition mt-2 shadow-xs"
              >
                Save Department Choice
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SCALE CONFIG ================= */}
      {isScaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                University Grading Scale Matrix
              </div>
              <button onClick={() => setIsScaleModalOpen(false)}>
                <X className="w-5 h-5 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mb-3">
              Standard Ethiopian Higher Education / ECTS 4.0 GPA scale.
            </p>

            <div className="space-y-1.5 text-xs font-mono">
              {gradingScale.map((s) => (
                <div
                  key={s.letter}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]"
                >
                  <span className="font-bold text-[rgb(var(--c-text))]">{s.letter}</span>
                  <span className="text-[rgb(var(--c-muted))]">≥ {s.minPercent}%</span>
                  <span className="font-bold text-[#7A2E4A]">{s.gpa.toFixed(2)} pts</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[rgb(var(--c-border))]">
              <button
                onClick={() => setIsScaleModalOpen(false)}
                className="w-full py-2 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable CourseModal */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        courseToEdit={courseToEdit}
      />
    </div>
  );
};
