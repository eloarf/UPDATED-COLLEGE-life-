import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, Sparkles, X, BookOpen } from 'lucide-react';
import { StudySuite } from '../types/study';
import { SAMPLE_SUITES } from '../data/sampleMaterials';

interface MaterialUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuiteCreated: (suite: StudySuite) => void;
}

export const MaterialUploaderModal: React.FC<MaterialUploaderModalProps> = ({
  isOpen,
  onClose,
  onSuiteCreated,
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'paste' | 'samples'>('upload');
  const [title, setTitle] = useState('');
  const [targetGrade, setTargetGrade] = useState('College / Undergraduate');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    type: string;
    base64: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    if (!title) {
      // Auto-populate title from filename without extension
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        base64: base64,
      });
    };
    reader.onerror = () => {
      setErrorMessage('Could not read the selected file. Please try again.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (activeMode === 'upload' && !selectedFile && !rawText.trim()) {
      setErrorMessage('Please select a PDF or Word file to upload.');
      return;
    }
    if (activeMode === 'paste' && !rawText.trim()) {
      setErrorMessage('Please enter or paste your school work notes or text.');
      return;
    }

    setIsProcessing(true);
    setProcessingStage('Analyzing document structure and concepts...');

    try {
      const timer1 = setTimeout(() => {
        setProcessingStage('Synthesizing high-yield flashcards & mnemonics...');
      }, 2000);
      const timer2 = setTimeout(() => {
        setProcessingStage('Generating quick practice questions with misconception warnings...');
      }, 4500);
      const timer3 = setTimeout(() => {
        setProcessingStage('Formulating deep scenario-based mock exam with rubrics...');
      }, 7000);

      const response = await fetch('/api/study/process-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || selectedFile?.name || 'School Study Material',
          rawText: rawText,
          file: selectedFile,
          targetGrade: targetGrade,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process document');
      }

      const suiteData = await response.json();

      const newSuite: StudySuite = {
        id: 'suite-' + Date.now(),
        subjectTitle: suiteData.subjectTitle || title || 'Study Suite',
        summary: suiteData.summary || 'Generated study suite',
        sourceName: selectedFile?.name || 'School Notes.txt',
        createdAt: Date.now(),
        topics: suiteData.topics || [],
        flashcards: suiteData.flashcards || [],
        quickPractice: suiteData.quickPractice || [],
        deepMockExam: suiteData.deepMockExam || [],
      };

      onSuiteCreated(newSuite);
      onClose();
    } catch (err: any) {
      console.error('Error generating study suite:', err);
      setErrorMessage(
        err.message || 'Error communicating with processing server. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectSample = (sample: StudySuite) => {
    onSuiteCreated(sample);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Upload Schoolwork & Generate Study Suite
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Arranges your documents into flashcards, quick practice drills, and deep mock exams.
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

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg mt-5 mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeMode === 'upload'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload PDF / Word
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('paste')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeMode === 'paste'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Text / Notes
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('samples')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeMode === 'samples'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pre-loaded Samples
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content based on Mode */}
        {activeMode === 'samples' ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Load an instant high-yield academic module to test the flashcards, practice drills, and mistake tracking right away:
            </p>
            {SAMPLE_SUITES.map((sample) => (
              <div
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className="p-4 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-lg cursor-pointer transition-all flex items-start justify-between gap-4 group"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {sample.subjectTitle}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{sample.summary}</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                    <span>{sample.flashcards.length} Flashcards</span>
                    <span aria-hidden="true">·</span>
                    <span>{sample.quickPractice.length} Practice Questions</span>
                    <span aria-hidden="true">·</span>
                    <span>{sample.deepMockExam.length} Mock Exam Scenarios</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0"
                >
                  Load Deck
                </button>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title & Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Deck Title / Course Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. AP Biology Unit 3 or Bio 101"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Academic Rigor Level
                </label>
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="High School AP / IB">High School AP / IB</option>
                  <option value="College / Undergraduate">College / Undergraduate</option>
                  <option value="Graduate / Professional">Graduate / Professional</option>
                </select>
              </div>
            </div>

            {/* Mode: Upload File */}
            {activeMode === 'upload' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Schoolwork File (.pdf, .docx, .txt)
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
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
                    accept=".pdf,.docx,.doc,.txt,.md"
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-white">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Ready for analysis
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
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-medium text-slate-300">
                        Drag and drop your PDF or Word document here, or click to browse
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Supports PDF (with diagrams), Word .docx, lecture notes, textbook chapters
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mode: Paste Text */}
            {activeMode === 'paste' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Paste Notes, Study Guide, or Homework Text
                </label>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste lecture notes, study guide topics, textbook definitions, or syllabus contents..."
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>
            )}

            {/* Processing state indicator */}
            {isProcessing && (
              <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-300">
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>{processingStage}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-1.5 rounded-full animate-pulse w-3/4 transition-all duration-500" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
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
                className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Generating Study Suite...' : 'Generate Flashcards & Exams'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
