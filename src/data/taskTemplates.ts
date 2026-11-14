export interface TaskTemplateStep {
  title: string;
  estimateMinutes: number;
}

export interface TaskBreakdownTemplate {
  id: string;
  name: 'Essay' | 'Lab report' | 'Exam prep' | 'Presentation' | 'Coding assignment' | 'Reading';
  description: string;
  steps: TaskTemplateStep[];
}

/**
 * Editable local task breakdown templates (no network, no AI).
 * Modify step titles or estimateMinutes directly here to customize your workflow.
 */
export const TASK_BREAKDOWN_TEMPLATES: TaskBreakdownTemplate[] = [
  {
    id: 'essay',
    name: 'Essay',
    description: 'Outline, sources, draft, and polish workflow',
    steps: [
      { title: 'Clarify prompt & thesis statement', estimateMinutes: 15 },
      { title: 'Gather & skim 3-5 core sources', estimateMinutes: 30 },
      { title: 'Build section outline with bullet points', estimateMinutes: 20 },
      { title: 'Write rough first draft', estimateMinutes: 60 },
      { title: 'Revise structure, citations & proofread', estimateMinutes: 25 },
    ],
  },
  {
    id: 'lab-report',
    name: 'Lab report',
    description: 'Data check, methods, results, and discussion',
    steps: [
      { title: 'Verify lab data, units & calculations', estimateMinutes: 25 },
      { title: 'Plot graphs or format tables', estimateMinutes: 20 },
      { title: 'Draft introduction & methods section', estimateMinutes: 25 },
      { title: 'Write results & error analysis discussion', estimateMinutes: 35 },
      { title: 'Final formatting & reference check', estimateMinutes: 15 },
    ],
  },
  {
    id: 'exam-prep',
    name: 'Exam prep',
    description: 'Audit weak spots, active recall, and timed practice',
    steps: [
      { title: 'List syllabus topics & spot weak areas', estimateMinutes: 15 },
      { title: 'Condense key formulas & concepts onto 1 sheet', estimateMinutes: 30 },
      { title: 'Complete active recall / flashcard pass', estimateMinutes: 25 },
      { title: 'Solve past problems under timed conditions', estimateMinutes: 45 },
      { title: 'Review mistakes & log top takeaways', estimateMinutes: 20 },
    ],
  },
  {
    id: 'presentation',
    name: 'Presentation',
    description: 'Storyline, clean slides, and spoken run-through',
    steps: [
      { title: 'Define core takeaway & 3 supporting points', estimateMinutes: 15 },
      { title: 'Draft slide sequence & speaker bullets', estimateMinutes: 35 },
      { title: 'Add clear visuals / charts & trim clutter', estimateMinutes: 25 },
      { title: 'Do 2 timed aloud practice runs', estimateMinutes: 20 },
    ],
  },
  {
    id: 'coding-assignment',
    name: 'Coding assignment',
    description: 'Read spec, build core slice, test edge cases',
    steps: [
      { title: 'Read prompt, inputs/outputs & constraints', estimateMinutes: 15 },
      { title: 'Set up starter files & verify test runner', estimateMinutes: 15 },
      { title: 'Implement core logic in small pieces', estimateMinutes: 50 },
      { title: 'Write & test boundary / edge cases', estimateMinutes: 25 },
      { title: 'Clean up code, comments & submission check', estimateMinutes: 15 },
    ],
  },
  {
    id: 'reading',
    name: 'Reading',
    description: 'Preview, focused read, and 3-bullet synthesis',
    steps: [
      { title: 'Skim headings, abstract & summary questions', estimateMinutes: 10 },
      { title: 'Read main sections with light margin notes', estimateMinutes: 30 },
      { title: 'Write 3-bullet summary in your own words', estimateMinutes: 10 },
    ],
  },
];
