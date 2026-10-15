import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, Sparkles, X, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { ExamQuestion } from '../types/study';
import { SAMPLE_PAST_EXAMS_QUESTIONS } from '../data/sampleExams';

interface PastExamParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsExtracted: (questions: ExamQuestion[], courseCode: string) => void;
}

export const PastExamParserModal: React.FC<PastExamParserModalProps> = ({
  isOpen,
  onClose,
  onQuestionsExtracted,
}) => {
  const [courseCode, setCourseCode] = useState('CS301 - Operating Systems');
  const [year, setYear] = useState('2024');
  const [examType, setExamType] = useState<'Midterm' | 'Final' | 'Quiz'>('Final');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    base64: string;
    previewUrl?: string;
  } | null>(null);
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [extractedQuestions, setExtractedQuestions] = useState<ExamQuestion[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const isImg = file.type.startsWith('image/');
      setSelectedFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        base64: base64,
        previewUrl: isImg ? base64 : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (activeTab === 'upload' && !selectedFile && !rawText.trim()) {
      setErrorMessage('Please select a past exam PDF, photo scan, or document.');
      return;
    }
    if (activeTab === 'paste' && !rawText.trim()) {
      setErrorMessage('Please paste exam questions or transcript.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Ingesting document and analyzing question layout...');

    try {
      const timer1 = setTimeout(() => {
        setProcessingStatus('Detecting structural sections (MCQ, Short Answer, Code)...');
      }, 1500);
      const timer2 = setTimeout(() => {
        setProcessingStatus('Extracting mark weights, rubrics, and topic metadata...');
      }, 3500);

      const response = await fetch('/api/exam/parse-past-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: selectedFile,
          rawText: rawText,
          course_code: courseCode,
          year: parseInt(year, 10) || 2024,
          exam_type: examType,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!response.ok) {
        throw new Error('Failed to parse exam document.');
      }

      const parsedData = await response.json();
      const questionsWithMeta: ExamQuestion[] = (parsedData.questions || []).map(
        (q: any, idx: number) => ({
          id: q.id || `eq-${Date.now()}-${idx}`,
          course_id: courseCode.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          course_code: courseCode,
          section_title: q.section_title || 'General Examination',
          question_type: q.question_type || 'short_answer',
          question_text: q.question_text,
          options: q.options || [],
          correct_answer: q.correct_answer,
          points: Number(q.points) || 5,
          topic_tag: q.topic_tag || 'Core Concepts',
          difficulty_level: q.difficulty_level || 'medium',
          explanation: q.explanation || 'Verified canonical solution.',
          rubric: q.rubric || ['Addresses the core principle'],
          source_type: 'past_exam',
          year: parseInt(year, 10) || 2024,
          exam_type: examType,
          lecture_reference: q.lecture_reference || 'Module 1: Foundations',
        })
      );

      setExtractedQuestions(questionsWithMeta);
    } catch (err: any) {
      console.error('Error parsing exam:', err);
      setErrorMessage(err.message || 'Error occurred while parsing exam.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAddToBank = () => {
    if (!extractedQuestions || extractedQuestions.length === 0) return;
    onQuestionsExtracted(extractedQuestions, courseCode);
    onClose();
  };

  const handleLoadSamplePaper = () => {
    setExtractedQuestions(SAMPLE_PAST_EXAMS_QUESTIONS);
    setCourseCode('CS301 - Operating Systems');
    setYear('2024');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Module 1 · Past Exam Ingestion Pipeline</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              Ingest Past Exam & Extract Question Bank
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload PDF exam papers or scanned exam photos. Automatically extracts sections, mark weights, and metadata.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="my-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!extractedQuestions ? (
          <form onSubmit={handleParse} className="space-y-5 pt-4">
            {/* Metadata inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Course Code & Title
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g. CS301 - Operating Systems"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Exam Year
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min="2010"
                  max="2026"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Exam Type
                </label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Final">Final Examination</option>
                  <option value="Midterm">Midterm Exam</option>
                  <option value="Quiz">Major Quiz / Practice</option>
                </select>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload PDF / Scanned Photo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'paste'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Paste Exam Transcript
              </button>
            </div>

            {/* Drag & Drop Upload */}
            {activeTab === 'upload' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-950/20'
                    : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt"
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    {selectedFile.previewUrl ? (
                      <img
                        src={selectedFile.previewUrl}
                        alt="Scanned Exam Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-emerald-500/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-xs font-semibold text-white">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · {selectedFile.type}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="ml-auto text-xs text-slate-400 hover:text-rose-400 px-2 py-1"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-200">
                      Drag and drop your past exam PDF or scanned photos here
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Supports high-resolution exam scans, mobile photos, text PDFs, and docx. AI extracts equations, code blocks, MCQs, and points.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste questions, sections, and point allocations from past exams..."
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono resize-none"
                />
              </div>
            )}

            {isProcessing && (
              <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-300">
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>{processingStatus}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-1.5 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleLoadSamplePaper}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                1-Click Load Sample CS301 Past Paper
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Digitizing Exam...' : 'Parse Past Exam'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* REVIEW EXTRACTED QUESTIONS BEFORE CONFIRMATION */
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Parsed {extractedQuestions.length} Questions for {courseCode} ({year} {examType})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Total Points: {extractedQuestions.reduce((sum, q) => sum + q.points, 0)} pts · Ready to add to Question Bank
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExtractedQuestions(null)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Re-upload
              </button>
            </div>

            {/* Questions Preview List */}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {extractedQuestions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-indigo-400">
                      Q{idx + 1} · {q.section_title || 'Exam Item'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {q.question_type.toUpperCase()}
                      </span>
                      <span className="font-bold text-white font-mono">{q.points} pts</span>
                    </div>
                  </div>

                  <p className="text-slate-200 font-medium">{q.question_text}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                    <span>Topic: {q.topic_tag}</span>
                    <span className="text-emerald-400 font-mono">Answer: {q.correct_answer.slice(0, 45)}...</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Confirmation Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setExtractedQuestions(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                Back to Ingestion
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToBank}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>Commit to Question Bank & Update Radar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
