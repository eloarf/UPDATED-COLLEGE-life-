import { JournalEntry } from '../types';
import { getTodayKey, addDaysToKey, parseDayKey } from './dateUtils';

export type PromptCategory =
  | 'all'
  | 'reflection'
  | 'gratitude'
  | 'university'
  | 'creativity'
  | 'relationships'
  | 'ambitions'
  | 'difficult_days';

export interface PromptItem {
  id: string;
  category: PromptCategory;
  categoryLabel: string;
  prompt: string;
}

export const CATEGORIZED_PROMPTS: PromptItem[] = [
  // 1. Self-Reflection
  {
    id: 'ref-1',
    category: 'reflection',
    categoryLabel: 'Self-Reflection',
    prompt: 'What was your dominant emotion today, and what triggered it?',
  },
  {
    id: 'ref-2',
    category: 'reflection',
    categoryLabel: 'Self-Reflection',
    prompt: 'Where did you act with clear personal integrity today?',
  },
  {
    id: 'ref-3',
    category: 'reflection',
    categoryLabel: 'Self-Reflection',
    prompt: 'What is something you assumed earlier this week that turned out to be false?',
  },

  // 2. Gratitude
  {
    id: 'grat-1',
    category: 'gratitude',
    categoryLabel: 'Gratitude',
    prompt: 'Name three subtle comforts or privileges that supported you today.',
  },
  {
    id: 'grat-2',
    category: 'gratitude',
    categoryLabel: 'Gratitude',
    prompt: 'Who did something kind or reliable for you recently that you haven’t acknowledged?',
  },
  {
    id: 'grat-3',
    category: 'gratitude',
    categoryLabel: 'Gratitude',
    prompt: 'What physical sensation (warm tea, morning sunlight, walking air) felt grounding today?',
  },

  // 3. University Life
  {
    id: 'uni-1',
    category: 'university',
    categoryLabel: 'University Life',
    prompt: 'What single lecture, problem set, or concept genuinely piqued your intellectual interest today?',
  },
  {
    id: 'uni-2',
    category: 'university',
    categoryLabel: 'University Life',
    prompt: 'How did your campus schedule feel today—frantic, deliberate, or restful?',
  },
  {
    id: 'uni-3',
    category: 'university',
    categoryLabel: 'University Life',
    prompt: 'What academic challenge is currently testing your patience, and how can you simplify it?',
  },

  // 4. Creativity & Flow
  {
    id: 'cre-1',
    category: 'creativity',
    categoryLabel: 'Creativity & Flow',
    prompt: 'If you had two completely unstructured hours tonight, what would you make or explore?',
  },
  {
    id: 'cre-2',
    category: 'creativity',
    categoryLabel: 'Creativity & Flow',
    prompt: 'What piece of music, art, writing, or code caught your attention recently and why?',
  },

  // 5. Relationships & Community
  {
    id: 'rel-1',
    category: 'relationships',
    categoryLabel: 'Relationships',
    prompt: 'What was the most meaningful or honest conversation you had today?',
  },
  {
    id: 'rel-2',
    category: 'relationships',
    categoryLabel: 'Relationships',
    prompt: 'Is there a classmate, friend, or mentor you want to connect with this week?',
  },

  // 6. Future Ambitions
  {
    id: 'amb-1',
    category: 'ambitions',
    categoryLabel: 'Future Ambitions',
    prompt: 'Imagine yourself one year after graduation: what daily habits from today made that version possible?',
  },
  {
    id: 'amb-2',
    category: 'ambitions',
    categoryLabel: 'Future Ambitions',
    prompt: 'What bold project or skill are you quietly curious about pursuing next term?',
  },

  // 7. Difficult Days & Resilience
  {
    id: 'dif-1',
    category: 'difficult_days',
    categoryLabel: 'Difficult Days',
    prompt: 'What drained your energy today? What is the kindest thing you can do for yourself tonight?',
  },
  {
    id: 'dif-2',
    category: 'difficult_days',
    categoryLabel: 'Difficult Days',
    prompt: 'Even if today felt unproductive or frustrating, what did you still manage to protect?',
  },
  {
    id: 'dif-3',
    category: 'difficult_days',
    categoryLabel: 'Difficult Days',
    prompt: 'What is within your control right now, and what belongs to things you cannot force?',
  },
];

/**
 * Returns a randomized or index-based prompt for a specific category.
 */
export function getPromptForCategory(category: PromptCategory, currentIndex: number = 0): PromptItem {
  const pool = category === 'all'
    ? CATEGORIZED_PROMPTS
    : CATEGORIZED_PROMPTS.filter((p) => p.category === category);

  if (pool.length === 0) return CATEGORIZED_PROMPTS[0];
  const safeIdx = Math.abs(currentIndex) % pool.length;
  return pool[safeIdx];
}

/**
 * Safe, lightweight client-side Markdown formatter.
 * Escapes raw HTML entities to prevent XSS, then converts headings, bold, italics,
 * blockquotes, lists, checklists, and code.
 */
export function formatLightweightMarkdown(rawText: string): string {
  if (!rawText) return '';

  // 1. Escape HTML special characters
  let text = rawText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Split into lines for block processing
  const lines = text.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headings
    if (/^### (.*$)/.test(line)) {
      line = line.replace(/^### (.*$)/, '<h3 class="text-sm font-heading font-bold mt-3 mb-1 text-[rgb(var(--c-primary))]">$1</h3>');
    } else if (/^## (.*$)/.test(line)) {
      line = line.replace(/^## (.*$)/, '<h2 class="text-base font-heading font-bold mt-4 mb-1 text-[rgb(var(--c-text))]">$1</h2>');
    } else if (/^# (.*$)/.test(line)) {
      line = line.replace(/^# (.*$)/, '<h1 class="text-lg font-heading font-bold mt-4 mb-2 text-[rgb(var(--c-text))] border-b border-[rgb(var(--c-border))]/50 pb-1">$1</h1>');
    }

    // Blockquote
    else if (/^&gt; (.*$)/.test(line)) {
      line = line.replace(
        /^&gt; (.*$)/,
        '<blockquote class="border-l-2 border-[rgb(var(--c-primary))] pl-3 my-1.5 italic text-[rgb(var(--c-muted))]">$1</blockquote>'
      );
    }

    // Checklists: - [ ] or - [x]
    else if (/^- \[([ xX])\] (.*$)/.test(line)) {
      line = line.replace(/^- \[([ xX])\] (.*$)/, (_, check, item) => {
        const isChecked = check.toLowerCase() === 'x';
        return `<div class="flex items-start gap-2 my-1 text-xs">
          <span class="mt-0.5 inline-block w-3.5 h-3.5 rounded-sm border ${isChecked ? 'bg-[rgb(var(--c-primary))] text-white border-[rgb(var(--c-primary))]' : 'border-[rgb(var(--c-border))]'} text-[10px] text-center leading-3">
            ${isChecked ? '✓' : ''}
          </span>
          <span class="${isChecked ? 'line-through opacity-70' : ''}">${item}</span>
        </div>`;
      });
    }

    // Bullet lists: - item or * item
    else if (/^[-*] (.*$)/.test(line)) {
      line = line.replace(/^[-*] (.*$)/, '<li class="ml-4 list-disc text-xs my-0.5">$1</li>');
    }

    // Numbered lists: 1. item
    else if (/^\d+\. (.*$)/.test(line)) {
      line = line.replace(/^\d+\. (.*$)/, '<li class="ml-4 list-decimal text-xs my-0.5">$1</li>');
    }

    // Horizontal divider
    else if (/^---$/.test(line.trim())) {
      line = '<hr class="my-4 border-[rgb(var(--c-border))]/60" />';
    }

    // Empty lines
    else if (line.trim() === '') {
      line = '<div class="h-2"></div>';
    }

    // Regular paragraphs with inline formatting
    else {
      line = `<p class="my-1 text-xs sm:text-sm leading-relaxed">${line}</p>`;
    }

    // Inline formatting: Bold **text**
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[rgb(var(--c-text))]">$1</strong>');

    // Inline formatting: Italic *text* or _text_
    line = line.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    line = line.replace(/_(.*?)_/g, '<em class="italic">$1</em>');

    // Inline code: `code`
    line = line.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-[rgb(var(--c-surface2))] font-mono text-[11px] text-[rgb(var(--c-primary))]">$1</code>');

    processedLines.push(line);
  }

  return processedLines.join('');
}

/**
 * Inserts markdown formatting syntax at current cursor or wraps selection.
 */
export function insertFormattingSyntax(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  type: 'bold' | 'italic' | 'h2' | 'h3' | 'quote' | 'bullet' | 'todo'
): { updatedText: string; newCursorStart: number; newCursorEnd: number } {
  const selected = text.slice(selectionStart, selectionEnd);
  const before = text.slice(0, selectionStart);
  const after = text.slice(selectionEnd);

  let replacement = '';
  let cursorOffsetStart = 0;
  let cursorOffsetEnd = 0;

  switch (type) {
    case 'bold':
      replacement = `**${selected || 'bold text'}**`;
      cursorOffsetStart = selected ? selectionStart + 2 : selectionStart + 2;
      cursorOffsetEnd = selected ? selectionEnd + 2 : selectionStart + 11;
      break;
    case 'italic':
      replacement = `*${selected || 'italic text'}*`;
      cursorOffsetStart = selected ? selectionStart + 1 : selectionStart + 1;
      cursorOffsetEnd = selected ? selectionEnd + 1 : selectionStart + 12;
      break;
    case 'h2':
      replacement = `\n## ${selected || 'Section Heading'}\n`;
      cursorOffsetStart = selectionStart + 4;
      cursorOffsetEnd = selected ? selectionStart + 4 + selected.length : selectionStart + 19;
      break;
    case 'h3':
      replacement = `\n### ${selected || 'Subheading'}\n`;
      cursorOffsetStart = selectionStart + 5;
      cursorOffsetEnd = selected ? selectionStart + 5 + selected.length : selectionStart + 15;
      break;
    case 'quote':
      replacement = `\n> ${selected || 'Insight or memorable line'}\n`;
      cursorOffsetStart = selectionStart + 3;
      cursorOffsetEnd = selected ? selectionStart + 3 + selected.length : selectionStart + 29;
      break;
    case 'bullet':
      replacement = `\n- ${selected || 'Key takeaway'}\n`;
      cursorOffsetStart = selectionStart + 3;
      cursorOffsetEnd = selected ? selectionStart + 3 + selected.length : selectionStart + 15;
      break;
    case 'todo':
      replacement = `\n- [ ] ${selected || 'Action item'}\n`;
      cursorOffsetStart = selectionStart + 7;
      cursorOffsetEnd = selected ? selectionStart + 7 + selected.length : selectionStart + 18;
      break;
  }

  const updatedText = before + replacement + after;
  return { updatedText, newCursorStart: cursorOffsetStart, newCursorEnd: cursorOffsetEnd };
}

export interface JournalStatistics {
  totalEntriesCount: number;
  entriesThisWeekCount: number;
  totalWordsWritten: number;
  averageWordsPerEntry: number;
  activeDaysCount: number;
  activeDaysLast30: number;
  favoriteEntriesCount: number;
  pinnedEntriesCount: number;
  recentEntriesByDate: Record<string, number>; // date -> count
  allTags: string[];
}

/**
 * Calculates honest, guilt-free period summaries and writing telemetry.
 */
export function calculateJournalStats(
  entries: JournalEntry[],
  referenceDate: string = getTodayKey()
): JournalStatistics {
  const activeEntries = entries.filter((e) => !e.deletedAt);
  const totalEntriesCount = activeEntries.length;

  if (totalEntriesCount === 0) {
    return {
      totalEntriesCount: 0,
      entriesThisWeekCount: 0,
      totalWordsWritten: 0,
      averageWordsPerEntry: 0,
      activeDaysCount: 0,
      activeDaysLast30: 0,
      favoriteEntriesCount: 0,
      pinnedEntriesCount: 0,
      recentEntriesByDate: {},
      allTags: [],
    };
  }

  // Calculate this week's start (Monday)
  const refDateObj = parseDayKey(referenceDate);
  const day = refDateObj.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(refDateObj);
  monday.setDate(refDateObj.getDate() + diffToMon);
  const mondayKey = monday.toISOString().slice(0, 10);

  // Thirty days ago key
  const thirtyDaysAgoKey = addDaysToKey(referenceDate, -30);

  let totalWordsWritten = 0;
  let entriesThisWeekCount = 0;
  let favoriteEntriesCount = 0;
  let pinnedEntriesCount = 0;
  const activeDaysSet = new Set<string>();
  const activeDays30Set = new Set<string>();
  const recentEntriesByDate: Record<string, number> = {};
  const tagsSet = new Set<string>();

  for (const entry of activeEntries) {
    const words = entry.wordCount || (entry.content ? entry.content.trim().split(/\s+/).length : 0);
    totalWordsWritten += words;

    if (entry.date >= mondayKey && entry.date <= referenceDate) {
      entriesThisWeekCount++;
    }

    if (entry.date >= thirtyDaysAgoKey && entry.date <= referenceDate) {
      activeDays30Set.add(entry.date);
    }

    activeDaysSet.add(entry.date);

    recentEntriesByDate[entry.date] = (recentEntriesByDate[entry.date] || 0) + 1;

    if (entry.isFavorite) favoriteEntriesCount++;
    if (entry.isPinned) pinnedEntriesCount++;

    if (Array.isArray(entry.tags)) {
      entry.tags.forEach((t) => {
        if (t && t.trim()) tagsSet.add(t.trim().toLowerCase());
      });
    }
  }

  return {
    totalEntriesCount,
    entriesThisWeekCount,
    totalWordsWritten,
    averageWordsPerEntry: Math.round(totalWordsWritten / totalEntriesCount),
    activeDaysCount: activeDaysSet.size,
    activeDaysLast30: activeDays30Set.size,
    favoriteEntriesCount,
    pinnedEntriesCount,
    recentEntriesByDate,
    allTags: Array.from(tagsSet).sort(),
  };
}

/**
 * Creates formatted structured reflection content.
 */
export function buildStructuredReflectionContent(params: {
  happened: string;
  mattered: string;
  next: string;
  reflectionNotes?: string;
}): string {
  const { happened, mattered, next, reflectionNotes } = params;

  let result = `## Daily Reflection Structure\n\n`;
  if (happened.trim()) {
    result += `### 1. What Happened?\n${happened.trim()}\n\n`;
  }
  if (mattered.trim()) {
    result += `### 2. What Mattered Most?\n${mattered.trim()}\n\n`;
  }
  if (next.trim()) {
    result += `### 3. What Do I Want To Do Next?\n${next.trim()}\n\n`;
  }
  if (reflectionNotes?.trim()) {
    result += `### Notes & Musings\n${reflectionNotes.trim()}\n`;
  }
  return result.trim();
}
