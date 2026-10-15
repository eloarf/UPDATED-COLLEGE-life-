import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Award, Trash2, Plus, CheckCircle2, ExternalLink } from 'lucide-react';
import { ExamItem } from '../types/aastu';
import { createGoogleCalendarUrl } from '../utils/calendarSync';

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  examToEdit?: ExamItem | null;
  onSaveExam: (examData: Omit<ExamItem, 'id'> & { id?: string }) => void;
  onDeleteExam?: (id: string) => void;
}

export const ExamModal: React.FC<ExamModalProps> = ({
  isOpen,
  onClose,
  examToEdit,
  onSaveExam,
  onDeleteExam,
}) => {
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('MATH1007');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [room, setRoom] = useState('B59-2-005');
  const [weightPercentage, setWeightPercentage] = useState(30);
  const [syllabusTopics, setSyllabusTopics] = useState<{ id: string; name: string; completed: boolean }[]>([]);
  const [newTopicText, setNewTopicText] = useState('');

  useEffect(() => {
    if (examToEdit) {
      setTitle(examToEdit.title);
      setCourseCode(examToEdit.courseCode);
      setExamDate(examToEdit.examDate);
      setExamTime(examToEdit.examTime || '09:00');
      setDurationMinutes(examToEdit.durationMinutes || 120);
      setRoom(examToEdit.room || '');
      setWeightPercentage(examToEdit.weightPercentage || 30);
      setSyllabusTopics(examToEdit.syllabusTopics || []);
    } else {
      setTitle('');
      setCourseCode('MATH1007');
      const defaultDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
      setExamDate(defaultDate);
      setExamTime('09:00');
      setDurationMinutes(120);
      setRoom('B59-2-005');
      setWeightPercentage(30);
      setSyllabusTopics([
        { id: 't1', name: 'Core theoretical derivations', completed: true },
        { id: 't2', name: 'Worksheet numerical problems', completed: false },
        { id: 't3', name: 'Past exam mock questions', completed: false },
      ]);
    }
  }, [examToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddTopic = () => {
    if (!newTopicText.trim()) return;
    setSyllabusTopics((prev) => [
      ...prev,
      { id: `top-${Date.now()}`, name: newTopicText.trim(), completed: false },
    ]);
    setNewTopicText('');
  };

  const handleToggleTopic = (topicId: string) => {
    setSyllabusTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTopic = (topicId: string) => {
    setSyllabusTopics((prev) => prev.filter((t) => t.id !== topicId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !examDate) return;

    const completedCount = syllabusTopics.filter((t) => t.completed).length;
    const readiness = syllabusTopics.length > 0 ? Math.round((completedCount / syllabusTopics.length) * 100) : 50;

    onSaveExam({
      id: examToEdit?.id,
      title: title.trim(),
      courseCode: courseCode.trim() || 'EXAM',
      examDate,
      examTime,
      durationMinutes: Number(durationMinutes) || 120,
      room: room.trim() || undefined,
      weightPercentage: Number(weightPercentage) || 0,
      readinessScore: readiness,
      syllabusTopics,
    });
    onClose();
  };

  const handleOpenGoogleCalendar = () => {
    if (!title.trim() || !examDate) return;
    const url = createGoogleCalendarUrl({
      title: `[EXAM] ${title} (${courseCode})`,
      details: `Room: ${room}\nWeight: ${weightPercentage}%\nDuration: ${durationMinutes} mins`,
      location: room,
      dateStr: examDate,
      timeStr: examTime,
      durationMinutes: durationMinutes,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6 text-[#c9d1d9] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#f0883e]" />
              <span>{examToEdit ? 'Edit University Exam' : 'Schedule University Exam & Checklist'}</span>
            </h2>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Tracks high-stakes exam dates, venue halls, and syllabus readiness.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Exam Title */}
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
              Exam Name / Subject
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MATH1007 Applied Mathematics I Midterm"
              className="w-full px-3.5 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-sm focus:outline-none focus:border-[#58a6ff]"
              required
              autoFocus
            />
          </div>

          {/* Course, Room, Weight */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
                Course Code
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. MATH1007"
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#58a6ff]" /> Room / Hall
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. B59-2-005"
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs focus:outline-none focus:border-[#58a6ff]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
                Grade Weight (%)
              </label>
              <input
                type="number"
                value={weightPercentage}
                onChange={(e) => setWeightPercentage(Number(e.target.value))}
                min="0"
                max="100"
                placeholder="30%"
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>

          {/* Date, Time, Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#58a6ff]" /> Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#58a6ff]" /> Start Time
              </label>
              <input
                type="time"
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                min="15"
                max="300"
                className="w-full px-2.5 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>

          {/* Syllabus Readiness Checklist */}
          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white">
                Syllabus Preparation Checklist
              </label>
              <span className="text-[11px] font-mono text-[#3fb950]">
                {syllabusTopics.filter((t) => t.completed).length} of {syllabusTopics.length} Prepared
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {syllabusTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-xs"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1 mr-2 truncate">
                    <input
                      type="checkbox"
                      checked={topic.completed}
                      onChange={() => handleToggleTopic(topic.id)}
                      className="rounded"
                    />
                    <span className={topic.completed ? 'line-through text-[#8b949e]' : 'text-slate-200'}>
                      {topic.name}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteTopic(topic.id)}
                    className="text-[#8b949e] hover:text-[#f85149] p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newTopicText}
                onChange={(e) => setNewTopicText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTopic();
                  }
                }}
                placeholder="Add revision topic or chapter..."
                className="flex-1 px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-white text-xs focus:outline-none focus:border-[#58a6ff]"
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="px-3 py-1.5 text-xs font-semibold text-[#58a6ff] hover:bg-[#58a6ff]/10 border border-[#58a6ff]/30 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Quick Calendar Link */}
          {title && examDate && (
            <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] flex items-center justify-between text-xs">
              <span className="text-[#8b949e]">Sync exam with reminder alerts:</span>
              <button
                type="button"
                onClick={handleOpenGoogleCalendar}
                className="text-[#58a6ff] hover:text-[#79b8ff] font-semibold flex items-center gap-1.5"
              >
                <span>Add to Google Calendar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#30363d]">
            {examToEdit && onDeleteExam ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this scheduled exam?')) {
                    onDeleteExam(examToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-xs font-semibold text-[#f85149] hover:bg-[#f85149]/10 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#8b949e] hover:text-white rounded-xl hover:bg-[#21262d] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-black bg-[#58a6ff] hover:bg-[#79b8ff] rounded-xl transition-colors shadow-sm"
              >
                {examToEdit ? 'Save Exam' : 'Schedule Exam'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
