import { describe, it, expect } from 'vitest';
import {
  CATEGORIZED_PROMPTS,
  getPromptForCategory,
  formatLightweightMarkdown,
  insertFormattingSyntax,
  calculateJournalStats,
  buildStructuredReflectionContent,
} from './journalEngine';
import { JournalEntry } from '../types';

describe('journalEngine', () => {
  it('has categorized prompts covering all 7 requested themes', () => {
    const categories = new Set(CATEGORIZED_PROMPTS.map((p) => p.category));
    expect(categories.has('reflection')).toBe(true);
    expect(categories.has('gratitude')).toBe(true);
    expect(categories.has('university')).toBe(true);
    expect(categories.has('creativity')).toBe(true);
    expect(categories.has('relationships')).toBe(true);
    expect(categories.has('ambitions')).toBe(true);
    expect(categories.has('difficult_days')).toBe(true);

    const gratitudePrompt = getPromptForCategory('gratitude', 0);
    expect(gratitudePrompt.category).toBe('gratitude');
    expect(gratitudePrompt.prompt.length).toBeGreaterThan(10);
  });

  it('safely formats lightweight markdown with XSS escaping', () => {
    const raw = `# Morning Reflection
<script>alert('xss')</script>
This is **bold text** and *italic note*.

- First bullet
- Second bullet

> Deep wisdom here.

- [ ] Unchecked action
- [x] Completed action`;

    const html = formatLightweightMarkdown(raw);
    // Verifies script tags are escaped
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    // Verifies headers, bold, italics, quotes
    expect(html).toContain('Morning Reflection');
    expect(html).toContain('<strong class="font-bold text-[rgb(var(--c-text))]">bold text</strong>');
    expect(html).toContain('<em class="italic">italic note</em>');
    expect(html).toContain('<blockquote');
    expect(html).toContain('Deep wisdom here.');
    expect(html).toContain('Unchecked action');
    expect(html).toContain('Completed action');
  });

  it('inserts formatting syntax accurately at selection', () => {
    const text = 'Hello world today';
    const boldRes = insertFormattingSyntax(text, 6, 11, 'bold'); // "world"
    expect(boldRes.updatedText).toBe('Hello **world** today');

    const h2Res = insertFormattingSyntax(text, 0, 0, 'h2');
    expect(h2Res.updatedText).toContain('## Section Heading');
  });

  it('calculates honest journal statistics without guilt-based streaks', () => {
    const today = '2026-10-19'; // Monday

    const entries: JournalEntry[] = [
      {
        id: 'j1',
        title: 'Monday Kickoff',
        date: '2026-10-19',
        moodScore: 5,
        energyScore: 4,
        content: 'Started the week with calm momentum and clarity.',
        wordCount: 8,
        tags: ['academic', 'focus'],
        createdAt: '2026-10-19T09:00:00Z',
        isFavorite: true,
        isPinned: true,
      },
      {
        id: 'j2',
        title: 'Sunday Sunset',
        date: '2026-10-18',
        moodScore: 4,
        energyScore: 3,
        content: 'Long walk through campus gardens.',
        wordCount: 5,
        tags: ['walk', 'mindfulness'],
        createdAt: '2026-10-18T18:00:00Z',
      },
      {
        id: 'j-deleted',
        title: 'Discarded scrap',
        date: '2026-10-17',
        moodScore: 2,
        energyScore: 2,
        content: 'Test scrap that was deleted.',
        wordCount: 5,
        tags: [],
        createdAt: '2026-10-17T10:00:00Z',
        deletedAt: '2026-10-17T11:00:00Z',
      },
    ];

    const stats = calculateJournalStats(entries, today);
    // Deleted entries should not be counted
    expect(stats.totalEntriesCount).toBe(2);
    expect(stats.totalWordsWritten).toBe(13);
    expect(stats.entriesThisWeekCount).toBe(1); // 2026-10-19 is Monday
    expect(stats.favoriteEntriesCount).toBe(1);
    expect(stats.pinnedEntriesCount).toBe(1);
    expect(stats.allTags).toContain('academic');
    expect(stats.allTags).toContain('mindfulness');
  });

  it('builds structured reflection template text correctly', () => {
    const text = buildStructuredReflectionContent({
      happened: 'Finished Lab 3 analysis.',
      mattered: 'Understood circuit resonance.',
      next: 'Prepare for midterm quiz tomorrow.',
    });

    expect(text).toContain('### 1. What Happened?');
    expect(text).toContain('Finished Lab 3 analysis.');
    expect(text).toContain('### 2. What Mattered Most?');
    expect(text).toContain('### 3. What Do I Want To Do Next?');
  });
});
