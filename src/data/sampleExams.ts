import { ExamQuestion, TopicRadarAnalysis, ExamSession } from '../types/study';

export const SAMPLE_PAST_EXAMS_QUESTIONS: ExamQuestion[] = [
  // Question 1: Virtual Memory Address Translation (MCQ)
  {
    id: 'eq-cs301-2024-q1',
    course_id: 'cs301',
    course_code: 'CS301 - Operating Systems',
    section_title: 'Part I: Multiple Choice & Architectural Fundamentals',
    question_type: 'mcq',
    question_text:
      'Consider a system with a 32-bit virtual address space, 4 KB page size, and 4-byte page table entries (PTEs). What is the total size of a linear (single-level) page table for one process?',
    options: ['1 MB', '4 MB', '8 MB', '16 MB'],
    correct_answer: '4 MB',
    explanation:
      'With 4 KB page size (2^12), there are 32 - 12 = 20 bits for the Virtual Page Number (VPN), meaning 2^20 = 1,048,576 pages. Each PTE is 4 bytes, so 2^20 * 4 bytes = 4,194,304 bytes = 4 MB.',
    rubric: [
      'Calculates 20-bit VPN from 32-bit address space and 12-bit offset',
      'Multiplies 2^20 entries by 4-byte PTE size to obtain 4 MB',
    ],
    topic_tag: 'Virtual Memory & Paging',
    points: 5,
    difficulty_level: 'medium',
    source_type: 'past_exam',
    year: 2024,
    exam_type: 'Final',
    lecture_reference: 'Module 4: Virtual Memory, Section 4.2 (Linear Page Tables), Slide 18',
  },

  // Question 2: Belady's Anomaly (True/False)
  {
    id: 'eq-cs301-2024-q2',
    course_id: 'cs301',
    course_code: 'CS301 - Operating Systems',
    section_title: 'Part I: Multiple Choice & Architectural Fundamentals',
    question_type: 'true_false',
    question_text:
      'True or False: The Optimal (OPT / MIN) page replacement algorithm can suffer from Belady’s Anomaly if the reference string contains cyclic loops.',
    options: ['True', 'False'],
    correct_answer: 'False',
    explanation:
      'Optimal is a stack algorithm that satisfies the inclusion property: the set of pages in memory for N frames is always a subset of the pages in memory for N+1 frames. Therefore, Belady’s anomaly is mathematically impossible for OPT.',
    rubric: ['Identifies OPT as a stack algorithm obeying the inclusion property'],
    topic_tag: 'Virtual Memory & Paging',
    points: 3,
    difficulty_level: 'easy',
    source_type: 'past_exam',
    year: 2024,
    exam_type: 'Final',
    lecture_reference: 'Module 4: Virtual Memory, Section 4.4 (Page Replacement Algorithms), Slide 34',
  },

  // Question 3: TLB Miss vs Page Fault (Short Answer)
  {
    id: 'eq-cs301-2023-q3',
    course_id: 'cs301',
    course_code: 'CS301 - Operating Systems',
    section_title: 'Part II: Systems Analysis & Short Answer',
    question_type: 'short_answer',
    question_text:
      'Differentiate between a TLB Miss and a Page Fault. Specifically contrast who handles each event (Hardware MMU vs. OS Kernel), whether secondary storage I/O is required, and the latency disparity between them.',
    correct_answer:
      'A TLB Miss occurs when a virtual address translation is not cached in the hardware TLB; on x86 architectures, hardware page table walkers traverse memory to fetch the PTE (~10-50 nanoseconds, no disk I/O). A Page Fault occurs when the valid bit in the PTE is 0 (page not in physical memory); it triggers a software hardware trap to the OS kernel, which issues disk/SSD I/O to swap the page in, taking ~1-10 milliseconds (orders of magnitude slower).',
    rubric: [
      'Differentiates hardware MMU table walk vs OS kernel software trap',
      'Identifies absence of disk I/O in TLB miss vs mandatory disk/SSD swap in page fault',
      'Contrasts latency: nanoseconds for TLB miss vs milliseconds for page fault',
    ],
    explanation:
      'TLB misses are hardware lookup penalties (~10ns), whereas page faults necessitate an OS interrupt and disk I/O (~10ms).',
    topic_tag: 'Virtual Memory & Paging',
    points: 10,
    difficulty_level: 'hard',
    source_type: 'past_exam',
    year: 2023,
    exam_type: 'Final',
    lecture_reference: 'Module 4: Virtual Memory, Section 4.3 (TLB & Fault Handling), Pages 22-26',
  },

  // Question 4: Concurrency & Semaphores (Code)
  {
    id: 'eq-cs301-2023-q4',
    course_id: 'cs301',
    course_code: 'CS301 - Operating Systems',
    section_title: 'Part III: Concurrency & Code Implementation',
    question_type: 'code',
    question_text:
      'Implement the classical Producer-Consumer bounded buffer problem using counting semaphores (`sem_t mutex`, `sem_t empty_slots`, `sem_t filled_items`). Write the complete C code for `void* producer(void *arg)` and `void* consumer(void *arg)`. Ensure no deadlocks or race conditions.',
    starter_code: `// Complete the producer and consumer functions
void* producer(void* arg) {
    while(1) {
        int item = produce_item();
        // Your synchronization code here
    }
}

void* consumer(void* arg) {
    while(1) {
        // Your synchronization code here
        consume_item(item);
    }
}`,
    correct_answer: `void* producer(void* arg) {
    while(1) {
        int item = produce_item();
        sem_wait(&empty_slots);
        sem_wait(&mutex);
        buffer[in] = item;
        in = (in + 1) % BUFFER_SIZE;
        sem_post(&mutex);
        sem_post(&filled_items);
    }
}

void* consumer(void* arg) {
    while(1) {
        sem_wait(&filled_items);
        sem_wait(&mutex);
        int item = buffer[out];
        out = (out + 1) % BUFFER_SIZE;
        sem_post(&mutex);
        sem_post(&empty_slots);
        consume_item(item);
    }
}`,
    rubric: [
      'Correct nesting: wait on empty_slots before wait on mutex to prevent deadlock',
      'Mutual exclusion lock around buffer critical section',
      'Signaling filled_items after insertion and empty_slots after removal',
    ],
    explanation:
      'The counting semaphores coordinate buffer capacity and occupancy, while the binary mutex guarantees exclusive access to the buffer pointers.',
    topic_tag: 'Concurrency & Synchronization',
    points: 15,
    difficulty_level: 'hard',
    source_type: 'past_exam',
    year: 2023,
    exam_type: 'Final',
    lecture_reference: 'Module 3: Concurrency, Section 3.5 (Classic Synchronization Problems), Slides 40-48',
  },

  // Question 5: CPU Scheduling - Shortest Remaining Time First (Short Answer / Calculation)
  {
    id: 'eq-cs301-2022-q5',
    course_id: 'cs301',
    course_code: 'CS301 - Operating Systems',
    section_title: 'Part II: Systems Analysis & Short Answer',
    question_type: 'short_answer',
    question_text:
      'Processes P1, P2, and P3 arrive at times t=0, t=2, and t=4 with burst times of 8ms, 4ms, and 2ms respectively. Under preemptive Shortest Remaining Time First (SRTF) scheduling, compute the exact average waiting time across all three processes.',
    correct_answer:
      'At t=0, P1 starts (rem: 8). At t=2, P2 arrives with burst 4 vs P1 rem 6; P2 preempts P1. At t=4, P3 arrives with burst 2 vs P2 rem 2; tie-breaker keeps P2 running until t=6. At t=6, P3 runs to completion at t=8. At t=8, P1 finishes from 8 to 14. Waiting times: P3 = 6 - 4 = 2ms; P2 = 2 - 2 = 0ms; P1 = (2 - 0) + (8 - 2) = 6ms. Average waiting time = (6 + 0 + 2) / 3 = 8 / 3 = 2.67 ms.',
    rubric: [
      'Constructs correct Gantt chart (P1: 0-2, P2: 2-6, P3: 6-8, P1: 8-14)',
      'Calculates individual waiting times: P1=6ms, P2=0ms, P3=2ms',
      'Derives average waiting time: 2.67 ms (or 8/3 ms)',
    ],
    explanation:
      'SRTF dynamically preempts when shorter jobs arrive. P2 preempts P1 at t=2, P3 runs at t=6, and P1 completes last, leading to 2.67 ms average wait time.',
    topic_tag: 'CPU Scheduling & Deadlocks',
    points: 10,
    difficulty_level: 'medium',
    source_type: 'past_exam',
    year: 2022,
    exam_type: 'Midterm',
    lecture_reference: 'Module 2: CPU Scheduling, Section 2.3 (Preemptive Scheduling), Slides 15-20',
  },

  // Question 6: Bankers Algorithm Safety State (MCQ)
  {
    id: 'eq-cs301-2022-q6',
    course_id: 'cs301',
    course_code: 'CS301 - Operating Systems',
    section_title: 'Part I: Multiple Choice & Architectural Fundamentals',
    question_type: 'mcq',
    question_text:
      'Which of the following conditions is required for the Banker’s Algorithm to grant a resource request immediately?',
    options: [
      'The requested resources are available, and the resulting state is guaranteed to be Safe.',
      'The process requesting the resource has the lowest PID in the runqueue.',
      'All deadlock conditions (Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait) are broken.',
      'Total allocated resources equal total system capacity.',
    ],
    correct_answer: 'The requested resources are available, and the resulting state is guaranteed to be Safe.',
    explanation:
      'The Banker’s algorithm simulates resource allocation; it only grants the request if resources are currently available AND the state transition maintains a safe sequence where every process can terminate.',
    rubric: ['States requirement for remaining in a guaranteed Safe state with safe sequence'],
    topic_tag: 'CPU Scheduling & Deadlocks',
    points: 5,
    difficulty_level: 'medium',
    source_type: 'past_exam',
    year: 2022,
    exam_type: 'Midterm',
    lecture_reference: 'Module 2: Deadlocks, Section 2.7 (Banker’s Algorithm), Slides 30-36',
  },

  // Question 7: File System Inodes (Short Answer)
  {
    id: 'eq-cs301-2021-q7',
    course_id: 'cs301',
    course_code: 'CS301 - Operating Systems',
    section_title: 'Part II: Systems Analysis & Short Answer',
    question_type: 'short_answer',
    question_text:
      'An ext2-style file system uses 4 KB disk blocks and 4-byte block pointers. An inode contains 12 direct pointers, 1 single indirect pointer, 1 double indirect pointer, and 1 triple indirect pointer. Calculate the maximum file size addressable via the single indirect block alone.',
    correct_answer:
      'Each block is 4 KB = 4096 bytes. With 4-byte block pointers, a single indirect block holds 4096 / 4 = 1024 pointers to data blocks. Thus, the single indirect block can address 1024 * 4 KB = 4,096 KB = 4 MB.',
    rubric: [
      'Calculates pointers per block = 4096 / 4 = 1024 pointers',
      'Multiplies 1024 pointers by 4 KB block size to yield 4 MB',
    ],
    explanation:
      'A single indirect block stores 1024 direct pointers to 4 KB disk blocks, yielding 1024 * 4 KB = 4 MB addressable space.',
    topic_tag: 'File Systems & Storage',
    points: 8,
    difficulty_level: 'medium',
    source_type: 'past_exam',
    year: 2021,
    exam_type: 'Final',
    lecture_reference: 'Module 5: File Systems, Section 5.3 (Inode Block Allocation), Slide 24',
  },
];

export const INITIAL_TOPIC_RADAR: TopicRadarAnalysis = {
  course_id: 'cs301',
  course_name: 'CS301 - Operating Systems & Systems Architecture',
  total_exams_analyzed: 5,
  year_range: '2020 - 2024 Past Exams',
  weight_matrix: [
    {
      topic: 'Virtual Memory & Paging',
      historical_frequency_pct: 100,
      average_exam_points_pct: 28,
      appearance_count: 5,
      total_past_exams_analyzed: 5,
      years_appeared: [2020, 2021, 2022, 2023, 2024],
      recurring_pattern:
        'Appears in 100% of past Finals and accounts for 28% of total exam points. Focuses heavily on page table address math and TLB miss vs fault cascades.',
      yield_tier: 'Critical High-Yield',
      recommended_revision_weight_pct: 35,
    },
    {
      topic: 'Concurrency & Synchronization',
      historical_frequency_pct: 100,
      average_exam_points_pct: 25,
      appearance_count: 5,
      total_past_exams_analyzed: 5,
      years_appeared: [2020, 2021, 2022, 2023, 2024],
      recurring_pattern:
        'Always features a 12-15 point implementation question requiring POSIX mutexes and condition variables or semaphores.',
      yield_tier: 'Critical High-Yield',
      recommended_revision_weight_pct: 30,
    },
    {
      topic: 'CPU Scheduling & Deadlocks',
      historical_frequency_pct: 80,
      average_exam_points_pct: 18,
      appearance_count: 4,
      total_past_exams_analyzed: 5,
      years_appeared: [2021, 2022, 2023, 2024],
      recurring_pattern:
        'Gantt chart calculations (SRTF, Round Robin) and Banker’s safety matrix appear in 4 out of 5 exams.',
      yield_tier: 'Important Core',
      recommended_revision_weight_pct: 20,
    },
    {
      topic: 'File Systems & Storage',
      historical_frequency_pct: 60,
      average_exam_points_pct: 15,
      appearance_count: 3,
      total_past_exams_analyzed: 5,
      years_appeared: [2020, 2022, 2024],
      recurring_pattern:
        'Inode pointer capacity calculations and disk seek algorithms (SCAN/C-LOOK) alternate on odd/even years.',
      yield_tier: 'Secondary Depth',
      recommended_revision_weight_pct: 15,
    },
  ],
  predicted_focus_order: [
    'Virtual Memory & Paging',
    'Concurrency & Synchronization',
    'CPU Scheduling & Deadlocks',
    'File Systems & Storage',
  ],
  executive_takeaway:
    'Statistical analysis across the 2020-2024 exams shows that 53% of all exam points are concentrated in two topics: Virtual Memory and Concurrency. Mastering 32/64-bit page table arithmetic and bounded-buffer semaphore patterns establishes an immediate A-/A baseline.',
};
