import React from 'react';
import {
  Shield,
  HardDrive,
  CheckCircle,
  Sparkles,
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { EmergencyBackupMeta } from '../../db/db';
import { ValidationSuccess } from '../../services/backupService';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface SettingsDataSectionProps {
  persistenceInfo: { isPersisted: boolean; usage?: number; quota?: number };
  onProtectStorage: () => void;
  mirrorMeta: EmergencyBackupMeta;
  isSyncingMirror: boolean;
  onForceMirrorSync: () => void;
  isMirrorRestoring: boolean;
  onRestoreFromMirror: () => void;
  lastBackupDate?: string;
  isExportingBackup: boolean;
  onDownloadBackup: () => void;
  onFileRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportTasks: () => void;
  isConfirmDeleteOpen: boolean;
  setIsConfirmDeleteOpen: (val: boolean) => void;
  onWipeAllData: () => void;
  pendingRestore: { filename: string; validation: ValidationSuccess } | null;
  setPendingRestore: (val: { filename: string; validation: ValidationSuccess } | null) => void;
  isRestoring: boolean;
  onConfirmRestore: () => void;
}

export const SettingsDataSection: React.FC<SettingsDataSectionProps> = ({
  persistenceInfo,
  onProtectStorage,
  mirrorMeta,
  isSyncingMirror,
  onForceMirrorSync,
  isMirrorRestoring,
  onRestoreFromMirror,
  lastBackupDate,
  isExportingBackup,
  onDownloadBackup,
  onFileRestore,
  onExportTasks,
  isConfirmDeleteOpen,
  setIsConfirmDeleteOpen,
  onWipeAllData,
  pendingRestore,
  setPendingRestore,
  isRestoring,
  onConfirmRestore,
}) => {
  return (
    <>
      {/* Storage Durability & Emergency Mirror Vault */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[rgb(var(--c-primary))]" />
            <span className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
              Offline Storage Protection &amp; Reliability Vault
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-heading font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            Multi-Tier Safe
          </span>
        </div>

        <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
          College Life OS keeps all your timetable, courses, notes, habits, finances, and journal records strictly on your device using a multi-tier persistence engine (IndexedDB + LZ-compressed Local Mirror).
        </p>

        {/* Persistence Status Indicator Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Storage Eviction Shield */}
          <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-heading font-bold text-[rgb(var(--c-text))] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                Browser Storage Eviction Shield
              </span>
              {persistenceInfo.isPersisted ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Protected
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold">
                  Best-Effort
                </span>
              )}
            </div>
            <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              {persistenceInfo.isPersisted
                ? 'Your browser has granted permanent storage. Data will never be evicted under storage pressure.'
                : 'Storage may be evicted by the browser if disk space runs low. Enable protection below.'}
            </p>
            {persistenceInfo.quota !== undefined && (
              <div className="text-[10px] text-[rgb(var(--c-muted))] font-mono pt-1">
                Estimated Usage: {((persistenceInfo.usage || 0) / (1024 * 1024)).toFixed(2)} MB /{' '}
                {((persistenceInfo.quota || 0) / (1024 * 1024 * 1024)).toFixed(1)} GB Available
              </div>
            )}
            {!persistenceInfo.isPersisted && (
              <button
                type="button"
                onClick={onProtectStorage}
                className="mt-1 px-3 py-1.5 rounded-lg bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-[11px] font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
              >
                Request Storage Eviction Protection
              </button>
            )}
          </div>

          {/* Emergency Local Mirror */}
          <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-heading font-bold text-[rgb(var(--c-text))] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Emergency Local Mirror (Compressed)
              </span>
              {mirrorMeta.exists ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-bold">
                  {mirrorMeta.totalRecords} Records Synced
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-500/10 text-stone-400 font-bold">
                  Not Initialized
                </span>
              )}
            </div>
            <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              {mirrorMeta.exists && mirrorMeta.savedAt
                ? `Last synchronized: ${new Date(mirrorMeta.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (${new Date(mirrorMeta.savedAt).toLocaleDateString()}). Auto-synced on all edits.`
                : 'Auto-syncs all database mutations to compressed local storage so you can recover if IndexedDB resets.'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isSyncingMirror}
                onClick={onForceMirrorSync}
                className="px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-[11px] font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
              >
                {isSyncingMirror ? 'Syncing...' : 'Sync Mirror Now'}
              </button>
              <button
                type="button"
                disabled={isMirrorRestoring || !mirrorMeta.exists}
                onClick={onRestoreFromMirror}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-heading text-[11px] font-bold transition disabled:opacity-50 cursor-pointer"
              >
                {isMirrorRestoring ? 'Restoring...' : 'Restore from Mirror'}
              </button>
            </div>
          </div>
        </div>

        {/* PWA Home Screen Installation */}
        <div className="pt-2 border-t border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-heading font-bold text-[rgb(var(--c-text))]">
              Android Home-Screen &amp; Desktop App
            </div>
            <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              Install College Life OS as a standalone app. Launches instantly without internet from your home screen.
            </p>
          </div>
          <PWAInstallButton />
        </div>

        {/* Portability Actions */}
        <div className="pt-2 border-t border-[rgb(var(--c-border))]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
            <div className="text-[11px] font-heading font-bold text-[rgb(var(--c-text))]">
              Data Portability &amp; External JSON Backups
            </div>
            <div className="text-[10px] text-[rgb(var(--c-muted))] font-mono">
              Last backup: {lastBackupDate ? new Date(lastBackupDate).toLocaleString() : 'Never exported'}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onDownloadBackup}
              disabled={isExportingBackup}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingBackup ? 'Exporting...' : 'Export & Save JSON Backup'}</span>
            </button>

            <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Restore from JSON</span>
              <input type="file" accept=".json" onChange={onFileRestore} className="hidden" />
            </label>

            <button
              onClick={onExportTasks}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export Tasks CSV</span>
            </button>

            <button
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-heading text-xs font-bold transition ml-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Wipe All Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restore Preview Modal */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-[rgb(var(--c-primary))]" />
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Restore Database from Backup
              </div>
            </div>

            <div className="space-y-2 text-xs text-[rgb(var(--c-muted))] font-flourish">
              <div>
                File: <strong className="text-[rgb(var(--c-text))]">{pendingRestore.filename}</strong>
              </div>
              <div>
                Exported At:{' '}
                <strong className="text-[rgb(var(--c-text))]">
                  {new Date(pendingRestore.validation.backup.exportedAt).toLocaleString()}
                </strong>
              </div>
              <div>
                Total Records:{' '}
                <strong className="text-[rgb(var(--c-text))]">
                  {pendingRestore.validation.totalRecords}
                </strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-flourish">
              ⚠️ Restoring will overwrite existing data with the records from this backup file.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                disabled={isRestoring}
                onClick={() => setPendingRestore(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isRestoring}
                onClick={onConfirmRestore}
                className="px-3.5 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] text-xs font-heading font-bold transition shadow-xs hover:opacity-90 cursor-pointer"
              >
                {isRestoring ? 'Restoring Tables...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe All Data Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-rose-500/50 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Wipe All App Data?
              </div>
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
              This will clear all tables (courses, timetable, tasks, exams, habits, finances) in your local IndexedDB. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onWipeAllData}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-heading font-bold transition shadow-xs cursor-pointer"
              >
                Yes, Wipe Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
