import { db } from './db';
import { generateId } from '../utils/idGenerator';
import { getTodayKey } from '../utils/dateUtils';
import { INITIAL_ACHIEVEMENTS } from '../services/rpgService';

export async function loadStarterPackData() {
  const now = new Date().toISOString();
  const todayKey = getTodayKey();

  // 1. Five University Courses
  const c1 = generateId();
  const c2 = generateId();
  const c3 = generateId();
  const c4 = generateId();
  const c5 = generateId();

  await db.courses.bulkPut([
    {
      id: c1,
      code: 'MATH1011',
      name: 'Applied Mathematics I',
      creditHours: 4,
      instructor: 'Dr. Tadesse',
      room: 'B59-2-005',
      color: '#B6E63E', // Lime
      term: 'Year 1 - Semester II',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: c2,
      code: 'ENGR1021',
      name: 'Engineering Mechanics (Statics)',
      creditHours: 3,
      instructor: 'Er. Abebe',
      room: 'B60-Auditorium',
      color: '#F6A8BE', // Pink
      term: 'Year 1 - Semester II',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: c3,
      code: 'COSC1012',
      name: 'Introduction to Computing (CS50)',
      creditHours: 3,
      instructor: 'Ins. Selam',
      room: 'Lab-C4',
      color: '#8EC5E8', // Sky
      term: 'Year 1 - Semester II',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: c4,
      code: 'CHEM1011',
      name: 'General Chemistry & Lab',
      creditHours: 3,
      instructor: 'Dr. Yonas',
      room: 'ChemLab-102',
      color: '#BBA6E0', // Lavender
      term: 'Year 1 - Semester II',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: c5,
      code: 'ENGL1011',
      name: 'Communicative English Skills',
      creditHours: 3,
      instructor: 'Ms. Bethlehem',
      room: 'B59-1-002',
      color: '#F5B58A', // Peach
      term: 'Year 1 - Semester II',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // 2. Class Sessions across the week
  await db.classSessions.bulkPut([
    {
      id: generateId(),
      courseId: c1,
      dayOfWeek: 0, // Mon
      startTime: '08:30',
      endTime: '10:20',
      type: 'lecture',
      room: 'B59-2-005',
      building: 'Block 59',
      repeat: 'all',
    },
    {
      id: generateId(),
      courseId: c2,
      dayOfWeek: 0, // Mon
      startTime: '10:40',
      endTime: '12:30',
      type: 'lecture',
      room: 'B60-Auditorium',
      building: 'Block 60',
      repeat: 'all',
    },
    {
      id: generateId(),
      courseId: c3,
      dayOfWeek: 1, // Tue
      startTime: '08:30',
      endTime: '11:30',
      type: 'lab',
      room: 'Lab-C4',
      building: 'ICT Building',
      repeat: 'all',
    },
    {
      id: generateId(),
      courseId: c1,
      dayOfWeek: 2, // Wed
      startTime: '08:30',
      endTime: '10:20',
      type: 'tutorial',
      room: 'B59-2-005',
      repeat: 'all',
    },
    {
      id: generateId(),
      courseId: c4,
      dayOfWeek: 2, // Wed
      startTime: '14:00',
      endTime: '17:00',
      type: 'lab',
      room: 'ChemLab-102',
      repeat: 'all',
    },
    {
      id: generateId(),
      courseId: c5,
      dayOfWeek: 3, // Thu
      startTime: '10:40',
      endTime: '12:30',
      type: 'lecture',
      room: 'B59-1-002',
      repeat: 'all',
    },
    {
      id: generateId(),
      courseId: c2,
      dayOfWeek: 4, // Fri
      startTime: '09:00',
      endTime: '11:00',
      type: 'tutorial',
      room: 'B60-Auditorium',
      repeat: 'all',
    },
  ]);

  // 3. Habits Presets
  await db.habits.bulkPut([
    {
      id: generateId(),
      title: 'Daily Journaling & Reflection',
      category: 'mindset',
      type: 'daily',
      targetCount: 1,
      minimumVersionText: 'Write 1 sentence before sleep',
      color: '#F6A8BE',
      currentStreak: 4,
      bestStreak: 12,
      icon: 'PenTool',
      graceDaysLeft: 1,
    },
    {
      id: generateId(),
      title: 'Campus Run / Workout (30m)',
      category: 'health',
      type: 'daily',
      targetCount: 1,
      minimumVersionText: '10 pushups + stretching',
      color: '#B6E63E',
      currentStreak: 2,
      bestStreak: 7,
      icon: 'Activity',
      graceDaysLeft: 2,
    },
    {
      id: generateId(),
      title: 'Deep Work / Reading (20 pages)',
      category: 'study',
      type: 'daily',
      targetCount: 1,
      minimumVersionText: 'Read 5 pages',
      color: '#8EC5E8',
      currentStreak: 6,
      bestStreak: 14,
      icon: 'BookOpen',
      graceDaysLeft: 2,
    },
    {
      id: generateId(),
      title: 'Coding Practice (CS50 Problem Set)',
      category: 'study',
      type: 'daily',
      targetCount: 1,
      minimumVersionText: 'Review 1 algorithm',
      color: '#E5C04B',
      currentStreak: 3,
      bestStreak: 9,
      icon: 'Terminal',
      graceDaysLeft: 1,
    },
    {
      id: generateId(),
      title: 'Music Production Flow Session',
      category: 'creative',
      type: 'daily',
      targetCount: 1,
      minimumVersionText: '10 mins sound design',
      color: '#BBA6E0',
      currentStreak: 1,
      bestStreak: 5,
      icon: 'Music',
      graceDaysLeft: 2,
    },
    {
      id: generateId(),
      title: 'Lines Written Target',
      category: 'creative',
      type: 'daily',
      targetCount: 16,
      minimumVersionText: '4 lines written',
      color: '#F5B58A',
      currentStreak: 5,
      bestStreak: 10,
      icon: 'Feather',
      graceDaysLeft: 2,
    },
    {
      id: generateId(),
      title: 'Sleep on Time (by 23:30)',
      category: 'health',
      type: 'daily',
      targetCount: 1,
      minimumVersionText: 'Phone off by 23:45',
      color: '#4FA3A5',
      currentStreak: 3,
      bestStreak: 8,
      icon: 'Moon',
      graceDaysLeft: 1,
    },
  ]);

  // 4. Learning Queue
  await db.learningQueue.bulkPut([
    { id: generateId(), title: 'Cognitive Biases & Mental Models', status: 'done', order: 1, notes: 'Confirmation bias, availability heuristic' },
    { id: generateId(), title: 'Epigenetics & Gene Expression', status: 'done', order: 2, notes: 'DNA methylation and lifestyle triggers' },
    { id: generateId(), title: 'Procrastination Mechanics & Hyperbolic Discounting', status: 'done', order: 3, notes: 'Immediate vs delayed gratification' },
    { id: generateId(), title: 'First-Principles Decision Making', status: 'done', order: 4, notes: 'Boiling problems down to fundamental truths' },
    { id: generateId(), title: 'Geopolitics & Horn of Africa Trade Corridors', status: 'today', order: 5, notes: 'Red Sea logistics and infrastructure' },
    { id: generateId(), title: 'Neuroplasticity & Synaptic Pruning', status: 'queued', order: 6 },
    { id: generateId(), title: 'Financial Literacy & Capital Allocation', status: 'queued', order: 7 },
    { id: generateId(), title: 'Artificial Intelligence & Large Language Models', status: 'queued', order: 8 },
    { id: generateId(), title: 'Robert Greene: 48 Laws & Strategic Positioning', status: 'queued', order: 9 },
  ]);

  // 5. Master Week Non-Class Timeblocks
  await db.masterWeekBlocks.bulkPut([
    {
      id: generateId(),
      title: 'Morning Flow: Exercise & Journal',
      category: 'health',
      dayOfWeek: 0,
      startTime: '06:30',
      endTime: '07:30',
      dayType: 'dorm',
    },
    {
      id: generateId(),
      title: 'Creative Studio Block (2h)',
      category: 'creative',
      dayOfWeek: 0,
      startTime: '19:00',
      endTime: '21:00',
      dayType: 'dorm',
    },
    {
      id: generateId(),
      title: 'Rotating Study Block: Math & Statics',
      category: 'study',
      dayOfWeek: 1,
      startTime: '16:00',
      endTime: '18:30',
      dayType: 'dorm',
      courseId: c1,
    },
    {
      id: generateId(),
      title: 'Deep Creative Production Block (5h)',
      category: 'creative',
      dayOfWeek: 5, // Sat (Home Day)
      startTime: '13:00',
      endTime: '18:00',
      dayType: 'home',
    },
  ]);

  // 6. Boss Battle Exam
  const examId = generateId();
  await db.exams.put({
    id: examId,
    courseId: c1,
    title: 'Applied Math I Midterm Boss',
    examType: 'Midterm',
    examDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    startTime: '09:00',
    hall: 'B59 Main Exam Hall',
    weight: 30,
    targetScore: 90,
    currentHp: 65,
    maxHp: 100,
    isDefeated: false,
    createdAt: now,
  });

  await db.examTopics.bulkPut([
    { id: generateId(), examId, title: 'Limits & Epsilon-Delta Definition', isStudied: true },
    { id: generateId(), examId, title: 'Derivatives & Chain Rule Applications', isStudied: true },
    { id: generateId(), examId, title: 'Implicit Differentiation & Tangents', isStudied: false },
    { id: generateId(), examId, title: 'Mean Value Theorem & Optimization', isStudied: false },
    { id: generateId(), examId, title: 'Definite Integrals & Fundamental Theorem', isStudied: false },
  ]);

  // 7. Dungeon Project
  const projId = generateId();
  await db.projects.put({
    id: projId,
    title: 'Autonomous Line-Follower Rover',
    courseId: c3,
    type: 'group',
    description: 'Hardware + Arduino C++ sensor tracking rover for engineering exhibition.',
    status: 'active',
    startDate: todayKey,
    deadline: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    weight: 25,
    createdAt: now,
    updatedAt: now,
  });

  await db.projectMilestones.bulkPut([
    { id: generateId(), projectId: projId, title: 'Floor 1: Chassis & Sensor Array Assembly', isDone: true, order: 1 },
    { id: generateId(), projectId: projId, title: 'Floor 2: PID Control Algorithm in C++', isDone: false, order: 2 },
    { id: generateId(), projectId: projId, title: 'Floor 3: Speed Optimization & Test Runs', isDone: false, order: 3 },
    { id: generateId(), projectId: projId, title: 'Floor 4: Project Report & Live Demonstration', isDone: false, order: 4 },
  ]);

  await db.projectMembers.bulkPut([
    { id: generateId(), projectId: projId, name: 'You (Lead)', role: 'Algorithm & Firmware', contact: '@scholar_dev', color: '#B6E63E' },
    { id: generateId(), projectId: projId, name: 'Henok', role: 'Hardware & Soldering', contact: '+251 911 234567', color: '#8EC5E8' },
    { id: generateId(), projectId: projId, name: 'Bethlehem', role: 'Testing & CAD Report', contact: '@beth_eng', color: '#F6A8BE' },
  ]);

  // 8. Creative Project
  await db.creativeProjects.put({
    id: generateId(),
    title: 'Semester Anthem EP (4 Tracks)',
    type: 'ep',
    currentStage: 'Melody & Beat',
    stages: ['Idea', 'Lyrics', 'Melody & Beat', 'Recording', 'Mix', 'Master', 'Release'],
    progressPercent: 42,
    linesWritten: 48,
    notes: 'Lo-fi study vibes with Ethiopian Ethio-jazz brass samples.',
  });

  // 9. Reading shelf
  await db.readingItems.put({
    id: generateId(),
    title: 'Clean Code: A Handbook of Agile Craftsmanship',
    author: 'Robert C. Martin',
    totalPages: 464,
    pagesRead: 182,
    rating: 5,
    isFinished: false,
    notes: 'Meaningful names, small functions, do one thing well.',
  });

  // 10. Initial Achievements
  await db.achievementsUnlocked.bulkPut(INITIAL_ACHIEVEMENTS);

  // 11. Initial Tasks
  await db.tasks.bulkPut([
    {
      id: generateId(),
      title: 'Applied Math I: Solve Problem Set 4 on Derivatives',
      courseId: c1,
      priority: 'high',
      effort: 'medium',
      dueDate: todayKey,
      dueTime: '20:00',
      status: 'todo',
      contextTag: 'phone',
      notes: 'Questions 4 to 12 from Chapter 3 handbook.',
      createdAt: now,
      updatedAt: now,
      subtasks: [
        { id: generateId(), title: 'Review Chain Rule notes', done: true },
        { id: generateId(), title: 'Solve questions 4-8', done: false },
        { id: generateId(), title: 'Check answers with Henok', done: false },
      ],
    },
    {
      id: generateId(),
      title: 'CS50: Watch Week 3 Lecture on Algorithms',
      courseId: c3,
      priority: 'medium',
      effort: 'large',
      dueDate: todayKey,
      dueTime: '22:00',
      status: 'todo',
      contextTag: 'laptop',
      notes: 'Bubble sort, selection sort, merge sort complexities.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: 'General Chemistry: Submit Pre-lab Report #5',
      courseId: c4,
      priority: 'medium',
      effort: 'small',
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      dueTime: '14:00',
      status: 'todo',
      contextTag: 'laptop',
      notes: 'Titration procedures and safety precautions.',
      createdAt: now,
      updatedAt: now,
    },
  ]);
}
