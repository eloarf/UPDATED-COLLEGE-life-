# College Life OS 🎓⚡

> Single-user, offline-first, mobile-friendly university life operating system designed with Grand-Budapest-inspired storybook elegance, forgiving RPG progression, and zero-backend static hosting.

---

## 🚀 How to Enable GitHub Pages (Step-by-Step)

1. **Push this repository to GitHub**:
   ```bash
   git add .
   git commit -m "feat: College Life OS release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Open your repository on GitHub in your web browser.
3. Click on the **Settings** tab at the top.
4. On the left sidebar under *Code and automation*, click **Pages**.
5. Under **Build and deployment > Source**, select:
   👉 **GitHub Actions** (do NOT select "Deploy from a branch").
6. The `.github/workflows/deploy.yml` workflow will automatically run on every push to `main` and deploy your static app to:
   `https://<your-username>.github.io/<repo-name>/`

---

## 📱 Testing on Android Chrome & PC

- **PC**: Open the deployed URL in Google Chrome, Edge, or Firefox.
- **Android Phone**: Open the URL in Chrome. Tap the three-dot menu `⋮` and select **Add to Home screen** / **Install app**. The app launches full-screen like a native Android APK and works 100% offline.

---

## 🏰 Feature Tour

1. **Lobby (`#/`)**: Concierge desk with Ethiopic and Gregorian dates, level progress, "Next Class" ticket countdown, today's top priorities, daily quest rewards, and Low-Energy Mode toggle.
2. **Timetable (`#/timetable`)**: Mon–Sun schedule with conflict/clash detection, room locations, and LZ-string timetable share codes to copy-paste between classmates.
3. **Courses (`#/courses`)**: Luggage-tag course cards with immutable color inheritance across tasks and exams.
4. **Quests (`#/tasks`)**: Assignment tickets with forgiving "rolled over" reframing (never red failure alarms), subtasks, and XP rewards.
5. **Exams (`#/exams`)**: University Boss Battles with draining HP gauges tied to your syllabus topic checklist.
6. **Projects (`#/projects`)**: Dungeon floor milestones, touch-safe Kanban pipeline, and a "Copy Update" button formatted for Telegram/WhatsApp groups.
7. **Focus (`#/focus`)**: Timestamp-based countdown dial with Screen Wake Lock that survives phone screen lock and tab switches.
8. **Habits (`#/habits`)**: Passport-stamp consistency tracker with 2 weekly rest tokens and partial-win minimum versions.
9. **Journal (`#/journal`)**: Lined paper aesthetics, rotating prompts, mood telemetry, and word count XP rewards.
10. **Master Week (`#/week`)**: Non-class routine blocks with Dorm (phone-first) vs. Home (PC power) day modes.
11. **Calendar (`#/calendar`)**: Integrated 30-day matrix with Ethiopic calendar conversion and agenda filters.
12. **Grades & GPA (`#/grades`)**: Transcript audit, target CGPA gauge (default 3.85), and "What do I need on the Final?" sandbox calculator.
13. **Wallet (`#/wallet`)**: Perforated receipt ledger with ETB currency, Cash/Telebirr/CBE accounts, and expense logging (+5 XP).
14. **Studio (`#/studio`)**: 8-stage creative music and writing release pipelines with a "Finish-First" spotlight.
15. **Library (`#/library`)**: Morning curiosity topic brief and 40-book yearly reading goal ring.
16. **Hero Sheet (`#/hero`)**: Character ranks from Lobby Initiate to Legend of the House, 5 core attributes, and 15+ achievement badges.
17. **Rituals (`#/rituals`)**: Sunday Weekly Review (+60 XP) and Post-Exam Monthly Reset Day (+150 XP).
18. **Themes (`#/themes`)**: 6 preloaded storybook palettes (Pink Lobby, Matcha Cream, Blush & Cocoa, Chocolate Lime, Midnight Plum, Burgundy Velvet).
19. **Settings (`#/settings`)**: Student profile, Starter Pack loader, local storage persist check, and one-tap JSON backup/restore.
