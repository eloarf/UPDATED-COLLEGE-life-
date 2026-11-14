import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Exam, ExamTopic, Course } from '../types';
import { getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import { awardXp, triggerLevelUpConfetti } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import { cancelExamReminders, reconcileAllReminders } from '../services/reminderEngine';
import {
  ShieldAlert,
  Plus,
  Clock,
  CheckCircle,
  Circle,
  Award,
  Sparkles,
  MapPin,
  Calendar,
  X,
  Trash2,
  Sword,
  Edit2,
} from 'lucide-react';

export const ExamsPage: React.FC = () => {
  const { showToast, setCurrentRoute } = useUiStore();
  const todayKey = getTodayKey();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  // Form State
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState<'Midterm' | 'Final' | 'Quiz' | 'Lab Practical'>('Midterm');
  const [examDate, setExamDate] = useState(getTodayKey());
  const [startTime, setStartTime] = useState('09:00');
  const [hall, setHall] = useState('');
  const [weight, setWeight] = useState<number | string>(30);
  const [targetScore, setTargetScore] = useState<number | string>(85);
  const [topicsInput, setTopicsInput] = useState('');

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const topics = useLiveQuery(() => db.examTopics.toArray()) || [];

  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  const handleOpenAddExam = () => {
    setEditingExam(null);
    setCourseId(courses[0]?.id || '');
    setTitle('');
    setExamType('Midterm');
    setExamDate(getTodayKey());
    setStartTime('09:00');
    setHall('');
    setWeight(30);
    setTargetScore(85);
    setTopicsInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditExam = async (exam: Exam) => {
    setEditingExam(exam);
    setCourseId(exam.courseId);
    setTitle(exam.title);
    setExamType(exam.examType as any);
    setExamDate(exam.examDate);
    setStartTime(exam.startTime);
    setHall(exam.hall || '');
    setWeight(exam.weight);
    setTargetScore(exam.targetScore);
    const examTopicsList = await db.examTopics.where('examId').equals(exam.id).toArray();
    setTopicsInput(examTopicsList.map((t) => t.title).join('\n'));
    setIsModalOpen(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId) {
      showToast('Please provide an exam title and select a course.', 'warning');
      return;
    }

    const parsedTopics = topicsInput
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingExam) {
      await db.exams.update(editingExam.id, {
        courseId,
        title: title.trim(),
        examType,
        examDate,
        startTime,
        hall: hall.trim() || undefined,
        weight: Number(weight) || 30,
        targetScore: Number(targetScore) || 85,
      });

      if (parsedTopics.length > 0) {
        const existingTopics = await db.examTopics.where('examId').equals(editingExam.id).toArray();
        const existingMap = new Map(existingTopics.map((t) => [t.title.toLowerCase(), t]));
        await db.examTopics.where('examId').equals(editingExam.id).delete();
        const topicRecords: ExamTopic[] = parsedTopics.map((t) => ({
          id: generateId(),
          examId: editingExam.id,
          title: t,
          isStudied: existingMap.get(t.toLowerCase())?.isStudied ?? false,
        }));
        await db.examTopics.bulkPut(topicRecords);

        const studiedCount = topicRecords.filter((t) => t.isStudied).length;
        const remainingHp = topicRecords.length > 0 ? Math.round(((topicRecords.length - studiedCount) / topicRecords.length) * 100) : 0;
        await db.exams.update(editingExam.id, {
          currentHp: remainingHp,
          isDefeated: remainingHp === 0,
        });
      }

      showToast('Exam boss battle updated!', 'success');
      reconcileAllReminders().catch(console.warn);
    } else {
      const examId = generateId();
      await db.exams.add({
        id: examId,
        courseId,
        title: title.trim(),
        examType,
        examDate,
        startTime,
        hall: hall.trim() || undefined,
        weight: Number(weight) || 30,
        targetScore: Number(targetScore) || 85,
        currentHp: 100,
        maxHp: 100,
        isDefeated: false,
        createdAt: new Date().toISOString(),
      });

      if (parsedTopics.length > 0) {
        const topicRecords: ExamTopic[] = parsedTopics.map((t) => ({
          id: generateId(),
          examId,
          title: t,
          isStudied: false,
        }));
        await db.examTopics.bulkPut(topicRecords);
      }

      showToast('University Boss Battle summoned!', 'success');
      reconcileAllReminders().catch(console.warn);
    }

    setIsModalOpen(false);
  };

  const handleToggleTopic = async (topic: ExamTopic, exam: Exam) => {
    const isNowStudied = !topic.isStudied;
    await db.examTopics.update(topic.id, { isStudied: isNowStudied });

    // Recalculate boss HP
    const examTopics = await db.examTopics.where('examId').equals(exam.id).toArray();
    const studiedCount = examTopics.filter((t) => (t.id === topic.id ? isNowStudied : t.isStudied)).length;
    const totalCount = examTopics.length;
    const remainingHp = totalCount > 0 ? Math.round(((totalCount - studiedCount) / totalCount) * 100) : 0;

    await db.exams.update(exam.id, {
      currentHp: remainingHp,
      isDefeated: remainingHp === 0,
    });

    if (isNowStudied) {
      await awardXp({
        source: 'exam_topic',
        sourceId: topic.id,
        amount: 15,
        stat: 'knowledge',
      });
      showToast('Syllabus topic conquered! Boss HP reduced (+15 XP)', 'success');
    }

    if (remainingHp === 0 && !exam.isDefeated) {
      triggerLevelUpConfetti();
      await awardXp({
        source: 'boss_defeat',
        sourceId: exam.id,
        amount: 150,
        stat: 'knowledge',
      });
      showToast('🏆 BOSS DEFEATED! 100% syllabus revised! +150 XP awarded!', 'success');
      cancelExamReminders(exam.id).catch(console.warn);
    }
  };

  const handleDeleteExam = async (id: string) => {
    cancelExamReminders(id).catch(console.warn);
    await db.exams.delete(id);
    await db.examTopics.where('examId').equals(id).delete();
    showToast('Exam removed.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Dark Plum Arena Header */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-[#1E1020] via-[#2B1A2E] to-[#3A2540] text-white shadow-xl relative overflow-hidden border border-[#4F3556]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#B6E63E] font-bold flex items-center gap-1.5">
              <Sword className="w-3.5 h-3.5" />
              <span>Colosseum of Assessments</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-wide mt-1">
              Exam Boss Battles
            </h2>
            <p className="text-xs text-[#BFA3B5] font-flourish">
              Every midterm and final is a boss. Drain its HP bar by mastering syllabus topics.
            </p>
          </div>

          <button
            onClick={handleOpenAddExam}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-lg shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Summon Boss</span>
          </button>
        </div>
      </div>

      {/* Boss Cards */}
      <div className="space-y-4">
        {exams.length === 0 ? (
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-12 text-center text-xs text-[rgb(var(--c-muted))] font-flourish space-y-3">
            <div>No exams scheduled yet. Add your midterms or finals to track study topics.</div>
            <button
              onClick={handleOpenAddExam}
              className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add your first exam</span>
            </button>
          </div>
        ) : (
          exams.map((exam) => {
            const course = courseMap.get(exam.courseId);
            const examTopicsList = topics.filter((t) => t.examId === exam.id);

            return (
              <div
                key={exam.id}
                className="ticket-border rounded-2xl p-5 bg-[rgb(var(--c-surface))] space-y-4 shadow-sm"
              >
                {/* Boss Title & Stats */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="w-3.5 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: course?.color || '#B6E63E' }}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {course && (
                          <button
                            type="button"
                            onClick={() => setCurrentRoute(`#/courses/${course.id}`)}
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md hover:opacity-85 cursor-pointer text-stone-900 shadow-2xs"
                            style={{ backgroundColor: course.color }}
                            title="Open Course Hub"
                          >
                            {course.code}
                          </button>
                        )}
                        <span className="text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]">
                          {exam.examType} ({exam.weight}% of grade)
                        </span>
                        {exam.isDefeated && (
                          <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                            <Award className="w-3 h-3" /> Boss Defeated!
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))] mt-1">
                        {exam.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-[rgb(var(--c-muted))] mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-[rgb(var(--c-primary))]">
                          <Calendar className="w-3 h-3" /> {formatDisplayDate(exam.examDate)} at {exam.startTime}
                        </span>
                        {exam.hall && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {exam.hall}
                          </span>
                        )}
                        <span>Target: {exam.targetScore}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditExam(exam)}
                      className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition"
                      title="Edit examination details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExamToDelete(exam)}
                      className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))] transition"
                      title="Remove exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* HP Gauge */}
                <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
                  <div className="flex items-center justify-between text-xs font-heading font-bold mb-1">
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Boss HP (Syllabus Remaining)
                    </span>
                    <span className="text-[rgb(var(--c-text))]">
                      {exam.currentHp}% HP left
                    </span>
                  </div>
                  <div className="w-full h-3 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${exam.currentHp}%` }}
                    />
                  </div>
                </div>

                {/* Syllabus Topic Checklist */}
                <div>
                  <div className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase mb-2">
                    Syllabus Topics Checklist ({examTopicsList.filter((t) => t.isStudied).length}/{examTopicsList.length} Studied)
                  </div>
                  <div className="space-y-1.5">
                    {examTopicsList.map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => handleToggleTopic(topic, exam)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition active:scale-98 ${
                          topic.isStudied
                            ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                            : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] hover:border-[rgb(var(--c-primary))]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 text-xs font-medium">
                          {topic.isStudied ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-stone-400 shrink-0" />
                          )}
                          <span className={topic.isStudied ? 'line-through opacity-75' : ''}>
                            {topic.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-heading font-bold text-[rgb(var(--c-xp))]">
                          +15 XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summon Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                {editingExam ? 'Edit University Exam Boss' : 'Summon University Exam Boss'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Target Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                >
                  <option value="">Select Course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Applied Math I Midterm Boss"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Exam Type
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="Midterm">Midterm Examination</option>
                    <option value="Final">Final Examination</option>
                    <option value="Quiz">Graded Quiz</option>
                    <option value="Lab Practical">Lab Practical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Weight (% of Grade)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={weight === '' || isNaN(Number(weight)) ? '' : weight}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWeight(val === '' ? '' : isNaN(parseInt(val, 10)) ? '' : parseInt(val, 10));
                    }}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Exam Hall / Room
                </label>
                <input
                  type="text"
                  value={hall}
                  onChange={(e) => setHall(e.target.value)}
                  placeholder="e.g. Block 59, Room 2-005"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Syllabus Chapters / Topics (one per line)
                </label>
                <textarea
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  rows={4}
                  placeholder={`Limits & Continuity\nDerivatives & Chain Rule\nImplicit Differentiation\nDefinite Integrals`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-2 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold hover:opacity-90 active:scale-98 transition shadow-xs"
              >
                {editingExam ? 'Save Changes' : 'Summon Boss Battle'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Exam Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
              Banish Exam Boss Battle?
            </h4>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Are you sure you want to remove <strong className="text-[rgb(var(--c-text))]">"{examToDelete.title}"</strong> and all its syllabus checklist topics?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setExamToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-surface2))]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = examToDelete.id;
                  setExamToDelete(null);
                  await handleDeleteExam(id);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-heading font-bold hover:bg-rose-700 active:scale-95 transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
