import React, { useState, useMemo } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  Habit,
  HabitLog,
  HabitTrackingMethod,
  HabitRecurrenceType,
  HabitStatusType,
  DayOfWeek,
} from '../types';
import { getTodayKey, DAY_NAMES } from '../utils/dateUtils';
import {
  calculateHabitStreak,
  getRemainingRestTokens,
  getHabitComebackState,
  getHabitDayState,
  getHabitTrackingMethod,
  getHabitUnitLabel,
  getHabitTargetValue,
  isHabitScheduledForDate,
  isHabitLogCompleted,
  getDailyHabitsSummary,
  DEFAULT_HABIT_CATEGORIES,
  MAX_WEEKLY_REST_TOKENS,
} from '../utils/streakEngine';
import { awardXp, reverseXp } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import { HabitDetailView } from '../components/habits/HabitDetailView';
import { reconcileAllReminders } from '../services/reminderEngine';
import {
  Plus,
  Flame,
  Sparkles,
  Shield,
  Trash2,
  X,
  Check,
  Undo2,
  RefreshCw,
  Edit2,
  ChevronDown,
  ChevronUp,
  BarChart2,
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  Archive,
  Minus,
  SlidersHorizontal,
} from 'lucide-react';

const TRACKING_METHODS: { id: HabitTrackingMethod; label: string; hint: string }[] = [
  { id: 'simple', label: 'Simple', hint: '1-tap done / not done' },
  { id: 'duration', label: 'Duration', hint: 'Minutes or hours' },
  { id: 'quantity', label: 'Quantity', hint: 'Pages, glasses, reps...' },
  { id: 'frequency', label: 'Frequency', hint: 'Sessions / times per day' },
  { id: 'avoidance', label: 'Avoidance', hint: 'Track days avoided' },
];

export const HabitsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  // Detail & Organize states
  const [detailHabitId, setDetailHabitId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isOrganizeMode, setIsOrganizeMode] = useState(false);
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [showPausedArchived, setShowPausedArchived] = useState(false);
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});

  // Add/Edit Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [trackingMethod, setTrackingMethod] = useState<HabitTrackingMethod>('simple');
  const [unit, setUnit] = useState('');
  const [targetValueStr, setTargetValueStr] = useState('');
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [category, setCategory] = useState<string>('health');
  const [recurrence, setRecurrence] = useState<HabitRecurrenceType>('daily');
  const [scheduledDays, setScheduledDays] = useState<DayOfWeek[]>([0, 1, 2, 3, 4]);
  const [weeklyTargetCount, setWeeklyTargetCount] = useState<number>(3);
  const [intervalDays, setIntervalDays] = useState<number>(2);
  const [scheduleStartDate, setScheduleStartDate] = useState<string>(todayKey);
  const [minimumVersion, setMinimumVersion] = useState('');
  const [habitStatus, setHabitStatus] = useState<HabitStatusType>('active');
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Delete / Skip modals
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [skipPromptHabit, setSkipPromptHabit] = useState<Habit | null>(null);

  const habits = useLiveQuery(() => db.habits.toArray()) || [];
  const logs = useLiveQuery(() => db.habitLogs.toArray()) || [];
  const restDays = useLiveQuery(() => db.restDays.toArray()) || [];
  const userSettings = useLiveQuery(() => db.settings.get('current_user'));

  const configuredCategories = useMemo(() => {
    const base = userSettings?.habitCategories?.length
      ? userSettings.habitCategories
      : DEFAULT_HABIT_CATEGORIES;
    const seen = new Set(base.map((c) => c.id));
    const extras: { id: string; label: string }[] = [];
    for (const h of habits) {
      if (h.category && h.category !== 'uncategorized' && !seen.has(h.category)) {
        seen.add(h.category);
        extras.push({ id: h.category, label: h.customCategory || h.category });
      }
    }
    return [...base, ...extras];
  }, [userSettings?.habitCategories, habits]);

  const todayLogs = useMemo(() => logs.filter((l) => l.date === todayKey), [logs, todayKey]);
  const remainingTokens = getRemainingRestTokens(restDays, todayKey);
  const dailySummary = useMemo(
    () => getDailyHabitsSummary(habits, logs, restDays, todayKey),
    [habits, logs, restDays, todayKey]
  );

  // Sorted & filtered habits
  const sortedHabits = useMemo(() => {
    return habits
      .slice()
      .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  }, [habits]);

  const matchesCategory = (h: Habit) => {
    if (selectedCategoryFilter === 'all') return true;
    if (selectedCategoryFilter === 'uncategorized') {
      return !h.category || h.category === 'uncategorized';
    }
    return h.category === selectedCategoryFilter;
  };

  const activeHabits = sortedHabits.filter(
    (h) => h.status !== 'paused' && h.status !== 'archived' && matchesCategory(h)
  );
  const scheduledTodayHabits = activeHabits.filter((h) => isHabitScheduledForDate(h, todayKey));
  const unscheduledTodayHabits = activeHabits.filter((h) => !isHabitScheduledForDate(h, todayKey));
  const pausedOrArchivedHabits = sortedHabits.filter(
    (h) => (h.status === 'paused' || h.status === 'archived') && matchesCategory(h)
  );

  const detailHabit = detailHabitId ? habits.find((h) => h.id === detailHabitId) || null : null;

  const getStatKey = (habit: Habit) =>
    habit.category === 'creative'
      ? 'creativity'
      : habit.category === 'health'
      ? 'vitality'
      : 'discipline';

  const getCategoryLabel = (habit: Habit) => {
    if (!habit.category || habit.category === 'uncategorized') return 'Uncategorized';
    if (habit.customCategory) return habit.customCategory;
    return configuredCategories.find((c) => c.id === habit.category)?.label || habit.category;
  };

  const syncHabitStreak = async (habit: Habit, updatedLogs: HabitLog[], updatedRest = restDays) => {
    const nextStreak = calculateHabitStreak(habit.id, updatedLogs, updatedRest, todayKey, habit);
    await db.habits.update(habit.id, {
      currentStreak: nextStreak.currentStreak,
      bestStreak: nextStreak.bestStreak,
    });
    return nextStreak;
  };

  // Upsert today's log cleanly (supports simple, avoidance, duration, quantity, frequency, skipped, partial)
  const upsertTodayHabitLog = async (
    habit: Habit,
    options: {
      value?: number;
      status: 'completed' | 'partial' | 'skipped';
      isPartial?: boolean;
      count?: number;
    }
  ) => {
    const existing = todayLogs.find((l) => l.habitId === habit.id);
    const nowIso = new Date().toISOString();
    const method = getHabitTrackingMethod(habit);
    const unitLabel = getHabitUnitLabel(habit) || undefined;
    const countValue =
      options.status === 'skipped'
        ? 0
        : options.count !== undefined
        ? options.count
        : method === 'frequency'
        ? Math.max(1, options.value || 1)
        : 1;

    let updatedLogs: HabitLog[];
    if (existing) {
      const updatedRecord: HabitLog = {
        ...existing,
        count: countValue,
        isPartial: !!options.isPartial || options.status === 'partial',
        value: options.value,
        unit: unitLabel,
        status: options.status,
        updatedAt: nowIso,
      };
      await db.habitLogs.put(updatedRecord);
      updatedLogs = logs.map((l) => (l.id === existing.id ? updatedRecord : l));
    } else {
      const newRecord: HabitLog = {
        id: generateId(),
        habitId: habit.id,
        date: todayKey,
        count: countValue,
        isPartial: !!options.isPartial || options.status === 'partial',
        value: options.value,
        unit: unitLabel,
        status: options.status,
        updatedAt: nowIso,
      };
      await db.habitLogs.add(newRecord);
      updatedLogs = [...logs, newRecord];
    }

    const streak = await syncHabitStreak(habit, updatedLogs);

    if (options.status === 'skipped') {
      await reverseXp('habit', habit.id + '_' + todayKey);
    } else {
      await awardXp({
        source: 'habit',
        sourceId: habit.id + '_' + todayKey,
        amount: options.status === 'partial' ? 5 : 10,
        stat: getStatKey(habit),
      });
    }

    return streak;
  };

  // Clear today's log cleanly
  const clearTodayHabitLog = async (habit: Habit, existing: HabitLog) => {
    await db.habitLogs.delete(existing.id);
    await reverseXp('habit', habit.id + '_' + todayKey);
    const updatedLogs = logs.filter((l) => l.id !== existing.id);
    await syncHabitStreak(habit, updatedLogs);
  };

  // Toggle simple or avoidance habit
  const handleToggleSimpleOrAvoidance = async (habit: Habit) => {
    const existing = todayLogs.find((l) => l.habitId === habit.id);
    const method = getHabitTrackingMethod(habit);

    if (existing && isHabitLogCompleted(existing)) {
      await clearTodayHabitLog(habit, existing);
      showToast('Today’s log removed.', 'info');
      return;
    }

    const streak = await upsertTodayHabitLog(habit, {
      status: 'completed',
      isPartial: false,
    });
    showToast(
      method === 'avoidance'
        ? `Avoided today (${streak.currentStreak}d streak)`
        : `Completed today (${streak.currentStreak}d streak)`,
      'success'
    );
  };

  // Log measurable numeric value (duration, quantity, frequency)
  const handleLogNumericValue = async (habit: Habit, rawValue: number) => {
    const value = Math.max(0, Math.round(rawValue * 100) / 100);
    const existing = todayLogs.find((l) => l.habitId === habit.id);

    if (value <= 0) {
      if (existing) {
        await clearTodayHabitLog(habit, existing);
        showToast('Today’s progress cleared.', 'info');
      }
      setInlineInputs((prev) => ({ ...prev, [habit.id]: '' }));
      return;
    }

    const target = getHabitTargetValue(habit);
    const isPartial = target !== null && value < target;
    const status = isPartial ? 'partial' : 'completed';

    await upsertTodayHabitLog(habit, {
      value,
      status,
      isPartial,
    });

    const unitLabel = getHabitUnitLabel(habit);
    setInlineInputs((prev) => ({ ...prev, [habit.id]: String(value) }));
    showToast(
      isPartial && target !== null
        ? `Logged ${value} / ${target} ${unitLabel} (partial)`
        : `Logged ${value} ${unitLabel}`,
      'success'
    );
  };

  const handleLogMinimumVersion = async (habit: Habit) => {
    const existing = todayLogs.find((l) => l.habitId === habit.id);
    if (existing && isHabitLogCompleted(existing)) {
      showToast('Already logged for today.', 'info');
      setSkipPromptHabit(null);
      return;
    }

    const streak = await upsertTodayHabitLog(habit, {
      status: 'partial',
      isPartial: true,
    });
    setSkipPromptHabit(null);
    showToast(`Minimum version logged (${streak.currentStreak}d streak)`, 'success');
  };

  const handleSkipToday = async (habit: Habit, isAvoidanceSlip = false) => {
    await upsertTodayHabitLog(habit, {
      value: 0,
      count: 0,
      status: 'skipped',
      isPartial: false,
    });
    setSkipPromptHabit(null);
    showToast(
      isAvoidanceSlip
        ? 'Logged honestly — ready for a fresh start tomorrow.'
        : 'Skipped cleanly for today.',
      'info'
    );
  };

  const handleApplyRestToken = async (habitId: string, targetDateKey: string = todayKey) => {
    if (remainingTokens <= 0) {
      showToast('No rest tokens remaining for this week (refills next Monday).', 'warning');
      return;
    }

    const isCompleted = logs.some(
      (l) => l.habitId === habitId && l.date === targetDateKey && isHabitLogCompleted(l)
    );
    if (isCompleted) {
      showToast('This day is already completed.', 'info');
      return;
    }

    const existingToken = restDays.find(
      (r) => r.habitId === habitId && r.dateKey === targetDateKey
    );
    if (existingToken) {
      showToast('A rest token is already active for this day.', 'info');
      return;
    }

    const newRest = {
      id: generateId(),
      habitId,
      dateKey: targetDateKey,
      createdAt: new Date().toISOString(),
    };
    await db.restDays.add(newRest);

    const habit = habits.find((h) => h.id === habitId);
    if (habit) {
      await syncHabitStreak(habit, logs, [...restDays, newRest]);
    }
    showToast(`Rest token applied to ${targetDateKey}.`, 'success');
  };

  const handleRemoveRestToken = async (restDayId: string) => {
    const target = restDays.find((r) => r.id === restDayId);
    await db.restDays.delete(restDayId);

    if (target) {
      const updatedRestDays = restDays.filter((r) => r.id !== restDayId);
      const habit = habits.find((h) => h.id === target.habitId);
      if (habit) {
        await syncHabitStreak(habit, logs, updatedRestDays);
      }
    }
    showToast('Rest token removed.', 'info');
  };

  const handleDeleteSpecificLog = async (log: HabitLog) => {
    await db.habitLogs.delete(log.id);
    if (log.date === todayKey) {
      await reverseXp('habit', log.habitId + '_' + todayKey);
    }
    const habit = habits.find((h) => h.id === log.habitId);
    if (habit) {
      const updatedLogs = logs.filter((l) => l.id !== log.id);
      await syncHabitStreak(habit, updatedLogs);
    }
    showToast('Log entry removed.', 'info');
  };

  // Reorder habits cleanly
  const handleMoveHabit = async (habitId: string, direction: -1 | 1) => {
    const list = activeHabits;
    const idx = list.findIndex((h) => h.id === habitId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;

    const reordered = [...list];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(swapIdx, 0, moved);

    await Promise.all(
      reordered.map((h, i) => db.habits.update(h.id, { sortOrder: i }))
    );
  };

  const handleChangeStatus = async (habit: Habit, nextStatus: HabitStatusType) => {
    await db.habits.update(habit.id, { status: nextStatus });
    reconcileAllReminders().catch(console.warn);
    showToast(
      nextStatus === 'active'
        ? `${habit.title} reactivated.`
        : nextStatus === 'paused'
        ? `${habit.title} paused — history preserved.`
        : `${habit.title} archived — history preserved.`,
      'info'
    );
  };

  // Category Management (persisted in AppSettings.habitCategories)
  const handleAddCategory = async () => {
    const clean = newCategoryName.trim();
    if (!clean) return;
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || clean;
    const existingList = userSettings?.habitCategories?.length
      ? userSettings.habitCategories
      : DEFAULT_HABIT_CATEGORIES;
    if (existingList.some((c) => c.id === id || c.label.toLowerCase() === clean.toLowerCase())) {
      showToast('That category already exists.', 'info');
      return;
    }
    const nextList = [...existingList, { id, label: clean }];
    await db.settings.update('current_user', { habitCategories: nextList });
    setCategory(id);
    setNewCategoryName('');
  };

  const handleDeleteCategory = async (catId: string) => {
    const existingList = userSettings?.habitCategories?.length
      ? userSettings.habitCategories
      : DEFAULT_HABIT_CATEGORIES;
    const nextList = existingList.filter((c) => c.id !== catId);
    await db.settings.update('current_user', { habitCategories: nextList });
    if (category === catId) setCategory('uncategorized');
    if (selectedCategoryFilter === catId) setSelectedCategoryFilter('all');
  };

  const handleOpenAddHabit = () => {
    setEditingHabit(null);
    setTitle('');
    setDescription('');
    setTrackingMethod('simple');
    setUnit('');
    setTargetValueStr('');
    setShowAdvancedForm(false);
    setCategory(selectedCategoryFilter !== 'all' ? selectedCategoryFilter : 'health');
    setRecurrence('daily');
    setScheduledDays([0, 1, 2, 3, 4]);
    setWeeklyTargetCount(3);
    setIntervalDays(2);
    setScheduleStartDate(todayKey);
    setMinimumVersion('');
    setHabitStatus('active');
    setShowManageCategories(false);
    setIsAddModalOpen(true);
  };

  const handleOpenEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setTitle(habit.title);
    setDescription(habit.description || '');
    const method = getHabitTrackingMethod(habit);
    setTrackingMethod(method);
    setUnit(habit.unit || '');
    const target = getHabitTargetValue(habit);
    setTargetValueStr(target !== null ? String(target) : '');
    setShowAdvancedForm(true);
    setCategory(habit.category || 'uncategorized');
    setRecurrence(habit.recurrence || 'daily');
    setScheduledDays(habit.scheduledDays?.length ? habit.scheduledDays : [0, 1, 2, 3, 4]);
    setWeeklyTargetCount(habit.weeklyTargetCount || habit.targetCount || 3);
    setIntervalDays(habit.intervalDays || 2);
    setScheduleStartDate(habit.scheduleStartDate || todayKey);
    setMinimumVersion(habit.minimumVersionText || '');
    setHabitStatus(habit.status || 'active');
    setShowManageCategories(false);
    setIsAddModalOpen(true);
  };

  const handleSelectMethod = (method: HabitTrackingMethod) => {
    setTrackingMethod(method);
    if (!unit.trim()) {
      if (method === 'duration') setUnit('min');
      else if (method === 'frequency') setUnit('sessions');
      else if (method === 'quantity') setUnit('pages');
      else setUnit('');
    } else if (method === 'simple' || method === 'avoidance') {
      setUnit('');
      setTargetValueStr('');
    }
  };

  const toggleScheduledDay = (day: DayOfWeek) => {
    setScheduledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedTarget = parseFloat(targetValueStr);
    const hasTarget =
      (trackingMethod === 'duration' || trackingMethod === 'quantity' || trackingMethod === 'frequency') &&
      !Number.isNaN(parsedTarget) &&
      parsedTarget > 0;

    if (recurrence === 'weekdays' && scheduledDays.length === 0) {
      showToast('Choose at least one weekday for a weekday schedule.', 'warning');
      return;
    }

    const legacyType: Habit['type'] =
      trackingMethod === 'duration'
        ? 'minutes'
        : recurrence === 'weekly_target'
        ? 'weekly_target'
        : 'daily';

    const matchedCat = configuredCategories.find((c) => c.id === category);

    const payload: Partial<Habit> = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category || 'uncategorized',
      customCategory: matchedCat ? matchedCat.label : category === 'uncategorized' ? 'Uncategorized' : category,
      type: legacyType,
      targetCount: recurrence === 'weekly_target' ? weeklyTargetCount : hasTarget ? parsedTarget : 1,
      trackingMethod,
      unit:
        trackingMethod === 'duration' || trackingMethod === 'quantity' || trackingMethod === 'frequency'
          ? unit.trim() || getHabitUnitLabel({ trackingMethod, type: legacyType })
          : undefined,
      targetValue: hasTarget ? parsedTarget : undefined,
      recurrence,
      scheduledDays: recurrence === 'weekdays' ? scheduledDays : undefined,
      weeklyTargetCount: recurrence === 'weekly_target' ? weeklyTargetCount : undefined,
      intervalDays: recurrence === 'interval' ? Math.max(1, intervalDays) : undefined,
      scheduleStartDate: recurrence === 'interval' ? scheduleStartDate || todayKey : undefined,
      minimumVersionText: minimumVersion.trim() || undefined,
      status: habitStatus,
    };

    if (editingHabit) {
      // Editing never modifies existing habitLogs
      const updatedHabitObj: Habit = { ...editingHabit, ...payload } as Habit;
      const recalculated = calculateHabitStreak(
        editingHabit.id,
        logs,
        restDays,
        todayKey,
        updatedHabitObj
      );
      await db.habits.update(editingHabit.id, {
        ...payload,
        currentStreak: recalculated.currentStreak,
        bestStreak: recalculated.bestStreak,
      });
      showToast('Habit updated (historical logs preserved).', 'success');
    } else {
      const nextSortOrder =
        habits.length > 0 ? Math.max(...habits.map((h) => h.sortOrder ?? 0)) + 1 : 0;
      const newHabit: Habit = {
        id: generateId(),
        title: title.trim(),
        category: payload.category || 'health',
        customCategory: payload.customCategory,
        type: legacyType,
        targetCount: payload.targetCount || 1,
        minimumVersionText: payload.minimumVersionText,
        color: '#B6E63E',
        currentStreak: 0,
        bestStreak: 0,
        icon: 'Activity',
        graceDaysLeft: 2,
        trackingMethod,
        unit: payload.unit,
        targetValue: payload.targetValue,
        recurrence,
        scheduledDays: payload.scheduledDays,
        weeklyTargetCount: payload.weeklyTargetCount,
        intervalDays: payload.intervalDays,
        scheduleStartDate: payload.scheduleStartDate,
        status: habitStatus,
        sortOrder: nextSortOrder,
        description: payload.description,
      };
      await db.habits.add(newHabit);
      showToast('Habit created.', 'success');
    }

    setIsAddModalOpen(false);
    setEditingHabit(null);
    reconcileAllReminders().catch(console.warn);
  };

  const handleConfirmDeleteHabit = async () => {
    if (!habitToDelete) return;
    await db.habits.delete(habitToDelete.id);
    await db.habitLogs.where('habitId').equals(habitToDelete.id).delete();
    await db.restDays.where('habitId').equals(habitToDelete.id).delete();
    if (detailHabitId === habitToDelete.id) setDetailHabitId(null);
    showToast(`Habit "${habitToDelete.title}" deleted.`, 'info');
    setHabitToDelete(null);
    reconcileAllReminders().catch(console.warn);
  };

  const renderHabitCard = (habit: Habit, indexInList: number, totalInList: number, isOffDay = false) => {
    const streak = calculateHabitStreak(habit.id, logs, restDays, todayKey, habit);
    const comeback = getHabitComebackState(habit.id, logs, restDays, todayKey, habit);
    const dayInfo = getHabitDayState(habit, logs, restDays, todayKey, todayKey);
    const method = getHabitTrackingMethod(habit);
    const unitLabel = getHabitUnitLabel(habit);
    const targetVal = getHabitTargetValue(habit);
    const todayLog = dayInfo.log;
    const isCompleted = dayInfo.state === 'completed';
    const isPartial = dayInfo.state === 'partial';
    const isDoneOrPartial = isCompleted || isPartial;
    const isRestToday = dayInfo.state === 'rested';
    const isSkipped = dayInfo.state === 'skipped';
    const loggedValue =
      todayLog && typeof todayLog.value === 'number'
        ? todayLog.value
        : todayLog && isHabitLogCompleted(todayLog)
        ? todayLog.count
        : 0;

    const draftInput =
      inlineInputs[habit.id] !== undefined
        ? inlineInputs[habit.id]
        : loggedValue > 0
        ? String(loggedValue)
        : '';

    return (
      <div
        key={habit.id}
        className={`ticket-border rounded-2xl p-4 bg-[rgb(var(--c-surface))] space-y-3 transition ${
          isCompleted
            ? 'border-[#B6E63E] shadow-xs'
            : isPartial
            ? 'border-lime-500/60 shadow-xs'
            : isRestToday
            ? 'border-amber-500/60 shadow-xs'
            : isOffDay
            ? 'opacity-80'
            : 'hover:border-[rgb(var(--c-primary))]'
        }`}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs transition shrink-0 ${
                isCompleted
                  ? 'bg-[#B6E63E] text-stone-950'
                  : isPartial
                  ? 'bg-lime-400/70 text-stone-950'
                  : isRestToday
                  ? 'bg-amber-500 text-stone-950'
                  : isSkipped
                  ? 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]'
                  : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
              }`}
            >
              {isDoneOrPartial ? (
                <Check className="w-4 h-4 stroke-[3]" />
              ) : isRestToday ? (
                <Shield className="w-4 h-4 fill-stone-950" />
              ) : isSkipped ? (
                <Minus className="w-4 h-4" />
              ) : (
                <Flame className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDetailHabitId(habit.id)}
                  className="text-xs sm:text-sm font-heading font-bold text-[rgb(var(--c-text))] hover:text-[rgb(var(--c-primary))] truncate text-left cursor-pointer"
                >
                  {habit.title}
                </button>
              </div>
              <div className="text-[11px] text-[rgb(var(--c-muted))] flex items-center gap-1.5 flex-wrap">
                <span>{getCategoryLabel(habit)}</span>
                <span>·</span>
                <span className="font-bold text-[rgb(var(--c-text))]">{streak.currentStreak}d</span>
                <span>·</span>
                <span>{remainingTokens} rest left</span>
                {habit.recurrence && habit.recurrence !== 'daily' && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{habit.recurrence.replace('_', ' ')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {isOrganizeMode ? (
              <>
                <button
                  type="button"
                  disabled={indexInList === 0}
                  onClick={() => handleMoveHabit(habit.id, -1)}
                  className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] disabled:opacity-30 cursor-pointer"
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={indexInList === totalInList - 1}
                  onClick={() => handleMoveHabit(habit.id, 1)}
                  className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] disabled:opacity-30 cursor-pointer"
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus(habit, 'paused')}
                  className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-amber-500 cursor-pointer"
                  title="Pause habit"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus(habit, 'archived')}
                  className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                  title="Archive habit"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setDetailHabitId(habit.id)}
                  className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] hover:bg-[rgb(var(--c-surface2))] transition cursor-pointer"
                  title="Details & history"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditHabit(habit)}
                  className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition cursor-pointer"
                  title="Edit habit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setHabitToDelete(habit)}
                  className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))] transition cursor-pointer"
                  title="Delete habit"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Gentle Comeback Banner */}
        {comeback.hadRecentBreak && comeback.message && !isDoneOrPartial && (
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-700 dark:text-emerald-300 font-flourish flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{comeback.message}</span>
          </div>
        )}

        {/* Direct Inline Tracking Control */}
        <div className="space-y-2">
          {(method === 'simple' || method === 'avoidance') && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleToggleSimpleOrAvoidance(habit)}
                className={`flex-1 py-2 px-3 rounded-xl font-heading text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer ${
                  isCompleted
                    ? 'bg-[#B6E63E] text-stone-950 shadow-xs'
                    : isPartial
                    ? 'bg-lime-400/70 text-stone-950'
                    : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[#B6E63E] hover:text-stone-950'
                }`}
              >
                {isDoneOrPartial ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>
                      {method === 'avoidance'
                        ? 'Avoided today · Undo'
                        : isPartial
                        ? 'Mini done · Undo'
                        : 'Done today · Undo'}
                    </span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{method === 'avoidance' ? 'Avoided today' : 'Complete today'}</span>
                  </>
                )}
              </button>

              {method === 'avoidance' && !isDoneOrPartial && !isSkipped && (
                <button
                  type="button"
                  onClick={() => handleSkipToday(habit, true)}
                  className="px-2.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] text-[11px] font-heading transition cursor-pointer"
                  title="Log a slip gently without shame"
                >
                  Log slip
                </button>
              )}
            </div>
          )}

          {(method === 'duration' || method === 'quantity') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[rgb(var(--c-muted))]">
                <span>
                  Today:{' '}
                  <strong className="text-[rgb(var(--c-text))]">
                    {loggedValue} {unitLabel}
                  </strong>
                  {targetVal !== null && ` / ${targetVal} ${unitLabel}`}
                </span>
                {isDoneOrPartial && todayLog && (
                  <button
                    type="button"
                    onClick={() => clearTodayHabitLog(habit, todayLog)}
                    className="text-[11px] underline hover:text-[rgb(var(--c-text))] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {targetVal !== null && (
                <div className="w-full h-1.5 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                  <div
                    className={`h-full transition-all ${isPartial ? 'bg-lime-400' : 'bg-[#B6E63E]'}`}
                    style={{ width: `${Math.min(100, Math.round((loggedValue / targetVal) * 100))}%` }}
                  />
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={draftInput}
                  onChange={(e) =>
                    setInlineInputs((prev) => ({ ...prev, [habit.id]: e.target.value }))
                  }
                  placeholder={`0 ${unitLabel}`}
                  className="w-24 px-2.5 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-mono"
                />
                {method === 'duration' ? (
                  <>
                    {[5, 15, 30].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => handleLogNumericValue(habit, loggedValue + inc)}
                        className="px-2 py-1.5 rounded-lg bg-[rgb(var(--c-surface2))] hover:bg-[#B6E63E] hover:text-stone-950 text-[11px] font-heading font-bold transition cursor-pointer"
                      >
                        +{inc}
                      </button>
                    ))}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLogNumericValue(habit, loggedValue + 1)}
                    className="px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c-surface2))] hover:bg-[#B6E63E] hover:text-stone-950 text-[11px] font-heading font-bold transition cursor-pointer"
                  >
                    +1
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const n = parseFloat(draftInput || '0');
                    if (!Number.isNaN(n)) handleLogNumericValue(habit, n);
                  }}
                  className="ml-auto px-3 py-1.5 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold hover:opacity-90 transition cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {method === 'frequency' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  disabled={loggedValue <= 0}
                  onClick={() => handleLogNumericValue(habit, Math.max(0, loggedValue - 1))}
                  className="w-8 h-8 rounded-lg bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] flex items-center justify-center disabled:opacity-35 cursor-pointer"
                  aria-label="Decrease session count"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="text-center">
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    {loggedValue}
                    {targetVal !== null ? ` / ${targetVal}` : ''} {unitLabel}
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))]">
                    {isCompleted
                      ? 'Target complete'
                      : isPartial
                      ? 'In progress'
                      : 'Tap + to log'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLogNumericValue(habit, loggedValue + 1)}
                  className="w-8 h-8 rounded-lg bg-[#B6E63E] text-stone-950 flex items-center justify-center font-bold cursor-pointer"
                  aria-label="Increase session count"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Secondary Compact Actions: Skip/Mini & Rest Token */}
          {!isDoneOrPartial && (
            <div className="flex items-center gap-1.5">
              {isRestToday && dayInfo.restDay ? (
                <button
                  type="button"
                  onClick={() => handleRemoveRestToken(dayInfo.restDay!.id)}
                  className="w-full py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-heading text-[11px] font-bold hover:bg-amber-500/20 transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Undo Rest Token ({remainingTokens} left)</span>
                </button>
              ) : isSkipped && todayLog ? (
                <button
                  type="button"
                  onClick={() => clearTodayHabitLog(habit, todayLog)}
                  className="w-full py-1.5 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))]/70 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] font-heading text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Skipped today · Tap to clear</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSkipPromptHabit(habit)}
                    className="flex-1 py-1.5 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] font-heading text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Skip / Mini</span>
                  </button>
                  {remainingTokens > 0 && !isOffDay && (
                    <button
                      type="button"
                      onClick={() => handleApplyRestToken(habit.id, todayKey)}
                      className="flex-1 py-1.5 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-amber-600 hover:border-amber-500/40 font-heading text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Shield className="w-3 h-3 text-amber-500" />
                      <span>Rest ({remainingTokens} left)</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Dedicated Habit Detail History View
  if (detailHabit) {
    return (
      <>
        <HabitDetailView
          habit={detailHabit}
          logs={logs}
          restDays={restDays}
          categories={configuredCategories}
          onBack={() => setDetailHabitId(null)}
          onEdit={handleOpenEditHabit}
          onApplyRestToken={(dateKey) => handleApplyRestToken(detailHabit.id, dateKey)}
          onRemoveRestToken={handleRemoveRestToken}
          onDeleteLog={handleDeleteSpecificLog}
        />
        {isAddModalOpen && renderHabitFormModal()}
      </>
    );
  }

  function renderHabitFormModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
        <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
            <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
              {editingHabit ? 'Edit Habit' : 'New Habit'}
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveHabit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                Habit Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Read textbook, Meditate, Drink water"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                Tracking Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {TRACKING_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMethod(m.id)}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      trackingMethod === m.id
                        ? 'border-[#B6E63E] bg-[#B6E63E]/15 text-[rgb(var(--c-text))]'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                    }`}
                  >
                    <div className="text-xs font-heading font-bold">{m.label}</div>
                    <div className="text-[10px] opacity-80 leading-tight">{m.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {(trackingMethod === 'duration' ||
              trackingMethod === 'quantity' ||
              trackingMethod === 'frequency') && (
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder={
                      trackingMethod === 'duration'
                        ? 'min / hours'
                        : trackingMethod === 'frequency'
                        ? 'sessions'
                        : 'pages / glasses'
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Daily Target (optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={targetValueStr}
                    onChange={(e) => setTargetValueStr(e.target.value)}
                    placeholder="No target"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>
            )}

            {/* Progressive Disclosure: Schedule, Category & Notes */}
            <button
              type="button"
              onClick={() => setShowAdvancedForm((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))]/50 text-xs font-heading font-bold text-[rgb(var(--c-text))] cursor-pointer"
            >
              <span>Schedule, Category &amp; Options</span>
              {showAdvancedForm ? (
                <ChevronUp className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              )}
            </button>

            {showAdvancedForm && (
              <div className="space-y-3 p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))]">
                {/* Recurrence */}
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Schedule
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as HabitRecurrenceType)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
                  >
                    <option value="daily">Every day</option>
                    <option value="weekdays">Specific weekdays</option>
                    <option value="weekly_target">Flexible weekly target</option>
                    <option value="interval">Every N days</option>
                  </select>
                </div>

                {recurrence === 'weekdays' && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {DAY_NAMES.map((name, idx) => {
                      const dIdx = idx as DayOfWeek;
                      const active = scheduledDays.includes(dIdx);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleScheduledDay(dIdx)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-heading font-bold transition cursor-pointer ${
                            active
                              ? 'bg-[#B6E63E] text-stone-950'
                              : 'bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))]'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {recurrence === 'weekly_target' && (
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-[rgb(var(--c-muted))]">Days per week:</label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={weeklyTargetCount}
                      onChange={(e) =>
                        setWeeklyTargetCount(Math.min(7, Math.max(1, parseInt(e.target.value, 10) || 1)))
                      }
                      className="w-16 px-2 py-1 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
                    />
                  </div>
                )}

                {recurrence === 'interval' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[rgb(var(--c-muted))] mb-1">
                        Repeat every N days
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={intervalDays}
                        onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value, 10) || 2))}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[rgb(var(--c-muted))] mb-1">
                        Starting from
                      </label>
                      <input
                        type="date"
                        value={scheduleStartDate}
                        onChange={(e) => setScheduleStartDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
                      />
                    </div>
                  </div>
                )}

                {/* Category + Inline Manager */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-heading text-[rgb(var(--c-muted))]">
                      Category (optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowManageCategories((v) => !v)}
                      className="text-[10px] font-heading font-bold text-[rgb(var(--c-primary))] hover:underline cursor-pointer"
                    >
                      {showManageCategories ? 'Done managing' : 'Manage categories'}
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
                  >
                    <option value="uncategorized">None / Uncategorized</option>
                    {configuredCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {showManageCategories && (
                    <div className="mt-2 p-2.5 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Add category..."
                          className="flex-1 px-2 py-1 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          className="px-2.5 py-1 rounded-lg bg-[#B6E63E] text-stone-950 text-[11px] font-heading font-bold cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {configuredCategories.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[rgb(var(--c-surface2))] text-[10px] text-[rgb(var(--c-text))]"
                          >
                            {c.label}
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(c.id)}
                              className="hover:text-rose-500 cursor-pointer"
                              aria-label={`Remove ${c.label}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Minimum Version */}
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Minimum Viable Version (low-energy days)
                  </label>
                  <input
                    type="text"
                    value={minimumVersion}
                    onChange={(e) => setMinimumVersion(e.target.value)}
                    placeholder="e.g. Read 2 pages or 2 minutes"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
                  />
                </div>

                {/* Optional Description */}
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Note / Why (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional short reminder"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
                  />
                </div>

                {/* Status */}
                {editingHabit && (
                  <div>
                    <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                      Status
                    </label>
                    <select
                      value={habitStatus}
                      onChange={(e) => setHabitStatus(e.target.value as HabitStatusType)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-2.5 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              {editingHabit ? 'Save Changes' : 'Create Habit'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Calm Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Today&apos;s Habits
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              {dailySummary.scheduledTodayCount > 0
                ? `${dailySummary.completedCount + dailySummary.partialCount} of ${dailySummary.scheduledTodayCount} scheduled done · ${remainingTokens} of ${MAX_WEEKLY_REST_TOKENS} rest tokens left`
                : `${remainingTokens} of ${MAX_WEEKLY_REST_TOKENS} rest tokens left this week`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeHabits.length > 1 && (
              <button
                type="button"
                onClick={() => setIsOrganizeMode((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-heading font-bold transition cursor-pointer ${
                  isOrganizeMode
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isOrganizeMode ? 'Done Organizing' : 'Organize'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAddHabit}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Habit</span>
            </button>
          </div>
        </div>

        {/* Category Filter Bar */}
        {habits.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-heading font-bold shrink-0 transition cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                  : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              All ({habits.filter((h) => h.status !== 'paused' && h.status !== 'archived').length})
            </button>
            {configuredCategories.map((cat) => {
              const count = habits.filter(
                (h) => h.status !== 'paused' && h.status !== 'archived' && h.category === cat.id
              ).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-heading font-bold shrink-0 transition cursor-pointer ${
                    selectedCategoryFilter === cat.id
                      ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                      : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
            {habits.some(
              (h) =>
                h.status !== 'paused' &&
                h.status !== 'archived' &&
                (!h.category || h.category === 'uncategorized')
            ) && (
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('uncategorized')}
                className={`px-3 py-1 rounded-full text-[11px] font-heading font-bold shrink-0 transition cursor-pointer ${
                  selectedCategoryFilter === 'uncategorized'
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                    : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                Uncategorized
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scheduled Today List */}
      {habits.length === 0 ? (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-12 text-center text-xs text-[rgb(var(--c-muted))] font-flourish space-y-3">
          <div>No habits yet. Build something small and steady.</div>
          <button
            type="button"
            onClick={handleOpenAddHabit}
            className="px-4 py-2 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold shadow-xs hover:opacity-90 transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Your First Habit</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {scheduledTodayHabits.length === 0 ? (
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-8 text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
              No active habits scheduled for this view today.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scheduledTodayHabits.map((h, i) =>
                renderHabitCard(h, i, scheduledTodayHabits.length, false)
              )}
            </div>
          )}

          {/* Off-schedule Active Habits */}
          {unscheduledTodayHabits.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowUnscheduled((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
              >
                {showUnscheduled ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>Not scheduled today ({unscheduledTodayHabits.length})</span>
              </button>
              {showUnscheduled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unscheduledTodayHabits.map((h, i) =>
                    renderHabitCard(h, i, unscheduledTodayHabits.length, true)
                  )}
                </div>
              )}
            </div>
          )}

          {/* Paused & Archived Habits */}
          {pausedOrArchivedHabits.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => setShowPausedArchived((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
              >
                {showPausedArchived ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>Paused &amp; Archived ({pausedOrArchivedHabits.length})</span>
              </button>
              {showPausedArchived && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pausedOrArchivedHabits.map((h) => (
                    <div
                      key={h.id}
                      className="ticket-border rounded-2xl p-3.5 bg-[rgb(var(--c-surface))] opacity-80 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setDetailHabitId(h.id)}
                          className="text-xs font-heading font-bold text-[rgb(var(--c-text))] hover:underline truncate block text-left cursor-pointer"
                        >
                          {h.title}
                        </button>
                        <div className="text-[10px] text-[rgb(var(--c-muted))] capitalize">
                          {h.status} · {getCategoryLabel(h)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleChangeStatus(h, 'active')}
                          className="px-2.5 py-1 rounded-lg bg-[#B6E63E]/20 text-emerald-700 dark:text-[#B6E63E] text-[11px] font-heading font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Resume</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailHabitId(h.id)}
                          className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                          title="History"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHabitToDelete(h)}
                          className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddModalOpen && renderHabitFormModal()}

      {/* Delete Confirmation Modal */}
      {habitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-rose-500/50 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <Trash2 className="w-5 h-5 shrink-0" />
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Delete Habit?
              </div>
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
              Delete <strong className="text-[rgb(var(--c-text))]">“{habitToDelete.title}”</strong> and all its completion history?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => setHabitToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteHabit}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-heading font-bold transition shadow-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gentle Skip / Minimum Version Modal */}
      {skipPromptHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Gentle Option for Today</span>
              </div>
              <button
                type="button"
                onClick={() => setSkipPromptHabit(null)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
              Low on energy for <strong className="text-[rgb(var(--c-text))]">{skipPromptHabit.title}</strong>? Try a lighter minimum version — or skip today cleanly:
            </p>

            <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              {skipPromptHabit.minimumVersionText || 'Do just a 2-minute starter version today'}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleLogMinimumVersion(skipPromptHabit)}
                className="w-full py-2 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                Log Minimum Version (+5 XP)
              </button>
              {remainingTokens > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    handleApplyRestToken(skipPromptHabit.id, todayKey);
                    setSkipPromptHabit(null);
                  }}
                  className="w-full py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 font-heading text-xs font-bold hover:bg-amber-500/20 transition cursor-pointer"
                >
                  Use 1 Rest Token ({remainingTokens} left)
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSkipToday(skipPromptHabit, false)}
                className="w-full py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] font-heading text-xs font-bold transition cursor-pointer"
              >
                Skip cleanly for today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
