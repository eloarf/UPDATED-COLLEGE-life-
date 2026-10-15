/**
 * AASTU OS Tracker - Academic & Goal Planner
 * Zero Compilation, Zero Backend, 100% Static ES6+ Vanilla JavaScript
 * GitHub Pages Ready with LocalStorage Persistence & Web Notifications
 */

// Default Section 12 Master Schedules
const defaultSchedules = {
  Mon: [
    { id: "run", time: "05:45 - 06:30", title: "Morning Run / Exercise", category: "running", shiftable: true, location: "Campus Track" },
    { id: "class1", time: "08:30 - 10:20", title: "PSYC1011 General Psychology", category: "classes", location: "B59-2-005" },
    { id: "lib1", time: "10:30 - 12:30", title: "Library Sprint: Applied Math I", category: "study", location: "Main Library 2F" },
    { id: "class2", time: "13:30 - 15:20", title: "ANTH1002 Social Anthropology", category: "classes", location: "B59-2-010" },
    { id: "deep1", time: "18:00 - 19:30", title: "Deep Work: STEM Practice", category: "study", location: "Dorm Study Desk" },
    { id: "journal", time: "20:15 - 20:30", title: "15-Min Journaling & Writing", category: "journal", location: "Quiet Room" },
    { id: "music", time: "20:30 - 21:30", title: "Personal Music Study Analysis", category: "music", location: "Studio Desk" }
  ],
  Tue: [
    { id: "class1", time: "10:30 - 12:20", title: "GEES1005 Geography of Ethiopia", category: "classes", location: "B59-1-008" },
    { id: "class2", time: "14:00 - 16:30", title: "MATH1007 Mathematics Tutorial", category: "classes", location: "B59-2-005" },
    { id: "deep1", time: "18:30 - 20:15", title: "Deep Work: Physics & Calc Problem Sets", category: "study", location: "Library Study Carrel" },
    { id: "journal", time: "20:15 - 20:30", title: "15-Min Journaling & Writing", category: "journal", location: "Dorm" },
    { id: "music", time: "20:30 - 21:30", title: "Personal Music Study Analysis", category: "music", location: "Studio Desk" }
  ],
  Wed: [
    { id: "run", time: "05:45 - 06:30", title: "Morning Run / Exercise", category: "running", shiftable: true, location: "Campus Track" },
    { id: "class1", time: "10:30 - 12:20", title: "ENTR1006 Entrepreneurship", category: "classes", location: "B59-4-008" },
    { id: "lib1", time: "13:30 - 16:30", title: "Mid-Week Math & Physics Sprint", category: "study", location: "Science Library" },
    { id: "deep1", time: "18:00 - 19:30", title: "STEM Problem Solving & Lab Prep", category: "study", location: "Dorm Study Desk" },
    { id: "journal", time: "20:15 - 20:30", title: "15-Min Journaling & Writing", category: "journal", location: "Quiet Room" },
    { id: "music", time: "20:30 - 21:30", title: "Personal Music Study Analysis", category: "music", location: "Studio Desk" }
  ],
  Thu: [
    { id: "class1", time: "10:30 - 12:20", title: "FLEN1003 Communicative English", category: "classes", location: "B59-2-002" },
    { id: "class2", time: "13:30 - 15:20", title: "PHIL1009 Logic & Critical Thinking", category: "classes", location: "B59-2-003" },
    { id: "deep1", time: "18:00 - 19:30", title: "STEM Review & Equation Drilling", category: "study", location: "Dorm Study Desk" },
    { id: "journal", time: "20:15 - 20:30", title: "15-Min Journaling & Writing", category: "journal", location: "Dorm" },
    { id: "music", time: "20:30 - 21:30", title: "Personal Music Study Analysis", category: "music", location: "Studio Desk" }
  ],
  Fri: [
    { id: "run", time: "05:45 - 06:30", title: "Morning Run / Exercise", category: "running", shiftable: true, location: "Campus Track" },
    { id: "class1", time: "08:30 - 10:20", title: "MATH1007 Mathematics Lecture", category: "classes", location: "B59-2-005" },
    { id: "class2", time: "14:00 - 15:50", title: "FLEN1003 Communicative English", category: "classes", location: "B59-2-003" },
    { id: "journal", time: "20:15 - 20:30", title: "15-Min Journaling & Writing", category: "journal", location: "Dorm" },
    { id: "music", time: "20:30 - 22:00", title: "FL Studio Setup & Production", category: "music", location: "Home Studio" }
  ],
  Sat: [
    { id: "code1", time: "08:30 - 12:30", title: "CS50 & Software Project Coding", category: "code", location: "Tech Lab / Desk" },
    { id: "code2", time: "13:30 - 16:30", title: "Math-In-Python Scripting", category: "code", location: "Tech Lab / Desk" },
    { id: "journal", time: "20:15 - 20:30", title: "15-Min Journaling & Writing", category: "journal", location: "Dorm" },
    { id: "music", time: "20:30 - 22:30", title: "FL Studio Music Production Flow", category: "music", location: "Home Studio" }
  ],
  Sun: [
    { id: "music1", time: "08:30 - 12:30", title: "FL Studio Mixing & Engineering", category: "music", location: "Home Studio" },
    { id: "code1", time: "13:30 - 16:30", title: "Git Commits & Side Projects", category: "code", location: "Desk" },
    { id: "journal", time: "20:15 - 20:30", title: "15-Min Journaling & Writing", category: "journal", location: "Dorm" },
    { id: "music2", time: "20:30 - 21:30", title: "Casual Music Listening & Analysis", category: "music", location: "Headphones" }
  ]
};

// Default Sample Assignments
const defaultAssignments = [
  {
    id: "asg-1",
    course: "MATH1007",
    title: "Problem Set #3: Limits, Continuity & Squeeze Theorem",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    dueTime: "23:59",
    priority: "high",
    desc: "Complete exercises 4.1 through 4.8. Show full proofs for epsilon-delta limit questions.",
    hours: 3.5,
    completed: false
  },
  {
    id: "asg-2",
    course: "PHIL1009",
    title: "Essay: Fallacies of Relevance in Public Discourse",
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    dueTime: "17:00",
    priority: "medium",
    desc: "1,500 words analyzing 3 recent news articles. Cite using APA 7th edition.",
    hours: 4.0,
    completed: false
  },
  {
    id: "asg-3",
    course: "ENTR1006",
    title: "Business Model Canvas Presentation",
    dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    dueTime: "14:00",
    priority: "high",
    desc: "Slide deck for solar-powered campus device charging kiosk.",
    hours: 2.0,
    completed: true
  }
];

// Default Sample Exams
const defaultExams = [
  {
    id: "exam-1",
    course: "MATH1007 Applied Mathematics I",
    examType: "Midterm",
    date: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
    time: "09:00",
    hall: "Block 59, Room 2-005",
    weight: 30,
    topics: [
      { name: "Vectors and Analytical Geometry", revised: true },
      { name: "Limits & Continuity Proofs", revised: true },
      { name: "Techniques of Differentiation", revised: false },
      { name: "Applications of Extrema & Optimization", revised: false }
    ]
  },
  {
    id: "exam-2",
    course: "PSYC1011 General Psychology",
    examType: "Quiz",
    date: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0],
    time: "10:30",
    hall: "Block 59, Room 2-005",
    weight: 15,
    topics: [
      { name: "Biological Foundations & Neurotransmission", revised: false },
      { name: "Sensation vs Perception", revised: false },
      { name: "Classical and Operant Conditioning", revised: false }
    ]
  }
];

// App State Management
const STORAGE_KEY = "aastu_os_state_v2";
let activeDay = "Mon";
let activeTab = "schedule";
let assignmentFilter = "all";
let swRegistration = null;

// Initialize or Load State from localStorage
let state = loadInitialState();

function loadInitialState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Ensure schema integrity
      parsed.schedules = parsed.schedules || JSON.parse(JSON.stringify(defaultSchedules));
      parsed.assignments = parsed.assignments || JSON.parse(JSON.stringify(defaultAssignments));
      parsed.exams = parsed.exams || JSON.parse(JSON.stringify(defaultExams));
      parsed.streaks = parsed.streaks || { classes: 0, running: 0, music: 0, journal: 0, assignments: 0, perfect: 0 };
      parsed.freezesUsed = parsed.freezesUsed || 0;
      parsed.monthHistory = parsed.monthHistory || {};
      parsed.completedTasks = parsed.completedTasks || {};
      parsed.shiftedTasks = parsed.shiftedTasks || {};
      parsed.notificationsLog = parsed.notificationsLog || [];
      return parsed;
    } catch (e) {
      console.warn("Corrupt state found, resetting to defaults", e);
    }
  }

  // Check backward compatibility with older "aastu_os_state" if available
  const legacy = localStorage.getItem("aastu_os_state");
  if (legacy) {
    try {
      const parsedLegacy = JSON.parse(legacy);
      return {
        schedules: JSON.parse(JSON.stringify(defaultSchedules)),
        assignments: JSON.parse(JSON.stringify(defaultAssignments)),
        exams: JSON.parse(JSON.stringify(defaultExams)),
        streaks: {
          classes: parsedLegacy.streaks?.classes || 0,
          running: parsedLegacy.streaks?.running || 0,
          music: parsedLegacy.streaks?.music || 0,
          journal: parsedLegacy.streaks?.journal || 0,
          assignments: 1,
          perfect: parsedLegacy.streaks?.perfect || 0
        },
        freezesUsed: parsedLegacy.freezesUsed || 0,
        monthHistory: parsedLegacy.monthHistory || {},
        completedTasks: parsedLegacy.completedTasks || {},
        shiftedTasks: parsedLegacy.shiftedTasks || {},
        notificationsLog: [],
        notifBannerDismissed: false
      };
    } catch (e) {
      console.warn("Legacy parse error", e);
    }
  }

  return {
    schedules: JSON.parse(JSON.stringify(defaultSchedules)),
    assignments: JSON.parse(JSON.stringify(defaultAssignments)),
    exams: JSON.parse(JSON.stringify(defaultExams)),
    streaks: { classes: 0, running: 0, music: 0, journal: 0, assignments: 0, perfect: 0 },
    freezesUsed: 0,
    monthHistory: {},
    completedTasks: {},
    shiftedTasks: {},
    notificationsLog: [],
    notifBannerDismissed: false
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateUI();
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayName(dateObj) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[dateObj.getDay()];
}

// -------------------------------------------------------------
// WEB NOTIFICATIONS & SERVICE WORKER INITIALIZATION
// -------------------------------------------------------------

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        swRegistration = reg;
        console.log("AASTU OS ServiceWorker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("ServiceWorker registration notice:", err);
      });
  }

  // Check notification permission state
  checkNotificationBanner();

  // Run initial scheduler check and start background interval
  checkAndTriggerScheduledAlerts();
  setInterval(checkAndTriggerScheduledAlerts, 60000); // Check every minute
}

function checkNotificationBanner() {
  const banner = document.getElementById("duo-banner");
  if (!banner) return;

  if (state.notifBannerDismissed || (window.Notification && Notification.permission === "granted")) {
    banner.style.display = "none";
  } else {
    banner.style.display = "flex";
  }
}

function dismissDuoBanner() {
  state.notifBannerDismissed = true;
  saveState();
  const banner = document.getElementById("duo-banner");
  if (banner) banner.style.display = "none";
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast("This browser does not support desktop notifications.", "warning");
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      showToast("🎉 Notifications enabled! Duolingo alerts active.", "success");
      dismissDuoBanner();
      playChime(true);
      sendPushNotification("⚡ AASTU OS Alerts Activated!", {
        body: "You're all set! We'll alert you before due dates and help protect your streaks."
      });
    } else if (permission === "denied") {
      showToast("Notifications blocked. You can re-enable in browser settings.", "error");
    }
  });
}

function sendPushNotification(title, options = {}) {
  // Add to notification log
  const logEntry = {
    id: "notif-" + Date.now(),
    title,
    body: options.body || "",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  state.notificationsLog.unshift(logEntry);
  if (state.notificationsLog.length > 25) state.notificationsLog.pop();
  saveState();
  renderNotificationDrawer();

  // Audio cue
  playChime();

  // 1. Try Service Worker showNotification (works even in background)
  if (swRegistration && swRegistration.showNotification) {
    swRegistration.showNotification(title, {
      body: options.body || "Academic alert from AASTU OS",
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230d1117'/><text x='50' y='68' font-size='60' text-anchor='middle' fill='%2358a6ff'>⚡</text></svg>",
      vibrate: [200, 100, 200],
      tag: options.tag || 'aastu-alert'
    }).catch(() => {
      fallbackNotification(title, options);
    });
  } else {
    fallbackNotification(title, options);
  }
}

function fallbackNotification(title, options) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body: options.body,
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230d1117'/><text x='50' y='68' font-size='60' text-anchor='middle' fill='%2358a6ff'>⚡</text></svg>"
      });
    } catch (e) {
      console.warn("Notification fallback failed:", e);
    }
  }
}

function testNotificationAlert() {
  if ("Notification" in window && Notification.permission !== "granted") {
    requestNotificationPermission();
    return;
  }
  sendPushNotification("🦉 Duolingo Streak Alert!", {
    body: "🔥 Keep your fire burning! Don't forget your 15-min journal & music study tonight."
  });
  showToast("Notification triggered! Check your desktop/phone tray.", "success");
}

function testMissedTaskNotification() {
  sendPushNotification("⚠️ Missed Task Warning", {
    body: "You missed 1 task on your schedule today. Activate a Streak Freeze or complete it now to keep 100%!"
  });
  showToast("Missed task alert dispatched.", "warning");
}

// Automated Scheduled Alerts Engine
function checkAndTriggerScheduledAlerts() {
  const now = new Date();
  const todayStr = getTodayKey();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  // Check assignments due soon (<24h or due today)
  state.assignments.forEach(asg => {
    if (asg.completed) return;
    const dueTimeStr = asg.dueTime || "23:59";
    const dueDateTime = new Date(`${asg.dueDate}T${dueTimeStr}`);
    const diffHours = (dueDateTime - now) / (1000 * 60 * 60);

    const alertKey24 = `alert_24h_${asg.id}_${asg.dueDate}`;
    const alertKey1 = `alert_1h_${asg.id}_${asg.dueDate}`;

    // 24 Hour alert
    if (diffHours > 0 && diffHours <= 24 && !localStorage.getItem(alertKey24)) {
      sendPushNotification(`⏰ Assignment Due Tomorrow: ${asg.course}`, {
        body: `"${asg.title}" is due in ${Math.round(diffHours)} hours! Finish strong.`
      });
      localStorage.setItem(alertKey24, "true");
    }

    // 1 Hour alert
    if (diffHours > 0 && diffHours <= 1.5 && !localStorage.getItem(alertKey1)) {
      sendPushNotification(`🚨 Urgent Due Date: ${asg.course}`, {
        body: `"${asg.title}" is due in less than 90 minutes! Submit before deadline.`
      });
      localStorage.setItem(alertKey1, "true");
    }
  });

  // Check upcoming exams (alert at 48 hours and 24 hours)
  state.exams.forEach(ex => {
    const examDateTime = new Date(`${ex.date}T${ex.time || "09:00"}`);
    const diffDays = (examDateTime - now) / (1000 * 60 * 60 * 24);
    const alertKeyExam = `alert_exam_${ex.id}_${ex.date}`;

    if (diffDays > 0 && diffDays <= 2 && !localStorage.getItem(alertKeyExam)) {
      sendPushNotification(`🎯 Upcoming Exam in 48 Hours!`, {
        body: `${ex.course} ${ex.examType} is scheduled for ${ex.date} at ${ex.time}. Check your revision topics!`
      });
      localStorage.setItem(alertKeyExam, "true");
    }
  });

  // Evening Duolingo-style streak check at 20:00 (8:00 PM)
  if (currentHour === 20 && currentMin <= 2) {
    const dailyKey = `streak_reminder_${todayStr}`;
    if (!localStorage.getItem(dailyKey)) {
      const todayDay = getDayName(now);
      const tasks = state.schedules[todayDay] || [];
      let pending = 0;
      tasks.forEach(t => {
        if (!state.completedTasks[`${todayStr}-${todayDay}-${t.id}`]) pending++;
      });

      if (pending > 0) {
        sendPushNotification("🦉 Duolingo Streak Check", {
          body: `You still have ${pending} tasks left today! Finish them now to maintain your 100% streak.`
        });
      }
      localStorage.setItem(dailyKey, "true");
    }
  }
}

// Synthesizer Web Audio Chime (Zero External Files)
function playChime(isCelebration = false) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (isCelebration) {
      // 3-tone victory chime
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.35);
      });
    } else {
      // 2-tone pleasant gentle ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      osc.type = "sine";
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Audio context may be restricted by autoplay policy
  }
}

// -------------------------------------------------------------
// CORE INITIALIZATION & NAVIGATION
// -------------------------------------------------------------

function init() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayIndex = new Date().getDay();
  activeDay = days[todayIndex];

  document.getElementById("current-date-display").innerText = new Date().toDateString();

  renderDayButtons();
  renderTasks();
  renderAssignments();
  renderExams();
  renderCalendar();
  renderExamCountdownBanner();
  renderNotificationDrawer();
  updateUI();

  initServiceWorker();
}

function switchTab(tabName) {
  activeTab = tabName;
  const tabs = ["schedule", "assignments", "exams", "calendar", "settings"];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (el) el.style.display = (t === tabName) ? "block" : "none";
    if (btn) {
      if (t === tabName) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });

  if (tabName === "calendar") renderFullCalendar();
  if (tabName === "assignments") renderAssignments();
  if (tabName === "exams") renderExams();
}

function selectDay(day) {
  activeDay = day;
  renderDayButtons();
  renderTasks();
}

function renderDayButtons() {
  const dayBar = document.getElementById("day-bar");
  if (!dayBar) return;

  const todayName = getDayName(new Date());
  const btns = dayBar.querySelectorAll(".day-btn");
  btns.forEach(btn => {
    const dayCode = btn.innerText.slice(0, 3);
    btn.classList.toggle("active", dayCode === activeDay);
    btn.classList.toggle("is-today", dayCode === todayName);
  });

  const titleEl = document.getElementById("schedule-title");
  if (titleEl) {
    const isToday = activeDay === todayName;
    titleEl.innerText = `${activeDay} Schedule ${isToday ? "(Today)" : ""}`;
  }
}

// -------------------------------------------------------------
// TASK MANAGEMENT (ADD, EDIT, SHIFT, COMPLETE, DELETE)
// -------------------------------------------------------------

function toggleTask(taskId, category) {
  const key = `${getTodayKey()}-${activeDay}-${taskId}`;
  const isNowCompleted = !state.completedTasks[key];
  state.completedTasks[key] = isNowCompleted;

  if (isNowCompleted) {
    playChime();
    showToast("Task completed! Streak updated ⚡", "success");
  }

  calculateStreaks();
  saveState();
  renderTasks();
  renderCalendar();
}

function shiftTaskTime(taskId) {
  state.shiftedTasks[taskId] = !state.shiftedTasks[taskId];
  saveState();
  renderTasks();
  showToast("Task time shifted.", "info");
}

function renderTasks() {
  const listContainer = document.getElementById("task-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  const currentTasks = state.schedules[activeDay] || [];

  if (currentTasks.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">No tasks scheduled for ${activeDay}</div>
        <div class="empty-sub">Click "+ Add Custom Task" above to customize your routine!</div>
      </div>
    `;
    updateProgress();
    return;
  }

  currentTasks.forEach((task, index) => {
    const key = `${getTodayKey()}-${activeDay}-${task.id}`;
    const isDone = !!state.completedTasks[key];
    const isShifted = !!state.shiftedTasks[task.id];

    let displayTime = task.time;
    if (task.shiftable && isShifted) {
      displayTime = "18:00 - 18:45 (Shifted Evening)";
    }

    const item = document.createElement("div");
    item.className = `task-item ${isDone ? 'completed' : ''}`;

    // Google Calendar Quick Link
    const gCalUrl = generateGoogleCalendarUrl(
      task.title,
      `AASTU Section 12 Class / Activity: ${task.title}. Location: ${task.location || 'AASTU Campus'}`,
      task.location || 'AASTU Campus',
      task.time
    );

    item.innerHTML = `
      <div class="task-left">
        <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleTask('${task.id}', '${task.category}')" title="Mark Done" />
        <div class="task-details">
          <div class="task-title ${isDone ? 'done' : ''}">${escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="task-time">${escapeHtml(displayTime)}</span>
            <span class="task-tag ${task.category}">${task.category}</span>
            ${task.location ? `<span class="task-room">📍 ${escapeHtml(task.location)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="task-actions">
        ${task.shiftable ? `<button class="shift-btn" onclick="shiftTaskTime('${task.id}')">${isShifted ? '↺ Morning' : '⇄ Shift'}</button>` : ''}
        <a href="${gCalUrl}" target="_blank" class="task-btn" title="Add to Google Calendar">📅</a>
        <button class="task-btn" onclick="openEditTaskModal('${task.id}')" title="Edit Task">✏️</button>
        <button class="task-btn delete" onclick="deleteTask('${task.id}')" title="Delete Task">🗑️</button>
      </div>
    `;

    listContainer.appendChild(item);
  });

  updateProgress();
}

function updateProgress() {
  const currentTasks = state.schedules[activeDay] || [];
  if (currentTasks.length === 0) {
    document.getElementById("progress-bar").style.width = "0%";
    document.getElementById("completion-text").innerText = "0% Done";
    document.getElementById("progress-summary").innerText = "0 tasks";
    return;
  }

  let completedCount = 0;
  currentTasks.forEach(task => {
    const key = `${getTodayKey()}-${activeDay}-${task.id}`;
    if (state.completedTasks[key]) completedCount++;
  });

  const percent = Math.round((completedCount / currentTasks.length) * 100);
  const progressBar = document.getElementById("progress-bar");
  const completionText = document.getElementById("completion-text");
  const progressSummary = document.getElementById("progress-summary");
  const motivationalQuote = document.getElementById("motivational-quote");

  if (progressBar) progressBar.style.width = `${percent}%`;
  if (completionText) completionText.innerText = `${percent}% Done`;
  if (progressSummary) progressSummary.innerText = `${completedCount} of ${currentTasks.length} tasks completed`;

  if (motivationalQuote) {
    if (percent === 100) {
      motivationalQuote.innerText = "🔥 100% PERFECT DAY ACHIEVED! Outstanding work!";
      motivationalQuote.style.color = "var(--accent-green)";
    } else if (percent >= 70) {
      motivationalQuote.innerText = "⚡ Almost there! Finish the final reps!";
      motivationalQuote.style.color = "var(--accent-cyan)";
    } else if (percent >= 30) {
      motivationalQuote.innerText = "Solid momentum. Keep pushing.";
      motivationalQuote.style.color = "var(--text-muted)";
    } else {
      motivationalQuote.innerText = "Start strong. Win the day!";
      motivationalQuote.style.color = "var(--text-muted)";
    }
  }

  const todayKey = getTodayKey();
  if (!state.monthHistory[todayKey]) state.monthHistory[todayKey] = {};
  state.monthHistory[todayKey].percent = percent;
  state.monthHistory[todayKey].completedCount = completedCount;
  state.monthHistory[todayKey].totalCount = currentTasks.length;

  // Trigger celebration confetti if 100% just hit on today
  if (percent === 100 && activeDay === getDayName(new Date())) {
    if (!state.monthHistory[todayKey].celebrated) {
      triggerConfetti();
      playChime(true);
      state.monthHistory[todayKey].celebrated = true;
      sendPushNotification("🏆 100% Perfect Day!", {
        body: "You conquered every task on your Section 12 schedule today! Streak +1."
      });
    }
  }

  calculateStreaks();
}

function calculateStreaks() {
  let cats = { classes: 0, running: 0, music: 0, journal: 0 };
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  days.forEach(day => {
    (state.schedules[day] || []).forEach(task => {
      const key = `${getTodayKey()}-${day}-${task.id}`;
      if (state.completedTasks[key] && cats[task.category] !== undefined) {
        cats[task.category]++;
      }
    });
  });

  state.streaks.classes = cats.classes;
  state.streaks.running = cats.running;
  state.streaks.music = cats.music;
  state.streaks.journal = cats.journal;

  // Assignments on-time streak
  const completedAssignments = state.assignments.filter(a => a.completed).length;
  state.streaks.assignments = completedAssignments;

  // Perfect day streak
  const todayKey = getTodayKey();
  if (state.monthHistory[todayKey] && state.monthHistory[todayKey].percent === 100) {
    state.streaks.perfect = Math.max(state.streaks.perfect || 0, 1);
  }
}

// Add & Edit Task Modal Logic
function openAddTaskModal() {
  document.getElementById("task-modal-title").innerText = `Add Custom Task to ${activeDay}`;
  document.getElementById("task-form-id").value = "";
  document.getElementById("task-form-day").value = activeDay;
  document.getElementById("task-form-day-select").value = activeDay;
  document.getElementById("task-form-title").value = "";
  document.getElementById("task-form-time").value = "16:00 - 17:00";
  document.getElementById("task-form-location").value = "AASTU Campus";
  document.getElementById("task-form-category").value = "study";
  document.getElementById("task-form-shiftable").checked = false;

  document.getElementById("task-modal").classList.add("open");
  document.getElementById("task-form-title").focus();
}

function openEditTaskModal(taskId) {
  const currentTasks = state.schedules[activeDay] || [];
  const task = currentTasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById("task-modal-title").innerText = `Edit Task (${activeDay})`;
  document.getElementById("task-form-id").value = task.id;
  document.getElementById("task-form-day").value = activeDay;
  document.getElementById("task-form-day-select").value = activeDay;
  document.getElementById("task-form-title").value = task.title;
  document.getElementById("task-form-time").value = task.time || "";
  document.getElementById("task-form-location").value = task.location || "";
  document.getElementById("task-form-category").value = task.category || "study";
  document.getElementById("task-form-shiftable").checked = !!task.shiftable;

  document.getElementById("task-modal").classList.add("open");
}

function closeTaskModal() {
  document.getElementById("task-modal").classList.remove("open");
}

function saveTaskForm() {
  const id = document.getElementById("task-form-id").value;
  const targetDay = document.getElementById("task-form-day-select").value;
  const title = document.getElementById("task-form-title").value.trim();
  const time = document.getElementById("task-form-time").value.trim();
  const location = document.getElementById("task-form-location").value.trim();
  const category = document.getElementById("task-form-category").value;
  const shiftable = document.getElementById("task-form-shiftable").checked;

  if (!title) {
    showToast("Please enter a task title.", "warning");
    return;
  }

  if (!state.schedules[targetDay]) state.schedules[targetDay] = [];

  if (id) {
    // Editing existing task
    const oldDay = document.getElementById("task-form-day").value;
    if (oldDay === targetDay) {
      const idx = state.schedules[oldDay].findIndex(t => t.id === id);
      if (idx !== -1) {
        state.schedules[oldDay][idx] = { id, title, time, location, category, shiftable };
      }
    } else {
      // Moved to another day
      state.schedules[oldDay] = state.schedules[oldDay].filter(t => t.id !== id);
      state.schedules[targetDay].push({ id, title, time, location, category, shiftable });
    }
    showToast("Task updated successfully!", "success");
  } else {
    // Creating new custom task
    const newId = "task-" + Date.now();
    state.schedules[targetDay].push({
      id: newId,
      title,
      time: time || "Flexible",
      location: location || "",
      category,
      shiftable
    });
    showToast(`Task added to ${targetDay}!`, "success");
  }

  saveState();
  closeTaskModal();
  renderTasks();
}

function deleteTask(taskId) {
  if (!confirm("Are you sure you want to delete this task?")) return;
  state.schedules[activeDay] = (state.schedules[activeDay] || []).filter(t => t.id !== taskId);
  saveState();
  renderTasks();
  showToast("Task removed.", "info");
}

// -------------------------------------------------------------
// CLASS ASSIGNMENTS MANAGEMENT
// -------------------------------------------------------------

function renderAssignments() {
  const container = document.getElementById("assignments-grid");
  const countText = document.getElementById("assignments-count-text");
  const badge = document.getElementById("assignments-badge");
  if (!container) return;

  const now = new Date();
  const todayStr = getTodayKey();

  let filtered = [...state.assignments];

  // Apply active filter
  if (assignmentFilter === "pending") {
    filtered = filtered.filter(a => !a.completed);
  } else if (assignmentFilter === "completed") {
    filtered = filtered.filter(a => a.completed);
  } else if (assignmentFilter === "due-soon") {
    filtered = filtered.filter(a => {
      if (a.completed) return false;
      const due = new Date(`${a.dueDate}T${a.dueTime || "23:59"}`);
      const diffHours = (due - now) / (1000 * 60 * 60);
      return diffHours >= 0 && diffHours <= 48;
    });
  } else if (assignmentFilter === "overdue") {
    filtered = filtered.filter(a => {
      if (a.completed) return false;
      const due = new Date(`${a.dueDate}T${a.dueTime || "23:59"}`);
      return due < now;
    });
  }

  // Sort by due date
  filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const pendingCount = state.assignments.filter(a => !a.completed).length;
  if (badge) badge.innerText = pendingCount;
  if (countText) countText.innerText = `${filtered.length} of ${state.assignments.length} assignments shown`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🎉</div>
        <div class="empty-text">No assignments match this filter</div>
        <div class="empty-sub">Add a class assignment to track homework & due dates!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  filtered.forEach(asg => {
    const dueDateTime = new Date(`${asg.dueDate}T${asg.dueTime || "23:59"}`);
    const isOverdue = !asg.completed && dueDateTime < now;
    const diffHours = Math.round((dueDateTime - now) / (1000 * 60 * 60));
    const isDueToday = asg.dueDate === todayStr;

    let dueBadgeHtml = "";
    if (asg.completed) {
      dueBadgeHtml = `<span class="card-due-badge due-done">✅ Completed</span>`;
    } else if (isOverdue) {
      dueBadgeHtml = `<span class="card-due-badge due-overdue">⚠️ Overdue!</span>`;
    } else if (isDueToday) {
      dueBadgeHtml = `<span class="card-due-badge due-today">⏰ Due Today (${asg.dueTime})</span>`;
    } else if (diffHours <= 48) {
      dueBadgeHtml = `<span class="card-due-badge due-soon">⏳ Due in ${diffHours}h</span>`;
    } else {
      dueBadgeHtml = `<span class="card-due-badge due-future">📅 Due ${asg.dueDate}</span>`;
    }

    const gCalUrl = generateGoogleCalendarUrl(
      `[Assignment Due] ${asg.course}: ${asg.title}`,
      `Submission deadline for ${asg.course}. Notes: ${asg.desc || 'None'}`,
      "AASTU Portal",
      `${asg.dueTime || "23:59"} - ${asg.dueTime || "23:59"}`,
      asg.dueDate
    );

    const card = document.createElement("div");
    card.className = `assignment-card ${asg.completed ? 'completed' : ''}`;
    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="card-course">${escapeHtml(asg.course)}</span>
          ${dueBadgeHtml}
        </div>
        <div class="card-title">${escapeHtml(asg.title)}</div>
        ${asg.desc ? `<div class="card-desc">${escapeHtml(asg.desc)}</div>` : ''}
        <div class="card-meta-row">
          <span>Priority: <strong>${asg.priority || 'Medium'}</strong></span>
          <span>Effort: <strong>${asg.hours || 2}h</strong></span>
          <span>Due: <strong>${asg.dueDate} ${asg.dueTime || '23:59'}</strong></span>
        </div>
      </div>
      <div class="card-footer">
        <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; color:var(--text-main);">
          <input type="checkbox" ${asg.completed ? 'checked' : ''} onchange="toggleAssignment('${asg.id}')" />
          <span>${asg.completed ? 'Done' : 'Mark Done'}</span>
        </label>
        <div style="display:flex; gap:4px;">
          <a href="${gCalUrl}" target="_blank" class="task-btn" title="Add to Google Calendar">📅</a>
          <button class="task-btn" onclick="openEditAssignmentModal('${asg.id}')" title="Edit">✏️</button>
          <button class="task-btn delete" onclick="deleteAssignment('${asg.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterAssignments(filterType, btnEl) {
  assignmentFilter = filterType;
  const pills = document.querySelectorAll("#assignment-filter-pills .filter-pill");
  pills.forEach(p => p.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  renderAssignments();
}

function toggleAssignment(id) {
  const asg = state.assignments.find(a => a.id === id);
  if (!asg) return;
  asg.completed = !asg.completed;
  if (asg.completed) {
    playChime();
    showToast(`Assignment completed! Great job on ${asg.course}.`, "success");
  }
  calculateStreaks();
  saveState();
  renderAssignments();
  renderCalendar();
}

function openAddAssignmentModal() {
  document.getElementById("assignment-modal-title").innerText = "Add Class Assignment";
  document.getElementById("assignment-form-id").value = "";
  document.getElementById("assignment-form-title").value = "";
  document.getElementById("assignment-form-course").value = "MATH1007";
  document.getElementById("assignment-form-priority").value = "medium";
  document.getElementById("assignment-form-date").value = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
  document.getElementById("assignment-form-time").value = "23:59";
  document.getElementById("assignment-form-desc").value = "";
  document.getElementById("assignment-form-hours").value = "2";

  document.getElementById("assignment-modal").classList.add("open");
  document.getElementById("assignment-form-title").focus();
}

function openEditAssignmentModal(id) {
  const asg = state.assignments.find(a => a.id === id);
  if (!asg) return;

  document.getElementById("assignment-modal-title").innerText = "Edit Assignment";
  document.getElementById("assignment-form-id").value = asg.id;
  document.getElementById("assignment-form-title").value = asg.title;
  document.getElementById("assignment-form-course").value = asg.course;
  document.getElementById("assignment-form-priority").value = asg.priority || "medium";
  document.getElementById("assignment-form-date").value = asg.dueDate;
  document.getElementById("assignment-form-time").value = asg.dueTime || "23:59";
  document.getElementById("assignment-form-desc").value = asg.desc || "";
  document.getElementById("assignment-form-hours").value = asg.hours || "2";

  document.getElementById("assignment-modal").classList.add("open");
}

function closeAssignmentModal() {
  document.getElementById("assignment-modal").classList.remove("open");
}

function saveAssignmentForm() {
  const id = document.getElementById("assignment-form-id").value;
  const title = document.getElementById("assignment-form-title").value.trim();
  const course = document.getElementById("assignment-form-course").value.trim();
  const priority = document.getElementById("assignment-form-priority").value;
  const dueDate = document.getElementById("assignment-form-date").value;
  const dueTime = document.getElementById("assignment-form-time").value || "23:59";
  const desc = document.getElementById("assignment-form-desc").value.trim();
  const hours = parseFloat(document.getElementById("assignment-form-hours").value) || 2;

  if (!title || !course || !dueDate) {
    showToast("Please fill in Assignment title, course, and due date.", "warning");
    return;
  }

  if (id) {
    const idx = state.assignments.findIndex(a => a.id === id);
    if (idx !== -1) {
      state.assignments[idx] = {
        ...state.assignments[idx],
        title, course, priority, dueDate, dueTime, desc, hours
      };
      showToast("Assignment updated!", "success");
    }
  } else {
    state.assignments.push({
      id: "asg-" + Date.now(),
      title, course, priority, dueDate, dueTime, desc, hours,
      completed: false
    });
    showToast("New assignment logged & reminder queued!", "success");
  }

  saveState();
  closeAssignmentModal();
  renderAssignments();
  renderCalendar();
}

function deleteAssignment(id) {
  if (!confirm("Delete this assignment?")) return;
  state.assignments = state.assignments.filter(a => a.id !== id);
  saveState();
  renderAssignments();
  renderCalendar();
  showToast("Assignment deleted.", "info");
}

// -------------------------------------------------------------
// EXAMS & TEST MILESTONES MANAGEMENT
// -------------------------------------------------------------

function renderExams() {
  const container = document.getElementById("exams-grid");
  const badge = document.getElementById("exams-badge");
  if (!container) return;

  if (badge) badge.innerText = state.exams.length;

  if (state.exams.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🎯</div>
        <div class="empty-text">No exams currently scheduled</div>
        <div class="empty-sub">Add your upcoming midterms, finals, and quizzes!</div>
      </div>
    `;
    return;
  }

  // Sort by date ascending
  state.exams.sort((a, b) => new Date(`${a.date}T${a.time || "09:00"}`) - new Date(`${b.date}T${b.time || "09:00"}`));

  container.innerHTML = "";
  state.exams.forEach(exam => {
    const revisedCount = (exam.topics || []).filter(t => t.revised).length;
    const totalTopics = (exam.topics || []).length;
    const pctRevised = totalTopics > 0 ? Math.round((revisedCount / totalTopics) * 100) : 0;

    const gCalUrl = generateGoogleCalendarUrl(
      `[EXAM] ${exam.course} - ${exam.examType}`,
      `AASTU Exam: ${exam.course} ${exam.examType}. Hall: ${exam.hall || 'TBA'}. Weight: ${exam.weight}%`,
      exam.hall || 'AASTU Campus',
      `${exam.time || "09:00"} - 12:00`,
      exam.date
    );

    const card = document.createElement("div");
    card.className = "exam-card";
    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="card-course">${escapeHtml(exam.course)}</span>
          <span class="card-due-badge due-today">${exam.examType} (${exam.weight || 30}%)</span>
        </div>
        <div class="card-title">📅 ${exam.date} at ${exam.time || "09:00"}</div>
        <div class="card-meta-row">
          <span>📍 <strong>${escapeHtml(exam.hall || 'Exam Hall TBA')}</strong></span>
          <span>Readiness: <strong style="color:var(--accent-green);">${pctRevised}%</strong> (${revisedCount}/${totalTopics} topics)</span>
        </div>

        ${totalTopics > 0 ? `
          <div class="topic-check-list">
            <div style="font-weight:600; color:var(--text-bright); margin-bottom:4px; font-size:0.75rem;">Study Topics Revision Checklist:</div>
            ${exam.topics.map((t, idx) => `
              <label class="topic-check-item ${t.revised ? 'done' : ''}" style="cursor:pointer;">
                <input type="checkbox" ${t.revised ? 'checked' : ''} onchange="toggleExamTopic('${exam.id}', ${idx})" />
                <span>${escapeHtml(t.name)}</span>
              </label>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="card-footer">
        <a href="${gCalUrl}" target="_blank" class="btn btn-sm btn-cyan" style="font-size:0.75rem;">📅 Google Cal</a>
        <div style="display:flex; gap:4px;">
          <button class="task-btn" onclick="openEditExamModal('${exam.id}')" title="Edit">✏️</button>
          <button class="task-btn delete" onclick="deleteExam('${exam.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  renderExamCountdownBanner();
}

function toggleExamTopic(examId, topicIndex) {
  const ex = state.exams.find(e => e.id === examId);
  if (!ex || !ex.topics || !ex.topics[topicIndex]) return;
  ex.topics[topicIndex].revised = !ex.topics[topicIndex].revised;
  saveState();
  renderExams();
}

function renderExamCountdownBanner() {
  const banner = document.getElementById("exam-banner");
  if (!banner) return;

  const now = new Date();
  const upcoming = state.exams
    .filter(e => new Date(`${e.date}T${e.time || "09:00"}`) > now)
    .sort((a, b) => new Date(`${a.date}T${a.time || "09:00"}`) - new Date(`${b.date}T${b.time || "09:00"}`));

  if (upcoming.length === 0) {
    banner.style.display = "none";
    return;
  }

  const nextExam = upcoming[0];
  banner.style.display = "flex";

  const examDateTime = new Date(`${nextExam.date}T${nextExam.time || "09:00"}`);
  const titleEl = document.getElementById("banner-exam-title");
  const detailsEl = document.getElementById("banner-exam-details");

  if (titleEl) titleEl.innerText = `⏳ Next Exam: ${nextExam.course} (${nextExam.examType})`;
  if (detailsEl) detailsEl.innerText = `Scheduled for ${nextExam.date} at ${nextExam.time || "09:00"} in ${nextExam.hall || "Hall TBA"} (Worth ${nextExam.weight || 30}%)`;

  updateCountdownDigits(examDateTime);
}

function updateCountdownDigits(targetDate) {
  const now = new Date();
  const diff = targetDate - now;

  if (diff <= 0) {
    document.getElementById("timer-days").innerText = "00";
    document.getElementById("timer-hours").innerText = "00";
    document.getElementById("timer-mins").innerText = "00";
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const dEl = document.getElementById("timer-days");
  const hEl = document.getElementById("timer-hours");
  const mEl = document.getElementById("timer-mins");

  if (dEl) dEl.innerText = String(days).padStart(2, '0');
  if (hEl) hEl.innerText = String(hours).padStart(2, '0');
  if (mEl) mEl.innerText = String(mins).padStart(2, '0');
}

// Live timer tick every 10 seconds
setInterval(() => {
  if (activeTab === "schedule" || activeTab === "exams") {
    renderExamCountdownBanner();
  }
}, 10000);

function openAddExamModal() {
  document.getElementById("exam-modal-title").innerText = "Add Upcoming Exam / Test";
  document.getElementById("exam-form-id").value = "";
  document.getElementById("exam-form-course").value = "MATH1007 Applied Mathematics I";
  document.getElementById("exam-form-type").value = "Midterm";
  document.getElementById("exam-form-weight").value = "30";
  document.getElementById("exam-form-date").value = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
  document.getElementById("exam-form-time").value = "09:00";
  document.getElementById("exam-form-hall").value = "Block 59, Room 2-005";
  document.getElementById("exam-form-topics").value = "Limits & Continuity, Differential Calculus, Integration";

  document.getElementById("exam-modal").classList.add("open");
  document.getElementById("exam-form-course").focus();
}

function openEditExamModal(id) {
  const ex = state.exams.find(e => e.id === id);
  if (!ex) return;

  document.getElementById("exam-modal-title").innerText = "Edit Exam";
  document.getElementById("exam-form-id").value = ex.id;
  document.getElementById("exam-form-course").value = ex.course;
  document.getElementById("exam-form-type").value = ex.examType;
  document.getElementById("exam-form-weight").value = ex.weight || "30";
  document.getElementById("exam-form-date").value = ex.date;
  document.getElementById("exam-form-time").value = ex.time || "09:00";
  document.getElementById("exam-form-hall").value = ex.hall || "";
  document.getElementById("exam-form-topics").value = (ex.topics || []).map(t => t.name).join(', ');

  document.getElementById("exam-modal").classList.add("open");
}

function closeExamModal() {
  document.getElementById("exam-modal").classList.remove("open");
}

function saveExamForm() {
  const id = document.getElementById("exam-form-id").value;
  const course = document.getElementById("exam-form-course").value.trim();
  const examType = document.getElementById("exam-form-type").value;
  const weight = parseInt(document.getElementById("exam-form-weight").value, 10) || 30;
  const date = document.getElementById("exam-form-date").value;
  const time = document.getElementById("exam-form-time").value || "09:00";
  const hall = document.getElementById("exam-form-hall").value.trim();
  const topicsRaw = document.getElementById("exam-form-topics").value.trim();

  if (!course || !date) {
    showToast("Please provide Course and Exam date.", "warning");
    return;
  }

  const topics = topicsRaw.split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => ({ name: t, revised: false }));

  if (id) {
    const idx = state.exams.findIndex(e => e.id === id);
    if (idx !== -1) {
      state.exams[idx] = {
        ...state.exams[idx],
        course, examType, weight, date, time, hall,
        topics: topics.length > 0 ? topics : state.exams[idx].topics
      };
      showToast("Exam milestone updated!", "success");
    }
  } else {
    state.exams.push({
      id: "exam-" + Date.now(),
      course, examType, weight, date, time, hall, topics
    });
    showToast("New exam scheduled & countdown started!", "success");
  }

  saveState();
  closeExamModal();
  renderExams();
  renderCalendar();
}

function deleteExam(id) {
  if (!confirm("Delete this exam milestone?")) return;
  state.exams = state.exams.filter(e => e.id !== id);
  saveState();
  renderExams();
  renderCalendar();
  showToast("Exam removed.", "info");
}

// -------------------------------------------------------------
// 30-DAY EXECUTION CALENDAR & MISSED TASKS AUDIT
// -------------------------------------------------------------

function renderCalendar() {
  renderMiniCalendar();
  renderFullCalendar();
}

function renderMiniCalendar() {
  const grid = document.getElementById("mini-month-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const now = new Date();
  const daysInMonth = 30;
  const todayDate = now.getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "cal-day";
    dayDiv.innerText = i;

    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const record = state.monthHistory[dateStr];

    if (i === todayDate) dayDiv.classList.add("today");

    if (record) {
      if (record.percent === 100) dayDiv.classList.add("perfect");
      else if (record.frozen) dayDiv.classList.add("frozen");
      else if (record.percent > 0) dayDiv.classList.add("partial");
    }

    grid.appendChild(dayDiv);
  }
}

function renderFullCalendar() {
  const grid = document.getElementById("full-month-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const now = new Date();
  const todayDate = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Blank padding days
  for (let b = 0; b < firstDayIndex; b++) {
    const blank = document.createElement("div");
    blank.style.opacity = "0.2";
    grid.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const record = state.monthHistory[dateStr];
    const isPast = d < todayDate;
    const isToday = d === todayDate;

    // Check for assignments or exams on this date
    const hasAssignments = state.assignments.some(a => a.dueDate === dateStr);
    const hasExams = state.exams.some(e => e.date === dateStr);

    const dayDiv = document.createElement("div");
    dayDiv.className = "cal-day";
    dayDiv.onclick = () => inspectDayDetails(dateStr, d);

    if (isToday) dayDiv.classList.add("today");

    let statusHtml = `<span>${d}</span>`;

    if (record) {
      if (record.percent === 100) dayDiv.classList.add("perfect");
      else if (record.frozen) dayDiv.classList.add("frozen");
      else if (record.percent > 0) dayDiv.classList.add("partial");
    } else if (isPast) {
      // Past day with no record / missed tasks
      dayDiv.classList.add("missed");
    }

    // Dots for assignments / exams
    let dotsHtml = "";
    if (hasAssignments || hasExams) {
      dotsHtml = `
        <div class="cal-dot-container">
          ${hasAssignments ? `<div class="cal-dot assignment" title="Assignment Due"></div>` : ''}
          ${hasExams ? `<div class="cal-dot exam" title="Exam Date"></div>` : ''}
        </div>
      `;
    }

    dayDiv.innerHTML = statusHtml + dotsHtml;
    grid.appendChild(dayDiv);
  }
}

function inspectDayDetails(dateStr, dayNum) {
  const panel = document.getElementById("day-detail-panel");
  const title = document.getElementById("day-detail-title");
  const badge = document.getElementById("day-detail-badge");
  const list = document.getElementById("day-detail-tasks");
  if (!panel || !list) return;

  panel.style.display = "block";
  const targetDate = new Date(`${dateStr}T12:00:00`);
  const dayName = getDayName(targetDate);
  const tasks = state.schedules[dayName] || [];
  const record = state.monthHistory[dateStr];

  title.innerText = `Audit: ${dayName}, ${dateStr}`;

  if (record && record.percent === 100) {
    badge.className = "badge badge-lime";
    badge.innerText = "100% Perfect Completion";
  } else if (record && record.frozen) {
    badge.className = "badge badge-pink";
    badge.innerText = "Streak Freeze Used";
  } else if (targetDate > new Date()) {
    badge.className = "badge badge-caramel";
    badge.innerText = "Upcoming Schedule";
  } else {
    badge.className = "badge badge-red";
    badge.innerText = "Audit: Missed / Incomplete Tasks";
  }

  // Find assignments & exams on this date
  const dayAssignments = state.assignments.filter(a => a.dueDate === dateStr);
  const dayExams = state.exams.filter(e => e.date === dateStr);

  let html = "";

  if (dayExams.length > 0) {
    html += `<div style="font-weight:700; color:var(--accent-red); margin-bottom:4px;">🎯 Exams On This Date:</div>`;
    dayExams.forEach(e => {
      html += `<div class="task-item" style="border-color:var(--accent-red);"><strong style="color:#fff;">${e.course} (${e.examType})</strong> at ${e.time || '09:00'} - ${e.hall || 'AASTU'}</div>`;
    });
  }

  if (dayAssignments.length > 0) {
    html += `<div style="font-weight:700; color:var(--accent-orange); margin: 8px 0 4px;">📝 Assignments Due:</div>`;
    dayAssignments.forEach(a => {
      html += `<div class="task-item" style="border-color:var(--accent-orange);"><strong style="color:#fff;">${a.course}: ${a.title}</strong> - Status: ${a.completed ? '✅ Done' : '⚠️ Pending'}</div>`;
    });
  }

  html += `<div style="font-weight:700; color:var(--text-bright); margin: 10px 0 4px;">Scheduled Tasks (${dayName}):</div>`;

  tasks.forEach(t => {
    const key = `${dateStr}-${dayName}-${t.id}`;
    const done = !!state.completedTasks[key];
    html += `
      <div class="task-item ${done ? 'completed' : ''}">
        <div class="task-left">
          <span style="font-size:1.1rem;">${done ? '✅' : '❌'}</span>
          <div>
            <div class="task-title ${done ? 'done' : ''}">${escapeHtml(t.title)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${t.time} (${t.category})</div>
          </div>
        </div>
        <span class="badge ${done ? 'badge-lime' : 'badge-red'}">${done ? 'Completed' : 'Missed'}</span>
      </div>
    `;
  });

  list.innerHTML = html;
  panel.scrollIntoView({ behavior: 'smooth' });
}

function useStreakFreeze() {
  if (state.freezesUsed >= 3) {
    showToast("Maximum 3 streak freezes allowed per month!", "error");
    return;
  }
  const todayKey = getTodayKey();
  state.freezesUsed++;
  if (!state.monthHistory[todayKey]) state.monthHistory[todayKey] = {};
  state.monthHistory[todayKey].frozen = true;
  saveState();
  renderCalendar();
  showToast("Streak Freeze Activated! Your streak is protected for today.", "success");
}

// -------------------------------------------------------------
// CALENDAR INTEGRATION & EXPORT (.ICS & GOOGLE CALENDAR)
// -------------------------------------------------------------

function generateGoogleCalendarUrl(title, description, location, timeRange, specificDate) {
  // Format dates for Google Calendar render link
  const targetDate = specificDate ? new Date(specificDate) : new Date();
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');

  let startTime = "080000";
  let endTime = "090000";

  if (timeRange && timeRange.includes("-")) {
    const parts = timeRange.split("-").map(p => p.trim());
    if (parts[0]) startTime = parts[0].replace(":", "") + "00";
    if (parts[1]) endTime = parts[1].replace(":", "") + "00";
  }

  const dtStart = `${y}${m}${d}T${startTime}`;
  const dtEnd = `${y}${m}${d}T${endTime}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dtStart}/${dtEnd}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
}

function openCalendarSyncModal() {
  document.getElementById("calendar-sync-modal").classList.add("open");
}

function closeCalendarSyncModal() {
  document.getElementById("calendar-sync-modal").classList.remove("open");
}

// Generates RFC 5545 iCalendar format file
function generateICalendarData(includeClasses = true, includeAssignments = true, includeExams = true) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AASTU OS//Academic OS Tracker 4.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:AASTU Section 12 Schedule & Deadlines"
  ];

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const nowStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const dayToRRule = {
    Sun: "SU", Mon: "MO", Tue: "TU", Wed: "WE", Thu: "TH", Fri: "FR", Sat: "SA"
  };

  // 1. Weekly recurring classes
  if (includeClasses) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    days.forEach((day, dayIndex) => {
      const tasks = state.schedules[day] || [];
      tasks.forEach(t => {
        let startH = "08", startM = "30", endH = "10", endM = "20";
        if (t.time && t.time.includes("-")) {
          const parts = t.time.split("-").map(p => p.trim());
          if (parts[0]) [startH, startM] = parts[0].split(":");
          if (parts[1]) [endH, endM] = parts[1].split(":");
        }

        // Anchor date for next occurrence of this day of week
        const anchor = new Date();
        const currentDayIndex = anchor.getDay();
        const targetDayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
        const diff = (targetDayIdx - currentDayIndex + 7) % 7;
        anchor.setDate(anchor.getDate() + diff);

        const dtStart = `${anchor.getFullYear()}${pad(anchor.getMonth() + 1)}${pad(anchor.getDate())}T${startH}${startM}00`;
        const dtEnd = `${anchor.getFullYear()}${pad(anchor.getMonth() + 1)}${pad(anchor.getDate())}T${endH}${endM}00`;

        lines.push(
          "BEGIN:VEVENT",
          `UID:class-${t.id}-${day}@aastu.edu`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART:${dtStart}`,
          `DTEND:${dtEnd}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${dayToRRule[day]}`,
          `SUMMARY:[AASTU] ${t.title}`,
          `DESCRIPTION:Section 12 ${t.category} session. Room: ${t.location || 'AASTU Campus'}`,
          `LOCATION:${t.location || 'AASTU Campus'}`,
          "BEGIN:VALARM",
          "TRIGGER:-PT15M",
          "ACTION:DISPLAY",
          `DESCRIPTION:Reminder: ${t.title} starts in 15 minutes!`,
          "END:VALARM",
          "END:VEVENT"
        );
      });
    });
  }

  // 2. Class Assignments
  if (includeAssignments) {
    state.assignments.forEach(asg => {
      const [dueH, dueM] = (asg.dueTime || "23:59").split(":");
      const cleanDate = asg.dueDate.replace(/-/g, '');
      const dtStart = `${cleanDate}T${dueH}${dueM}00`;

      lines.push(
        "BEGIN:VEVENT",
        `UID:${asg.id}@aastu.edu`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtStart}`,
        `SUMMARY:[Due] ${asg.course}: ${asg.title}`,
        `DESCRIPTION:Assignment deadline. Priority: ${asg.priority}. ${asg.desc || ''}`,
        "LOCATION:AASTU Portal Submission",
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        `DESCRIPTION:Assignment due tomorrow: ${asg.title}`,
        "END:VALARM",
        "BEGIN:VALARM",
        "TRIGGER:-PT2H",
        "ACTION:DISPLAY",
        `DESCRIPTION:Assignment due in 2 hours: ${asg.title}`,
        "END:VALARM",
        "END:VEVENT"
      );
    });
  }

  // 3. Exams
  if (includeExams) {
    state.exams.forEach(ex => {
      const [exH, exM] = (ex.time || "09:00").split(":");
      const cleanDate = ex.date.replace(/-/g, '');
      const dtStart = `${cleanDate}T${exH}${exM}00`;
      const endH = String(Number(exH) + 3).padStart(2, '0');
      const dtEnd = `${cleanDate}T${endH}${exM}00`;

      lines.push(
        "BEGIN:VEVENT",
        `UID:${ex.id}@aastu.edu`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:[EXAM] ${ex.course} (${ex.examType})`,
        `DESCRIPTION:Exam Hall: ${ex.hall}. Weight: ${ex.weight}%. Topics: ${(ex.topics || []).map(t => t.name).join(', ')}`,
        `LOCATION:${ex.hall || 'AASTU Campus'}`,
        "BEGIN:VALARM",
        "TRIGGER:-P2D",
        "ACTION:DISPLAY",
        `DESCRIPTION:Exam in 48 hours: ${ex.course} ${ex.examType}`,
        "END:VALARM",
        "END:VEVENT"
      );
    });
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function triggerDownload(filename, textData, mimeType = "text/calendar;charset=utf-8") {
  const blob = new Blob([textData], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportMasterICalendar() {
  const ics = generateICalendarData(true, true, true);
  triggerDownload("AASTU-Master-Schedule.ics", ics);
  showToast("Master .ics calendar exported!", "success");
}

function exportWeeklyClassesICalendar() {
  const ics = generateICalendarData(true, false, false);
  triggerDownload("AASTU-Weekly-Classes.ics", ics);
  showToast("Weekly classes .ics exported!", "success");
}

function exportAssignmentsExamsICalendar() {
  const ics = generateICalendarData(false, true, true);
  triggerDownload("AASTU-Assignments-Exams.ics", ics);
  showToast("Assignments & Exams .ics exported!", "success");
}

// -------------------------------------------------------------
// LOCAL DATA PERSISTENCE & BACKUP/RESTORE
// -------------------------------------------------------------

function exportStateToJSON() {
  const data = JSON.stringify(state, null, 2);
  triggerDownload(`aastu-os-backup-${getTodayKey()}.json`, data, "application/json");
  showToast("JSON backup saved locally!", "success");
}

function importStateFromJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.schedules) {
        showToast("Invalid backup JSON format.", "error");
        return;
      }
      state = imported;
      saveState();
      init();
      showToast("Data restored successfully!", "success");
    } catch (err) {
      showToast("Failed to parse JSON file.", "error");
    }
  };
  reader.readAsText(file);
}

function resetToDefaultSchedules() {
  if (!confirm("Reset all routines to default Section 12 schedule? (Assignments will be preserved)")) return;
  state.schedules = JSON.parse(JSON.stringify(defaultSchedules));
  saveState();
  renderTasks();
  showToast("Schedule reset to default Section 12.", "info");
}

// -------------------------------------------------------------
// NOTIFICATION DRAWER & TOASTS
// -------------------------------------------------------------

function toggleNotificationDrawer() {
  const drawer = document.getElementById("notif-drawer");
  if (!drawer) return;
  drawer.classList.toggle("open");
}

function renderNotificationDrawer() {
  const list = document.getElementById("notif-list");
  const badge = document.getElementById("notif-badge");
  if (!list) return;

  const count = state.notificationsLog.length;
  if (badge) {
    if (count > 0) {
      badge.style.display = "flex";
      badge.innerText = count;
    } else {
      badge.style.display = "none";
    }
  }

  if (count === 0) {
    list.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:10px;">No notifications yet</div>`;
    return;
  }

  list.innerHTML = state.notificationsLog.map(n => `
    <div class="notif-item">
      <div class="notif-item-title">${escapeHtml(n.title)}</div>
      <div style="color:var(--text-main); margin-top:2px;">${escapeHtml(n.body)}</div>
      <div class="notif-item-time">${n.timestamp}</div>
    </div>
  `).join('');
}

function clearNotificationLog() {
  state.notificationsLog = [];
  saveState();
  renderNotificationDrawer();
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }, 3500);
}

// -------------------------------------------------------------
// UI REFRESH HELPER & CONFETTI
// -------------------------------------------------------------

function updateUI() {
  document.getElementById("streak-classes").innerText = state.streaks.classes || 0;
  document.getElementById("streak-running").innerText = state.streaks.running || 0;
  document.getElementById("streak-music").innerText = state.streaks.music || 0;
  document.getElementById("streak-journal").innerText = state.streaks.journal || 0;
  document.getElementById("streak-assignments").innerText = state.streaks.assignments || 0;
  document.getElementById("streak-perfect").innerText = state.streaks.perfect || 0;

  const freezeCounter = document.getElementById("freeze-counter");
  const freezeBtn = document.getElementById("freeze-btn");
  if (freezeCounter) freezeCounter.innerText = `${state.freezesUsed} / 3 Used`;
  if (freezeBtn) freezeBtn.disabled = state.freezesUsed >= 3;
}

// Lightweight Pure Vanilla JS Particle Confetti (0 Dependencies)
function triggerConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#ccff00", "#b8ff00", "#e09448", "#f3b77a", "#ffadc6", "#f472b6", "#ffe0e9"];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width * 0.5,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      dr: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  let animationFrame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravity
      p.rotation += p.dr;
      p.opacity -= 0.012;

      if (p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      }
    });

    if (alive) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  animate();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// -------------------------------------------------------------
// STANDALONE SINGLE-FILE EXPORT & GITHUB PAGES BUNDLER
// -------------------------------------------------------------

async function exportStandaloneHTML() {
  showToast("Compiling standalone single-file HTML...", "info");
  try {
    const [cssRes, jsRes] = await Promise.all([
      fetch('/style.css').then(r => r.text()).catch(() => ""),
      fetch('/script.js').then(r => r.text()).catch(() => "")
    ]);

    // Clone the current DOM
    let htmlContent = document.documentElement.outerHTML;

    // Replace external stylesheet link with inline <style>
    if (cssRes) {
      htmlContent = htmlContent.replace(
        /<link\s+rel=["']stylesheet["']\s+href=["']\/style\.css["']\s*\/?>/i,
        `<style>\n${cssRes}\n</style>`
      );
    }

    // Replace external script tag with inline <script>
    if (jsRes) {
      htmlContent = htmlContent.replace(
        /<script\s+src=["']\/script\.js["']><\/script>/i,
        `<script>\n${jsRes}\n<\/script>`
      );
    }

    const fullDoc = `<!DOCTYPE html>\n${htmlContent}`;
    triggerDownload("aastu-os-standalone.html", fullDoc, "text/html;charset=utf-8");
    showToast("🎉 All-in-One Standalone HTML exported!", "success");
  } catch (err) {
    console.error("Export standalone error:", err);
    showToast("Export failed. You can directly copy index.html, style.css, script.js, and sw.js.", "error");
  }
}

function exportAllCodeFilesInfo() {
  alert(
    "📁 GitHub Pages Deployment Guide:\n\n" +
    "1. Create a repository on GitHub (e.g. 'aastu-tracker').\n" +
    "2. Upload these files to the root of your repository:\n" +
    "   - index.html\n" +
    "   - style.css\n" +
    "   - script.js\n" +
    "   - sw.js\n" +
    "   - manifest.json\n\n" +
    "3. Go to Repository Settings > Pages > Select 'main' branch and '/' folder > Click Save.\n\n" +
    "4. Your academic tracker is live at: https://<username>.github.io/<repo>/\n" +
    "Zero compilation, zero backend, 100% offline & persistent with localStorage!"
  );
}

// Close modals when clicking outside
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
  }
  const drawer = document.getElementById("notif-drawer");
  const bell = document.getElementById("notif-bell-btn");
  if (drawer && drawer.classList.contains("open") && !drawer.contains(e.target) && !bell.contains(e.target)) {
    drawer.classList.remove("open");
  }
});

// Run on window load
window.onload = init;
