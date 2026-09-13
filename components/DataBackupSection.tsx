import React, { useState, useRef, useEffect } from 'react';
import { User } from '../App';
import {
  WEBSITE_SECTIONS,
  getSectionLocalData,
  getSectionItemCount,
  exportFullWebsiteJSON,
  parseBackupFile,
  importSectionData,
  generateSampleTemplateJSON,
  ParseResult,
  ImportResult
} from '../src/lib/dataBackup';

interface DataBackupSectionProps {
  user: User;
  onUpdateUser?: (u: User) => void;
}

export const DataBackupSection: React.FC<DataBackupSectionProps> = ({ user, onUpdateUser }) => {
  // Live local data stats
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});
  const [selectedExportKeys, setSelectedExportKeys] = useState<string[]>(() =>
    WEBSITE_SECTIONS.map((s) => s.key)
  );
  const [showExportCustomizer, setShowExportCustomizer] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Upload / Import states
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedImportKeys, setSelectedImportKeys] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh live counts
  const refreshLiveCounts = () => {
    const counts: Record<string, number> = {};
    for (const sec of WEBSITE_SECTIONS) {
      counts[sec.key] = getSectionItemCount(sec.key);
    }
    setSectionCounts(counts);
  };

  useEffect(() => {
    refreshLiveCounts();
    const handleStorageChange = () => refreshLiveCounts();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Total active items across all sections
  const totalLocalItems = Object.values(sectionCounts).reduce((a, b) => a + b, 0);
  const activeSectionsCount = Object.values(sectionCounts).filter((c) => c > 0).length;

  // Handle Export
  const handleExport = () => {
    if (selectedExportKeys.length === 0) {
      alert('Please select at least one section to export.');
      return;
    }
    setIsExporting(true);
    try {
      const res = exportFullWebsiteJSON(user.email, selectedExportKeys);
      setExportSuccessMessage(
        `Successfully downloaded ${res.filename} (${res.totalSections} sections, ${res.totalItems} items)!`
      );
      setTimeout(() => setExportSuccessMessage(null), 6000);
    } catch (err: any) {
      alert(`Export failed: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      alert('Please select a valid .json file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseBackupFile(content);
      setParseResult(res);
      if (res.valid) {
        setSelectedImportKeys(res.detectedSections.map((s) => s.key));
        setImportResult(null);
      }
    };
    reader.onerror = () => {
      alert('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle Pasted JSON
  const handleApplyPastedJson = () => {
    setPasteError(null);
    if (!pastedJsonText.trim()) {
      setPasteError('Please paste your JSON text first.');
      return;
    }

    const res = parseBackupFile(pastedJsonText);
    if (!res.valid) {
      setPasteError(res.error || 'Invalid JSON content.');
      return;
    }

    setParseResult(res);
    setSelectedImportKeys(res.detectedSections.map((s) => s.key));
    setImportResult(null);
    setShowPasteModal(false);
    setPastedJsonText('');
  };

  // Handle Import Execution
  const handleExecuteImport = async () => {
    if (!parseResult || !parseResult.valid) return;
    if (selectedImportKeys.length === 0) {
      alert('Please select at least one section to contribute.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await importSectionData(
        parseResult.detectedSections,
        selectedImportKeys,
        importMode,
        user.email,
        onUpdateUser
      );
      setImportResult(res);
      refreshLiveCounts();
    } catch (err: any) {
      alert(`Import error: ${err?.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Download Sample Template
  const handleDownloadSample = () => {
    const jsonStr = generateSampleTemplateJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studydash_sample_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Toggle selection helpers
  const toggleExportKey = (key: string) => {
    setSelectedExportKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleImportKey = (key: string) => {
    setSelectedImportKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-4">
      {/* Header & Overview Stats */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 mb-2">
              <i className="fa-solid fa-cloud-arrow-down"></i>
              <span>Universal JSON Data Engine</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              Full Website Data Management
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              Download your entire StudyDash database into a single JSON file or upload a JSON backup to contribute data section by section across all tools.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <div className="bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-center">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Sections</span>
              <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{activeSectionsCount} / {WEBSITE_SECTIONS.length}</span>
            </div>
            <div className="bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-center">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Items</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{totalLocalItems}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Alert for Export */}
      {exportSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-circle-check text-emerald-500 text-lg"></i>
            <span className="text-xs sm:text-sm font-semibold">{exportSuccessMessage}</span>
          </div>
          <button
            onClick={() => setExportSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      )}

      {/* Grid: Export Card & Import Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- SECTION 1: DOWNLOAD JSON FILE --- */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
                  <i className="fa-solid fa-download"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-base">
                    Download Full JSON File
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Export all sections to a portable backup
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                .JSON Export
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Downloads a complete structured snapshot of your tasks, notes, habits, courses, routine, interview questions, and preferences. You can store it safely or transfer it to another browser/device.
            </p>

            {/* Quick Section Breakdown Preview */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Data In Your Session
                </span>
                <button
                  type="button"
                  onClick={() => setShowExportCustomizer(!showExportCustomizer)}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <i className="fa-solid fa-sliders text-[10px]"></i>
                  <span>{showExportCustomizer ? 'Hide Selection' : 'Customize Sections'}</span>
                </button>
              </div>

              {/* Badges preview */}
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {WEBSITE_SECTIONS.map((sec) => {
                  const count = sectionCounts[sec.key] || 0;
                  const isSelected = selectedExportKeys.includes(sec.key);
                  return (
                    <span
                      key={sec.key}
                      onClick={() => showExportCustomizer && toggleExportKey(sec.key)}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all ${
                        showExportCustomizer ? 'cursor-pointer' : ''
                      } ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                          : 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 line-through'
                      }`}
                    >
                      <i className={`fa-solid ${sec.icon} text-[10px] text-indigo-500`}></i>
                      <span>{sec.name}</span>
                      <span className="font-mono text-[10px] font-bold px-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {count}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Customizer Checklist if expanded */}
            {showExportCustomizer && (
              <div className="mb-4 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Select Sections to Include ({selectedExportKeys.length} / {WEBSITE_SECTIONS.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedExportKeys(WEBSITE_SECTIONS.map((s) => s.key))}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedExportKeys([])}
                      className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {WEBSITE_SECTIONS.map((sec) => (
                    <label
                      key={sec.key}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer text-xs text-slate-700 dark:text-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={selectedExportKeys.includes(sec.key)}
                        onChange={() => toggleExportKey(sec.key)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate">{sec.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            {isExporting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Preparing JSON Export...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-down text-base"></i>
                <span>Download Full Website JSON File</span>
              </>
            )}
          </button>
        </div>

        {/* --- SECTION 2: UPLOAD & CONTRIBUTE JSON FILE --- */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
                  <i className="fa-solid fa-upload"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-base">
                    Upload & Contribute JSON File
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Import and distribute data section by section
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 cursor-pointer"
                  title="Download an example template JSON file"
                >
                  <i className="fa-solid fa-file-code mr-1"></i> Sample JSON
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Upload any StudyDash JSON file. Our engine automatically parses the data, identifies which section each item belongs to, and lets you contribute it cleanly.
            </p>

            {/* Dropzone Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[1.01]'
                  : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-xl mb-3">
                <i className="fa-solid fa-file-arrow-up"></i>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                Drag & Drop JSON file here, or <span className="text-emerald-600 dark:text-emerald-400 underline">browse</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports all StudyDash full backups and section export files
              </p>
            </div>

            {/* Paste JSON Option */}
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-slate-400">Prefer pasting text?</span>
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <i className="fa-solid fa-code text-[11px]"></i>
                <span>Paste JSON Code Directly</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- SECTION 3: PARSED JSON FILE CONTRIBUTION PREVIEW --- */}
      {parseResult && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-emerald-500/40 dark:border-emerald-500/30 shadow-lg animate-fade-in">
          {!parseResult.valid ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-3">
              <i className="fa-solid fa-triangle-exclamation text-lg mt-0.5"></i>
              <div>
                <h5 className="font-bold text-sm">Failed to Parse JSON File</h5>
                <p className="text-xs mt-1">{parseResult.error}</p>
                <button
                  type="button"
                  onClick={() => setParseResult(null)}
                  className="mt-3 px-3 py-1 bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300 rounded-lg text-xs font-bold hover:bg-red-200 cursor-pointer"
                >
                  Dismiss & Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* File Info Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-lg">
                    <i className="fa-solid fa-file-circle-check"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-white text-base">
                        JSON Ready for Section Distribution
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Valid Schema
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {parseResult.detectedSections.length} sections found • {parseResult.detectedSections.reduce((acc, s) => acc + s.itemCount, 0)} total items detected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParseResult(null);
                      setImportResult(null);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Clear File
                  </button>
                </div>
              </div>

              {/* Import Mode Selector */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
                  Choose Contribution Method:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      importMode === 'merge'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="import_mode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold block flex items-center gap-1.5">
                        <i className="fa-solid fa-code-merge text-emerald-600"></i>
                        <span>Contribute & Merge (Recommended)</span>
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-tight">
                        Adds new items into each section without deleting your existing tasks, notes, or habits. Deduplicates by ID.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      importMode === 'overwrite'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="import_mode"
                      value="overwrite"
                      checked={importMode === 'overwrite'}
                      onChange={() => setImportMode('overwrite')}
                      className="mt-1 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-bold block flex items-center gap-1.5">
                        <i className="fa-solid fa-arrows-rotate text-rose-600"></i>
                        <span>Replace & Overwrite</span>
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-tight">
                        Completely replaces selected sections with the data in this JSON file. Use for full system restores.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Section-by-Section Distribution Checklist */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Detected Sections ({selectedImportKeys.length} / {parseResult.detectedSections.length} selected)
                  </h5>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImportKeys(parseResult.detectedSections.map((s) => s.key))
                      }
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedImportKeys([])}
                      className="text-xs text-slate-400 hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {parseResult.detectedSections.map((sec) => {
                    const isChecked = selectedImportKeys.includes(sec.key);
                    return (
                      <div
                        key={sec.key}
                        onClick={() => toggleImportKey(sec.key)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isChecked
                            ? 'border-emerald-500/70 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Handled by container
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <i className={`fa-solid ${sec.icon} text-emerald-600`}></i>
                              <span>{sec.name}</span>
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                            {sec.itemCount} {sec.isArray ? 'items' : 'record'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {sec.category} • Ready to distribute
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Ready to contribute <strong className="text-slate-800 dark:text-white">{selectedImportKeys.length} sections</strong> to your StudyDash database.
                </span>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isImporting || selectedImportKeys.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Distributing Data Section by Section...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check-double"></i>
                      <span>Contribute Data to {selectedImportKeys.length} Sections</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SECTION 4: IMPORT RESULTS CELEBRATION MODAL / SUMMARY --- */}
      {importResult && (
        <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-md animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg shadow-sm">
              <i className="fa-solid fa-check"></i>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
                Data Successfully Contributed Across All Sections!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {importResult.totalSectionsUpdated} sections updated with {importResult.totalItemsContributed} contributed entries.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            {importResult.details.map((item) => (
              <div
                key={item.key}
                className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/60 shadow-2xs"
              >
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block truncate">
                  {item.name}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{item.addedCount} contributed (Total: {item.totalCount})
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                setImportResult(null);
                setParseResult(null);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Direct Paste JSON Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-code text-indigo-500"></i>
                <span>Paste JSON Code Directly</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowPasteModal(false);
                  setPasteError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Paste the raw JSON content of your StudyDash backup. Our parser will automatically format and distribute it into corresponding sections.
            </p>

            {pasteError && (
              <div className="p-3 mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs font-medium">
                {pasteError}
              </div>
            )}

            <textarea
              rows={10}
              value={pastedJsonText}
              onChange={(e) => setPastedJsonText(e.target.value)}
              placeholder='{\n  "app": "StudyDash",\n  "sections": {\n    "todos": [...],\n    "notes": [...]\n  }\n}'
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowPasteModal(false);
                  setPasteError(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPastedJson}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-magnifying-glass"></i>
                <span>Parse & Preview Sections</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
