# Implementation Plan: College Life OS — Controlled Balance & Finance Upgrade

## 1. System Audit & Baseline Architecture

### A. Current Persistence Architecture
- **Primary Data Store**: Client-side **Dexie.js (IndexedDB)** database named `CollegeLifeOSDB` (version 1) initialized in `src/db/db.ts`.
- **Entities & Tables**:
  - `courses`, `classSessions`, `classExceptions`, `attendance`, `gradeComponents`: Academic timetable and grading.
  - `tasks`, `exams`, `examTopics`: Assignment tickets and syllabus boss battles.
  - `projects`, `projectMilestones`, `projectTasks`, `projectMembers`, `projectMeetings`: Coursework projects.
  - `habits`, `habitLogs`: Passport stamp habit tracker.
  - `journalEntries`: Daily reflections and mood scores.
  - `transactions`, `budgets`, `savingsGoals`: Financial ledger, spending limits, and goal vaults.
  - `settings`: Single-record table (`id: 'current_user'`) containing `AppSettings`.
  - `xpEvents`, `achievementsUnlocked`, `quests`: RPG leveling engine.
- **Secondary Storage**: `localStorage` stores current route (`college_os_route`), active theme (`college_os_theme`), and legacy checklist states.
- **Offline & PWA Mechanism**:
  - PWA configured via `public/manifest.json` (`id: "./"`, `start_url: "./"`, `scope: "./"`) and `public/sw.js` (cache name `aastu-os-pwa-v2`).
  - Service worker caches core app shell and assets via `stale-while-revalidate` and handles offline navigation fallback to `./index.html`.
  - Offline changes are committed directly into IndexedDB on the device, requiring zero network calls.

### B. Shared Components & Data Interactions
- **`src/components/common/QuickAddModal.tsx`**: Universal "+" modal opened from the header and bottom nav. Shared across tasks, habits, focus, notes, and money.
- **`src/services/rpgService.ts`**: Awards XP for completing tasks, logging expenses (+5 XP), and stashing savings (+15 XP).
- **`src/pages/LobbyPage.tsx`**: Renders live treasury preview using `db.transactions` and `db.savingsGoals`.
- **`src/pages/FinancePage.tsx`**: Full finance dashboard with chart visualizations (7/14/30 days), savings goal vaults, and transaction ledger.

### C. Existing Transaction & Balance Mechanics
- `Transaction` interface in `src/types/index.ts` already defines:
  - `type: 'expense' | 'income' | 'saving'`
  - `account: 'cash' | 'bank' | 'mobile_money'`
  - `amount: number`, `date: string`, `notes?: string`, `savingsGoalId?: string`.
- **Current Limitation**: 
  - `FinancePage.tsx` currently only calculates total expenses per account (`accountTotals = { mobile_money: ..., bank: ..., cash: ... }`).
  - There is currently no UI to log an **Income / Deposit** transaction (only Expense and Savings).
  - There are no configurable starting balances for Cash, Telebirr, or CBE Bank, meaning the app could not display true live running account balances.
  - There is no low-balance alert system when funds drop below safe limits.

### D. Risks to Existing User Data & Mobile App
- **IndexedDB Protection**: Any schema change must NOT delete or bump tables destructively. We must keep `CollegeLifeOSDB` backward-compatible.
- **Zero Data Loss Guarantee**: Starting balances will be stored as optional fields on the existing `settings` table (`id: 'current_user'`) or defaults in memory so existing user profiles load seamlessly without database resets.
- **PWA Integrity**: All changes remain 100% static React and TypeScript; no external servers, backend routes, or breaking assets will be introduced.

---

## 2. Architectural Design & Visual Specification

```
┌────────────────────────────────────────────────────────────────────────┐
│                   COLLEGE LIFE OS — CAMPUS TREASURY                    │
├────────────────────────────────────────────────────────────────────────┤
│ [Total Net Worth: 4,850 ETB]  [+ Quick Deposit]  [⚙ Adjust Balances]   │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 💵 PHYSICAL CASH  │ 📱 TELEBIRR       │ 🏛️ CBE BANK                    │
│   650.00 ETB      │   1,420.00 ETB    │   2,780.00 ETB                 │
│   Base: 500 ETB   │   Base: 1,200 ETB │   Base: 2,500 ETB              │
│   ● Healthy       │   ● Healthy       │   ● Healthy                    │
└───────────────────┴───────────────────┴────────────────────────────────┘
  ▲ Optional Warning Banner when any account drops below Low-Balance Threshold
```

### Aesthetic & UX Requirements (Grand Budapest Storybook Constitution)
- **Palette & Typography**:
  - Josefin Sans heading titles, Cormorant Garamond editorial figures, Nunito Sans metadata.
  - Perforated ticket borders (`ticket-border`), warm parchment backgrounds, luggage-tag aesthetics.
  - Telebirr accent: `#4FA3A5` / `#8EC5E8`, CBE Bank accent: `#BBA6E0` / `#7A2E4A`, Cash accent: `#E5C04B` / `#B6E63E`.
- **Zero-Pill Metadata**: Account status shown with unboxed typographic indicators and subtle dot separators.
- **Usability**: Tappable account cards with instant "Deposit / Log Income" and "Log Expense" quick actions.

---

## 3. Independently Testable Implementation Chunks

### Chunk 1: Type Definition & Safe Storage Extension
- **Objective**: Extend `AppSettings` in `src/types/index.ts` with backward-compatible account balance configuration without altering existing table schemas.
- **Files Affected**:
  - `src/types/index.ts`
  - `src/db/starterPack.ts`
- **Details**:
  - Add optional `accountBalances` to `AppSettings`:
    ```typescript
    export interface AccountBalancesConfig {
      initialCash: number;
      initialBank: number; // Commercial Bank of Ethiopia (CBE)
      initialMobileMoney: number; // Telebirr
      lowBalanceThreshold: number; // Default: 150 ETB
    }
    ```
  - Ensure existing profiles default gracefully to `initialCash: 500`, `initialBank: 2500`, `initialMobileMoney: 1200`, `lowBalanceThreshold: 150` if undefined.
- **Verification**: `npm run lint` (`tsc --noEmit`).

---

### Chunk 2: Core Balance Engine & Income Logging in `FinancePage.tsx`
- **Objective**: Implement exact running balance mathematical engine and add the "Log Income / Deposit" modal.
- **Files Affected**:
  - `src/pages/FinancePage.tsx`
- **Details**:
  - Mathematical model for live running balances:
    $$\text{Balance}_{\text{account}} = \text{Initial}_{\text{account}} + \sum \text{Income}_{\text{account}} - \sum \text{Expense}_{\text{account}} - \sum \text{SavingsDeposit}_{\text{account}}$$
  - Add Quick Income/Deposit modal with income categories: `Monthly Allowance / Family`, `Part-time / Tutoring`, `Freelance / Tech`, `Scholarship / Stipend`, `Gift / Refund`, `Other`.
  - Award +10 XP for logging income/deposits (source: `income`, stat: `discipline`).
  - Update Transaction Ledger table to display Income transactions in emerald green with positive indicator (`+`), clean tags, and delete capability.
- **Verification**: Verify logging income increases account balance live, and deleting an income transaction reverts the balance.

---

### Chunk 3: Balance Overview Banner & Low-Balance Alert Banner
- **Objective**: Introduce Grand Budapest-themed account cards at the top of Finance Page with starting balance adjustments and threshold warnings.
- **Files Affected**:
  - `src/pages/FinancePage.tsx`
- **Details**:
  - **Account Overview Grid**:
    - **Total Net Worth** card summarizing sum of all accounts and savings vault.
    - **Physical Cash** card with running balance, income/expense tally, and base.
    - **Telebirr** card with mobile money branding and live balance.
    - **CBE Bank** card with commercial bank tally and live balance.
  - **Low-Balance Alert Banner**:
    - Automatically displays an alert when any account falls below the user's `lowBalanceThreshold`.
  - **Starting Balance Adjustment Modal**:
    - Allows the user to calibrate their real-world starting balance for Cash, Telebirr, and CBE, and set their custom low-balance alert threshold anytime without wiping transactions.
- **Verification**: Changing starting balance in modal immediately reflects in account balances. Setting threshold above current balance triggers warning banner.

---

### Chunk 4: QuickAddModal Integration & Final Verification
- **Objective**: Enable logging Income/Deposits from the universal "+" quick modal and run full build checks.
- **Files Affected**:
  - `src/components/common/QuickAddModal.tsx`
- **Details**:
  - Update the "Money" tab in `QuickAddModal.tsx` to include three segments: `Expense`, `Save`, and `Deposit / Income`.
  - When `Deposit / Income` is selected, render account selector (`Telebirr`, `CBE Bank`, `Cash`), amount input, and category selector.
- **Verification**:
  - Run `compile_applet` and `npm run lint`.
  - Verify build produces zero errors.
  - Test offline readiness via service worker cache.

---

## 4. Suggested Git Commit Plan
- **Chunk 1**: `feat(finance): add backward-compatible account balance types and config`
- **Chunk 2**: `feat(finance): implement live running balances and income deposit logging`
- **Chunk 3**: `feat(finance): add Grand Budapest balance overview banner and low-balance alerts`
- **Chunk 4**: `feat(quick-add): add income deposit tab to universal quick modal`
