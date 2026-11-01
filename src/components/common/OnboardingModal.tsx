import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../../store/uiStore';
import { applyTheme, THEMES } from '../../theme/themeUtils';
import { loadSection12Timetable, getDefaultSemesterDates } from '../../db/starterPack';
import {
  Sparkles,
  GraduationCap,
  Calendar,
  Award,
  ChevronRight,
  ChevronLeft,
  Check,
  BookOpen,
  Compass,
  ArrowRight,
  X,
} from 'lucide-react';

interface OnboardingModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ forceOpen, onClose }) => {
  const { showToast, isOnboardingOpen, setOnboardingOpen } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userName, setUserName] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('pink-lobby');
  const [universityName, setUniversityName] = useState('');
  const [termName, setTermName] = useState('');
  const [targetCgpa, setTargetCgpa] = useState<number>(3.85);
  const [scheduleOption, setScheduleOption] = useState<'clean' | 'section12'>('clean');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.userName && settings.userName !== 'Scholar') {
        setUserName(settings.userName);
      }
      if (settings.theme) {
        setSelectedTheme(settings.theme);
      }
      if (settings.universityName) {
        setUniversityName(settings.universityName);
      } else {
        setUniversityName('Addis Ababa Science & Technology University');
      }
      if (settings.currentTermName) {
        setTermName(settings.currentTermName);
      } else {
        setTermName('Year 1 - Semester I');
      }
      if (settings.targetCgpa) {
        setTargetCgpa(settings.targetCgpa);
      }
    }
  }, [settings]);

  // Determine if modal should be shown
  const isFirstLaunch = settings && settings.hasCompletedOnboarding === false;
  const isOpen = forceOpen || isOnboardingOpen || (settings && settings.hasCompletedOnboarding === undefined && !settings.lastBackupDate);

  if (!isOpen) return null;

  const handleThemePick = (themeId: string) => {
    setSelectedTheme(themeId);
    applyTheme(themeId);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const finalName = userName.trim() || 'Scholar';
      const finalUni = universityName.trim() || 'University';
      const finalTerm = termName.trim() || 'Year 1 - Semester I';

      await db.settings.update('current_user', {
        userName: finalName,
        universityName: finalUni,
        currentTermName: finalTerm,
        targetCgpa: Number(targetCgpa) || 3.85,
        theme: selectedTheme,
        hasCompletedOnboarding: true,
      });

      applyTheme(selectedTheme);

      if (scheduleOption === 'section12') {
        const defaults = getDefaultSemesterDates();
        await loadSection12Timetable({
          semesterName: finalTerm,
          startDate: defaults.startDate,
          endDate: defaults.endDate,
        });
        showToast('Freshman Section 12 schedule loaded into your timetable!', 'success');
      }

      showToast(`Welcome aboard, ${finalName}! Your College Life OS is ready.`, 'success');
      setOnboardingOpen(false);
      if (onClose) onClose();
    } catch (err) {
      console.error('[Onboarding] Error finalizing setup:', err);
      showToast('Saved setup details to profile.', 'info');
      setOnboardingOpen(false);
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Close Button if opened on demand */}
        {(forceOpen || isOnboardingOpen) && (
          <button
            onClick={() => {
              setOnboardingOpen(false);
              if (onClose) onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] transition"
            title="Close setup"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Steps Tracker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-primary))]">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>College Life OS Setup</span>
            </span>
            <span>Step {step} of 3</span>
          </div>

          <div className="w-full h-1.5 bg-[rgb(var(--c-surface2))] rounded-full overflow-hidden">
            <div
              className="h-full bg-[rgb(var(--c-primary))] transition-all duration-300 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Contents Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          {/* STEP 1: SCHOLAR IDENTITY & THEME */}
          {step === 1 && (
            <div className="space-y-4 animate-pop">
              <div>
                <h3 className="text-lg sm:text-xl font-heading font-bold text-[rgb(var(--c-text))]">
                  Welcome to Your Command Center
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
                  Offline-first personal operating system for your academic, creative, and daily life.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex / Scholar"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[rgb(var(--c-primary))] outline-hidden transition"
                  autoFocus
                />
                <p className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
                  Displayed on your daily concierge banner and greeting.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                  Choose Your Aesthetic Theme
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {THEMES.slice(0, 8).map((t) => {
                    const isSelected = selectedTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleThemePick(t.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                          isSelected
                            ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] ring-2 ring-[rgb(var(--c-primary))]'
                            : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))]'
                        }`}
                      >
                        <div className="flex -space-x-1 shrink-0">
                          {t.swatches.slice(0, 3).map((sw, i) => (
                            <span
                              key={i}
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: sw }}
                            />
                          ))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
                            {t.name}
                          </div>
                          <div className="text-[9px] text-[rgb(var(--c-muted))] uppercase">
                            {t.isDark ? 'Dark' : 'Light'}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[rgb(var(--c-primary))] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: UNIVERSITY & ACADEMICS */}
          {step === 2 && (
            <div className="space-y-4 animate-pop">
              <div>
                <h3 className="text-lg sm:text-xl font-heading font-bold text-[rgb(var(--c-text))]">
                  Your Academic Profile
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
                  Connect your campus, semester term, and target CGPA for placement.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                  University / College Name
                </label>
                <input
                  type="text"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  placeholder="e.g. Addis Ababa Science & Technology University"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[rgb(var(--c-primary))] outline-hidden transition"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-[rgb(var(--c-muted))]">Quick fill:</span>
                  {[
                    'Addis Ababa Science & Technology University',
                    'Addis Ababa University',
                    'Adama Science & Technology University',
                  ].map((uni) => (
                    <button
                      key={uni}
                      type="button"
                      onClick={() => setUniversityName(uni)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                    >
                      {uni.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    Current Term / Semester
                  </label>
                  <input
                    type="text"
                    value={termName}
                    onChange={(e) => setTermName(e.target.value)}
                    placeholder="e.g. Year 1 - Semester I"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[rgb(var(--c-primary))] outline-hidden transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    Target Placement CGPA
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="2.00"
                    max="4.00"
                    value={targetCgpa}
                    onChange={(e) => setTargetCgpa(parseFloat(e.target.value) || 3.85)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[rgb(var(--c-primary))] outline-hidden transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SCHEDULE PREFERENCE */}
          {step === 3 && (
            <div className="space-y-4 animate-pop">
              <div>
                <h3 className="text-lg sm:text-xl font-heading font-bold text-[rgb(var(--c-text))]">
                  Choose Your Starting Setup
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
                  How would you like to initialize your timetable and courses?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div
                  onClick={() => setScheduleOption('clean')}
                  className={`ticket-border p-4 rounded-2xl cursor-pointer transition flex items-start gap-3 bg-[rgb(var(--c-bg))] ${
                    scheduleOption === 'clean'
                      ? 'border-[rgb(var(--c-primary))] ring-2 ring-[rgb(var(--c-primary))]'
                      : 'hover:border-[rgb(var(--c-border))]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[rgb(var(--c-surface2))] flex items-center justify-center shrink-0 text-[rgb(var(--c-primary))]">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Start Clean Slate
                    </div>
                    <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish mt-0.5">
                      Register your own custom subjects, weekly class times, credit hours, and lecture halls as you receive syllabi.
                    </div>
                  </div>
                  {scheduleOption === 'clean' && (
                    <Check className="w-4 h-4 text-[rgb(var(--c-primary))] shrink-0 mt-1" />
                  )}
                </div>

                <div
                  onClick={() => setScheduleOption('section12')}
                  className={`ticket-border p-4 rounded-2xl cursor-pointer transition flex items-start gap-3 bg-[rgb(var(--c-bg))] ${
                    scheduleOption === 'section12'
                      ? 'border-[rgb(var(--c-primary))] ring-2 ring-[rgb(var(--c-primary))]'
                      : 'hover:border-[rgb(var(--c-border))]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] flex items-center gap-1.5">
                      <span>Load Freshman Engineering Schedule</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold uppercase">
                        Pre-built
                      </span>
                    </div>
                    <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish mt-0.5">
                      Includes 7 modules (Calculus, Physics, Logic, English, Programming, etc.) and complete Monday–Friday class periods.
                    </div>
                  </div>
                  {scheduleOption === 'section12' && (
                    <Check className="w-4 h-4 text-[rgb(var(--c-primary))] shrink-0 mt-1" />
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[11px] text-[rgb(var(--c-muted))] font-flourish flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>All records are stored locally in your browser's IndexedDB. Works 100% offline.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="pt-4 border-t border-[rgb(var(--c-border))] flex items-center justify-between gap-3 shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-surface2))] transition active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 2 | 3)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-white font-heading text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-xs"
            >
              <span>Continue</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[rgb(var(--c-primary))] text-white font-heading text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-md disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Configuring...' : 'Launch College Life OS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
